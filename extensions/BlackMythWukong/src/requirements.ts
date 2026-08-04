import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_SIGNATURE_BYPASS,
  MOD_TYPE_UE4SS,
  SIGNATURE_BYPASS_DLL,
  SIGNATURE_BYPASS_REQUIREMENT_MOD_ID,
  SIGNATURE_BYPASS_SCRIPT,
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

async function directoryExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    const stat = await context.api.util.fs.stat(filePath)
    return Boolean(stat?.isDirectory)
  } catch {
    return false
  }
}

async function findFileRecursively(
  context: IExtensionContext,
  rootPath: string,
  targetName: string,
  maxDepth = 8,
  maxEntries = 4096,
): Promise<boolean> {
  if (!await directoryExists(context, rootPath)) return false
  const path = context.api.util.path
  const target = targetName.toLowerCase()
  const queue: Array<{ path: string, depth: number }> = [{ path: rootPath, depth: 0 }]
  let visited = 0

  while (queue.length > 0 && visited < maxEntries) {
    const current = queue.shift()!
    let children: string[]
    try {
      children = await context.api.util.fs.readdir(current.path)
    } catch {
      continue
    }
    for (const child of children) {
      visited += 1
      if (visited > maxEntries) break
      const childPath = path.join(current.path, child)
      let stat
      try {
        stat = await context.api.util.fs.stat(childPath)
      } catch {
        continue
      }
      if (stat?.isFile && String(child).toLowerCase() === target) return true
      if (stat?.isDirectory && current.depth < maxDepth) queue.push({ path: childPath, depth: current.depth + 1 })
    }
  }
  return false
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
    requirement('black-myth-wukong-ue4ss', 'UE4SS for Black Myth: Wukong', UE4SS_REQUIREMENT_MOD_ID, MOD_TYPE_UE4SS),
    requirement(
      'black-myth-wukong-signature-bypass',
      'Signature Bypass',
      SIGNATURE_BYPASS_REQUIREMENT_MOD_ID,
      MOD_TYPE_SIGNATURE_BYPASS,
    ),
  ]
}

export async function getRequirementStatus(context: IExtensionContext, gamePath?: string): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const path = context.api.util.path
  const win64Path = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH) : ''
  const dwmapiPath = win64Path ? path.join(win64Path, UE4SS_DWMAPI) : ''
  const nestedUe4ssPath = win64Path ? path.join(win64Path, 'ue4ss', UE4SS_DLL) : ''
  const signatureDllPath = win64Path ? path.join(win64Path, SIGNATURE_BYPASS_DLL) : ''

  const hasUe4ss = Boolean(resolvedGamePath)
    && await fileExists(context, dwmapiPath)
    && await fileExists(context, nestedUe4ssPath)
  const hasSignatureBypass = Boolean(resolvedGamePath)
    && await fileExists(context, signatureDllPath)
    && await findFileRecursively(context, win64Path, SIGNATURE_BYPASS_SCRIPT)

  const items = getRequirementItems()
  const requirements: Array<Record<string, unknown>> = []
  if (!hasUe4ss) requirements.push(items[0])
  if (!hasSignatureBypass) requirements.push(items[1])

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
