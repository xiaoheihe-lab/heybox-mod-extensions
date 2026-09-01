import { GAME_FOLDER, MOD_TYPE_ROOT } from '../constants'
import {
  isArchiveFile,
  isUnderSegments,
  removeLeadingSegments,
  splitArchivePath,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

export function findGameRootAnchor(files: string[]): string[] | null {
  for (const file of files) {
    const parts = splitArchivePath(file)
    const rootIndex = parts.findIndex((part) => part.toLowerCase() === GAME_FOLDER.toLowerCase())
    if (rootIndex < 0) continue

    const anchor = parts.slice(0, rootIndex + 1)
    const hasPayload = files.some((candidate) => (
      isArchiveFile(candidate, files)
      && splitArchivePath(candidate).length > anchor.length
      && isUnderSegments(candidate, anchor)
    ))
    if (hasPayload) return anchor
  }
  return null
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
