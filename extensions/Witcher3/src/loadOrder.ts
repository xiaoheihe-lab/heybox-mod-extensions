import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { patchIni } from './ini'
import { atomicWrite, readText } from './files'
import type {
  IExtensionContext,
  LoadOrderContext,
  LoadOrderEntry as ApiLoadOrderEntry,
  LoadOrderModSnapshot,
  LoadOrderRegistration,
} from 'heybox-mod-api'
import {
  GAME_ID,
  CONTENT_MOD_TYPE,
  MENU_MOD_TYPE,
  MIXED_MOD_TYPE,
  MODS_MOD_TYPE,
} from './constants'

export const LOAD_ORDER_PROVIDER_ID = 'witcher3-mods'
type LoadOrderEntry = ApiLoadOrderEntry & { external?: boolean; locked?: boolean }
export const MOD_NAMES_ATTRIBUTE = 'witcher3ModNames'
export const MODS_SETTINGS_FILENAME = 'mods.settings'

type SettingsSection = {
  name: string
  enabled?: boolean
  priority?: number
}

type WitcherEntryData = {
  modName: string
  external?: boolean
  locked?: boolean
}

type ParsedSettings = { sections: SettingsSection[] }

const managedModTypes = [MODS_MOD_TYPE, CONTENT_MOD_TYPE, MENU_MOD_TYPE, MIXED_MOD_TYPE]
const invalidName = /[\u0000-\u001f\[\]]/

function normalizeName(value: unknown): string {
  return String(value || '').trim()
}

function nameKey(value: string): string {
  return value.toLocaleLowerCase('en-US')
}

function isValidModName(value: string): boolean {
  return Boolean(value) && !invalidName.test(value) && !value.includes('/') && !value.includes('\\')
}

function isLockedModName(value: string): boolean {
  return nameKey(value).startsWith('mod0000_')
}

function getDocumentsRoots(): string[] {
  const configured = String(process.env.WITCHER3_DOCUMENTS_ROOT || '').trim()
  const roots = [
    configured,
    process.env.OneDrive ? path.join(process.env.OneDrive, 'Documents') : '',
    process.env.OneDriveCommercial ? path.join(process.env.OneDriveCommercial, 'Documents') : '',
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Documents') : '',
    path.join(os.homedir(), 'Documents'),
  ]
  return Array.from(new Set(roots.filter(Boolean).map((root) => path.resolve(root))))
}

export function getModsSettingsCandidates(): string[] {
  return getDocumentsRoots().map((root) => path.join(root, 'The Witcher 3', MODS_SETTINGS_FILENAME))
}

export async function resolveModsSettingsPath(): Promise<string> {
  const candidates = getModsSettingsCandidates()
  // An explicit root is authoritative even before the first file exists (including tests).
  if (String(process.env.WITCHER3_DOCUMENTS_ROOT || '').trim()) return candidates[0]
  for (const candidate of candidates) {
    try {
      if ((await fs.promises.stat(candidate)).isFile()) return candidate
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return candidates[0]
}

function parseSettings(text: string): SettingsSection[] {
  const sections: SettingsSection[] = []
  let current: SettingsSection | undefined
  for (const rawLine of String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';') || line.startsWith('#')) continue
    const header = /^\[([^\]]+)\]$/.exec(line)
    if (header) {
      const name = normalizeName(header[1])
      if (!isValidModName(name)) {
        current = undefined
        continue
      }
      current = { name }
      sections.push(current)
      continue
    }
    if (!current) continue
    const pair = /^([^=]+)=(.*)$/.exec(line)
    if (!pair) continue
    const key = pair[1].trim().toLowerCase()
    const value = pair[2].trim()
    if (key === 'enabled') current.enabled = value !== '0' && value.toLowerCase() !== 'false'
    if (key === 'priority' && /^-?\d+$/.test(value)) current.priority = Number(value)
  }
  return sections
}

async function readSettings(): Promise<ParsedSettings> {
  const filePath = await resolveModsSettingsPath()
  try {
    return { sections: parseSettings(await fs.promises.readFile(filePath, 'utf8')) }
  } catch (error: any) {
    if (error?.code === 'ENOENT') return { sections: [] }
    throw error
  }
}

async function getGameModDirectories(gamePath: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  try {
    const values = await fs.promises.readdir(path.join(gamePath, 'Mods'), { withFileTypes: true })
    for (const value of values) if (value.isDirectory() && isValidModName(value.name)) result.set(nameKey(value.name), value.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return result
}

function getMetadataNames(mod: LoadOrderModSnapshot): string[] {
  const candidates = [mod.metaInfo?.[MOD_NAMES_ATTRIBUTE], mod.metaInfo?.modComponents]
  for (const value of candidates) {
    if (Array.isArray(value)) {
      const names = value.map(normalizeName).filter(isValidModName)
      if (names.length > 0) return Array.from(new Set(names.map((name) => nameKey(name)))).map((key) => {
        const original = names.find((name) => nameKey(name) === key)
        return original || key
      })
    }
  }
  const direct = normalizeName(mod.metaInfo?.[MOD_NAMES_ATTRIBUTE] || mod.metaInfo?.modName)
  return isValidModName(direct) ? [direct] : []
}

function modDisplayName(mod: LoadOrderModSnapshot, modName: string): string {
  const source = normalizeName(mod.metaInfo?.name || mod.metaInfo?.title)
  return source && nameKey(source) !== nameKey(modName) ? `${modName}（来自 ${source}）` : modName
}

export function isWitcherLoadOrderModRelevant(mod: LoadOrderModSnapshot): boolean {
  if (!managedModTypes.includes(String(mod.modType || ''))) return false
  return getMetadataNames(mod).length > 0
}

function sortBySavedOrder(entries: LoadOrderEntry[], savedOrder: string[]): LoadOrderEntry[] {
  const savedIndex = new Map(savedOrder.map((id, index) => [id, index]))
  const appendIndex = savedOrder.length
  return entries.sort((left, right) => {
    const leftLocked = Boolean((left.data as WitcherEntryData | undefined)?.locked)
    const rightLocked = Boolean((right.data as WitcherEntryData | undefined)?.locked)
    if (leftLocked !== rightLocked) return leftLocked ? -1 : 1
    const leftIndex = savedIndex.get(left.id) ?? appendIndex
    const rightIndex = savedIndex.get(right.id) ?? appendIndex
    if (leftIndex !== rightIndex) return leftIndex - rightIndex
    return left.name.localeCompare(right.name, 'en') || left.id.localeCompare(right.id)
  })
}

export async function deserializeWitcherLoadOrder(context: LoadOrderContext): Promise<LoadOrderEntry[]> {
  const settings = await readSettings()
  const directories = await getGameModDirectories(context.gamePath)
  const managedByName = new Map<string, LoadOrderModSnapshot>()
  const managedEntries: LoadOrderEntry[] = []

  for (const mod of context.mods) {
    if (!isWitcherLoadOrderModRelevant(mod)) continue
    for (const modName of getMetadataNames(mod)) {
      const key = nameKey(modName)
      if (managedByName.has(key)) continue
      managedByName.set(key, mod)
      managedEntries.push({
        id: `${mod.modKey}:${key}`,
        ownerModKey: mod.modKey,
        name: modDisplayName(mod, modName),
        enabled: mod.enabled,
        ...((isLockedModName(modName)) ? { locked: true } : {}),
        data: { modName, locked: isLockedModName(modName) } satisfies WitcherEntryData,
      })
    }
  }

  const byName = new Map(managedEntries.map((entry) => [nameKey(String((entry.data as WitcherEntryData).modName)), entry]))
  const settingsOrder: LoadOrderEntry[] = []
  const seen = new Set<string>()
  const sections = settings.sections
    .map((section, index) => ({ section, index }))
    .sort((left, right) => (left.section.priority ?? Number.MAX_SAFE_INTEGER) - (right.section.priority ?? Number.MAX_SAFE_INTEGER) || left.index - right.index)
    .map(({ section }) => section)
  for (const section of sections) {
    const key = nameKey(section.name)
    if (seen.has(key) || (!directories.has(key) && !byName.has(key))) continue
    seen.add(key)
    const managed = byName.get(key)
    if (managed) {
      settingsOrder.push(managed)
      continue
    }
    settingsOrder.push({
      id: `external:${key}`,
      ownerModKey: '',
      external: true,
      ...(isLockedModName(section.name) ? { locked: true } : {}),
      name: section.name,
      enabled: section.enabled !== false,
      data: { modName: section.name, external: true, locked: isLockedModName(section.name) } satisfies WitcherEntryData,
    })
  }
  // Merger output and manually installed folders need not already have an ini section.
  for (const [key, name] of directories) {
    if (seen.has(key) || byName.has(key)) continue
    seen.add(key)
    settingsOrder.push({
      id: `external:${key}`, ownerModKey: '', external: true, name, enabled: true,
      ...(isLockedModName(name) ? { locked: true } : {}),
      data: { modName: name, external: true, locked: isLockedModName(name) },
    })
  }
  const missingManaged = managedEntries.filter((entry) => !seen.has(nameKey(String((entry.data as WitcherEntryData).modName))))
  const entries = [...settingsOrder, ...missingManaged]
  // Refresh reflects external tools; retain SDK order only for a pending/failed save.
  const status = (context as LoadOrderContext & { deploymentStatus?: string }).deploymentStatus
  const order = status && status !== 'clean' && context.savedOrder.length > 0
    ? context.savedOrder : entries.map((entry) => entry.id)
  return sortBySavedOrder(entries, order)
}

export function validateWitcherLoadOrder(_previous: LoadOrderEntry[], current: LoadOrderEntry[]): void {
  const names = new Set<string>()
  let firstUnlocked = false
  for (const entry of current) {
    const data = (entry.data || {}) as WitcherEntryData
    const modName = normalizeName(data.modName)
    if (!isValidModName(modName)) throw new Error(`Invalid Witcher 3 mod name: ${modName}`)
    const key = nameKey(modName)
    if (names.has(key)) throw new Error(`Duplicate Witcher 3 mod name: ${modName}`)
    names.add(key)
    if (data.locked && firstUnlocked) throw new Error('Script Merger output must stay at the top of the load order')
    if (!data.locked) firstUnlocked = true
  }
}

export async function serializeWitcherLoadOrder(entries: LoadOrderEntry[]): Promise<void> {
  const filePath = await resolveModsSettingsPath()
  const before = await readText(filePath) || ''
  const changes = entries.flatMap((entry, index) => {
    const name = normalizeName((entry.data as WitcherEntryData).modName)
    return [{ section: name, key: 'Enabled', value: entry.enabled ? '1' : '0' }, { section: name, key: 'Priority', value: String(index + 1) }]
  })
  await atomicWrite(filePath, patchIni(before, changes))
}

export function registerWitcherLoadOrder(context: IExtensionContext, options?: {
  mergedOutputs?(gamePath: string): Promise<Array<{ name: string; sources: string[]; missing: boolean }>>
}): void {
  context.registerPostInstallerAttributeExtractor(100, (input) => {
    const { modTypeId, instructions, gamePath } = input as typeof input & { gamePath?: string }
    if (!managedModTypes.includes(String(modTypeId))) return {}
    const names = new Map<string, string>()
    for (const instruction of instructions) {
      if (instruction.type !== 'copy') continue
      let destination = String(instruction.destination || '').replace(/\\/g, '/')
      if (path.win32.isAbsolute(destination) || path.posix.isAbsolute(destination)) {
        if (!gamePath) continue
        const paths = /^[a-z]:[\\/]|^[/\\]{2}/i.test(gamePath) ? path.win32 : path.posix
        destination = paths.relative(gamePath, destination).replace(/\\/g, '/')
        if (path.win32.isAbsolute(destination) || path.posix.isAbsolute(destination)) continue
      }
      const parts = destination.split('/').filter(Boolean)
      if (parts.some(part => part === '.' || part === '..')) continue
      if (parts.length < 2 || nameKey(parts[0]) !== 'mods' || !isValidModName(parts[1])) continue
      names.set(nameKey(parts[1]), parts[1])
    }
    return names.size > 0 ? { [MOD_NAMES_ATTRIBUTE]: Array.from(names.values()) } : {}
  })
  const registration: LoadOrderRegistration & { allowExternalEntries: boolean } = {
    id: LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: 'Witcher 3 Mod 加载顺序',
    usageInstructions: [
      '越靠前的 Mod 优先级越高；脚本冲突仍需通过 Script Merger 处理。',
      'Script Merger 生成的 mod0000_ 合并结果会固定在最前面。',
      '禁用的 Mod 仍保留位置，保存后会同步到 Documents\\The Witcher 3\\mods.settings。',
    ],
    modTypes: managedModTypes,
    allowExternalEntries: true,
    isModRelevant: isWitcherLoadOrderModRelevant,
    deserializeLoadOrder: async input => {
      const entries = await deserializeWitcherLoadOrder(input)
      const merged = options?.mergedOutputs ? await options.mergedOutputs(input.gamePath) : []
      for (const entry of entries) {
        const data = entry.data as WitcherEntryData
        const output = merged.find(item => !item.missing && nameKey(item.name) === nameKey(data.modName))
        if (output) {
          Object.assign(entry, { locked: true })
          data.locked = true
          entry.name = `${data.modName}（合并：${output.sources.join('、')}）`
        }
      }
      return sortBySavedOrder(entries, entries.map(entry => entry.id))
    },
    validate: validateWitcherLoadOrder,
    serializeLoadOrder: serializeWitcherLoadOrder,
  }
  context.registerLoadOrder(registration)
  context.registerExtensionAction(GAME_ID, 'deployWitcherLoadOrder', () => (
    context.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID)
  ))
}
