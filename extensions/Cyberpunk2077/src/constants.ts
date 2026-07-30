export const GAME_ID = 1091500
export const GAME_NAME = 'Cyberpunk 2077'
export const EXECUTABLE = 'bin/x64/Cyberpunk2077.exe'
export const NEXUS_DOMAIN = 'cyberpunk2077'

export const REDMOD_PRELAUNCHER = 'REDprelauncher.exe'
export const REDMOD_DEPLOY_EXE = 'tools/redmod/bin/redMod.exe'
export const REDMOD_METADATA = 'tools/redmod/metadata.json'

const typeId = (name: string) => `${GAME_ID}-${name}`

export const MOD_TYPE = {
  fomod: typeId('fomod'),
  pipeline: typeId('pipeline'),
  coreCet: typeId('core-cet'),
  coreRedscript: typeId('core-redscript'),
  coreRed4ext: typeId('core-red4ext'),
  coreAudioware: typeId('core-audioware'),
  coreTweakXL: typeId('core-tweak-xl'),
  coreArchiveXL: typeId('core-archive-xl'),
  coreInputLoader: typeId('core-input-loader'),
  coreModSettings: typeId('core-mod-settings'),
  coreCyberCat: typeId('core-cybercat'),
  coreAmm: typeId('core-amm'),
  coreCyberScript: typeId('core-cyberscript'),
  asi: typeId('asi'),
  multiType: typeId('multi-type'),
  multiTypeRedmod: typeId('multi-type-redmod'),
  red4ext: typeId('red4ext'),
  redmod: typeId('redmod'),
  amm: typeId('amm'),
  cet: typeId('cet'),
  redscript: typeId('redscript'),
  audioware: typeId('audioware'),
  tweakXL: typeId('tweak-xl'),
  ini: typeId('ini'),
  jsonConfig: typeId('json-config'),
  xmlConfig: typeId('xml-config'),
  preset: typeId('character-preset'),
  archive: typeId('archive'),
  fallback: typeId('fallback'),
} as const

export type CyberpunkModType = typeof MOD_TYPE[keyof typeof MOD_TYPE]

export const MOD_TYPE_NAMES: Record<CyberpunkModType, string> = {
  [MOD_TYPE.fomod]: 'FOMOD Installer',
  [MOD_TYPE.pipeline]: 'Cyberpunk 2077 Installer Pipeline',
  [MOD_TYPE.coreCet]: 'Cyber Engine Tweaks',
  [MOD_TYPE.coreRedscript]: 'redscript',
  [MOD_TYPE.coreRed4ext]: 'RED4ext',
  [MOD_TYPE.coreAudioware]: 'Audioware',
  [MOD_TYPE.coreTweakXL]: 'TweakXL',
  [MOD_TYPE.coreArchiveXL]: 'ArchiveXL',
  [MOD_TYPE.coreInputLoader]: 'Input Loader',
  [MOD_TYPE.coreModSettings]: 'Mod Settings',
  [MOD_TYPE.coreCyberCat]: 'CyberCAT Save Editor',
  [MOD_TYPE.coreAmm]: 'Appearance Menu Mod',
  [MOD_TYPE.coreCyberScript]: 'CyberScript',
  [MOD_TYPE.asi]: 'ASI Mod',
  [MOD_TYPE.multiType]: 'Multi-type Mod',
  [MOD_TYPE.multiTypeRedmod]: 'Multi-type Mod with REDmod',
  [MOD_TYPE.red4ext]: 'RED4ext Mod',
  [MOD_TYPE.redmod]: 'REDmod',
  [MOD_TYPE.amm]: 'Appearance Menu Mod Content',
  [MOD_TYPE.cet]: 'Cyber Engine Tweaks Mod',
  [MOD_TYPE.redscript]: 'redscript Mod',
  [MOD_TYPE.audioware]: 'Audioware Mod',
  [MOD_TYPE.tweakXL]: 'TweakXL Mod',
  [MOD_TYPE.ini]: 'INI / ReShade Mod',
  [MOD_TYPE.jsonConfig]: 'JSON Configuration Mod',
  [MOD_TYPE.xmlConfig]: 'XML Configuration Mod',
  [MOD_TYPE.preset]: 'Character Preset',
  [MOD_TYPE.archive]: 'Archive / ArchiveXL Mod',
  [MOD_TYPE.fallback]: 'Root Folder Mod',
}

export const KNOWN_TOP_LEVEL_DIRS = new Set(['archive', 'bin', 'engine', 'r6', 'red4ext', 'mods'])
export const EXTRA_FILE_EXTENSIONS = new Set([
  '.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.odt', '.rtf', '.doc',
])

export const PATHS = {
  cetMods: 'bin/x64/plugins/cyber_engine_tweaks/mods',
  amm: 'bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod',
  archive: 'archive/pc/mod',
  legacyArchive: 'archive/pc/patch',
  red4extPlugins: 'red4ext/plugins',
  redscript: 'r6/scripts',
  redscriptHints: 'r6/config/redsUserHints',
  tweakXL: 'r6/tweaks',
  audioware: 'r6/audioware',
  xmlConfig: 'r6/config',
  xmlInput: 'r6/input',
  iniConfig: 'engine/config/platform/pc',
  reshade: 'bin/x64',
  redmods: 'mods',
  extras: 'V2077/mod-extra-files',
  cyberCat: 'CyberCAT',
  cyberCatPresets: 'V2077/presets/cybercat',
  appearancePresets: 'bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceChangeUnlocker/character-presets',
} as const

export const XML_PROTECTED_NAMES = new Set([
  'inputcontexts.xml', 'inputdeadzones.xml', 'inputusermappings.xml', 'uiinputactions.xml',
])

export const JSON_CANONICAL_PATHS: Record<string, string> = {
  'giweights.json': 'engine/config/giweights.json',
  'bumperssettings.json': 'r6/config/bumpersSettings.json',
}

export const RED4EXT_RESERVED_DLLS = new Set([
  'clrcompression.dll', 'clrjit.dll', 'coreclr.dll', 'd3dcompiler_47_cor3.dll', 'mscordaccore.dll',
  'penimc_cor3.dll', 'presentationnative_cor3.dll', 'vcruntime140_cor3.dll', 'wpfgfx_cor3.dll',
])
