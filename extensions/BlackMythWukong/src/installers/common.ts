import { GAME_ID } from '../constants'
import { archiveBaseName, splitArchivePath } from '../utils/archivePaths'

export type Instruction = Record<string, unknown>

export function isTargetGame(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

export function isFomodPackage(files: string[]): boolean {
  return files.some((file) => {
    const parts = splitArchivePath(file)
    return archiveBaseName(file).toLowerCase() === 'moduleconfig.xml'
      && parts[parts.length - 2]?.toLowerCase() === 'fomod'
  })
}

export function testResult(supported: boolean) {
  return { supported, requiredFiles: [] }
}
