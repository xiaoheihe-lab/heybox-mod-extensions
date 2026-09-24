export const GAME_ID = 2277560
export const GAME_NAME = 'WUCHANG: Fallen Feathers'
export const GAME_FOLDER = 'Project_Plague'
export const EXECUTABLE = 'Project_Plague.exe'
export const PAK_PATH = `${GAME_FOLDER}/Content/Paks/~mods`
export const LOGIC_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`
export const PAK_ATTRIBUTE = 'wuchangPakFiles'
export const LOAD_ORDER_ID = 'wuchang-pak'
// Heybox mod ID for the Wuchang UE4SS prerequisite.
export const UE4SS_REQUIREMENT_MOD_ID = '123673'
export const typeId = (kind: string) => `${GAME_ID}-${kind}`
export type StoreLayout = 'Win64' | 'WinGDK'
export const binariesPath = (layout: StoreLayout) => `${GAME_FOLDER}/Binaries/${layout}`
export const scriptsPath = (layout: StoreLayout) => `${binariesPath(layout)}/ue4ss/Mods`
