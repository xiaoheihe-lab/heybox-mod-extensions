import { JSON_CANONICAL_PATHS, MOD_TYPE, PATHS, XML_PROTECTED_NAMES } from '../constants'
import { basename, dirname, extname, isUnder } from '../package'
import { confirmInstall } from '../ui'
import type { Candidate, InstallInstruction, InstallerInput, PackageFile } from '../types'
import { finalizeMappedInstall, installFallback, mapInstruction, readText } from './shared'

const JSON_PROTECTED_PATHS = new Set([
  ...Object.values(JSON_CANONICAL_PATHS).map((path) => path.toLowerCase()),
  'r6/config/settings/options.json',
  'r6/config/settings/platform/pc/options.json',
])

function isProtectedJson(file: PackageFile): boolean {
  return JSON_PROTECTED_PATHS.has(file.lower)
    || ((isUnder(file, 'engine/config') || isUnder(file, 'r6/config')) && extname(file.path) === '.json')
}

export function hasJsonConfig(files: PackageFile[], canonicalOnly = false): boolean {
  if (files.some(isProtectedJson)) return true
  if (canonicalOnly) return false
  return files.some((file) => !file.path.includes('/')
    && [...Object.keys(JSON_CANONICAL_PATHS), 'options.json'].includes(basename(file.lower)))
}

export function mapJsonConfig(files: PackageFile[], mapped: Map<string, InstallInstruction>): { protected: boolean, unresolved: boolean } {
  let protectedFiles = false
  let unresolved = false
  for (const file of files) {
    if (isProtectedJson(file)) {
      protectedFiles = true
      mapInstruction(mapped, file)
      continue
    }
    if (file.path.includes('/') || extname(file.path) !== '.json') continue
    const name = basename(file.lower)
    const target = JSON_CANONICAL_PATHS[name]
    if (target) {
      protectedFiles = true
      mapInstruction(mapped, file, target)
    } else if (name === 'options.json') {
      unresolved = true
    }
  }
  return { protected: protectedFiles, unresolved }
}

function xmlKind(file: PackageFile): 'protected' | 'canonical' | 'mergeable' | 'toplevel' | null {
  if (extname(file.path) !== '.xml') return null
  if (dirname(file.lower) === PATHS.xmlConfig.toLowerCase()) {
    return XML_PROTECTED_NAMES.has(basename(file.lower)) ? 'protected' : 'canonical'
  }
  if (dirname(file.lower) === PATHS.xmlInput.toLowerCase()) return 'mergeable'
  if (!file.path.includes('/') && XML_PROTECTED_NAMES.has(basename(file.lower))) return 'toplevel'
  return null
}

export function hasXmlConfig(files: PackageFile[], canonicalOnly = false): boolean {
  return files.some((file) => {
    const kind = xmlKind(file)
    return kind !== null && (!canonicalOnly || kind !== 'toplevel')
  })
}

export function mapXmlConfig(files: PackageFile[], mapped: Map<string, InstallInstruction>): { protected: boolean } {
  let protectedFiles = false
  for (const file of files) {
    const kind = xmlKind(file)
    if (!kind) continue
    if (kind === 'protected' || kind === 'toplevel') protectedFiles = true
    mapInstruction(mapped, file, kind === 'toplevel' ? `${PATHS.xmlConfig}/${basename(file.path)}` : file.path)
  }
  return { protected: protectedFiles }
}

export function hasIni(files: PackageFile[]): boolean {
  const hasIniFile = files.some((file) => extname(file.path) === '.ini')
  const belongsToScriptMod = files.some((file) => basename(file.lower) === 'init.lua' || extname(file.path) === '.reds')
  return hasIniFile && !belongsToScriptMod && !files.some((file) => file.lower === 'bin/x64/global.ini')
}

async function looksLikeReshade(input: InstallerInput, ini: PackageFile): Promise<boolean> {
  try {
    const text = (await readText(input, ini)).slice(0, 16_384)
    return /(^|\r?\n)\s*(Techniques|TechniqueSorting|PreprocessorDefinitions|TextureSearchPaths|EffectSearchPaths)\s*=/im.test(text)
      || /(^|\r?\n)\s*\[(GENERAL|INPUT|STYLE)\]\s*$/im.test(text)
  } catch {
    return false
  }
}

const jsonConfig: Candidate = {
  id: 'JSON Config',
  modTypeId: MOD_TYPE.jsonConfig,
  matches: ({ pkg }) => hasJsonConfig(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    const state = mapJsonConfig(input.pkg.files, mapped)
    if (state.unresolved || mapped.size === 0) {
      return installFallback(input, '顶层 options.json 无法可靠判断属于 r6/config/settings 还是 platform/pc。')
    }
    if (state.protected) {
      await confirmInstall(input.context, '安装受保护的 JSON 配置', '该 Mod 会覆盖 Cyberpunk 2077 的核心 JSON 配置文件。请确认其与当前游戏版本兼容。')
    }
    return finalizeMappedInstall(input, MOD_TYPE.jsonConfig, mapped)
  },
}

const xmlConfig: Candidate = {
  id: 'XML Config',
  modTypeId: MOD_TYPE.xmlConfig,
  matches: ({ pkg }) => hasXmlConfig(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    const state = mapXmlConfig(input.pkg.files, mapped)
    if (state.protected) {
      await confirmInstall(input.context, '安装受保护的 XML 配置', '该 Mod 会覆盖 inputContexts、inputUserMappings 等输入配置。请确认其与当前游戏版本及其他输入 Mod 兼容。')
    }
    return finalizeMappedInstall(input, MOD_TYPE.xmlConfig, mapped)
  },
}

const ini: Candidate = {
  id: 'INI / ReShade',
  modTypeId: MOD_TYPE.ini,
  matches: ({ pkg }) => hasIni(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    const iniFiles = input.pkg.files.filter((file) => extname(file.path) === '.ini')
    const reshade = iniFiles.length > 0 && await looksLikeReshade(input, iniFiles[0])
    for (const file of iniFiles) {
      mapInstruction(mapped, file, `${reshade ? PATHS.reshade : PATHS.iniConfig}/${basename(file.path)}`)
    }
    if (reshade) {
      for (const file of input.pkg.files) {
        const marker = '/reshade-shaders/'
        const index = `/${file.lower}`.indexOf(marker)
        if (index < 0) continue
        // The leading slash added for segment matching offsets marker's own
        // leading slash, so index already points at "reshade-shaders".
        const suffix = file.path.slice(index)
        mapInstruction(mapped, file, `${PATHS.reshade}/${suffix}`)
      }
    }
    return finalizeMappedInstall(input, MOD_TYPE.ini, mapped)
  },
}

export const CONFIG_CANDIDATES = { ini, jsonConfig, xmlConfig }
