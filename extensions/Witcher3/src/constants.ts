export const GAME_ID = 292030
export const STORE_IDS = [292030, 499450]
export const GAME_NAME = 'The Witcher 3: Wild Hunt'
export const EXECUTABLES = [
  'bin/x64/witcher3.exe',
  'bin/x64_DX12/witcher3.exe',
] as const

export const ROOT_MOD_TYPE = `${GAME_ID}-root`
export const MODS_MOD_TYPE = `${GAME_ID}-mods`
export const CONTENT_MOD_TYPE = `${GAME_ID}-content`
export const DLC_MOD_TYPE = `${GAME_ID}-dlc`
export const MENU_MOD_TYPE = `${GAME_ID}-menu`
export const MIXED_MOD_TYPE = `${GAME_ID}-mixed`
export const SCRIPT_MERGER_MOD_TYPE = `${GAME_ID}-script-merger`
export const SCRIPT_MERGER_FILENAME = 'WitcherScriptMerger.exe'
export const SCRIPT_MERGER_DIRECTORY = 'WitcherScriptMerger'
// Fill in the published Heybox mod ID before enabling prerequisite downloads.
export const SCRIPT_MERGER_REQUIREMENT_MOD_ID: string | undefined = undefined
