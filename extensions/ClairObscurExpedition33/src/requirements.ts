import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_UE4SS,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_REQUIREMENT_MOD_ID,
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

export function getRequirementItems(): Array<Record<string, unknown>> {
  return [{
    key: 'clair-obscur-expedition-33-ue4ss',
    name: 'UE4SS for Clair Obscur: Expedition 33',
    modType: MOD_TYPE_UE4SS,
    modId: UE4SS_REQUIREMENT_MOD_ID,
    mod_id: UE4SS_REQUIREMENT_MOD_ID,
    openModDetailDialog: false,
    requirement: 'enabled',
  }]
}

export async function getRequirementStatus(context: IExtensionContext, gamePath?: string): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const path = context.api.util.path
  const win64Path = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH) : ''
  const hasUe4ss = Boolean(win64Path)
    && await fileExists(context, path.join(win64Path, UE4SS_DWMAPI))
    && await fileExists(context, path.join(win64Path, 'ue4ss', UE4SS_DLL))

  const requirements = hasUe4ss ? [] : getRequirementItems()
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
