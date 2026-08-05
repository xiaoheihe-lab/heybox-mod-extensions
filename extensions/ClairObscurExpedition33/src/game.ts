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

export async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
  return game?.gamePath
}

export function registerGame(context: IExtensionContext, setup?: (discovery: unknown) => Promise<unknown>): void {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, GAME_FOLDER],
    ...(setup ? { setup } : {}),
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
}
