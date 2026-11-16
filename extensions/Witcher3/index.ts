import type { IExtensionContext, InstallerInstall, InstallerTest } from 'heybox-mod-api'
import { registerWitcherLoadOrder } from './src/loadOrder'
import { createScriptMergerSupport } from './src/scriptMerger'
import { runtime } from './src/runtime'
import { registerMenuMergers, isNativeMenuXml, documentSettings } from './src/menuMerge'
import { resolveModsSettingsPath } from './src/loadOrder'
import { scriptStyle } from './src/scriptStyle'
import { readMergeInventory } from './src/mergeInventory'
import { isRemastered } from './src/edition'
import { readText } from './src/files'
import path from 'node:path'
import { createHash } from 'node:crypto'
import {
  EXECUTABLES,
  CONTENT_MOD_TYPE,
  GAME_ID,
  GAME_NAME,
  MENU_MOD_TYPE,
  MIXED_MOD_TYPE,
  MODS_MOD_TYPE,
  DLC_MOD_TYPE,
  ROOT_MOD_TYPE,
  STORE_IDS,
  SCRIPT_MERGER_DIRECTORY,
  SCRIPT_MERGER_FILENAME,
  SCRIPT_MERGER_MOD_TYPE,
} from './src/constants'

export * from './src/constants'

export const SCRIPT_MERGER_INSTALLER_ID = SCRIPT_MERGER_MOD_TYPE
const MODS_PATH = 'Mods'
const DLC_PATH = 'DLC'
const MENU_PATH = 'bin/config/r4game/user_config_matrix/pc'
const PART_SUFFIX = '.part.txt'

type Entry = { source: string; relative: string; segments: string[] }
type Instruction = {
  type: 'copy'
  source: string
  destination: string
  verification?: 'exists'
  conflictPolicy?: 'overwrite'
}
type InstallerResult = { instructions: Instruction[]; modType: string }

function normalizePath(source: string): string {
  let value = String(source).replace(/\\/g, '/').replace(/^\.\//, '')
  if (!value || value.startsWith('/') || /^[a-z]:\//i.test(value)) throw new Error(`Unsafe archive path: ${source}`)
  const segments = value.split('/').filter(Boolean)
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes(':') || /[\u0000-\u001f]/.test(segment))) {
    throw new Error(`Unsafe archive path: ${source}`)
  }
  return segments.join('/')
}

function entries(files: string[]): Entry[] {
  const result: Entry[] = []
  const seen = new Set<string>()
  for (const source of files) {
    const relative = normalizePath(source)
    if (!relative || source.endsWith('/') || source.endsWith('\\')) continue
    const key = relative.toLowerCase()
    if (seen.has(key)) throw new Error(`Conflicting archive paths: ${source}`)
    seen.add(key)
    result.push({ source, relative, segments: relative.split('/') })
  }
  return result
}

function indexOfSegment(entry: Entry, name: string): number {
  return entry.segments.findIndex(segment => segment.toLowerCase() === name)
}

function hasSegment(list: Entry[], name: string): boolean {
  return list.some(entry => indexOfSegment(entry, name) >= 0)
}

function hasMenuConfig(list: Entry[]): boolean {
  const expected = MENU_PATH.split('/')
  return list.some(entry => {
    const lower = entry.segments.map(segment => segment.toLowerCase())
    const start = lower.findIndex((segment, index) => segment === expected[0] && lower.slice(index, index + expected.length).join('/') === MENU_PATH)
    return start >= 0
  })
}

function hasPrefixedContent(list: Entry[], prefix: 'mod' | 'dlc'): boolean {
  return list.some(entry => {
    const content = indexOfSegment(entry, 'content')
    return content > 0 && entry.segments[content - 1].toLowerCase().startsWith(prefix)
  })
}

function hasScriptMerger(list: Entry[]): boolean {
  return list.some(entry => entry.segments[entry.segments.length - 1].toLowerCase() === SCRIPT_MERGER_FILENAME.toLowerCase())
}

function isBackupEntry(entry: Entry): boolean {
  return entry.segments.some(segment => segment.toLowerCase().includes('backup'))
}

function hasPartFile(list: Entry[]): boolean {
  return list.some(entry => entry.relative.toLowerCase().endsWith(PART_SUFFIX))
}

function stripTo(entry: Entry, marker: string): string[] {
  const index = indexOfSegment(entry, marker)
  return index >= 0 ? entry.segments.slice(index) : entry.segments
}

function deriveModName(list: Entry[]): string {
  for (const entry of list) {
    const content = indexOfSegment(entry, 'content')
    if (content > 0) {
      const candidate = entry.segments[content - 1]
      if (/^mod/i.test(candidate)) return candidate
    }
  }
  const top = list[0]?.segments[0]
  return top && !['mods', 'dlc', 'bin', 'content'].includes(top.toLowerCase()) ? top : 'mod'
}

function copy(source: string, destination: string, mutable = false): Instruction {
  return { type: 'copy', source, destination, ...(mutable ? { verification: 'exists' as const } : {}) }
}

function installMods(list: Entry[]): InstallerResult {
  const marker = list.find(entry => indexOfSegment(entry, 'mods') >= 0)
  const markerIndex = marker ? indexOfSegment(marker, 'mods') : -1
  const prefix = markerIndex > 0 ? marker!.segments.slice(0, markerIndex).map(segment => segment.toLowerCase()) : []
  const instructions = list.flatMap(entry => {
    if (prefix.length > 0 && entry.segments.slice(0, prefix.length).map(segment => segment.toLowerCase()).join('/') !== prefix.join('/')) return []
    const destination = prefix.length > 0 ? entry.segments.slice(prefix.length).join('/') : entry.relative
    return destination ? [copy(entry.source, destination)] : []
  })
  if (instructions.length === 0) throw new Error('No Witcher 3 Mods files found')
  return { instructions, modType: MODS_MOD_TYPE }
}

function installContent(list: Entry[], fallbackName?: string): InstallerResult {
  const modName = fallbackName || deriveModName(list)
  const instructions = list.flatMap(entry => {
    const contentIndex = indexOfSegment(entry, 'content')
    if (contentIndex < 0 || (contentIndex > 0 && !entry.segments[contentIndex - 1].toLowerCase().startsWith('mod'))) return []
    const contentPath = entry.segments.slice(contentIndex).join('/')
    return [copy(entry.source, `${MODS_PATH}/${contentIndex > 0 ? entry.segments[contentIndex - 1] : modName}/${contentPath}`)]
  })
  if (instructions.length === 0) throw new Error('No Witcher 3 content files found')
  return { instructions, modType: CONTENT_MOD_TYPE }
}

function installDlc(list: Entry[]): InstallerResult {
  const instructions = list.flatMap(entry => {
    const index = indexOfSegment(entry, 'dlc')
    if (index >= 0) return [copy(entry.source, stripTo(entry, 'dlc').join('/'))]
    const content = indexOfSegment(entry, 'content')
    return content > 0 && entry.segments[content - 1].toLowerCase().startsWith('dlc')
      ? [copy(entry.source, `${DLC_PATH}/${entry.segments.slice(content - 1).join('/')}`)] : []
  })
  if (instructions.length === 0) throw new Error('No Witcher 3 DLC files found')
  return { instructions, modType: DLC_MOD_TYPE }
}

function installMenu(list: Entry[], fallbackName?: string): InstallerResult {
  const modName = fallbackName || deriveModName(list)
  const menuRoot = MENU_PATH.toLowerCase().split('/')
  const inputFiles = list.filter(entry => {
    const lower = entry.segments.map(segment => segment.toLowerCase())
    return lower.some((_segment, index) => lower.slice(index, index + menuRoot.length).join('/') === MENU_PATH)
  })
  const selectedInput = new Map<string, Entry>()
  for (const entry of inputFiles) {
    const filename = entry.segments[entry.segments.length - 1].toLowerCase()
    const existing = selectedInput.get(filename)
    if (!existing || (isBackupEntry(existing) && !isBackupEntry(entry))) selectedInput.set(filename, entry)
  }
  const inputSet = new Set(inputFiles.map(entry => entry.source))
  const instructions = Array.from(selectedInput.values()).map(entry => {
    const lower = entry.segments.map(segment => segment.toLowerCase())
    const menuIndex = lower.findIndex((_segment, index) => lower.slice(index, index + menuRoot.length).join('/') === MENU_PATH)
    return copy(entry.source, entry.segments.slice(menuIndex).join('/'), true)
  })
  for (const entry of list) {
    if (inputSet.has(entry.source)) continue
    const modsIndex = indexOfSegment(entry, 'mods')
    if (modsIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, 'mods').join('/')))
      continue
    }
    const dlcIndex = indexOfSegment(entry, 'dlc')
    if (dlcIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, 'dlc').join('/')))
      continue
    }
    const binIndex = indexOfSegment(entry, 'bin')
    if (binIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, 'bin').join('/')))
      continue
    }
    const contentIndex = indexOfSegment(entry, 'content')
    if (contentIndex >= 0 || entry.relative.toLowerCase().endsWith(PART_SUFFIX)) {
      const name = contentIndex > 0 && /^mod/i.test(entry.segments[contentIndex - 1]) ? entry.segments[contentIndex - 1] : modName
      instructions.push(copy(entry.source, `${MODS_PATH}/${name}/${contentIndex >= 0 ? entry.segments.slice(contentIndex).join('/') : entry.segments.at(-1)}`))
    }
  }
  if (instructions.length === 0) throw new Error('No Witcher 3 menu files found')
  return { instructions, modType: MENU_MOD_TYPE }
}

function installMixed(list: Entry[]): InstallerResult {
  const instructions = list.flatMap(entry => {
    if (entry.segments.length === 0) return []
    const modsIndex = indexOfSegment(entry, 'mods')
    if (modsIndex >= 0) return [copy(entry.source, stripTo(entry, 'mods').join('/'))]
    const dlcIndex = indexOfSegment(entry, 'dlc')
    if (dlcIndex >= 0) return [copy(entry.source, stripTo(entry, 'dlc').join('/'))]
    const contentIndex = indexOfSegment(entry, 'content')
    if (contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith('mod')) {
      return [copy(entry.source, `${MODS_PATH}/${entry.segments.slice(contentIndex - 1).join('/')}`)]
    }
    if (contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith('dlc')) {
      return [copy(entry.source, `${DLC_PATH}/${entry.segments.slice(contentIndex - 1).join('/')}`)]
    }
    const binIndex = indexOfSegment(entry, 'bin')
    if (binIndex >= 0) return [copy(entry.source, entry.segments.slice(binIndex).join('/'))]
    return [copy(entry.source, entry.relative)]
  })
  if (instructions.length === 0) throw new Error('No Witcher 3 mixed files found')
  return { instructions, modType: MIXED_MOD_TYPE }
}

function installRoot(list: Entry[]): InstallerResult {
  const instructions = list.map(entry => copy(entry.source, entry.relative))
  return { instructions, modType: ROOT_MOD_TYPE }
}

function supported(gameId: number | string): boolean {
  return STORE_IDS.some(id => String(id) === String(gameId))
}

function testWith(predicate: (list: Entry[]) => boolean): InstallerTest {
  return (files, gameId) => {
    if (!supported(gameId)) return { supported: false, requiredFiles: [] }
    try {
      return { supported: predicate(entries(files)), requiredFiles: [] }
    } catch {
      return { supported: false, requiredFiles: [] }
    }
  }
}

const testScriptMerger = testWith(hasScriptMerger)
const testMixed = testWith(list => !hasMenuConfig(list) && (
  (hasSegment(list, 'mods') && hasSegment(list, 'dlc'))
  || (hasPrefixedContent(list, 'mod') && hasPrefixedContent(list, 'dlc'))
))
const testDlc = testWith(list => (hasSegment(list, 'dlc') || hasPrefixedContent(list, 'dlc')) && !hasSegment(list, 'mods') && !hasPrefixedContent(list, 'mod'))
const testMenu = testWith(list => hasMenuConfig(list) || hasPartFile(list))
const testContent = testWith(list => list.some(entry => {
  const contentIndex = indexOfSegment(entry, 'content')
  return contentIndex === 0 || (contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith('mod'))
}))
const testMods = testWith(list => hasSegment(list, 'mods') && !hasSegment(list, 'dlc'))
const testRoot = testWith(list => hasSegment(list, 'mods') || hasSegment(list, 'dlc') || list.some(entry => indexOfSegment(entry, 'content') >= 0) || list.some(entry => entry.relative.toLowerCase().startsWith('bin/')))

function installScriptMerger(list: Entry[]): InstallerResult {
  const executables = list.filter(entry => entry.segments.at(-1)?.toLowerCase() === SCRIPT_MERGER_FILENAME.toLowerCase())
  if (executables.length !== 1) throw new Error('Script Merger archive must contain exactly one WitcherScriptMerger.exe')
  const root = executables[0].segments.slice(0, -1)
  const instructions = list.flatMap(entry => {
    if (!root.every((segment, index) => entry.segments[index]?.toLowerCase() === segment.toLowerCase())) return []
    const relative = entry.segments.slice(root.length).join('/')
    if (/^(?:MergeInventory\.xml|\.heybox-merge-state\.json)$/i.test(relative)) return []
    // The tool changes its .config and merge inventory; keep writable files out of hard-linked pool assets.
    const mutable = /\.(?:config|xml|ini|json|log)$/i.test(relative)
    return [copy(entry.source, `${SCRIPT_MERGER_DIRECTORY}/${relative}`, mutable)]
  })
  return { instructions, modType: SCRIPT_MERGER_MOD_TYPE }
}

function registerType(context: IExtensionContext, id: string, typePriority: number, installerPriority: number, name: string, test: InstallerTest, install: InstallerInstall): void {
  // SDK ModType routing prefers larger priorities; installer selection prefers smaller ones.
  context.registerModType(id, typePriority, supported, () => '{gamePath}', test as (...args: unknown[]) => boolean | Promise<boolean>, { name })
  context.registerInstaller(id, installerPriority, test, install)
}

async function findGame(context: IExtensionContext): Promise<string | undefined> {
  return (await context.api.util.GameStoreHelper.findByAppId(STORE_IDS))?.gamePath
}

function uniqueModName(options: unknown): string | undefined {
  const identity = (options as { mod?: { name?: string; modKey?: string } } | undefined)?.mod
  if (!identity?.modKey) return undefined
  return `mod${String(identity.name || 'Content').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 45) || 'Content'}_${createHash('sha256').update(identity.modKey).digest('hex').slice(0, 8)}`
}

export default function main(context: IExtensionContext): boolean {
  const extended = runtime(context)
  let selectedGamePath: string | undefined
  const resolveGamePath = async () => selectedGamePath || findGame(context)
  const scriptMerger = createScriptMergerSupport(context, resolveGamePath)
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    executable: EXECUTABLES[0],
    queryPath: async () => {
      selectedGamePath = await findGame(context)
      return selectedGamePath
    },
    setup: async (discovery: { path?: string; gamePath?: string }) => {
      selectedGamePath = discovery.path || discovery.gamePath || await resolveGamePath()
      return scriptMerger.getRequiredMods(selectedGamePath)
    },
    localModFeatures: scriptMerger.getLocalModFeatures(),
    requiredFiles: [],
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: 'witcher3',
      customOpenModsPath: MODS_PATH,
    },
  })
  registerMenuMergers(extended)
  const prepare = (install: InstallerInstall): InstallerInstall => scriptMerger.guardInstaller(async (files, staging, options) => {
    const result = await install(files, staging, options)
    const style = await scriptStyle(files, staging, options)
    const documents = path.dirname(await resolveModsSettingsPath())
    const instructions = []
    const fragments = new Map<string, Instruction[]>()
    for (const instruction of result.instructions) {
      const basename = path.posix.basename(String(instruction.destination).replace(/\\/g, '/')).toLowerCase()
      if (basename.endsWith(PART_SUFFIX)) {
        const setting = basename.slice(0, -PART_SUFFIX.length)
        if (setting === 'user.settings' && isRemastered(await resolveGamePath() || '')) continue
        // Fragments are installer inputs, never game content. Unsupported fragments stay out of deployment.
        if (documentSettings.includes(setting)) {
          const target = path.join(documents, setting)
          const sources = fragments.get(target) || []
          sources.push(instruction)
          fragments.set(target, sources)
        }
      } else instructions.push(isNativeMenuXml(instruction.destination)
        ? { ...instruction, verification: 'exists', conflictPolicy: 'overwrite' } : instruction)
    }
    for (const [destination, sources] of fragments) {
      if (sources.length === 1) instructions.push({ ...sources[0], destination, verification: 'exists', conflictPolicy: 'overwrite' })
      else {
        const contents = await Promise.all(sources.map(async source => {
          const paths = options?.sourcePathByFile as Record<string, string> | undefined
          const text = await readText(paths?.[source.source] || (staging ? path.join(staging, source.source) : undefined))
          if (text === undefined) throw new Error(`无法读取菜单配置片段：${source.source}`)
          return text
        }))
        // One VFS contribution per package/target; preserve every bundled fragment.
        instructions.push({ type: 'generatefile', destination, data: contents.join('\r\n'), verification: 'exists', conflictPolicy: 'overwrite' })
      }
    }
    return { ...result, instructions: [...instructions, { type: 'attribute', key: 'witcher3ScriptStyle', value: style }] }
  })
  registerType(context, MIXED_MOD_TYPE, 100, 25, 'Witcher 3 Mixed Mod', testMixed, prepare(files => installMixed(entries(files))))
  registerType(context, DLC_MOD_TYPE, 90, 60, 'Witcher 3 DLC', testDlc, prepare(files => installDlc(entries(files))))
  registerType(context, MENU_MOD_TYPE, 80, 20, 'Witcher 3 Menu Mod', testMenu, prepare((files, _staging, options) => installMenu(entries(files), uniqueModName(options))))
  registerType(context, CONTENT_MOD_TYPE, 70, 50, 'Witcher 3 Content Mod', testContent, prepare((files, _staging, options) => {
    return installContent(entries(files), uniqueModName(options))
  }))
  registerType(context, MODS_MOD_TYPE, 60, 30, 'Witcher 3 Mod', testMods, prepare(files => installMods(entries(files))))
  registerType(context, ROOT_MOD_TYPE, 10, 1000, 'Witcher 3 Root Files', testRoot, prepare(files => installRoot(entries(files))))
  registerType(context, SCRIPT_MERGER_MOD_TYPE, 120, 15, 'Witcher 3 Script Merger', testScriptMerger, files => installScriptMerger(entries(files)))
  context.registerExtensionAction(GAME_ID, 'getScriptMergerStatus', () => scriptMerger.getStatus())
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => scriptMerger.getRequiredMods())
  registerWitcherLoadOrder(context, { mergedOutputs: gamePath => readMergeInventory(extended, gamePath) })
  scriptMerger.registerTool(extended)
  return true
}

export const __testing = {
  entries,
  testScriptMerger,
  testMixed,
  testDlc,
  testMenu,
  testContent,
  testMods,
  testRoot,
  installMixed,
  installDlc,
  installMenu,
  installContent,
  installMods,
  installRoot,
  installScriptMerger,
}
