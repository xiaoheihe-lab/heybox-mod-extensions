import type { IExtensionContext } from 'heybox-mod-api'
import { EXECUTABLE, GAME_ID, GAME_NAME, PAK_MODS_PATH, STEAM_APP_ID } from './constants'
import { registerStellarBladeModTypes } from './modTypes'
import { findGamePath, getExtensionRequiredMods } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, 'SB'],
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || '')),
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      epicAppId: '4013d48a20c1403282fc9d1453ec8f5a',
      nexusGameDomainName: 'stellarblade',
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: false,
    },
  })

  registerStellarBladeModTypes(context)
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))

  return true
}

export default main
