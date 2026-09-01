import { CSHARP_MODS_PATH, MOD_TYPE_CSHARP } from '../constants'
import {
  archiveJoin,
  isArchiveFile,
  isUnderSegments,
  removeLeadingSegments,
  splitArchivePath,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

function findCSharpModsAnchor(files: string[]): string[] | null {
  for (const file of files) {
    const parts = splitArchivePath(file)
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (parts[index]?.toLowerCase() !== 'csharploader' || parts[index + 1]?.toLowerCase() !== 'mods') continue
      const anchor = parts.slice(0, index + 2)
      const hasPayload = files.some((candidate) => (
        isArchiveFile(candidate, files)
        && splitArchivePath(candidate).length > anchor.length
        && isUnderSegments(candidate, anchor)
      ))
      if (hasPayload) return anchor
    }
  }
  return null
}

export function testCSharpMod(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId)
    && !isFomodPackage(files)
    && findCSharpModsAnchor(files) !== null)
}

export function installCSharpMod(files: string[]) {
  const anchor = findCSharpModsAnchor(files)
  const instructions = anchor ? files
    .filter((file) => (
      isArchiveFile(file, files)
      && splitArchivePath(file).length > anchor.length
      && isUnderSegments(file, anchor)
    ))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(CSHARP_MODS_PATH, removeLeadingSegments(file, anchor.length)),
    })) : []
  return { instructions, modType: MOD_TYPE_CSHARP }
}
