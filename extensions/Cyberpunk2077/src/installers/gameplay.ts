import {
  MOD_TYPE,
  PATHS,
  RED4EXT_RESERVED_DLLS,
} from '../constants'
import {
  basename,
  dirname,
  extname,
  hasPath,
  isUnder,
  relativeTo,
  sanitizePackageName,
} from '../package'
import { notify } from '../ui'
import type { Candidate, InstallInstruction, InstallerInput, PackageFile } from '../types'
import {
  copy,
  filesUnder,
  finalizeMappedInstall,
  mapInstruction,
  mapSame,
} from './shared'

const CET_PREFIX = `${PATHS.cetMods.toLowerCase()}/`
const REDSCRIPT_PREFIX = `${PATHS.redscript.toLowerCase()}/`
const RED4EXT_PREFIX = `${PATHS.red4extPlugins.toLowerCase()}/`

export function hasAsi(files: PackageFile[]): boolean {
  return files.some((file) => isUnder(file, 'bin/x64/plugins') && extname(file.path) === '.asi')
}

export function hasCet(files: PackageFile[]): boolean {
  return files.some((file) => {
    if (!file.lower.startsWith(CET_PREFIX)) return false
    const relative = file.lower.slice(CET_PREFIX.length).split('/')
    return relative.length === 2 && relative[1] === 'init.lua'
  })
}

export function hasRedscript(files: PackageFile[], canonicalOnly = false): boolean {
  const hasScripts = files.some((file) => file.lower.startsWith(REDSCRIPT_PREFIX) && extname(file.path) === '.reds')
  const hasHints = files.some((file) => isUnder(file, PATHS.redscriptHints) && extname(file.path) === '.toml')
  const topLevel = !canonicalOnly && files.some((file) => !file.path.includes('/') && extname(file.path) === '.reds')
  return hasScripts || hasHints || topLevel
}

export function hasTweakXL(files: PackageFile[]): boolean {
  return files.some((file) => isUnder(file, PATHS.tweakXL) && ['.yaml', '.yml'].includes(extname(file.path)))
}

export function hasAudioware(files: PackageFile[]): boolean {
  return files.some((file) => isUnder(file, PATHS.audioware)
    && ['.yaml', '.yml', '.wav', '.ogg', '.mp3', '.flac'].includes(extname(file.path)))
}

export function hasArchive(files: PackageFile[], canonicalOnly = false): boolean {
  return files.some((file) => {
    if (file.lower.startsWith('mods/')) return false
    const archive = ['.archive', '.xl'].includes(extname(file.path))
    return archive && (!canonicalOnly || isUnder(file, PATHS.archive) || isUnder(file, PATHS.legacyArchive))
  })
}

function dllFiles(files: PackageFile[]): PackageFile[] {
  return files.filter((file) => extname(file.path) === '.dll')
}

export function hasRed4ext(files: PackageFile[], canonicalOnly = false): boolean {
  if (hasPath(files, 'red4ext/red4ext.dll')) return false
  return dllFiles(files).some((file) => {
    if (canonicalOnly) return file.lower.startsWith(RED4EXT_PREFIX)
    return file.lower.startsWith(RED4EXT_PREFIX) || !file.path.includes('/') || dirname(file.path).split('/').length === 1
  })
}

export function assertSafeRed4ext(files: PackageFile[]): void {
  const dangerous = dllFiles(files).filter((file) => {
    const name = basename(file.lower)
    return RED4EXT_RESERVED_DLLS.has(name) || (isUnder(file, 'bin/x64') && RED4EXT_RESERVED_DLLS.has(name))
  })
  if (dangerous.length > 0) {
    throw new Error(`RED4ext Mod 包含禁止覆盖的运行库 DLL：${dangerous.map((file) => file.path).join(', ')}`)
  }
}

export function mapArchiveFiles(files: PackageFile[], mapped: Map<string, InstallInstruction>): void {
  for (const file of files) {
    if (file.lower.startsWith('mods/')) continue
    const extension = extname(file.path)
    if (!['.archive', '.xl'].includes(extension)) continue
    if (isUnder(file, PATHS.archive)) {
      mapInstruction(mapped, file)
    } else if (isUnder(file, PATHS.legacyArchive)) {
      mapInstruction(mapped, file, `${PATHS.archive}/${relativeTo(file, PATHS.legacyArchive)}`)
    } else {
      mapInstruction(mapped, file, `${PATHS.archive}/${file.path}`)
    }
  }
}

export function mapCetFiles(files: PackageFile[], mapped: Map<string, InstallInstruction>): void {
  mapSame(mapped, filesUnder(files, PATHS.cetMods))
}

export function mapRedscriptFiles(
  input: InstallerInput,
  mapped: Map<string, InstallInstruction>,
  canonicalOnly = false,
): void {
  const scripts = filesUnder(input.pkg.files, PATHS.redscript)
  const hasDirectReds = scripts.some((file) => dirname(file.lower) === PATHS.redscript.toLowerCase() && extname(file.path) === '.reds')
  for (const file of scripts) {
    const destination = hasDirectReds
      ? `${PATHS.redscript}/${input.pkg.packageName}/${relativeTo(file, PATHS.redscript)}`
      : file.path
    mapInstruction(mapped, file, destination)
  }
  mapSame(mapped, filesUnder(input.pkg.files, PATHS.redscriptHints).filter((file) => extname(file.path) === '.toml'))

  if (!canonicalOnly) {
    const topLevelReds = input.pkg.files.filter((file) => !file.path.includes('/') && extname(file.path) === '.reds')
    if (topLevelReds.length > 0) {
      for (const file of input.pkg.files) {
        mapInstruction(mapped, file, `${PATHS.redscript}/${input.pkg.packageName}/${file.path}`)
      }
    }
  }
}

export function mapTweakXLFiles(files: PackageFile[], mapped: Map<string, InstallInstruction>): void {
  for (const file of filesUnder(files, PATHS.tweakXL)) {
    if (['.yaml', '.yml'].includes(extname(file.path))) mapInstruction(mapped, file)
  }
}

export function mapAudiowareFiles(files: PackageFile[], mapped: Map<string, InstallInstruction>): void {
  for (const file of filesUnder(files, PATHS.audioware)) {
    if (['.yaml', '.yml', '.wav', '.ogg', '.mp3', '.flac'].includes(extname(file.path))) mapInstruction(mapped, file)
  }
}

export function mapRed4extFiles(
  input: InstallerInput,
  mapped: Map<string, InstallInstruction>,
  canonicalOnly = false,
): void {
  const files = input.pkg.files
  try {
    assertSafeRed4ext(files)
  } catch (error) {
    notify(input.context, '已阻止危险的 RED4ext DLL', String((error as Error)?.message || error), 'error')
    throw error
  }
  const underBase = filesUnder(files, PATHS.red4extPlugins)
  const directDll = underBase.some((file) => dirname(file.lower) === PATHS.red4extPlugins.toLowerCase() && extname(file.path) === '.dll')

  if (underBase.length > 0) {
    for (const file of underBase) {
      const destination = directDll
        ? `${PATHS.red4extPlugins}/${input.pkg.packageName}/${relativeTo(file, PATHS.red4extPlugins)}`
        : file.path
      mapInstruction(mapped, file, destination)
    }
    return
  }
  if (canonicalOnly) return

  const topLevelDll = files.some((file) => !file.path.includes('/') && extname(file.path) === '.dll')
  if (topLevelDll) {
    for (const file of files) {
      mapInstruction(mapped, file, `${PATHS.red4extPlugins}/${input.pkg.packageName}/${file.path}`)
    }
    return
  }

  const dllRoots = new Set(
    dllFiles(files)
      .filter((file) => dirname(file.path).split('/').length === 1)
      .map((file) => file.path.split('/')[0]),
  )
  if (dllRoots.size === 1) {
    const root = [...dllRoots][0]
    for (const file of files.filter((entry) => entry.path === root || entry.path.startsWith(`${root}/`))) {
      mapInstruction(mapped, file, `${PATHS.red4extPlugins}/${file.path}`)
    }
  }
}

const asi: Candidate = {
  id: 'ASI',
  modTypeId: MOD_TYPE.asi,
  matches: ({ pkg }) => hasAsi(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapSame(mapped, filesUnder(input.pkg.files, 'bin/x64/plugins'))
    return finalizeMappedInstall(input, MOD_TYPE.asi, mapped)
  },
}

const red4ext: Candidate = {
  id: 'RED4ext Mod',
  modTypeId: MOD_TYPE.red4ext,
  matches: ({ pkg }) => hasRed4ext(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapRed4extFiles(input, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.red4ext, mapped)
  },
}

const cet: Candidate = {
  id: 'CET Mod',
  modTypeId: MOD_TYPE.cet,
  matches: ({ pkg }) => hasCet(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapCetFiles(input.pkg.files, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.cet, mapped)
  },
}

const redscript: Candidate = {
  id: 'redscript Mod',
  modTypeId: MOD_TYPE.redscript,
  matches: ({ pkg }) => hasRedscript(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapRedscriptFiles(input, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.redscript, mapped)
  },
}

const audioware: Candidate = {
  id: 'Audioware Mod',
  modTypeId: MOD_TYPE.audioware,
  matches: ({ pkg }) => hasAudioware(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapAudiowareFiles(input.pkg.files, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.audioware, mapped)
  },
}

const tweakXL: Candidate = {
  id: 'TweakXL Mod',
  modTypeId: MOD_TYPE.tweakXL,
  matches: ({ pkg }) => hasTweakXL(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapTweakXLFiles(input.pkg.files, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.tweakXL, mapped)
  },
}

const archive: Candidate = {
  id: 'Archive / ArchiveXL Mod',
  modTypeId: MOD_TYPE.archive,
  matches: ({ pkg }) => hasArchive(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapArchiveFiles(input.pkg.files, mapped)
    const destinations = [...mapped.values()]
      .filter((item): item is Extract<InstallInstruction, { type: 'copy' }> => item.type === 'copy')
      .map((item) => item.destination.toLowerCase())
    const nested = destinations.some((destination) => destination.slice(`${PATHS.archive}/`.length).includes('/'))
    const nestedXl = destinations.some((destination) => destination.endsWith('.xl')
      && destination.slice(`${PATHS.archive}/`.length).includes('/'))
    if (nested || nestedXl) {
      notify(
        input.context,
        'Archive Mod 路径需要检查',
        '此压缩包会在 archive/pc/mod 下保留子目录；Cyberpunk 2077 或 ArchiveXL 不一定会加载该布局。',
      )
    }
    return finalizeMappedInstall(input, MOD_TYPE.archive, mapped)
  },
}

export const GAMEPLAY_CANDIDATES = { asi, red4ext, cet, redscript, audioware, tweakXL, archive }

export function red4extFolderName(input: InstallerInput): string {
  return sanitizePackageName(input.pkg.packageName)
}
