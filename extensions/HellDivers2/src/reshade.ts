import { RESHADE_ID } from './constants';
import {
  archiveDirname,
  archiveExtname,
  filterUnderRoot,
  getRootRelativeDestination,
} from './archive-utils';
import { hasFomodInstaller, isGameId, testerResult } from './game';

const INI_EXT = '.ini';

export function testReshade(files: string[], gameId: number | string) {
  const supported = isGameId(gameId)
    && !hasFomodInstaller(files)
    && files.some((file) => archiveExtname(file) === INI_EXT);
  return testerResult(supported);
}

export function installReshade(files: string[]) {
  const preset = files.find((file) => archiveExtname(file) === INI_EXT);
  if (!preset) return { instructions: [], modType: RESHADE_ID };

  const rootPath = archiveDirname(preset);
  const instructions = filterUnderRoot(files, rootPath).map((file) => ({
    type: 'copy',
    source: file,
    destination: getRootRelativeDestination(file, rootPath),
  }));
  return { instructions, modType: RESHADE_ID };
}
