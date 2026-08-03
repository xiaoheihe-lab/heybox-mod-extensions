import type { IExtensionContext } from 'heybox-mod-api'
import {
  EXECUTABLE,
  GAME_ID,
  GAME_NAME,
  NEXUS_DOMAIN,
  PATHS,
} from './constants'
import { prepareRedmodDirectories } from './redmodDeployment'
import { createRedmodSteamPrerequisite, getRedmodStatus } from './requirements/redmod'

export { getRedmodStatus } from './requirements/redmod'

export async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath
}

async function setup(context: IExtensionContext, gamePath: string): Promise<void> {
  await prepareRedmodDirectories(gamePath)
}

export function registerCyberpunkGame(context: IExtensionContext): void {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    steamPrerequisites: [createRedmodSteamPrerequisite(context)],
    setup: async (discovery: any) => setup(context, String(discovery?.path || discovery?.gamePath || '')),
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: NEXUS_DOMAIN,
      customOpenModsPath: PATHS.archive,
      supportsSymlinks: false,
      mergeMods: true,
    },
  })

  context.registerExtensionAction(GAME_ID, 'getRedmodStatus', (gamePath) => getRedmodStatus(context, String(gamePath || '')))
}
