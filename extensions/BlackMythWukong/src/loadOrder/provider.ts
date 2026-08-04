import { MOD_TYPE_FOMOD, MOD_TYPE_PAK, PAK_ATTRIBUTE } from '../constants'
import type { LoadOrderContext, LoadOrderEntry, LoadOrderModSnapshot } from './protocol'

function modDisplayName(mod: LoadOrderModSnapshot): string {
  const metaInfo = mod.metaInfo || {}
  const name = String(metaInfo.customFileName || metaInfo.logicalFileName || metaInfo.name || metaInfo.title || mod.modKey)
  const pakFiles = Array.isArray(metaInfo[PAK_ATTRIBUTE]) ? metaInfo[PAK_ATTRIBUTE] : []
  return pakFiles.length > 1 ? `${name}（${pakFiles.length} 个 Pak）` : name
}

export function isPakLoadOrderModRelevant(mod: LoadOrderModSnapshot): boolean {
  const modType = String(mod.modType || '')
  if (modType === MOD_TYPE_PAK) return true
  const pakFiles = mod.metaInfo && Array.isArray(mod.metaInfo[PAK_ATTRIBUTE])
    ? mod.metaInfo[PAK_ATTRIBUTE]
    : []
  return modType === MOD_TYPE_FOMOD && pakFiles.length > 0
}

export function deserializePakLoadOrder(context: LoadOrderContext): LoadOrderEntry[] {
  const entries = context.mods
    .filter(isPakLoadOrderModRelevant)
    .map((mod) => ({
      id: mod.modKey,
      ownerModKey: mod.modKey,
      name: modDisplayName(mod),
      enabled: mod.enabled,
      data: { modKey: mod.modKey },
    }))

  const savedIndex = new Map(context.savedOrder.map((id, index) => [id, index]))
  const appendIndex = context.savedOrder.length
  return entries.sort((left, right) => {
    const leftIndex = savedIndex.get(left.id) ?? appendIndex
    const rightIndex = savedIndex.get(right.id) ?? appendIndex
    if (leftIndex !== rightIndex) return leftIndex - rightIndex
    const nameOrder = left.name.localeCompare(right.name)
    return nameOrder || left.id.localeCompare(right.id)
  })
}
