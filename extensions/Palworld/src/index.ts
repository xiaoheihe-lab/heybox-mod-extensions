import type { IExtensionContext } from 'heybox-mod-api'
import { EXECUTABLE, GAME_ID, GAME_NAME, STEAM_APP_ID } from './constants'
import { registerLuaModsFileHooks } from './luaModsFile'
import { registerPalworldModTypes } from './modTypes'
import { findGamePath, getExtensionRequiredMods } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || '')),
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: 'palworld',
      customOpenModsPath: 'Pal/Content/Paks/~mods',
      supportsSymlinks: true,
    },
  })

  registerPalworldModTypes(context)
  registerLuaModsFileHooks(context)

  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))

  return true
}

export default main
