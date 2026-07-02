import {
  DATA_EXT,
  DATA_ID,
  STREAM_EXT,
  STREAM_ID,
} from './constants';
import {
  archiveDirname,
  archiveExtname,
  filterUnderRoot,
  getRootRelativeDestination,
  isDirectoryEntry,
} from './archive-utils';
import { hasFomodInstaller, isGameId, testerResult } from './game';

export function testDlbin(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === DATA_EXT);
  return testerResult(supported);
}

export function installDlbin(files: string[]) {
  const modFile = files.find((file) => archiveExtname(file) === DATA_EXT);
  if (!modFile) return { instructions: [], modType: DATA_ID };

  const rootPath = archiveDirname(modFile);
  const instructions = filterUnderRoot(files, rootPath).map((file) => ({
    type: 'copy',
    source: file,
    destination: getRootRelativeDestination(file, rootPath),
  }));
  return { instructions, modType: DATA_ID };
}

export function testStream(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === STREAM_EXT);
  return testerResult(supported);
}

export function installStream(files: string[]) {
  const modFile = files.find((file) => archiveExtname(file) === STREAM_EXT);
  if (!modFile) return { instructions: [], modType: STREAM_ID };

  const rootPath = archiveDirname(modFile);
  const instructions = files
    .filter((file) => !isDirectoryEntry(file))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: getRootRelativeDestination(file, rootPath),
    }));
  return { instructions, modType: STREAM_ID };
}
