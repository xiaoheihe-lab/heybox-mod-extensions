import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UNREAL_PAK_TOOL,
  PAL_WIN64_PATH,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_MOD_ID,
  UNREAL_PAK_EXE,
  UNREAL_PAK_TOOL_MOD_ID,
  UNREAL_PAK_TOOL_PATH,
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

function requirement(key: string, name: string, modId: string, modType: string) {
  return {
    key,
    name,
    modId,
    mod_id: modId,
    modType,
    openModDetailDialog: false,
    requirement: 'enabled',
  }
}

export function getRequirementItems() {
  return [
    requirement('palworld-ue4ss', 'UE4SS', UE4SS_MOD_ID, MOD_TYPE_UE4SS),
    requirement('palworld-unreal-pak-tool', 'UnrealPakTool', UNREAL_PAK_TOOL_MOD_ID, MOD_TYPE_UNREAL_PAK_TOOL),
  ]
}

export async function getRequirementStatus(context: IExtensionContext, gamePath?: string): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const path = context.api.util.path
  const ue4ssDllPath = resolvedGamePath ? path.join(resolvedGamePath, PAL_WIN64_PATH, UE4SS_DLL) : ''
  const dwmapiPath = resolvedGamePath ? path.join(resolvedGamePath, PAL_WIN64_PATH, UE4SS_DWMAPI) : ''
  const unrealPakPath = resolvedGamePath ? path.join(resolvedGamePath, UNREAL_PAK_TOOL_PATH, UNREAL_PAK_EXE) : ''

  const hasUe4ss = !!resolvedGamePath && await fileExists(context, ue4ssDllPath) && await fileExists(context, dwmapiPath)
  const hasUnrealPakTool = !!resolvedGamePath && await fileExists(context, unrealPakPath)

  const requirements = []
  if (!hasUe4ss) requirements.push(getRequirementItems()[0])
  if (!hasUnrealPakTool) requirements.push(getRequirementItems()[1])

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
