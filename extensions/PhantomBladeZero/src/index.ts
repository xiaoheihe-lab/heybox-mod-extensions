import type { IExtensionContext } from 'heybox-mod-api'
import {
  EXECUTABLE,
  GAME_ID,
  GAME_NAME,
  PAK_MODS_PATH,
  STEAM_APP_ID,
} from './constants'
import { registerPhantomBladeZeroModTypes } from './modTypes'
import { findGamePath, getExtensionRequiredMods, getLocalModFeatures } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: 'PBZ',
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, 'ProjectPBZ/Content/Paks'],
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || '')),
    localModFeatures: getLocalModFeatures(),
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: 'phantombladezero',
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: true,
    },
  })

  registerPhantomBladeZeroModTypes(context)

  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))

  return true
}

export default main
