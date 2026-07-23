import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_UE4SS,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_REQUIREMENT_MOD_ID,
  UE4SS_SOURCE_URL,
  WIN64_PATH,
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

function requirement(
  key: string,
  name: string,
  modType: string,
  modId: string,
  sourceUrl?: string,
): Record<string, unknown> {
  return {
    key,
    name,
    modType,
    ...(modId ? { modId, mod_id: modId } : {}),
    ...(sourceUrl ? { sourceUrl, url: sourceUrl } : {}),
    openModDetailDialog: false,
    requirement: 'enabled',
  }
}

export function getRequirementItems() {
  return [
    requirement(
      'stellar-blade-ue4ss',
      'UE4SS for Stellar Blade',
      MOD_TYPE_UE4SS,
      UE4SS_REQUIREMENT_MOD_ID,
      UE4SS_SOURCE_URL,
    ),
  ]
}

export async function getRequirementStatus(context: IExtensionContext, gamePath?: string): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const path = context.api.util.path
  const dwmapiPath = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH, UE4SS_DWMAPI) : ''
  const nestedUe4ssPath = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH, 'ue4ss', UE4SS_DLL) : ''

  const hasDwmapi = !!resolvedGamePath && await fileExists(context, dwmapiPath)
  const hasUe4ssDll = !!resolvedGamePath && await fileExists(context, nestedUe4ssPath)

  const items = getRequirementItems()
  const requirements = []
  if (!hasDwmapi || !hasUe4ssDll) requirements.push(items[0])

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
