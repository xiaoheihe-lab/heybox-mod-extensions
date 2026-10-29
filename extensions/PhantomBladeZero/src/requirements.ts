import type { IExtensionContext, LocalModFeature } from 'heybox-mod-api'
import {
  BINARIES_PATH,
  GAME_ID,
  MOD_TYPE_UE4SS,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_REQUIREMENT_MOD_ID,
} from './constants'

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

/** Both halves of the proxy install must be present before UE4SS mods can load. */
export function getUe4ssPaths(context: IExtensionContext, gamePath: string) {
  const path = context.api.util.path
  return {
    dwmapi: gamePath ? path.join(gamePath, BINARIES_PATH, UE4SS_DWMAPI) : '',
    dll: gamePath ? path.join(gamePath, BINARIES_PATH, 'ue4ss', UE4SS_DLL) : '',
  }
}

export async function getRequirementStatus(
  context: IExtensionContext,
  gamePath?: string,
): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const paths = getUe4ssPaths(context, resolvedGamePath)
  const hasDwmapi = Boolean(resolvedGamePath) && await fileExists(context, paths.dwmapi)
  const hasUe4ssDll = Boolean(resolvedGamePath) && await fileExists(context, paths.dll)
  const requirements = hasDwmapi && hasUe4ssDll ? [] : getRequirementItems()

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
