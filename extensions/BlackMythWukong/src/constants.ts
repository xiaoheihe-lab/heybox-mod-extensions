export const GAME_ID = 2358720
export const GAME_NAME = 'Black Myth: Wukong'
export const GAME_SHORT_NAME = 'Black Myth Wukong'
export const EXECUTABLE = 'b1.exe'
export const STEAM_APP_ID = '2358720'
export const NEXUS_GAME_DOMAIN = 'blackmythwukong'

export const GAME_FOLDER = 'b1'
export const WIN64_PATH = 'b1/Binaries/Win64'
export const UE4SS_RUNTIME_PATH = `${WIN64_PATH}/ue4ss`
export const UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`
export const PAK_MODS_PATH = 'b1/Content/Paks/~mods'
export const LOGIC_MODS_PATH = 'b1/Content/Paks/LogicMods'

export const UE4SS_DWMAPI = 'dwmapi.dll'
export const UE4SS_DLL = 'UE4SS.dll'
export const SIGNATURE_BYPASS_DLL = 'dsound.dll'
export const SIGNATURE_BYPASS_SCRIPT = 'sig.lua'

export const UE4SS_REQUIREMENT_MOD_ID = '8096'
export const SIGNATURE_BYPASS_REQUIREMENT_MOD_ID = '8099'

export const MOD_TYPE_FOMOD = `${GAME_ID}-fomod`
export const MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`
export const MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`
export const MOD_TYPE_PAK = `${GAME_ID}-pak`
export const MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`
export const MOD_TYPE_SIGNATURE_BYPASS = `${GAME_ID}-signature-bypass`
export const MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`
export const MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`
export const MOD_TYPE_ROOT = `${GAME_ID}-root`

export const MOD_TYPE_PRIORITY = {
  ue4ss: 950,
  combo: 900,
  logic: 850,
  pak: 800,
  signatureBypass: 700,
  script: 650,
  dll: 600,
  root: 500,
} as const

export const PAK_LOAD_ORDER_PROVIDER_ID = 'black-myth-wukong-pak'
export const PAK_EXTENSION = '.pak'
export const PAK_ATTRIBUTE = 'blackMythWukongPakFiles'
