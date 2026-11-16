import fs from 'fs/promises'
import path from 'path'
import type { IExtensionContext } from 'heybox-mod-api'
import { MOD_TYPE, PATHS } from './constants'

const FRAMEWORK_DIRECTORIES: Record<string, string> = {
  [MOD_TYPE.coreAudioware]: PATHS.audioware,
  [MOD_TYPE.coreTweakXL]: PATHS.tweakXL,
  [MOD_TYPE.coreInputLoader]: PATHS.xmlInput,
}

export async function prepareDeploymentDirectories(payload: Record<string, unknown>): Promise<void> {
  const gamePath = String(payload.gamePath || '')
  if (!gamePath) return
  const frameworkDirectory = FRAMEWORK_DIRECTORIES[String(payload.modType || '')]
  const mod = payload.mod as { metaInfo?: Record<string, unknown> } | undefined
  const declared = mod?.metaInfo?.cyberpunkRedmodEmptySoundDirs
  const sounds = Array.isArray(declared) ? declared.filter((value): value is string => {
    if (typeof value !== 'string') return false
    const match = value.match(/^mods\/([^/\\:]+)\/customSounds$/)
    return Boolean(match && !/[. ]$/.test(match[1]))
  }) : []
  // Shared input directories intentionally persist, like the game's setup directories.
  // Only actual empty directories are created; no placeholder files enter VFS.
  await Promise.all([...sounds, ...(frameworkDirectory ? [frameworkDirectory] : [])]
    .map((relative) => fs.mkdir(path.join(gamePath, relative), { recursive: true })))
}

export function registerDeploymentDirectories(context: IExtensionContext): void {
  context.registerManagedDeploymentHook('afterEnable', {}, prepareDeploymentDirectories)
}
