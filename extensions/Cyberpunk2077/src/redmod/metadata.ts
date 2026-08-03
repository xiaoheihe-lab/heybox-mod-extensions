import { EXTRA_FILE_EXTENSIONS } from '../constants'
import { extname, sanitizePackageName } from '../package'
import type { PackageFile, PreparedPackage } from '../types'

export interface RedmodInfoFile {
  name: string
  version: string
  description?: string
  customSounds?: Array<{ name?: string, type?: string }>
}

export interface RedmodMetadata {
  name: string
  version: string
  relativePath: string
}

export interface RedmodRoot {
  infoFile: PackageFile
  sourceRoot: string
  destinationRoot: string
  info: RedmodInfoFile
}

const SCRIPT_DIRS = new Set(['core', 'cyberpunk', 'exec', 'samples', 'tests'])
const TWEAK_DIRS = ['base/gameplay/static_data', 'ep1/gameplay/static_data']

export function hasRedmodInfo(files: PackageFile[], canonicalOnly = false): boolean {
  return files.some((file) => {
    if (canonicalOnly) return /^mods\/[^/]+\/info\.json$/i.test(file.path)
    return file.lower === 'info.json'
      || /^mods\/[^/]+\/info\.json$/i.test(file.path)
      || /^[^/]+\/info\.json$/i.test(file.path)
  })
}

async function decodeInfo(file: PackageFile, readText: (file: PackageFile) => Promise<string>): Promise<RedmodInfoFile> {
  let value: unknown
  try {
    value = JSON.parse(await readText(file))
  } catch (error) {
    throw new Error(`REDmod info.json 无法解析：${file.path} (${String(error)})`)
  }
  const info = value as Partial<RedmodInfoFile>
  if (!info || typeof info.name !== 'string' || !info.name.trim() || typeof info.version !== 'string' || !info.version.trim()) {
    throw new Error(`REDmod info.json 缺少有效的 name/version：${file.path}`)
  }
  return info as RedmodInfoFile
}

export async function findRedmodRoots(
  pkg: PreparedPackage,
  readText: (file: PackageFile) => Promise<string>,
  canonicalOnly = false,
): Promise<RedmodRoot[]> {
  const roots: RedmodRoot[] = []
  for (const file of pkg.files) {
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

    const info = await decodeInfo(file, readText)
    destinationRoot ||= `mods/${sanitizePackageName(info.name || pkg.packageName)}`
    roots.push({ infoFile: file, sourceRoot, destinationRoot, info })
  }
  return roots
}

export function relativeFromRedmodRoot(file: PackageFile, root: string): string | null {
  if (!root) return file.path
  if (file.path.toLowerCase() === root.toLowerCase()) return ''
  if (!file.path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return null
  return file.path.slice(root.length + 1)
}

export function isValidRedmodFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase()
  if (lower === 'info.json') return true
  const segments = lower.split('/')
  if (segments[0] === 'archives') return ['.archive', '.xl'].includes(extname(lower))
  if (segments[0] === 'customsounds') return extname(lower) === '.wav'
  if (segments[0] === 'scripts') {
    return segments.length >= 3 && SCRIPT_DIRS.has(segments[1]) && ['.script', '.ws'].includes(extname(lower))
  }
  if (segments[0] === 'tweaks') {
    return TWEAK_DIRS.includes(segments.slice(1, -1).join('/')) && extname(lower) === '.tweak'
  }
  return false
}

export function validateRedmodRoot(pkg: PreparedPackage, root: RedmodRoot): PackageFile[] {
  const scopedFiles = pkg.files.filter((file) => relativeFromRedmodRoot(file, root.sourceRoot) !== null)
  const invalid = scopedFiles.find((file) => {
    const relative = relativeFromRedmodRoot(file, root.sourceRoot) || ''
    return !isValidRedmodFile(relative) && !EXTRA_FILE_EXTENSIONS.has(extname(file.path))
  })
  if (invalid) throw new Error(`REDmod 包含无效目录或文件类型：${invalid.path}`)

  const rootFiles = scopedFiles.filter((file) => isValidRedmodFile(relativeFromRedmodRoot(file, root.sourceRoot) || ''))
  const payloadFiles = rootFiles.filter((file) => file.source !== root.infoFile.source)
  if (payloadFiles.length === 0) {
    const sounds = Array.isArray(root.info.customSounds) ? root.info.customSounds : []
    if (sounds.length === 0 || sounds.some((sound) => sound?.type !== 'mod_skip')) {
      throw new Error(`REDmod 只有 info.json，但未声明纯 mod_skip 音频条目：${root.infoFile.path}`)
    }
  }
  return rootFiles
}

export function metadataFromRoots(roots: RedmodRoot[]): RedmodMetadata[] {
  return roots.map((root) => ({
    name: root.info.name,
    version: root.info.version,
    relativePath: root.destinationRoot,
  }))
}
