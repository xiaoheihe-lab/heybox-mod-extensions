import type { IExtensionContext } from 'heybox-mod-api';
import {
  DATA_ID,
  DATA_NAME,
  DATA_PATH,
  EXECUTABLE,
  GAME_ID,
  GAME_NAME,
  PATCH_FILES,
  PATCH_ID,
  PATCH_NAME,
  PATCH_PATH,
  SOUND_PATCH_ID,
  SOUND_PATCH_NAME,
  STEAM_APP_ID,
  STREAM_ID,
  STREAM_NAME,
  STREAM_PATH,
} from './src/constants';
import type { InstallOptions } from './src/types';
import { registerModType } from './src/game';
import { installDlbin, installStream, testDlbin, testStream } from './src/basic-installers';
import {
  installPatchMulti,
  installSoundPatchMulti,
  registerPatchNormalizeHooks,
  testPatch,
  testSoundPatch,
} from './src/patch';

async function main(context: IExtensionContext) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    modPath: '.',
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
      return game?.gamePath;
    },
    queryModPath: () => '.',
    requiresCleanup: true,
    environment: {
      SteamAPPId: String(STEAM_APP_ID),
    },
    details: {
      steamAppId: STEAM_APP_ID,
      ignoreConflicts: PATCH_FILES.map((file) => `**/${file}`),
    },
    setup: async () => {
      context.api.util.ui.notify({
        type: 'helldivers2_setup',
        display: 'toast',
        variant: 'warning',
        title: 'Special Instructions for Helldivers 2',
        content: 'Graphics patch mods are automatically renumbered by Heybox. Sound patch mods are not merged and may conflict like in Vortex.',
      });
    },
  });

  registerModType(context, PATCH_ID, 100, PATCH_PATH, PATCH_NAME);
  registerModType(context, SOUND_PATCH_ID, 90, PATCH_PATH, SOUND_PATCH_NAME);
  registerModType(context, DATA_ID, 80, DATA_PATH, DATA_NAME);
  registerModType(context, STREAM_ID, 70, STREAM_PATH, STREAM_NAME);

  context.registerInstaller(PATCH_ID, 27, testPatch, (files, stagingPath, options) => installPatchMulti(context, files, {
    ...(options as InstallOptions || {}),
    stagingPath: typeof stagingPath === 'string' ? stagingPath : '',
  }));
  context.registerInstaller(SOUND_PATCH_ID, 27, testSoundPatch, (files, stagingPath, options) => installSoundPatchMulti(context, files, {
    ...(options as InstallOptions || {}),
    stagingPath: typeof stagingPath === 'string' ? stagingPath : '',
  }));
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);

  registerPatchNormalizeHooks(context);
  return true;
}

export default main;
