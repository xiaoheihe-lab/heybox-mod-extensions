import { MOD_TYPE, PATHS } from '../constants'
import { hasAllPaths, hasPath } from '../package'
import { confirmInstall, notify } from '../ui'
import type { Candidate, CyberpunkInstallResult, InstallerInput } from '../types'
import { copy, copySame } from './shared'

const REDSCRIPT_CURRENT = [
  'engine/config/base/scripts.ini',
  'engine/tools/scc.exe',
  'r6/config/cybercmd/scc.toml',
]
const REDSCRIPT_DEPRECATED = [
  'engine/config/base/scripts.ini',
  'engine/tools/scc.exe',
  'r6/scripts/redscript.toml',
]

const RED4EXT_BASE = ['red4ext/license.txt', 'red4ext/red4ext.dll']
const RED4EXT_CURRENT_EXTRA = 'red4ext/third_party_licenses.txt'

const CYBERCAT_EXECUTABLE = 'cp2077saveeditor.exe'
const CYBERCAT = [
  CYBERCAT_EXECUTABLE, 'd3dcompiler_47_cor3.dll', 'e_sqlite3.dll', 'kraken.dll',
  'penimc_cor3.dll', 'presentationnative_cor3.dll', 'vcruntime140_cor3.dll', 'wpfgfx_cor3.dll',
]

const CYBERSCRIPT = [
  'bin/x64/plugins/immersiveroleplayframework.asi',
  `${PATHS.cetMods}/quest_mod/init.lua`,
]

function success(input: InstallerInput, modTypeId: CyberpunkInstallResult['modTypeId']): CyberpunkInstallResult {
  return { modTypeId, instructions: copySame(input.pkg.files) }
}

function missing(name: string): never {
  throw new Error(`${name} 压缩包看起来不完整，已拒绝按框架本体安装。`)
}

function strictCandidate(
  id: string,
  modTypeId: CyberpunkInstallResult['modTypeId'],
  marker: string,
  required: string[],
): Candidate {
  return {
    id,
    modTypeId,
    matches: ({ pkg }) => hasPath(pkg.files, marker),
    install: (input) => {
      if (!hasAllPaths(input.pkg.files, required)) missing(id)
      return success(input, modTypeId)
    },
  }
}

function markerCandidate(id: string, modTypeId: CyberpunkInstallResult['modTypeId'], marker: string): Candidate {
  return {
    id, modTypeId,
    matches: ({ pkg }) => hasPath(pkg.files, marker),
    install: (input) => success(input, modTypeId),
  }
}

const coreCet: Candidate = {
  id: 'Core CET',
  modTypeId: MOD_TYPE.coreCet,
  matches: ({ pkg }) => hasPath(pkg.files, 'bin/x64/plugins/cyber_engine_tweaks.asi'),
  install: (input) => success(input, MOD_TYPE.coreCet),
}

const coreRedscript: Candidate = {
  id: 'Core redscript',
  modTypeId: MOD_TYPE.coreRedscript,
  matches: ({ pkg }) => hasPath(pkg.files, 'engine/tools/scc.exe'),
  install: async (input) => {
    if (hasAllPaths(input.pkg.files, REDSCRIPT_CURRENT)) return success(input, MOD_TYPE.coreRedscript)
    if (!hasAllPaths(input.pkg.files, REDSCRIPT_DEPRECATED)) missing('redscript')
    await confirmInstall(input.context, '旧版 redscript', '该压缩包使用已弃用的 redscript 布局，可能不兼容当前游戏版本。')
    return success(input, MOD_TYPE.coreRedscript)
  },
}

const coreRed4ext: Candidate = {
  id: 'Core RED4ext',
  modTypeId: MOD_TYPE.coreRed4ext,
  matches: ({ pkg }) => hasPath(pkg.files, 'red4ext/red4ext.dll'),
  install: async (input) => {
    const files = input.pkg.files
    const baseOk = hasAllPaths(files, RED4EXT_BASE)
    const current = baseOk
      && hasPath(files, RED4EXT_CURRENT_EXTRA)
      && (hasPath(files, 'bin/x64/winmm.dll') || hasPath(files, 'bin/x64/d3d11.dll'))
    const deprecated = baseOk && hasPath(files, 'bin/x64/powrprof.dll')
    if (!current && !deprecated) missing('RED4ext')
    if (deprecated) {
      await confirmInstall(input.context, '旧版 RED4ext', '该压缩包使用 powrprof.dll 注入方式，已被 RED4ext 弃用。')
    }
    return success(input, MOD_TYPE.coreRed4ext)
  },
}

const blockedCsvMerge: Candidate = {
  id: 'Deprecated CSVMerge',
  modTypeId: MOD_TYPE.fallback,
  matches: ({ pkg }) => hasPath(pkg.files, 'csvmerge/csvmerge.cmd'),
  install: () => { throw new Error('CSVMerge 已弃用，请改用 TweakXL / ArchiveXL。') },
}

const blockedWolvenKit: Candidate = {
  id: 'Deprecated WolvenKit CLI',
  modTypeId: MOD_TYPE.fallback,
  matches: ({ pkg }) => pkg.files.some((file) => file.lower === 'wolvenkit cli/wolvenkit.cli.exe' || file.lower.startsWith('wolvenkit desktop/')),
  install: () => { throw new Error('WolvenKit CLI/Desktop 不能作为游戏 Mod 安装。') },
}

const coreCyberCat: Candidate = {
  id: 'Core CyberCAT',
  modTypeId: MOD_TYPE.coreCyberCat,
  matches: ({ pkg }) => hasPath(pkg.files, CYBERCAT_EXECUTABLE),
  install: (input) => {
    if (!hasAllPaths(input.pkg.files, CYBERCAT)) missing('CyberCAT')
    notify(input.context, 'CyberCAT 已安装', 'CyberCAT 是独立工具；启用并部署后请从游戏目录的 CyberCAT 文件夹手动启动。', 'info')
    return {
      modTypeId: MOD_TYPE.coreCyberCat,
      instructions: input.pkg.files.map((file) => copy(file, `${PATHS.cyberCat}/${file.path}`)),
    }
  },
}

export const CORE_CANDIDATES: Candidate[] = [
  coreCet,
  coreRedscript,
  coreRed4ext,
  blockedCsvMerge,
  blockedWolvenKit,
  markerCandidate('Core Audioware', MOD_TYPE.coreAudioware, 'red4ext/plugins/audioware/audioware.dll'),
  markerCandidate('Core TweakXL', MOD_TYPE.coreTweakXL, 'red4ext/plugins/tweakxl/tweakxl.dll'),
  markerCandidate('Core ArchiveXL', MOD_TYPE.coreArchiveXL, 'red4ext/plugins/archivexl/archivexl.dll'),
  markerCandidate('Core Input Loader', MOD_TYPE.coreInputLoader, 'red4ext/plugins/input_loader/input_loader.dll'),
  markerCandidate('Core Mod Settings', MOD_TYPE.coreModSettings, 'red4ext/plugins/mod_settings/mod_settings.dll'),
  coreCyberCat,
  markerCandidate('Core Appearance Menu Mod', MOD_TYPE.coreAmm, `${PATHS.amm}/init.lua`),
  strictCandidate('Core CyberScript', MOD_TYPE.coreCyberScript, CYBERSCRIPT[0], CYBERSCRIPT),
]
