import type { IExtensionContext } from 'heybox-mod-api'
import { BEPINEX_MOD_ID, GAME_ID, PAYLOAD_FILES, typeId } from './constants'

export async function findGamePath(context: IExtensionContext) {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath
}
export function getRequirementItems() {
  return [
    { kind: 'bepinex', name: 'BepInExPack Valheim', modId: BEPINEX_MOD_ID,
      url: 'https://thunderstore.io/c/valheim/p/denikson/BepInExPack_Valheim/' },
  ].map(({ kind, name, modId, url }) => ({
    key: `valheim-${kind}`, name, modType: typeId(kind), modId, mod_id: modId,
    sourceUrl: url, url, openModDetailDialog: false, requirement: 'enabled',
  }))
}
export async function getRequirementStatus(context: IExtensionContext, gamePath?: string) {
  const resolved = String(gamePath || await findGamePath(context) || '')
  const fs = context.api.util.fs
  const path = context.api.util.path
  async function exists(file: string) {
    if (!resolved) return false
    try { return Boolean((await fs.stat(path.join(resolved, file))).isFile) } catch { return false }
  }
  const payload = await Promise.all(PAYLOAD_FILES.map(exists))
  const requirements = payload.every(Boolean) ? [] : getRequirementItems()
  return { installed: requirements.length === 0, gamePath: resolved, requirements }
}
export async function getExtensionRequiredMods(context: IExtensionContext, gamePath?: string) {
  const status = await getRequirementStatus(context, gamePath)
  return status.installed ? status : {
    ...status, code: 'EXTENSION_REQUIRED_MODS_MISSING',
    requirement: { code: 'EXTENSION_REQUIRED_MODS_MISSING', requirements: status.requirements },
  }
}
