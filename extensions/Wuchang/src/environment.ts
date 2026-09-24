import type { IExtensionContext } from 'heybox-mod-api'
import { binariesPath, GAME_ID, typeId, UE4SS_REQUIREMENT_MOD_ID, type StoreLayout } from './constants'

export async function exists(context: IExtensionContext, path: string): Promise<boolean> {
  try { return Boolean((await context.api.util.fs.stat(path))?.isFile) } catch { return false }
}
export async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath
}
export async function detectLayout(context: IExtensionContext, gamePath: string): Promise<StoreLayout> {
  return gamePath && await exists(context, context.api.util.path.join(gamePath, 'gamelaunchhelper.exe')) ? 'WinGDK' : 'Win64'
}
export async function getExtensionRequiredMods(context: IExtensionContext, gamePath?: string) {
  const resolved = gamePath || await findGamePath(context) || ''
  const layout = await detectLayout(context, resolved)
  const root = context.api.util.path.join(resolved, binariesPath(layout))
  const installed = Boolean(resolved)
    && await exists(context, context.api.util.path.join(root, 'dwmapi.dll'))
    && await exists(context, context.api.util.path.join(root, 'ue4ss', 'UE4SS.dll'))
  const requirements = installed ? [] : [{
    key: 'wuchang-ue4ss', name: 'UE4SS for WUCHANG: Fallen Feathers', modType: typeId('ue4ss'),
    modId: UE4SS_REQUIREMENT_MOD_ID, mod_id: UE4SS_REQUIREMENT_MOD_ID,
    requirement: 'enabled', openModDetailDialog: false,
    sourceUrl: 'https://github.com/UE4SS-RE/RE-UE4SS/releases',
    url: 'https://github.com/UE4SS-RE/RE-UE4SS/releases',
  }]
  return {
    installed, gamePath: resolved, requirements,
    ...(!installed ? { code: 'EXTENSION_REQUIRED_MODS_MISSING', requirement: { code: 'EXTENSION_REQUIRED_MODS_MISSING', requirements } } : {}),
  }
}
