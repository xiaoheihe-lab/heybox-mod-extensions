import {
  MOD_TYPE_DLL,
  MOD_TYPE_SCRIPT,
  UE4SS_MODS_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveExtName,
  archiveJoin,
  fallbackFolderId,
  findExplicitDirectory,
  isArchiveFile,
  isUnderSegments,
  removeLeadingSegments,
} from '../utils/archivePaths'
import { type Instruction, isFomodPackage, isTargetGame, testResult } from './common'

interface Ue4ssModAnchor {
  markerSegments: string[]
  rootSegments: string[]
}

function findUe4ssModAnchor(files: string[], marker: string, extension: string): Ue4ssModAnchor | null {
  const markerSegments = findExplicitDirectory(files, marker)
  if (!markerSegments) return null
  const hasPayload = files.some((file) => (
    isArchiveFile(file, files)
    && archiveExtName(file) === extension
    && isUnderSegments(file, markerSegments)
  ))
  return hasPayload ? { markerSegments, rootSegments: markerSegments.slice(0, -1) } : null
}

export function testScript(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId)
    && !isFomodPackage(files)
    && findUe4ssModAnchor(files, 'Scripts', '.lua') !== null)
}

export function testDll(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId)
    && !isFomodPackage(files)
    && findUe4ssModAnchor(files, 'dlls', '.dll') !== null)
}

function installUe4ssMod(
  files: string[],
  stagingPath: string | undefined,
  marker: string,
  extension: string,
  modType: string,
) {
  const anchor = findUe4ssModAnchor(files, marker, extension)
  if (!anchor) return { instructions: [], modType }

  const folderId = anchor.rootSegments[anchor.rootSegments.length - 1] || fallbackFolderId(stagingPath)
  const instructions: Instruction[] = []
  let hasEnabledFile = false
  for (const file of files) {
    if (!isArchiveFile(file, files) || !isUnderSegments(file, anchor.rootSegments)) continue
    const relative = removeLeadingSegments(file, anchor.rootSegments.length)
    if (archiveBaseName(relative).toLowerCase() === 'enabled.txt') hasEnabledFile = true
    instructions.push({
      type: 'copy',
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, relative),
    })
  }
  if (!hasEnabledFile) {
    instructions.push({
      type: 'generatefile',
      data: '',
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, 'enabled.txt'),
    })
  }
  return { instructions, modType }
}

export function installScript(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, 'Scripts', '.lua', MOD_TYPE_SCRIPT)
}

export function installDll(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, 'dlls', '.dll', MOD_TYPE_DLL)
}
