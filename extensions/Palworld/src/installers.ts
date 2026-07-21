import type { IExtensionContext } from 'heybox-mod-api'
import {
  BLUEPRINT_PAK_MODS_PATH,
  IGNORE_CONFLICT_FILES,
  LUA_EXTENSIONS,
  MODS_FILE,
  MODS_FILE_BACKUP,
  MOD_TYPE_BLUEPRINT_PAK,
  MOD_TYPE_LUA_V2,
  MOD_TYPE_PAK,
  PAK_EXTENSIONS,
  PAK_MODS_PATH,
  PAL_WIN64_PATH,
  ROOT_DIRECTORIES,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_RUNTIME_PATH,
  UE4SS_SETTINGS,
  UNREAL_PAK_EXE,
  UNREAL_PAK_TOOL_PATH,
} from './constants'
import {
  archiveBaseName,
  archiveExtName,
  archiveJoin,
  getStagingSourcePath,
  normalizeArchivePath,
  removeLeadingSegments,
  splitArchivePath,
  stripKnownTopWrapper,
} from './paths'
import { findGamePath } from './requirements'
import { listPak } from './pak'
import { getUe4ssModsPath } from './ue4ss'

type Instruction = Record<string, unknown>

function hasBaseName(files: string[], name: string): boolean {
  const lower = name.toLowerCase()
  return files.some((file) => archiveBaseName(file).toLowerCase() === lower)
}

function isFileLike(file: string): boolean {
  return archiveBaseName(file).includes('.')
}

function isIgnoredConflictFile(file: string): boolean {
  const lower = archiveBaseName(file).toLowerCase()
  return IGNORE_CONFLICT_FILES.includes(lower)
}

export function hasPakFile(files: string[]): boolean {
  return files.some((file) => PAK_EXTENSIONS.includes(archiveExtName(file)))
}

export function hasLuaFile(files: string[]): boolean {
  return files.some((file) => LUA_EXTENSIONS.includes(archiveExtName(file)))
}

function getLegacyUe4ssModsIndex(segments: string[]): number {
  for (let i = 0; i < segments.length - 2; i += 1) {
    if (segments[i].toLowerCase() === 'ue4ss' && segments[i + 1].toLowerCase() === 'mods') return i + 1
  }
  return -1
}

export function testUe4ss(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === 1623730 && hasBaseName(files, UE4SS_DLL) && hasBaseName(files, UE4SS_DWMAPI),
    requiredFiles: [UE4SS_DLL, UE4SS_DWMAPI],
  }
}

export function testUnrealPakTool(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === 1623730 && hasBaseName(files, UNREAL_PAK_EXE),
    requiredFiles: [UNREAL_PAK_EXE],
  }
}

export function testPak(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === 1623730 && hasPakFile(files) && !files.some(isIgnoredConflictFile),
    requiredFiles: [],
  }
}

export function testLua(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === 1623730 && hasLuaFile(files),
    requiredFiles: [],
  }
}

export function testRoot(files: string[], gameId: number | string) {
  const supported = Number(gameId) === 1623730 && files.some((file) => {
    const first = splitArchivePath(file)[0] || ''
    return ROOT_DIRECTORIES.some((dir) => dir.toLowerCase() === first.toLowerCase())
  })
  return { supported, requiredFiles: [] }
}

export async function installUe4ss(context: IExtensionContext, files: string[], stagingPath?: string, options?: any) {
  const fs = context.api.util.fs
  const wrapperSegments = stripKnownTopWrapper(files, (file) => {
    const base = archiveBaseName(file).toLowerCase()
    return [UE4SS_DLL, UE4SS_DWMAPI, UE4SS_SETTINGS].some((name) => name.toLowerCase() === base)
  })
  const instructions: Instruction[] = []

  for (const file of files) {
    if (!isFileLike(file)) continue
    const relative = removeLeadingSegments(file, wrapperSegments) || archiveBaseName(file)
    const base = archiveBaseName(file)

    if (base.toLowerCase() === MODS_FILE.toLowerCase()) {
      const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile)
      const data = await fs.readFile(sourcePath, { encoding: 'utf8' }) as string
      instructions.push({
        type: 'generatefile',
        data,
        destination: archiveJoin(PAL_WIN64_PATH, 'Mods', MODS_FILE_BACKUP),
      })
      continue
    }

    if (base.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
      const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile)
      const data = await fs.readFile(sourcePath, { encoding: 'utf8' }) as string
      instructions.push({
        type: 'generatefile',
        data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gm, 'bUseUObjectArrayCache = false'),
        destination: archiveJoin(PAL_WIN64_PATH, relative),
      })
      continue
    }

    instructions.push({
      type: 'copy',
      source: file,
      destination: archiveJoin(PAL_WIN64_PATH, relative),
    })
  }

  return { instructions }
}

export function installUnrealPakTool(files: string[]) {
  const wrapperSegments = stripKnownTopWrapper(files, (file) => archiveBaseName(file).toLowerCase() === UNREAL_PAK_EXE.toLowerCase())
  const instructions = files
    .filter(isFileLike)
    .map((file) => {
      const relative = removeLeadingSegments(file, wrapperSegments) || archiveBaseName(file)
      const hasToolPrefix = splitArchivePath(relative)[0]?.toLowerCase() === UNREAL_PAK_TOOL_PATH.toLowerCase()
      return {
        type: 'copy',
        source: file,
        destination: hasToolPrefix ? normalizeArchivePath(relative) : archiveJoin(UNREAL_PAK_TOOL_PATH, relative),
      }
    })
  return { instructions }
}

async function detectPakModType(context: IExtensionContext, files: string[], stagingPath?: string, options?: any): Promise<string> {
  const pakFile = files.find((file) => archiveExtName(file) === '.pak')
  const gamePath = await findGamePath(context)
  if (pakFile && gamePath) {
    try {
      const sourcePath = getStagingSourcePath(pakFile, stagingPath, options?.sourcePathByFile)
      const result = await listPak(context, gamePath, sourcePath)
      return result?.modType === MOD_TYPE_BLUEPRINT_PAK ? MOD_TYPE_BLUEPRINT_PAK : MOD_TYPE_PAK
    } catch {
      // Fall through to the Vortex-style path heuristic when the tool is unavailable or cannot read the pak.
    }
  }

  if (files.some((file) => splitArchivePath(file).some((segment) => segment.toLowerCase() === 'logicmods'))) {
    return MOD_TYPE_BLUEPRINT_PAK
  }

  return MOD_TYPE_PAK
}

export async function installPak(context: IExtensionContext, files: string[], stagingPath?: string, options?: any) {
  const modType = await detectPakModType(context, files, stagingPath, options)
  const target = modType === MOD_TYPE_BLUEPRINT_PAK ? BLUEPRINT_PAK_MODS_PATH : PAK_MODS_PATH
  const instructions = files
    .filter((file) => PAK_EXTENSIONS.includes(archiveExtName(file)))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(target, archiveBaseName(file)),
    }))
  return { instructions, modType }
}

function getFallbackFolderId(stagingPath?: string): string {
  const clean = String(stagingPath || '').replace(/[\\/]+$/, '')
  const leaf = clean.split(/[\\/]/).pop() || 'PalworldLuaMod'
  return leaf.replace(/\.installing$/i, '') || 'PalworldLuaMod'
}

export function getLuaFolderId(files: string[], stagingPath?: string): string {
  const luaFiles = files.filter((file) => LUA_EXTENSIONS.includes(archiveExtName(file))).sort((a, b) => a.length - b.length)
  const shortest = luaFiles[0] || ''
  const segments = splitArchivePath(shortest)
  const legacyModsIndex = getLegacyUe4ssModsIndex(segments)
  if (legacyModsIndex >= 0 && segments[legacyModsIndex + 1]) return segments[legacyModsIndex + 1]
  const modsIndex = segments.findIndex((segment) => segment.toLowerCase() === 'mods')
  if (modsIndex >= 0 && segments[modsIndex + 1]) return segments[modsIndex + 1]
  if (segments.length > 1) return segments[0]
  return getFallbackFolderId(stagingPath)
}

export async function installLua(context: IExtensionContext, files: string[], stagingPath: string | undefined, modType: string) {
  const folderId = getLuaFolderId(files, stagingPath)
  const modsPath = await getUe4ssModsPath(context)
  const luaFiles = files.filter((file) => LUA_EXTENSIONS.includes(archiveExtName(file))).sort((a, b) => a.length - b.length)
  const shortestSegments = splitArchivePath(luaFiles[0] || '')
  const modsIndex = shortestSegments.findIndex((segment) => segment.toLowerCase() === 'mods')

  const instructions: Instruction[] = [
    { type: 'attribute', key: 'palworldFolderId', value: folderId },
  ]

  for (const file of files) {
    if (!isFileLike(file)) continue
    const segments = splitArchivePath(file)
    const legacyModsIndex = getLegacyUe4ssModsIndex(segments)
    const destination = legacyModsIndex >= 0
      ? archiveJoin(modsPath, segments.slice(legacyModsIndex + 1).join('/'))
      : modsIndex >= 0
      ? archiveJoin(modsPath, segments.slice(modsIndex + 1).join('/'))
      : segments.length > 1
        ? archiveJoin(modsPath, folderId, segments.slice(1).join('/'))
        : archiveJoin(modsPath, folderId, file)

    instructions.push({
      type: 'copy',
      source: file,
      destination,
    })
  }

  return { instructions, modType }
}

export function installRoot(files: string[]) {
  const instructions = files
    .filter(isFileLike)
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: normalizeArchivePath(file),
    }))
  return { instructions }
}
