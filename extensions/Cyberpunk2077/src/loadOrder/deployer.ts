import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { REDMOD_DEPLOY_EXE, REDMOD_METADATA } from '../constants'
import type { LoadOrderContext, LoadOrderEntry } from './protocol'
import { getEnabledRedmodNames, REDMOD_LOAD_ORDER_PROVIDER_ID } from './provider'

const V2077_DIR = 'V2077'
const LOAD_ORDER_DIR = path.join(V2077_DIR, 'Load Order')
const MODLIST_PATH = path.join(V2077_DIR, 'modlist.txt')
const LOAD_ORDER_PATH = path.join(LOAD_ORDER_DIR, 'heybox-managed.json')

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
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
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
    '-force',
    `-root=${gamePath}`,
    `-rttiSchemaFile=${path.join(gamePath, REDMOD_METADATA)}`,
    `-modlist=${modlistPath}`,
  ]
}

function runRedmod(executable: string, gamePath: string, modlistPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      buildRedmodDeployArgs(gamePath, modlistPath),
      { cwd: path.dirname(executable), windowsHide: true },
      (error, _stdout, stderr) => {
        if (!error) return resolve()
        const details = String(stderr || '').trim()
        reject(new RedmodDeploymentError(
          'REDMOD_DEPLOY_FAILED',
          details ? `${error.message}: ${details}` : error.message,
        ))
      },
    )
  })
}

export interface RedmodDeploymentDependencies {
  fileExists(filePath: string): Promise<boolean>
  atomicWrite(filePath: string, data: string): Promise<void>
  runRedmod(executable: string, gamePath: string, modlistPath: string): Promise<void>
}

const defaultDependencies: RedmodDeploymentDependencies = { fileExists, atomicWrite, runRedmod }

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
  const diagnostic = {
    schemaVersion: 1,
    providerId: REDMOD_LOAD_ORDER_PROVIDER_ID,
    revision: context.revision,
    generatedAt: new Date().toISOString(),
    entries,
  }
  await dependencies.atomicWrite(modlistPath, getEnabledRedmodNames(entries).join('\r\n'))
  await dependencies.atomicWrite(loadOrderPath, `${JSON.stringify(diagnostic, null, 2)}\n`)
  if (!await dependencies.fileExists(executable) || !await dependencies.fileExists(metadataPath)) {
    throw new RedmodDeploymentError(
      'REDMOD_TOOL_MISSING',
      'Steam REDmod DLC 未安装或不完整；Load Order 已保存，但尚未运行 redMod.exe。',
    )
  }
  await dependencies.runRedmod(executable, gamePath, modlistPath)
}

export async function prepareRedmodDirectories(gamePath: string): Promise<void> {
  if (!gamePath) return
  await Promise.all([
    fs.promises.mkdir(path.join(gamePath, 'mods'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, 'r6/cache/modded'), { recursive: true }),
    fs.promises.mkdir(path.join(gamePath, LOAD_ORDER_DIR), { recursive: true }),
  ])
}
