import type { IExtensionContext } from 'heybox-mod-api'
import {
  EXECUTABLE,
  GAME_FOLDER,
  GAME_ID,
  GAME_NAME,
  GAME_SHORT_NAME,
  NEXUS_GAME_DOMAIN,
  PAK_MODS_PATH,
  STEAM_APP_ID,
} from './constants'
import { registerPakLoadOrder } from './loadOrder'
import { registerBlackMythWukongModTypes } from './modTypes'
import { findGamePath, getExtensionRequiredMods } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, GAME_FOLDER],
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || '')),
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: NEXUS_GAME_DOMAIN,
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: false,
    },
  })

  registerBlackMythWukongModTypes(context)
  registerPakLoadOrder(context)
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))

  return true
}

export default main
