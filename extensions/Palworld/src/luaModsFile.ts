import type { IExtensionContext } from 'heybox-mod-api'
import { MODS_FILE, MODS_FILE_BACKUP, MOD_TYPE_LUA, MOD_TYPE_LUA_V2, UE4SS_RUNTIME_PATH } from './constants'
import { findGamePath } from './requirements'

declare const require: any

const path = require('path')

const STATE_FILE = '.heybox-palworld-lua-mods.json'

type LuaState = Record<string, string>

async function pathExists(filePath: string): Promise<boolean> {
  const fs = require('fs')
  try {
    await fs.promises.stat(filePath)
    return true
  } catch {
    return false
  }
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  const fs = require('fs')
  try {
    return await fs.promises.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

async function writeText(filePath: string, data: string): Promise<void> {
  const fs = require('fs')
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  await fs.promises.writeFile(filePath, data, 'utf8')
}

function getModsDir(gamePath: string): string {
  return path.join(gamePath, UE4SS_RUNTIME_PATH, 'Mods')
}

async function ensureModsFile(gamePath: string): Promise<string> {
  const fs = require('fs')
  const modsDir = getModsDir(gamePath)
  const modsFile = path.join(modsDir, MODS_FILE)
  const backup = path.join(modsDir, MODS_FILE_BACKUP)
  await fs.promises.mkdir(modsDir, { recursive: true })
  if (!await pathExists(modsFile)) {
    const backupData = await readTextIfExists(backup)
    await writeText(modsFile, backupData ?? '\r\n')
  }
  return modsFile
}

async function readState(gamePath: string): Promise<LuaState> {
  const statePath = path.join(getModsDir(gamePath), STATE_FILE)
  const text = await readTextIfExists(statePath)
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeState(gamePath: string, state: LuaState): Promise<void> {
  const statePath = path.join(getModsDir(gamePath), STATE_FILE)
  await writeText(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

async function findFolderId(context: IExtensionContext, modKey: string, modType: string): Promise<string> {
  let folderId = ''
  await context.api.vfs.runManagedDeploymentMutation({ modType }, (mutation: any) => {
    const entry = Array.isArray(mutation?.entries)
      ? mutation.entries.find((item: any) => item?.modKey === modKey && item?.metaInfo?.palworldFolderId)
      : null
    folderId = String(entry?.metaInfo?.palworldFolderId || '')
  })
  return folderId
}

async function addModsFileEntry(gamePath: string, folderId: string): Promise<void> {
  const modsFile = await ensureModsFile(gamePath)
  const data = await readTextIfExists(modsFile) ?? ''
  const lines = data.split(/\r?\n/).filter((line) => line.length > 0)
  const target = `${folderId} : 1`
  if (!lines.some((line) => line.trim() === target)) {
    const insertAt = Math.max(0, lines.length - 2)
    lines.splice(insertAt, 0, target)
    await writeText(modsFile, lines.join('\r\n'))
  }
}

async function removeModsFileEntry(gamePath: string, folderId: string): Promise<void> {
  const modsFile = await ensureModsFile(gamePath)
  const data = await readTextIfExists(modsFile) ?? ''
  const target = `${folderId} : 1`
  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== target)
  await writeText(modsFile, lines.join('\r\n'))
}

async function onLuaEnabled(context: IExtensionContext, modKey: string, modType: string): Promise<void> {
  const gamePath = await findGamePath(context)
  if (!gamePath) return
  const folderId = await findFolderId(context, modKey, modType)
  if (!folderId) return
  await addModsFileEntry(gamePath, folderId)
  const state = await readState(gamePath)
  state[modKey] = folderId
  await writeState(gamePath, state)
}

async function onLuaRemoved(context: IExtensionContext, modKey: string): Promise<void> {
  const gamePath = await findGamePath(context)
  if (!gamePath) return
  const state = await readState(gamePath)
  const folderId = state[modKey]
  if (!folderId) return
  await removeModsFileEntry(gamePath, folderId)
  delete state[modKey]
  await writeState(gamePath, state)
}

export function registerLuaModsFileHooks(context: IExtensionContext): void {
  for (const modType of [MOD_TYPE_LUA_V2, MOD_TYPE_LUA]) {
    context.registerManagedDeploymentHook('afterEnable', { modType }, async (payload) => {
      await onLuaEnabled(context, String(payload.modKey || ''), modType)
    })
    context.registerManagedDeploymentHook('afterDisable', { modType }, async (payload) => {
      await onLuaRemoved(context, String(payload.modKey || ''))
    })
    context.registerManagedDeploymentHook('afterUninstall', { modType }, async (payload) => {
      await onLuaRemoved(context, String(payload.modKey || ''))
    })
  }
}
