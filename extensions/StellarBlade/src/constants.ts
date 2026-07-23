export const GAME_ID = 3489700
export const GAME_NAME = 'Stellar Blade'
export const EXECUTABLE = 'SB.exe'
export const STEAM_APP_ID = '3489700'

export const GAME_FOLDER = 'SB'
export const WIN64_PATH = 'SB/Binaries/Win64'
export const UE4SS_MODS_PATH = 'SB/Binaries/Win64/ue4ss/Mods'
export const PAK_MODS_PATH = 'SB/Content/Paks/~mods'
export const LOGIC_MODS_PATH = 'SB/Content/Paks/LogicMods'
export const MOVIES_PATH = 'SB/Content/Movies'
export const MENU_PATH = 'SB/Content/Movies/Menu'
export const SPLASH_PATH = 'SB/Content/Splash'
export const CNS_JSON_PATH = 'SB/Content/Paks/~mods/CustomNanosuitSystem'

export const UE4SS_DWMAPI = 'dwmapi.dll'
export const UE4SS_DLL = 'UE4SS.dll'
export const UE4SS_SOURCE_URL = 'https://github.com/Chrisr0/RE-UE4SS/releases'

export const UE4SS_REQUIREMENT_MOD_ID = '5338'

export const PAK_EXTENSIONS = ['.pak', '.utoc', '.ucas', '.json']
export const VIDEO_EXTENSIONS = ['.bk2', '.webm']

export const MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`
export const MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`
export const MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`
export const MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`
export const MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`
export const MOD_TYPE_PAK = `${GAME_ID}-pak`
export const MOD_TYPE_ROOT = `${GAME_ID}-root`
export const MOD_TYPE_BINARIES = `${GAME_ID}-binaries`
export const MOD_TYPE_MENU = `${GAME_ID}-menu`
export const MOD_TYPE_MOVIE = `${GAME_ID}-movie`
export const MOD_TYPE_SPLASH = `${GAME_ID}-splash`
export const MOD_TYPE_CNS_JSON = `${GAME_ID}-cns-json`

export const MOD_TYPE_PRIORITY = {
  ue4ss: 160,
  ue4ssCombo: 150,
  logic: 145,
  script: 130,
  dll: 125,
  cnsJson: 120,
  menu: 115,
  movie: 110,
  splash: 105,
  pak: 100,
  root: 90,
  binaries: 80,
}
