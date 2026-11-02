export const GAME_ID = 4115450
export const GAME_NAME = 'Phantom Blade Zero'
// The game root only holds a small launcher; the UE5 process UE4SS injects into lives here.
export const EXECUTABLE = 'platform/steam/PBZ.exe'
export const STEAM_APP_ID = '4115450'

// Phantom Blade Zero ships a split layout: the Steam launcher lives in `steam/`,
// while the real UE5 executable and the UE4SS proxy live in `platform/steam/`.
export const GAME_FOLDER = 'ProjectPBZ'
export const BINARIES_PATH = 'platform/steam'
export const UE4SS_RUNTIME_PATH = `${BINARIES_PATH}/ue4ss`
export const UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`
export const PAK_MODS_PATH = `${GAME_FOLDER}/Content/Paks/~mods`
export const LOGIC_MODS_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`
// Top-level directories a root mod may replace; `steam` holds the launcher and its stub.
export const ROOT_DIRECTORIES = ['Engine', 'ProjectPBZ', 'platform', 'steam']

export const UE4SS_DLL = 'UE4SS.dll'
export const UE4SS_DWMAPI = 'dwmapi.dll'
export const UE4SS_SETTINGS = 'UE4SS-settings.ini'
// Proxy DLLs that load UE4SS next to the real game executable. Repacks ship any
// one of them; `dwmapi.dll` is the build we require as a prerequisite.
export const UE4SS_PROXY_DLLS = [UE4SS_DWMAPI, 'xinput1_3.dll', 'xinput1_4.dll']
// Heybox mod entry for the Phantom Blade Zero UE4SS build.
export const UE4SS_REQUIREMENT_MOD_ID = '128413'
export const MODS_FILE = 'mods.txt'
// The packaged list is stored beside the live one instead of replacing it, so a
// player's existing CheatManager/console entries survive a UE4SS install.
export const MODS_FILE_BACKUP = 'mods.txt.original'
export const ENABLED_FILE = 'enabled.txt'

export const LUA_EXTENSIONS = ['.lua']
export const DLL_EXTENSIONS = ['.dll']
// UE user-config names. These belong in %LOCALAPPDATA% and are deliberately not
// routed to the game folder, so a bare ini with one of these names stays with the
// root/game-relative route instead of being mistaken for a ReShade preset.
export const UE_CONFIG_INI_NAMES = [
  'engine.ini',
  'game.ini',
  'gameusersettings.ini',
  'input.ini',
  'scalability.ini',
]
// Project-relative trees a content mod may ship.
export const CONTENT_ROOT_DIRECTORIES = ['Content', 'Config', 'Binaries']

export const MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`
export const MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`
export const MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`
export const MOD_TYPE_UE4SS_FOLDER = `${GAME_ID}-ue4ss-mod-folder`
export const MOD_TYPE_COMBO = `${GAME_ID}-combo`
export const MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`
export const MOD_TYPE_PAK = `${GAME_ID}-pak`
export const MOD_TYPE_PAK_ALT = `${GAME_ID}-pak-alt`
export const MOD_TYPE_BINARIES = `${GAME_ID}-binaries`
export const MOD_TYPE_CONTENT = `${GAME_ID}-content`
export const MOD_TYPE_ROOT = `${GAME_ID}-root`

export const MOD_TYPE_PRIORITY = {
  ue4ss: 200,
  combo: 190,
  logic: 185,
  script: 180,
  dll: 175,
  ue4ssFolder: 172,
  pak: 170,
  pakAlt: 168,
  content: 165,
  binaries: 160,
  root: 100,
} as const

// Lower installer priority is evaluated first.
export const INSTALLER_PRIORITY = {
  ue4ss: 1,
  combo: 10,
  logic: 11,
  script: 14,
  dll: 15,
  ue4ssFolder: 16,
  content: 17,
  pakAlt: 25,
  pak: 30,
  binaries: 35,
  root: 40,
} as const
