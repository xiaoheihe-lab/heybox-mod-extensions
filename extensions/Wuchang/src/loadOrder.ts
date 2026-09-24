import type { IExtensionContext, LoadOrderContext, LoadOrderEntry, ManagedDeploymentMutation } from 'heybox-mod-api'
import { base, join, normalizePath, under } from './archive'
import { GAME_ID, LOAD_ORDER_ID, PAK_PATH, typeId } from './constants'

export function deserialize(context: LoadOrderContext): LoadOrderEntry[] {
  const indices = new Map(context.savedOrder.map((id, i) => [id, i]))
  return context.mods.filter(mod => mod.modType === typeId('pak')).map(mod => ({
    id: mod.modKey, ownerModKey: mod.modKey, name: String(mod.metaInfo?.name || mod.modKey), enabled: mod.enabled,
  })).sort((a, b) => (indices.get(a.id) ?? indices.size) - (indices.get(b.id) ?? indices.size) || a.id.localeCompare(b.id))
}
export function prefix(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 26 ** 3) throw new Error('Pak load order exceeds three-letter capacity')
  return [Math.floor(index / 676), Math.floor(index / 26) % 26, index % 26].map(n => String.fromCharCode(65 + n)).join('')
}
export function plan(mutation: ManagedDeploymentMutation, order: LoadOrderEntry[]) {
  const indices = new Map(order.map((e, i) => [e.ownerModKey, i]))
  for (const e of mutation.entries) {
    const index = indices.get(e.modKey)
    const source = normalizePath(e.targetPath)
    if (index === undefined || !under(source, PAK_PATH) || !/\.pak$/i.test(source)) continue
    if (e.exists === false) { mutation.warn('Pak file missing', { targetPath: e.targetPath }); continue }
    // Encode the key without collisions (unlike replacing all punctuation with underscores).
    const folder = `${prefix(index)}-${Array.from(e.modKey).map(c => c.codePointAt(0)!.toString(16)).join('-')}`
    const to = join(PAK_PATH, folder, base(source))
    if (to.toLowerCase() === source.toLowerCase()) continue
    mutation.moveDeployment({ modKey: e.modKey, from: e.targetPath, to, expectedHash: e.expectedHash })
  }
}
export function registerLoadOrder(context: IExtensionContext) {
  context.registerLoadOrder({
    id: LOAD_ORDER_ID, gameId: GAME_ID, title: 'Pak 加载顺序', modTypes: [typeId('pak')],
    usageInstructions: ['越靠后的 Pak 加载优先级越高。禁用的 Mod 保留排序位置。'],
    isModRelevant: mod => mod.modType === typeId('pak'), deserializeLoadOrder: deserialize,
    serializeLoadOrder: async order => {
      const result = await context.api.vfs.runManagedDeploymentMutation({ modType: typeId('pak') }, mutation => plan(mutation, order))
      if (!result.ok) throw new Error(result.warnings.map(w => w.message).join('; ') || 'Pak load order deployment failed')
    },
  })
  context.registerExtensionAction(GAME_ID, 'deployPakLoadOrder', () => context.api.loadOrder.deploy(LOAD_ORDER_ID))
}
