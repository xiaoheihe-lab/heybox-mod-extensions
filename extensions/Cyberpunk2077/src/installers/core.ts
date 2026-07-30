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

const INPUT_LOADER_CURRENT = [
  'engine/config/platform/pc/input_loader.ini',
  'r6/cache/inputcontexts.xml',
  'r6/cache/inputusermappings.xml',
  'red4ext/plugins/input_loader/input_loader.dll',
  'red4ext/plugins/input_loader/inputusermappings.xml',
  'red4ext/plugins/input_loader/license.md',
  'red4ext/plugins/input_loader/readme.md',
]
const INPUT_LOADER_011 = [
  'red4ext/plugins/input_loader/input_loader.dll',
  'red4ext/plugins/input_loader/inputusermappings.xml',
  'red4ext/plugins/input_loader/license.md',
  'red4ext/plugins/input_loader/readme.md',
  'red4ext/plugins/input_loader_uninstall.bat',
]
const INPUT_LOADER_010 = [
  'red4ext/plugins/input_loader/input_loader.dll',
  'red4ext/plugins/input_loader/inputusermappings.xml',
]

const MOD_SETTINGS = [
  'red4ext/plugins/mod_settings/modsettings.archive',
  'red4ext/plugins/mod_settings/modsettings.archive.xl',
  'red4ext/plugins/mod_settings/mod_settings.dll',
  'red4ext/plugins/mod_settings/module.reds',
  'red4ext/plugins/mod_settings/packed.reds',
  'red4ext/plugins/mod_settings/license.md',
  'red4ext/plugins/mod_settings/readme.md',
]

const TWEAK_XL = [
  'red4ext/plugins/tweakxl/tweakxl.dll',
  'red4ext/plugins/tweakxl/scripts/tweakxl.global.reds',
  'red4ext/plugins/tweakxl/scripts/tweakxl.reds',
  'red4ext/plugins/tweakxl/data/extraflats.dat',
  'red4ext/plugins/tweakxl/data/inheritancemap.dat',
  'red4ext/plugins/tweakxl/license',
  'red4ext/plugins/tweakxl/third_party_licenses',
]

const AUDIOWARE = [
  'red4ext/plugins/audioware/audioware.dll',
  ...['Codeware', 'Config', 'Ext', 'Hooks', 'Natives', 'Preset', 'Service', 'Settings', 'System', 'Tween', 'Utils']
    .map((name) => `r6/scripts/audioware/${name.toLowerCase()}.reds`),
]

const ARCHIVE_XL = [
  'r6/config/redsuserhints/archivexl.toml',
  'red4ext/plugins/archivexl/archivexl.dll',
  'red4ext/plugins/archivexl/bundle/archivexl.archive',
  'red4ext/plugins/archivexl/bundle/photomodescope.xl',
  'red4ext/plugins/archivexl/bundle/playerbasescope.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationbeardfix.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationbeardscope.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationbrowsfix.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationbrowspatch.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationbrowsscope.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationhairfix.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationhairpatch.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationhairscope.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationlashesfix.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationlashespatch.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationlashesscope.xl',
  'red4ext/plugins/archivexl/bundle/playercustomizationscope.xl',
  'red4ext/plugins/archivexl/bundle/questbasescope.xl',
  'red4ext/plugins/archivexl/license',
  'red4ext/plugins/archivexl/scripts/archivexl.global.reds',
  'red4ext/plugins/archivexl/scripts/archivexl.reds',
  'red4ext/plugins/archivexl/third_party_licenses',
]

const CYBERCAT = [
  'cp2077saveeditor.exe', 'd3dcompiler_47_cor3.dll', 'e_sqlite3.dll', 'kraken.dll',
  'penimc_cor3.dll', 'presentationnative_cor3.dll', 'vcruntime140_cor3.dll', 'wpfgfx_cor3.dll',
]

const AMM_CORE = [
  `${PATHS.amm}/init.lua`,
  `${PATHS.amm}/db.sqlite3`,
  `${PATHS.amm}/collabs/api.lua`,
  `${PATHS.archive}/basegame_amm_props.archive`,
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

const coreInputLoader: Candidate = {
  id: 'Core Input Loader',
  modTypeId: MOD_TYPE.coreInputLoader,
  matches: ({ pkg }) => hasPath(pkg.files, 'red4ext/plugins/input_loader/input_loader.dll'),
  install: async (input) => {
    if (hasAllPaths(input.pkg.files, INPUT_LOADER_CURRENT)) return success(input, MOD_TYPE.coreInputLoader)
    const is011 = hasAllPaths(input.pkg.files, INPUT_LOADER_011)
    const is010 = hasAllPaths(input.pkg.files, INPUT_LOADER_010)
    if (!is011 && !is010) missing('Input Loader')
    await confirmInstall(input.context, '旧版 Input Loader', '该压缩包使用旧版 Input Loader 布局，将补充 input_loader.ini。')
    const instructions = copySame(input.pkg.files)
    if (!hasPath(input.pkg.files, 'engine/config/platform/pc/input_loader.ini')) {
      instructions.unshift({
        type: 'generatefile',
        data: '[Player/Input]\n',
        destination: 'engine/config/platform/pc/input_loader.ini',
      })
    }
    return { modTypeId: MOD_TYPE.coreInputLoader, instructions }
  },
}

const coreCyberCat: Candidate = {
  id: 'Core CyberCAT',
  modTypeId: MOD_TYPE.coreCyberCat,
  matches: ({ pkg }) => CYBERCAT.some((path) => hasPath(pkg.files, path)),
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
  strictCandidate('Core Audioware', MOD_TYPE.coreAudioware, AUDIOWARE[0], AUDIOWARE),
  strictCandidate('Core TweakXL', MOD_TYPE.coreTweakXL, TWEAK_XL[0], TWEAK_XL),
  strictCandidate('Core ArchiveXL', MOD_TYPE.coreArchiveXL, ARCHIVE_XL[1], ARCHIVE_XL),
  coreInputLoader,
  strictCandidate('Core Mod Settings', MOD_TYPE.coreModSettings, MOD_SETTINGS[2], MOD_SETTINGS),
  coreCyberCat,
  strictCandidate('Core Appearance Menu Mod', MOD_TYPE.coreAmm, AMM_CORE[0], AMM_CORE),
  strictCandidate('Core CyberScript', MOD_TYPE.coreCyberScript, CYBERSCRIPT[0], CYBERSCRIPT),
]
