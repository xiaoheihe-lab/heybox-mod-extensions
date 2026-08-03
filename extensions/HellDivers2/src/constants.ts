export const STEAM_APP_ID = 553850;
export const GAME_ID = STEAM_APP_ID;
export const GAME_NAME = 'Helldivers 2';
export const EXECUTABLE = 'bin/helldivers2.exe';

export const DATA_ID = 'helldivers2-data';
export const DATA_NAME = 'Game Data (.dl_bin)';
export const DATA_PATH = 'data/game';
export const DATA_EXT = '.dl_bin';

export const STREAM_ID = 'helldivers2-stream';
export const STREAM_NAME = 'Data Stream File (.stream)';
export const STREAM_PATH = 'data';
export const STREAM_EXT = '.stream';

export const BINARIES_ID = 'helldivers2-binaries';
export const BINARIES_NAME = 'Binaries (Engine Injector)';
export const BINARIES_PATH = 'bin';

export const RESHADE_ID = 'helldivers2-reshade';
export const RESHADE_NAME = 'ReShade Preset';

export const PATCH_ID = 'helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE';
export const PATCH_NAME = 'Data Patch (.patch0)';
export const PATCH_PATH = 'data';
export const PATCH_TOKEN_RE = /patch_(\d+)/i;
export const PATCH_FILE_RE = /\.patch_(\d+)$/i;
export const PATCH_FILES = [
  '9ba626afa44a3aa3.patch_0',
  '9ba626afa44a3aa3.patch_0.gpu_resources',
  '9ba626afa44a3aa3.patch_0.stream',
];
export const PATCH_FILE_STEMS = ['9ba626afa44a3aa3'];
export const PATCH_EXTS = ['.gpu_resources', '.stream'];
export const PATCH_METADATA_KEY = 'helldivers2PatchDeployments';

export const SOUND_PATCH_ID = 'helldivers2-soundpatch';
export const SOUND_PATCH_NAME = 'Data Sound Patch (.patch0)';
export const SOUND_PATCH_EXTS = ['.stream'];

export const INSTALL_CANCELLED_MESSAGE = '已取消安装';
