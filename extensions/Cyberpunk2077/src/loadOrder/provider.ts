import path from 'path'
import type { LoadOrderContext, LoadOrderEntry, LoadOrderModSnapshot } from './protocol'
import type { RedmodMetadata } from '../redmod/metadata'

export const REDMOD_LOAD_ORDER_PROVIDER_ID = 'redmod'

export interface RedmodLoadOrderData extends RedmodMetadata {
  sourceModKey: string
}

export function isRedmodLoadOrderModRelevant(mod: LoadOrderModSnapshot): boolean {
  return Array.isArray(mod.metaInfo?.cyberpunkRedmodInfo) && mod.metaInfo.cyberpunkRedmodInfo.length > 0
}

function normalizeRelativePath(value: unknown): string {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

export function createRedmodEntryId(modKey: string, relativePath: string): string {
  return `${modKey}:${normalizeRelativePath(relativePath).toLowerCase()}`
}

function getRedmodMetadata(context: LoadOrderContext): LoadOrderEntry[] {
  const entries: LoadOrderEntry[] = []
  const seen = new Set<string>()
  for (const mod of context.mods) {
    const values = mod.metaInfo?.cyberpunkRedmodInfo
    if (!Array.isArray(values)) continue
    for (const value of values) {
      if (!value || typeof value !== 'object') continue
      const raw = value as Partial<RedmodMetadata>
      const name = String(raw.name || '').trim()
      const version = String(raw.version || '').trim()
      const relativePath = normalizeRelativePath(raw.relativePath)
      if (!name || !version || !/^mods\/[^/]+$/i.test(relativePath)) continue
      const id = createRedmodEntryId(mod.modKey, relativePath)
      if (seen.has(id)) continue
      seen.add(id)
      const sourceName = String(mod.metaInfo?.name || mod.metaInfo?.title || mod.modKey)
      entries.push({
        id,
        ownerModKey: mod.modKey,
        name: `${name} ${version}（来自 ${sourceName}）`,
        enabled: mod.enabled,
        data: { name, version, relativePath, sourceModKey: mod.modKey } satisfies RedmodLoadOrderData,
      })
    }
  }
  return entries
}

export function deserializeRedmodLoadOrder(context: LoadOrderContext): LoadOrderEntry[] {
  const entries = getRedmodMetadata(context)
  const savedIndex = new Map(context.savedOrder.map((id, index) => [id, index]))
  const newIndex = context.savedOrder.length
  return entries.sort((left, right) => {
    const leftIndex = savedIndex.get(left.id) ?? newIndex
    const rightIndex = savedIndex.get(right.id) ?? newIndex
    if (leftIndex !== rightIndex) return leftIndex - rightIndex
    const leftPath = path.basename(String((left.data as unknown as RedmodLoadOrderData).relativePath || ''))
    const rightPath = path.basename(String((right.data as unknown as RedmodLoadOrderData).relativePath || ''))
    const pathOrder = leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0
    return pathOrder || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  })
}

export function getEnabledRedmodNames(entries: LoadOrderEntry[]): string[] {
  return entries
    .filter((entry) => entry.enabled)
    .map((entry) => path.basename(String((entry.data as unknown as RedmodLoadOrderData | undefined)?.relativePath || '')))
    .filter(Boolean)
}
