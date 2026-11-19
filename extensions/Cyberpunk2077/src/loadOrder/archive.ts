import fs from 'fs/promises'
import path from 'path'
import type { IExtensionContext, LoadOrderContext, LoadOrderEntry, LoadOrderRegistration } from 'heybox-mod-api'
import { GAME_ID, MOD_TYPE, PATHS } from '../constants'
import { atomicWrite } from './deployer'

export const ARCHIVE_LOAD_ORDER_PROVIDER_ID = 'archive'

/** New archives enter beside their ASCII neighbour without undoing custom order. */
export function orderArchives(names: readonly string[], listed: readonly string[]): string[] {
  const byLower = new Map(names.map((name) => [name.toLowerCase(), name]))
  const ordered = [...new Set(listed.map((name) => byLower.get(name.toLowerCase())).filter((name): name is string => !!name))]
  for (const name of names.filter((name) => !ordered.includes(name)).sort()) {
    const before = ordered.filter((other) => other < name).sort().pop()
    const after = [...ordered].sort()[0]
    const index = before ? ordered.indexOf(before) + 1 : after ? ordered.indexOf(after) : 0
    ordered.splice(index, 0, name)
  }
  return ordered
}

async function diskArchives(gamePath: string): Promise<string[]> {
  try {
    return (await fs.readdir(path.join(gamePath, PATHS.archive), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.archive$/i.test(entry.name)).map((entry) => entry.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function deserializeArchiveLoadOrder(context: LoadOrderContext & { deploymentStatus?: string }): Promise<LoadOrderEntry[]> {
  const names = await diskArchives(context.gamePath)
  let listed: string[]
  try {
    listed = (await fs.readFile(path.join(context.gamePath, PATHS.archive, 'modlist.txt'), 'utf8'))
      .split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    listed = []
  }
  // Retain a failed desired save so deploy can be retried; otherwise disk is authoritative.
  const status = context.deploymentStatus
  if (status && status !== 'clean' && context.savedOrder.length) {
    listed = context.savedOrder.map((id) => id.replace(/^archive:/, ''))
  }
  const owners = new Map<string, string>()
  for (const mod of context.mods) {
    const paths = (mod as typeof mod & { deployedPaths?: string[] }).deployedPaths || []
    for (const target of paths) {
      const match = target.replace(/\\/g, '/').match(/^archive\/pc\/mod\/([^/]+\.archive)$/i)
      if (match) owners.set(match[1].toLowerCase(), mod.modKey)
    }
  }
  return orderArchives(names, listed).map((name) => {
    const ownerModKey = owners.get(name.toLowerCase()) || ''
    return { id: `archive:${name}`, ownerModKey, name, enabled: true, ...(!ownerModKey ? { external: true } : {}) }
  })
}

export async function serializeArchiveLoadOrder(entries: LoadOrderEntry[], context: LoadOrderContext): Promise<void> {
  const names = entries.map((entry) => entry.name)
  const onDisk = await diskArchives(context.gamePath)
  if (names.length !== onDisk.length || names.some((name) => !onDisk.includes(name))) {
    throw new Error('Archive 文件已变化，请刷新加载顺序后重试。')
  }
  const target = path.join(context.gamePath, PATHS.archive, 'modlist.txt')
  if (names.every((name, index) => index === 0 || names[index - 1] <= name)) {
    await fs.rm(target, { force: true })
  } else {
    await atomicWrite(target, names.join('\r\n'))
  }
}

export function registerArchiveLoadOrder(context: IExtensionContext): void {
  const registration: LoadOrderRegistration & { allowExternalEntries: boolean } = {
    id: ARCHIVE_LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: 'Archive 加载顺序',
    usageInstructions: [
      '仅列出 archive/pc/mod 下已部署的直接 .archive 文件，包括手动安装文件。',
      '越靠前优先级越高；Archive 优先于 REDmod。一般保持默认 ASCII 文件名顺序即可。',
      '恢复文件名顺序后会移除 modlist.txt；新文件及重新启用文件进入其字母邻位。',
    ],
    modTypes: Object.values(MOD_TYPE),
    allowExternalEntries: true,
    deserializeLoadOrder: deserializeArchiveLoadOrder,
    serializeLoadOrder: serializeArchiveLoadOrder,
  }
  context.registerLoadOrder(registration)
}
