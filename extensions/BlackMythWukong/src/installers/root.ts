import { GAME_FOLDER, MOD_TYPE_ROOT } from '../constants'
import {
  findExplicitDirectory,
  isArchiveFile,
  isUnderSegments,
  removeLeadingSegments,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

export function findGameRootAnchor(files: string[]): string[] | null {
  return findExplicitDirectory(files, GAME_FOLDER)
}

export function testRoot(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && findGameRootAnchor(files) !== null)
}

export function installRoot(files: string[]) {
  const anchor = findGameRootAnchor(files)
  const instructions = anchor ? files
    .filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: removeLeadingSegments(file, Math.max(0, anchor.length - 1)),
    })) : []
  return { instructions, modType: MOD_TYPE_ROOT }
}
