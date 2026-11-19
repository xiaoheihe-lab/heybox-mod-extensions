import { EXTRA_FILE_EXTENSIONS } from '../constants'
import { extname, sanitizePackageName } from '../package'
import type { PackageFile, PreparedPackage } from '../types'

export interface RedmodInfoFile {
  name: string
  version: string
  description?: string
  customSounds?: Array<{ name: string, type: string, file?: string, gain?: number, pitch?: number }>
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

const SOUND_TYPES = new Set(['mod_skip', 'mod_sfx_2d', 'mod_sfx_city', 'mod_sfx_low_occlusion',
  'mod_sfx_occlusion', 'mod_sfx_radio', 'mod_sfx_room', 'mod_sfx_street', 'mod_sfx_ui'])

async function decodeInfo(file: PackageFile, readText: (file: PackageFile) => Promise<string>, version?: string): Promise<RedmodInfoFile> {
  let value: unknown
  try {
    value = JSON.parse(await readText(file))
  } catch (error) {
    throw new Error(`REDmod info.json 无法解析：${file.path} (${String(error)})`)
  }
  const info = value as Partial<RedmodInfoFile>
  if (!info || typeof info.name !== 'string' || !info.name.trim() || typeof info.version !== 'string') {
    throw new Error(`REDmod info.json 缺少有效的 name/version：${file.path}`)
  }
  if (info.description !== undefined && typeof info.description !== 'string') throw new Error(`REDmod description 无效：${file.path}`)
  if (info.customSounds !== undefined && (!Array.isArray(info.customSounds) || info.customSounds.some((sound) =>
    !sound || typeof sound.name !== 'string' || !SOUND_TYPES.has(sound.type)
    || (sound.file !== undefined && typeof sound.file !== 'string')
    || (sound.gain !== undefined && (typeof sound.gain !== 'number' || !Number.isFinite(sound.gain)))
    || (sound.pitch !== undefined && (typeof sound.pitch !== 'number' || !Number.isFinite(sound.pitch)))
  ))) throw new Error(`REDmod customSounds 声明无效：${file.path}`)
  return { ...info, version: info.version || version || '' } as RedmodInfoFile
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

    const info = await decodeInfo(file, readText, pkg.packageVersion)
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
  const sounds = root.info.customSounds || []
  const requiresSoundFiles = sounds.some((sound) => sound.type !== 'mod_skip')
  const hasSoundFiles = payloadFiles.some((file) =>
    (relativeFromRedmodRoot(file, root.sourceRoot) || '').toLowerCase().startsWith('customsounds/'))
  if (requiresSoundFiles !== hasSoundFiles) {
    throw new Error(`REDmod customSounds 声明与音频文件不一致：${root.infoFile.path}`)
  }
  if (payloadFiles.length === 0) {
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

export function emptySoundDirectories(roots: RedmodRoot[]): string[] {
  return roots.filter((root) => root.info.customSounds?.length
    && root.info.customSounds.every((sound) => sound.type === 'mod_skip'))
    .map((root) => `${root.destinationRoot}/customSounds`)
}
