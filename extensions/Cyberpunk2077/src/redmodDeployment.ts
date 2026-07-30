import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import type { IExtensionContext } from 'heybox-mod-api'
import {
  MOD_TYPE,
  GAME_ID,
  REDMOD_DEPLOY_EXE,
  REDMOD_METADATA,
} from './constants'
import { notify } from './ui'

interface SnapshotEntry {
  modKey?: string
  metaInfo?: Record<string, unknown>
}

interface Snapshot {
  gamePath?: string
  entries?: SnapshotEntry[]
}

interface RedmodMetadata {
  name?: string
  version?: string
  relativePath?: string
}

const V2077_DIR = 'V2077'
const LOAD_ORDER_DIR = path.join(V2077_DIR, 'Load Order')
const MODLIST_PATH = path.join(V2077_DIR, 'modlist.txt')
const LOAD_ORDER_PATH = path.join(LOAD_ORDER_DIR, 'heybox-managed.json')

let deploymentQueue: Promise<void> = Promise.resolve()

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await fs.promises.stat(filePath)).isFile()
  } catch {
    return false
  }
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${Date.now()}.tmp`
  try {
    await fs.promises.writeFile(temporaryPath, data, 'utf8')
    await fs.promises.rename(temporaryPath, filePath)
  } catch (error) {
    try { await fs.promises.unlink(temporaryPath) } catch { /* best effort */ }
    throw error
  }
}

export function collectEnabledRedmods(entries: SnapshotEntry[]): RedmodMetadata[] {
  const seenMods = new Set<string>()
  const seenPaths = new Set<string>()
  const result: RedmodMetadata[] = []

  for (const entry of entries) {
    const modKey = String(entry.modKey || '')
    if (!modKey || seenMods.has(modKey)) continue
    seenMods.add(modKey)
    const values = entry.metaInfo?.cyberpunkRedmodInfo
    if (!Array.isArray(values)) continue
    for (const value of values) {
      if (!value || typeof value !== 'object') continue
      const metadata = value as RedmodMetadata
      const relativePath = String(metadata.relativePath || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
      if (!relativePath || seenPaths.has(relativePath.toLowerCase())) continue
      seenPaths.add(relativePath.toLowerCase())
      result.push({ ...metadata, relativePath })
    }
  }
  return result
}

function runRedmod(executable: string, gamePath: string, modlistPath: string): Promise<void> {
  const metadataPath = path.join(gamePath, REDMOD_METADATA)
  const args = [
    'deploy',
    '-force',
    `-root=${gamePath}`,
    `-rttiSchemaFile=${metadataPath}`,
    `-modlist=${modlistPath}`,
  ]

  return new Promise((resolve, reject) => {
    execFile(executable, args, { cwd: path.dirname(executable), windowsHide: true }, (error, _stdout, stderr) => {
      if (!error) {
        resolve()
        return
      }
      const details = String(stderr || '').trim()
      reject(new Error(details ? `${error.message}: ${details}` : error.message))
    })
  })
}

async function deployFromSnapshot(context: IExtensionContext, snapshot: Snapshot): Promise<void> {
  const gamePath = String(snapshot.gamePath || '')
  if (!gamePath) throw new Error('未找到 Cyberpunk 2077 游戏目录。')

  const executable = path.join(gamePath, REDMOD_DEPLOY_EXE)
  const metadata = path.join(gamePath, REDMOD_METADATA)
  if (!await fileExists(executable) || !await fileExists(metadata)) {
    notify(context, '无法自动部署 REDmod', 'Steam REDmod DLC 未安装或不完整；Mod 文件已部署，但尚未运行 redMod.exe。', 'error')
    return
  }

  const enabledRedmods = collectEnabledRedmods(Array.isArray(snapshot.entries) ? snapshot.entries : [])
  const modNames = enabledRedmods
    .map((item) => path.basename(String(item.relativePath || '')))
    .filter(Boolean)
  const modlistPath = path.join(gamePath, MODLIST_PATH)
  const loadOrderPath = path.join(gamePath, LOAD_ORDER_PATH)

  await atomicWrite(modlistPath, modNames.join('\r\n'))
  await atomicWrite(loadOrderPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), mods: enabledRedmods }, null, 2)}\n`)
  await runRedmod(executable, gamePath, modlistPath)

  notify(
    context,
    'REDmod 部署完成',
    enabledRedmods.length > 0
      ? `已按当前启用顺序部署 ${enabledRedmods.length} 个 REDmod。`
      : '当前没有启用的 REDmod，已刷新默认 REDmod 部署。',
    'success',
  )
}

export async function deployEnabledRedmods(context: IExtensionContext): Promise<void> {
  deploymentQueue = deploymentQueue.catch(() => undefined).then(async () => {
    await context.api.vfs.runManagedDeploymentMutation({}, async (snapshot) => {
      await deployFromSnapshot(context, snapshot as Snapshot)
    })
  })
  return deploymentQueue.catch((error) => {
    notify(context, 'REDmod 部署失败', String((error as Error)?.message || error), 'error')
    throw error
  })
}

export async function prepareRedmodDirectories(gamePath: string): Promise<void> {
  if (!gamePath) return
  await Promise.all([
    fs.promises.mkdir(path.join(gamePath, 'mods'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, 'r6/cache/modded'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, LOAD_ORDER_DIR), { recursive: true }),
  ])
}

export function registerRedmodDeployment(context: IExtensionContext): void {
  for (const modType of [MOD_TYPE.redmod, MOD_TYPE.multiTypeRedmod]) {
    for (const phase of ['afterEnable', 'afterDisable', 'afterUninstall'] as const) {
      context.registerManagedDeploymentHook(phase, { modType }, () => deployEnabledRedmods(context))
    }
  }
  context.registerExtensionAction(GAME_ID, 'deployRedmods', () => deployEnabledRedmods(context))
}
