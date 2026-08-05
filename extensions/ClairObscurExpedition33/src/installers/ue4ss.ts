import {
  MOD_TYPE_UE4SS,
  UE4SS_DWMAPI,
  WIN64_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveJoin,
  isArchiveFile,
  removeLeadingSegments,
  splitArchivePath,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

interface Ue4ssAnchor {
  rootSegments: string[]
}

export function findUe4ssAnchor(files: string[]): Ue4ssAnchor | null {
  const anchorFile = files.find((file) => (
    isArchiveFile(file, files) && archiveBaseName(file).toLowerCase() === UE4SS_DWMAPI
  ))
  return anchorFile ? { rootSegments: splitArchivePath(anchorFile).slice(0, -1) } : null
}

export function testUe4ss(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && findUe4ssAnchor(files) !== null)
}

export function installUe4ss(files: string[]) {
  const anchor = findUe4ssAnchor(files)
  const instructions = anchor ? files
    .filter((file) => isArchiveFile(file, files))
    .filter((file) => splitArchivePath(anchor.rootSegments.join('/')).every((segment, index) => (
      splitArchivePath(file)[index]?.toLowerCase() === segment.toLowerCase()
    )))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, anchor.rootSegments.length)),
    })) : []
  return { instructions, modType: MOD_TYPE_UE4SS }
}
