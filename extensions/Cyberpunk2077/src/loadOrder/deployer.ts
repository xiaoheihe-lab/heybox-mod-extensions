import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { REDMOD_DEPLOY_EXE, REDMOD_METADATA } from '../constants'
import type { LoadOrderContext, LoadOrderEntry } from 'heybox-mod-api'
import { getEnabledRedmodNames, REDMOD_LOAD_ORDER_PROVIDER_ID } from './provider'

const H2077_DIR = 'H2077'
const LOAD_ORDER_DIR = path.join(H2077_DIR, 'Load Order')
const MODLIST_PATH = path.join(H2077_DIR, 'modlist.txt')
const LOAD_ORDER_PATH = path.join(LOAD_ORDER_DIR, 'heybox-managed.json')
let atomicWriteSequence = 0

export class RedmodDeploymentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'RedmodDeploymentError'
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await fs.promises.stat(filePath)).isFile()
  } catch {
    return false
  }
}

export async function atomicWrite(filePath: string, data: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  atomicWriteSequence += 1
  const randomSuffix = Math.random().toString(36).slice(2)
  const temporaryPath = `${filePath}.${Date.now()}.${atomicWriteSequence}.${randomSuffix}.tmp`
  try {
    await fs.promises.writeFile(temporaryPath, data, 'utf8')
    await fs.promises.rename(temporaryPath, filePath)
  } catch (error) {
    try { await fs.promises.unlink(temporaryPath) } catch { /* best effort */ }
    throw error
  }
}

export function buildRedmodDeployArgs(gamePath: string, modlistPath: string): string[] {
  return [
    'deploy',
    '-reportProgress',
    '-root',
    gamePath,
    `-rttiSchemaPath=${path.join(gamePath, REDMOD_METADATA)}`,
    `-modlist=${modlistPath}`,
  ]
}

export function redmodFailureReason(exitCode: number | null, output: string): string {
  if (exitCode !== null && (exitCode >>> 0) === 0xC000013A) return 'REDmod was interrupted'
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const failedAt = lines.indexOf('Commandlet deploy has failed.')
  const reason = failedAt >= 0 ? lines[failedAt - 1] : undefined
  return reason && !reason.startsWith('[DEPLOY]') ? reason : `REDmod exited with code ${exitCode}`
}

export function redmodNeedsRebuild(previous: readonly string[] | undefined, next: readonly string[]): boolean {
  if (previous === undefined) return true
  return [...previous].sort().join('\n') === [...next].sort().join('\n')
    && previous.join('\n') !== next.join('\n')
}

function runRedmod(executable: string, gamePath: string, modlistPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, buildRedmodDeployArgs(gamePath, modlistPath), {
      cwd: path.dirname(executable), windowsHide: true, shell: false,
    })
    // Bound diagnostics without imposing execFile's output limit on the compiler.
    let output = ''
    const collect = (chunk: Buffer): void => { output = (output + chunk.toString()).slice(-131072) }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    child.on('error', (error) => reject(new RedmodDeploymentError('REDMOD_DEPLOY_FAILED', error.message)))
    child.on('close', (code, signal) => {
      if (code === 0) return resolve()
      reject(new RedmodDeploymentError('REDMOD_DEPLOY_FAILED', signal
        ? `REDmod was interrupted (${signal})` : redmodFailureReason(code, output)))
    })
  })
}

export interface RedmodDeploymentDependencies {
  fileExists(filePath: string): Promise<boolean>
  atomicWrite(filePath: string, data: string): Promise<void>
  runRedmod(executable: string, gamePath: string, modlistPath: string): Promise<void>
  readModlist(filePath: string): Promise<string[] | undefined>
  resetCache(gamePath: string): Promise<void>
}

const defaultDependencies: RedmodDeploymentDependencies = {
  fileExists, atomicWrite, runRedmod,
  readModlist: async (filePath) => {
    try {
      return (await fs.promises.readFile(filePath, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    } catch { return undefined }
  },
  resetCache: async (gamePath) => {
    const cachePath = path.join(gamePath, 'r6/cache/modded')
    await fs.promises.rm(cachePath, { recursive: true, force: true })
    await fs.promises.mkdir(cachePath, { recursive: true })
  },
}

export async function serializeAndDeployRedmods(
  entries: LoadOrderEntry[],
  context: LoadOrderContext,
  dependencies: RedmodDeploymentDependencies = defaultDependencies,
): Promise<void> {
  const gamePath = String(context.gamePath || '')
  if (!gamePath) throw new RedmodDeploymentError('REDMOD_GAME_PATH_MISSING', '未找到 Cyberpunk 2077 游戏目录。')
  const executable = path.join(gamePath, REDMOD_DEPLOY_EXE)
  const metadataPath = path.join(gamePath, REDMOD_METADATA)
  const modlistPath = path.join(gamePath, MODLIST_PATH)
  const loadOrderPath = path.join(gamePath, LOAD_ORDER_PATH)
  const previous = await dependencies.readModlist(modlistPath)
  const enabledRedmods = getEnabledRedmodNames(entries)
  const diagnostic = {
    schemaVersion: 1,
    providerId: REDMOD_LOAD_ORDER_PROVIDER_ID,
    revision: context.revision,
    generatedAt: new Date().toISOString(),
    entries,
  }
  await dependencies.atomicWrite(modlistPath, enabledRedmods.join('\r\n'))
  await dependencies.atomicWrite(loadOrderPath, `${JSON.stringify(diagnostic, null, 2)}\n`)
  if (!await dependencies.fileExists(executable) || !await dependencies.fileExists(metadataPath)) {
    throw new RedmodDeploymentError(
      'REDMOD_TOOL_MISSING',
      'Steam REDmod DLC 未安装或不完整；Load Order 已保存，但尚未运行 redMod.exe。',
    )
  }
  if (redmodNeedsRebuild(previous, enabledRedmods)) await dependencies.resetCache(gamePath)
  console.log('[Cyberpunk2077][REDmod] Starting REDmod compilation', {
    enabledRedmods,
    executable,
    args: buildRedmodDeployArgs(gamePath, modlistPath),
  })
  try {
    await dependencies.runRedmod(executable, gamePath, modlistPath)
    console.log('[Cyberpunk2077][REDmod] REDmod compilation completed', { enabledRedmods })
  } catch (error) {
    console.error('[Cyberpunk2077][REDmod] REDmod compilation failed', { enabledRedmods, error })
    throw error
  }
}

export async function prepareRedmodDirectories(gamePath: string): Promise<void> {
  if (!gamePath) return
  await Promise.all([
    fs.promises.mkdir(path.join(gamePath, 'mods'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, 'r6/cache/modded'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, LOAD_ORDER_DIR), { recursive: true }),
  ])
}
