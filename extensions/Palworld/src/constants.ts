export const GAME_ID = 1623730
export const GAME_NAME = 'Palworld'
export const EXECUTABLE = 'Palworld.exe'
export const STEAM_APP_ID = '1623730'

export const UE4SS_MOD_ID = '2782'
export const UNREAL_PAK_TOOL_MOD_ID = '2783'

export const PAL_WIN64_PATH = 'Pal/Binaries/Win64'
export const UE4SS_RUNTIME_PATH = `${PAL_WIN64_PATH}/ue4ss`
export const PAK_MODS_PATH = 'Pal/Content/Paks/~mods'
export const BLUEPRINT_PAK_MODS_PATH = 'Pal/Content/Paks/LogicMods'
export const UNREAL_PAK_TOOL_PATH = 'UnrealPakTool'

export const UE4SS_DLL = 'UE4SS.dll'
export const UE4SS_DWMAPI = 'dwmapi.dll'
export const UE4SS_SETTINGS = 'UE4SS-settings.ini'
export const MODS_FILE = 'mods.txt'
export const MODS_FILE_BACKUP = 'mods.txt.original'
export const UNREAL_PAK_EXE = 'UnrealPak.exe'

export const PAK_EXTENSIONS = ['.pak', '.utoc', '.ucas']
export const LUA_EXTENSIONS = ['.lua']
export const ROOT_DIRECTORIES = ['Engine', 'Pal', 'Resources']
export const IGNORE_CONFLICT_FILES = ['enabled.txt', 'ue4sslogicmod.info', '.ue4sslogicmod', '.logicmod']

export const MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`
export const MOD_TYPE_UNREAL_PAK_TOOL = `${GAME_ID}-unreal-pak-tool`
export const MOD_TYPE_ROOT = `${GAME_ID}-root`
export const MOD_TYPE_BLUEPRINT_PAK = `${GAME_ID}-blueprint-pak`
export const MOD_TYPE_PAK = `${GAME_ID}-pak`
export const MOD_TYPE_LUA_V2 = `${GAME_ID}-lua-v2`
export const MOD_TYPE_LUA = `${GAME_ID}-lua`

export const MOD_TYPE_PRIORITY = {
  ue4ss: 130,
  unrealPakTool: 120,
  blueprintPak: 110,
  luaV2: 100,
  pak: 90,
  lua: 80,
  root: 70,
}
