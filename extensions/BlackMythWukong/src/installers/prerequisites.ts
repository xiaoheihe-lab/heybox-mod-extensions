import {
  MOD_TYPE_SIGNATURE_BYPASS,
  MOD_TYPE_UE4SS,
  SIGNATURE_BYPASS_DLL,
  SIGNATURE_BYPASS_SCRIPT,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  WIN64_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveJoin,
  isArchiveFile,
  isUnderSegments,
  removeLeadingSegments,
  splitArchivePath,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

interface AnchoredPackage {
  anchorFile: string
  rootSegments: string[]
}

function findArchiveFile(files: string[], name: string): string | undefined {
  const lower = name.toLowerCase()
  return files.find((file) => (
    archiveBaseName(file).toLowerCase() === lower
    && isArchiveFile(file, files)
  ))
}

function findAnchoredPackage(files: string[], anchorName: string, requiredName: string): AnchoredPackage | null {
  const anchorLower = anchorName.toLowerCase()
  const requiredLower = requiredName.toLowerCase()
  for (const anchorFile of files) {
    if (archiveBaseName(anchorFile).toLowerCase() !== anchorLower || !isArchiveFile(anchorFile, files)) continue
    const rootSegments = splitArchivePath(anchorFile).slice(0, -1)
    const hasRequiredFile = files.some((file) => (
      isArchiveFile(file, files)
      && archiveBaseName(file).toLowerCase() === requiredLower
      && isUnderSegments(file, rootSegments)
    ))
    if (hasRequiredFile) return { anchorFile, rootSegments }
  }
  return null
}

export function findUe4ssAnchor(files: string[]): AnchoredPackage | null {
  const anchorFile = findArchiveFile(files, UE4SS_DWMAPI)
  return anchorFile
    ? { anchorFile, rootSegments: splitArchivePath(anchorFile).slice(0, -1) }
    : null
}

export function findSignatureBypassAnchor(files: string[]): AnchoredPackage | null {
  return findAnchoredPackage(files, SIGNATURE_BYPASS_DLL, SIGNATURE_BYPASS_SCRIPT)
}

export function testUe4ss(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId)
    && !isFomodPackage(files)
    && findUe4ssAnchor(files) !== null
    && findArchiveFile(files, UE4SS_DLL) !== undefined)
}

export function testSignatureBypass(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && findSignatureBypassAnchor(files) !== null)
}

function installAnchoredPackage(files: string[], anchor: AnchoredPackage | null, modType: string) {
  const instructions = anchor ? files
    .filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor.rootSegments))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, anchor.rootSegments.length)),
    })) : []
  return { instructions, modType }
}

export function installUe4ss(files: string[]) {
  return installAnchoredPackage(files, findUe4ssAnchor(files), MOD_TYPE_UE4SS)
}

export function installSignatureBypass(files: string[]) {
  return installAnchoredPackage(files, findSignatureBypassAnchor(files), MOD_TYPE_SIGNATURE_BYPASS)
}
