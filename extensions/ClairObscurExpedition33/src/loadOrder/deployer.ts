import type { IExtensionContext } from 'heybox-mod-api'
import { MOD_TYPE_FOMOD, MOD_TYPE_PAK, PAK_MODS_PATH } from '../constants'
import { archiveBaseName, archiveJoin, normalizeArchivePath } from '../utils/archivePaths'
import type {
  LoadOrderContext,
  LoadOrderEntry,
  ManagedDeploymentMutation,
} from './protocol'

const PREFIX_CAPACITY = 26 * 26 * 26

export function makeLoadOrderPrefix(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= PREFIX_CAPACITY) {
    throw new Error(`Pak Load Order exceeds three-letter prefix capacity: ${index}`)
  }
  const first = Math.floor(index / (26 * 26))
  const second = Math.floor(index / 26) % 26
  const third = index % 26
  return [first, second, third].map((value) => String.fromCharCode(65 + value)).join('')
}

function safeFolderId(modKey: string): string {
  const normalized = String(modKey || '').replace(/[^0-9A-Za-z._-]+/g, '_').replace(/^_+|_+$/g, '')
  if (!normalized) throw new Error('Pak Load Order entry has no valid modKey')
  return normalized
}

function isPakDeploymentPath(targetPath: string): boolean {
  const normalized = normalizeArchivePath(targetPath).toLowerCase()
  const root = normalizeArchivePath(PAK_MODS_PATH).toLowerCase()
  return normalized === root || normalized.startsWith(`${root}/`)
}

export function planPakLoadOrderMutation(
  mutation: ManagedDeploymentMutation,
  entries: LoadOrderEntry[],
): number {
  const orderIndex = new Map(entries.map((entry, index) => [entry.ownerModKey, index]))
  let planned = 0
  for (const deployment of Array.isArray(mutation.entries) ? mutation.entries : []) {
    const index = orderIndex.get(deployment.modKey)
    if (index === undefined || !isPakDeploymentPath(deployment.targetPath)) continue
    if (deployment.exists === false) {
      mutation.warn('Pak Load Order skipped a missing VFS deployment file', {
        modKey: deployment.modKey,
        targetPath: deployment.targetPath,
      })
      continue
    }
    const destination = archiveJoin(
      PAK_MODS_PATH,
      `${makeLoadOrderPrefix(index)}-${safeFolderId(deployment.modKey)}`,
      archiveBaseName(deployment.targetPath),
    )
    if (normalizeArchivePath(destination).toLowerCase() === normalizeArchivePath(deployment.targetPath).toLowerCase()) continue
    mutation.moveDeployment({
      modKey: deployment.modKey,
      from: deployment.targetPath,
      to: destination,
      expectedHash: deployment.expectedHash,
    })
    planned += 1
  }
  return planned
}

export async function serializePakLoadOrder(
  context: IExtensionContext,
  entries: LoadOrderEntry[],
  _loadOrderContext: LoadOrderContext,
): Promise<void> {
  for (const modType of [MOD_TYPE_PAK, MOD_TYPE_FOMOD]) {
    const result = await context.api.vfs.runManagedDeploymentMutation(
      { modType },
      (mutation: ManagedDeploymentMutation) => planPakLoadOrderMutation(mutation, entries),
    ) as { ok?: boolean, warnings?: Array<{ message?: string }> } | undefined
    if (result?.ok === false) {
      const message = result.warnings?.map((warning) => String(warning?.message || '')).filter(Boolean).join('; ')
      throw new Error(message || 'Pak Load Order deployment failed')
    }
  }
}
