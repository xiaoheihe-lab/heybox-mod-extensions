import type { IExtensionContext } from 'heybox-mod-api'
import {
  EXECUTABLE,
  GAME_ID,
  GAME_NAME,
  PAK_MODS_PATH,
  STEAM_APP_ID,
} from './constants'
import { registerPhantomBladeZeroModTypes } from './modTypes'
import { findGamePath, getLocalModFeatures, setupExtension } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: 'PBZ',
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, 'ProjectPBZ/Content/Paks'],
    setup: async (discovery: any) => setupExtension(context, String(discovery?.path || '')),
    localModFeatures: getLocalModFeatures(),
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: 'phantombladezero',
      customOpenModsPath: PAK_MODS_PATH,
      // IoStore containers (.utoc/.ucas) are memory-mapped and read back 0 bytes
      // through a symlink, which crashes the UE5 Zen loader at startup.
      supportsSymlinks: false,
      // Per-install/per-mod bookkeeping files that must never raise a conflict
      // prompt when several UE4SS mods are enabled together.
      ignoreConflicts: ['UE4SS-settings.ini', 'mods.txt.original', 'enabled.txt'],
    },
  })

  registerPhantomBladeZeroModTypes(context)

  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => setupExtension(context))

  return true
}

export default main
