import type { IExtensionContext, LocalModFeature } from 'heybox-mod-api'
import {
  BINARIES_PATH,
  GAME_ID,
  LOGIC_MODS_PATH,
  MOD_TYPE_UE4SS,
  PAK_MODS_PATH,
  UE4SS_DLL,
  UE4SS_MODS_PATH,
  UE4SS_PROXY_DLLS,
  UE4SS_REQUIREMENT_MOD_ID,
} from './constants'

declare const require: any

export interface RequirementStatus {
  installed: boolean
  gamePath: string
  requirements: Array<Record<string, unknown>>
}

async function fileExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    const stat = await context.api.util.fs.stat(filePath)
    return Boolean(stat?.isFile)
  } catch {
    return false
  }
}

export async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
  return game?.gamePath
}

/**
 * The UE4SS build for Phantom Blade Zero ships as a regular Heybox mod
 * (mod id 128413) because the game's custom engine needs a patched runtime.
 */
export function getRequirementItems() {
  return [
    {
      key: 'phantom-blade-zero-ue4ss',
      name: 'UE4SS (Phantom Blade Zero build)',
      modId: UE4SS_REQUIREMENT_MOD_ID,
      mod_id: UE4SS_REQUIREMENT_MOD_ID,
      modType: MOD_TYPE_UE4SS,
      openModDetailDialog: false,
      requirement: 'enabled',
    },
  ]
}

/** Local mod list marker so the prerequisite is visible before it is installed. */
export function getLocalModFeatures(): LocalModFeature[] {
  return [
    {
      modId: Number(UE4SS_REQUIREMENT_MOD_ID),
      marked: true,
      mark: { type: 'prerequisite', label: '前置模组' },
    },
  ]
}

/**
 * Paths that must exist before UE4SS mods can load. Loaders are repacked with
 * either the dwmapi proxy or an xinput proxy, so every known proxy name counts;
 * the runtime may sit in `ue4ss/` or flat beside the game executable.
 */
export function getUe4ssPaths(context: IExtensionContext, gamePath: string) {
  const join = context.api.util.path.join
  const binaries = gamePath ? join(gamePath, ...BINARIES_PATH.split('/')) : ''
  return {
    binaries,
    proxies: gamePath
      ? UE4SS_PROXY_DLLS.map((proxy) => join(binaries, proxy))
      : [],
    runtime: gamePath
      ? [join(binaries, 'ue4ss', UE4SS_DLL), join(binaries, UE4SS_DLL)]
      : [],
  }
}

/** Folders a deploy needs before the first mod is enabled. */
export function getSetupDirectories(context: IExtensionContext, gamePath: string): string[] {
  if (!gamePath) return []
  const join = context.api.util.path.join
  return [PAK_MODS_PATH, LOGIC_MODS_PATH, UE4SS_MODS_PATH].map(
    (relative) => join(gamePath, ...relative.split('/')),
  )
}

/**
 * Vortex creates these folders on discovery because UE itself only writes them
 * on first launch. Without them a pak or Lua mod deployed before the first run
 * fails with "deployment target unknown".
 */
export async function ensureSetupDirectories(context: IExtensionContext, gamePath?: string): Promise<void> {
  const fs = require('fs')
  for (const directory of getSetupDirectories(context, String(gamePath || ''))) {
    try {
      await fs.promises.mkdir(directory, { recursive: true })
    } catch {
      // A read-only install still gets a clear deploy error later; do not fail setup.
    }
  }
}

export async function getRequirementStatus(
  context: IExtensionContext,
  gamePath?: string,
): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const paths = getUe4ssPaths(context, resolvedGamePath)
  const hasProxy = (await Promise.all(paths.proxies.map((file) => fileExists(context, file)))).some(Boolean)
  const hasRuntime = (await Promise.all(paths.runtime.map((file) => fileExists(context, file)))).some(Boolean)
  const requirements = hasProxy && hasRuntime ? [] : getRequirementItems()

  return {
    installed: requirements.length === 0,
    gamePath: resolvedGamePath,
    requirements,
  }
}

export async function getExtensionRequiredMods(context: IExtensionContext, gamePath?: string) {
  const status = await getRequirementStatus(context, gamePath)
  if (status.installed) return status
  return {
    ...status,
    code: 'EXTENSION_REQUIRED_MODS_MISSING',
    requirement: {
      code: 'EXTENSION_REQUIRED_MODS_MISSING',
      requirements: status.requirements,
    },
  }
}

export async function setupExtension(context: IExtensionContext, gamePath?: string) {
  const resolved = String(gamePath || await findGamePath(context) || '')
  await ensureSetupDirectories(context, resolved)
  return getExtensionRequiredMods(context, resolved)
}
