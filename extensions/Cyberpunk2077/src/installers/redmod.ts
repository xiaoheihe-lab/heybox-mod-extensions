import { EXTRA_FILE_EXTENSIONS, MOD_TYPE, PATHS } from '../constants'
import { basename, extname, sanitizePackageName } from '../package'
import type {
  AttributeInstruction,
  Candidate,
  InstallInstruction,
  InstallerInput,
  PackageFile,
} from '../types'
import { finalizeMappedInstall, mapInstruction, readText } from './shared'

interface RedmodInfo {
  name: string
  version: string
  description?: string
  customSounds?: Array<{ name?: string, type?: string }>
}

interface RedmodRoot {
  infoFile: PackageFile
  sourceRoot: string
  destinationRoot: string
  info: RedmodInfo
}

const SCRIPT_DIRS = new Set(['core', 'cyberpunk', 'exec', 'samples', 'tests'])
const TWEAK_DIRS = ['base/gameplay/static_data', 'ep1/gameplay/static_data']

export function hasRedmod(files: PackageFile[], canonicalOnly = false): boolean {
  return files.some((file) => {
    if (canonicalOnly) return /^mods\/[^/]+\/info\.json$/i.test(file.path)
    return file.lower === 'info.json'
      || /^mods\/[^/]+\/info\.json$/i.test(file.path)
      || /^[^/]+\/info\.json$/i.test(file.path)
  })
}

async function decodeInfo(input: InstallerInput, file: PackageFile): Promise<RedmodInfo> {
  let value: unknown
  try {
    value = JSON.parse(await readText(input, file))
  } catch (error) {
    throw new Error(`REDmod info.json 无法解析：${file.path} (${String(error)})`)
  }
  const info = value as Partial<RedmodInfo>
  if (!info || typeof info.name !== 'string' || !info.name.trim() || typeof info.version !== 'string' || !info.version.trim()) {
    throw new Error(`REDmod info.json 缺少有效的 name/version：${file.path}`)
  }
  return info as RedmodInfo
}

async function findRoots(input: InstallerInput, canonicalOnly: boolean): Promise<RedmodRoot[]> {
  const roots: RedmodRoot[] = []
  for (const file of input.pkg.files) {
    let sourceRoot: string | null = null
    let destinationRoot: string | null = null

    const canonical = file.path.match(/^mods\/([^/]+)\/info\.json$/i)
    const named = file.path.match(/^([^/]+)\/info\.json$/i)
    if (canonical) {
      sourceRoot = `mods/${canonical[1]}`
      destinationRoot = sourceRoot
    } else if (!canonicalOnly && file.lower === 'info.json') {
      sourceRoot = ''
    } else if (!canonicalOnly && named) {
      sourceRoot = named[1]
      destinationRoot = `mods/${named[1]}`
    }
    if (sourceRoot === null) continue

    const info = await decodeInfo(input, file)
    destinationRoot ||= `mods/${sanitizePackageName(info.name || input.pkg.packageName)}`
    roots.push({ infoFile: file, sourceRoot, destinationRoot, info })
  }
  return roots
}

function relativeFromRoot(file: PackageFile, root: string): string | null {
  if (!root) return file.path
  if (file.path.toLowerCase() === root.toLowerCase()) return ''
  if (!file.path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return null
  return file.path.slice(root.length + 1)
}

function validateRedmodFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase()
  if (lower === 'info.json') return true
  const segments = lower.split('/')
  if (segments[0] === 'archives') return ['.archive', '.xl'].includes(extname(lower))
  if (segments[0] === 'customsounds') return extname(lower) === '.wav'
  if (segments[0] === 'scripts') {
    return segments.length >= 3 && SCRIPT_DIRS.has(segments[1]) && ['.script', '.ws'].includes(extname(lower))
  }
  if (segments[0] === 'tweaks') {
    const parent = segments.slice(1, -1).join('/')
    return TWEAK_DIRS.includes(parent) && extname(lower) === '.tweak'
  }
  return false
}

export async function mapRedmods(
  input: InstallerInput,
  mapped: Map<string, InstallInstruction>,
  canonicalOnly = false,
): Promise<AttributeInstruction[]> {
  const roots = await findRoots(input, canonicalOnly)
  if (roots.length === 0) return []

  const metadata = []
  for (const root of roots) {
    const scopedFiles = input.pkg.files.filter((file) => relativeFromRoot(file, root.sourceRoot) !== null)
    const invalid = scopedFiles.find((file) => {
      const relative = relativeFromRoot(file, root.sourceRoot) || ''
      return !validateRedmodFile(relative) && !EXTRA_FILE_EXTENSIONS.has(extname(file.path))
    })
    if (invalid) throw new Error(`REDmod 包含无效目录或文件类型：${invalid.path}`)

    const rootFiles = scopedFiles.filter((file) => validateRedmodFile(relativeFromRoot(file, root.sourceRoot) || ''))

    const payloadFiles = rootFiles.filter((file) => file.source !== root.infoFile.source)
    if (payloadFiles.length === 0) {
      const sounds = Array.isArray(root.info.customSounds) ? root.info.customSounds : []
      if (sounds.length === 0 || sounds.some((sound) => sound?.type !== 'mod_skip')) {
        throw new Error(`REDmod 只有 info.json，但未声明纯 mod_skip 音频条目：${root.infoFile.path}`)
      }
    }

    for (const file of rootFiles) {
      const relative = relativeFromRoot(file, root.sourceRoot) || basename(file.path)
      mapInstruction(mapped, file, `${root.destinationRoot}/${relative}`)
    }

    metadata.push({
      name: root.info.name,
      version: root.info.version,
      relativePath: root.destinationRoot,
    })
  }

  return [
    { type: 'attribute', key: 'cyberpunkRedmodInfo', value: metadata },
    { type: 'attribute', key: 'cyberpunkRedmodRequiresDeploy', value: true },
  ]
}

export const redmodCandidate: Candidate = {
  id: 'REDmod',
  modTypeId: MOD_TYPE.redmod,
  matches: ({ pkg }) => hasRedmod(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    const attributes = await mapRedmods(input, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.redmod, mapped, attributes)
  },
}
