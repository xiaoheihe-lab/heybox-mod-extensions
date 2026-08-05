export const GAME_ID = 1903340
export const GAME_NAME = 'Clair Obscur: Expedition 33'
export const GAME_SHORT_NAME = 'Expedition 33'
export const STEAM_APP_ID = '1903340'
export const EXECUTABLE = 'Expedition33_Steam.exe'
export const NEXUS_GAME_DOMAIN = 'clairobscurexpedition33'

export const GAME_FOLDER = 'Sandfall'
export const WIN64_PATH = `${GAME_FOLDER}/Binaries/Win64`
export const UE4SS_RUNTIME_PATH = `${WIN64_PATH}/ue4ss`
export const UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`
export const PAK_MODS_PATH = `${GAME_FOLDER}/Content/Paks/~mods`
export const LOGIC_MODS_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`

export const UE4SS_DWMAPI = 'dwmapi.dll'
export const UE4SS_DLL = 'UE4SS.dll'
export const UE4SS_REQUIREMENT_MOD_ID = '8577'
export const PAK_EXTENSIONS = ['.pak', '.ucas', '.utoc'] as const
export const PAK_EXTENSION = '.pak'

export const MOD_TYPE_FOMOD = `${GAME_ID}-fomod`
export const MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`
export const MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`
export const MOD_TYPE_PAK = `${GAME_ID}-pak`
export const MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`
export const MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`
export const MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`
export const MOD_TYPE_ROOT = `${GAME_ID}-root`
export const MOD_TYPE_CONTENT = `${GAME_ID}-content`
export const MOD_TYPE_BINARIES = `${GAME_ID}-binaries`

export const MOD_TYPE_PRIORITY = {
  combo: 950,
  logic: 900,
  pak: 850,
  ue4ss: 800,
  script: 650,
  dll: 600,
  root: 500,
  content: 450,
  binaries: 100,
} as const

export const PAK_LOAD_ORDER_PROVIDER_ID = 'clair-obscur-expedition-33-pak'
export const PAK_ATTRIBUTE = 'clairObscurExpedition33PakFiles'
