// @ts-nocheck
import fs from 'fs'
import path from 'path'
import type { IExtensionContext } from 'heybox-mod-api'

export const GAME_ID = 1245620
export const STEAM_APP_ID = '1245620'
export const GAME_NAME = 'Elden Ring'
export const EXECUTABLE = path.join('Game', 'eldenring.exe')
// TODO: 填写小黑盒后台提供的 Mod Engine 2 真实 modId。
export const MOD_ENGINE_MOD_ID = ''
export const MOD_ENGINE_DIR = 'ModEngine2'
export const MOD_ENGINE_MOD_DIR = path.join(MOD_ENGINE_DIR, 'mod')
export const MOD_ENGINE_LAUNCHER = 'modengine2_launcher.exe'
export const MOD_ENGINE_DLL = 'modengine2.dll'
export const MOD_ENGINE_CONFIG = 'config_eldenring.toml'
export const MOD_ENGINE_STARTER = 'heybox_launch_eldenring_modengine2.cmd'
export const MOD_TYPE_MOD_ENGINE = 'elden-ring-mod-engine-2'
export const MOD_TYPE_MOD_ENGINE_MOD = 'elden-ring-mod-engine-2-mod'
export const MOD_TYPE_MOD_ENGINE_DLL = 'elden-ring-mod-engine-2-dll'
export const MOD_TYPE_SEAMLESS_COOP = 'elden-ring-seamless-coop'
export const MOD_ENGINE_CONFIG_ATTRIBUTE = 'eldenRingModEngineConfig'

export function shouldRefreshModEngineConfigForModType(modType: unknown): boolean {
  return [MOD_TYPE_SEAMLESS_COOP, MOD_TYPE_MOD_ENGINE_DLL, MOD_TYPE_MOD_ENGINE_MOD].includes(String(modType || ''))
}

type CopyInstruction = {
  type: 'copy'
  source: string
  destination: string
}

type AttributeInstruction = {
  type: 'attribute'
  key: string
  value: unknown
}

type InstallInstruction = CopyInstruction | AttributeInstruction

type ModEngineConfigContribution = {
  externalDlls?: string[]
  modEntries?: ModLoaderEntry[]
}

type ConfigCleanupMode = 'disable' | 'uninstall'

type ModLoaderEntry = {
  enabled?: boolean
  name: string
  path: string
}

type ConfigSettings = {
  debug: boolean
  looseParams: boolean
  scyllaHide: boolean
}

const LOOSE_CONTENT_ROOTS = new Set([
  'action',
  'asset',
  'chr',
  'cutscene',
  'event',
  'facegen',
  'map',
  'menu',
  'msg',
  'param',
  'parts',
  'regulation.bin',
  'script',
  'sfx',
  'sound',
])

const DOC_BASENAMES = new Set([
  '.gitignore',
  '.gitattributes',
  'license',
  'license.txt',
  'readme',
  'readme.md',
  'readme.txt',
  'changelog',
  'changelog.txt',
])

const PREFERRED_EXTERNAL_DLLS = ['elden_ring_seamless_coop.dll', 'ersc.dll']
const DEFAULT_CONFIG_SETTINGS: ConfigSettings = {
  debug: false,
  looseParams: false,
  scyllaHide: false,
}

function normalizeArchivePath(filePath: string): string | null {
  const normalized = String(filePath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/g, '')
    .replace(/^(\.\/)+/g, '')
    .replace(/\/+/g, '/')
    .trim()

  if (!normalized || normalized.endsWith('/')) return null
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null

  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '.' || segment === '..')) return null
  return segments.join('/')
}

function splitArchivePath(filePath: string): string[] {
  return normalizeArchivePath(filePath)?.split('/').filter(Boolean) || []
}

function archiveBaseName(filePath: string): string {
  const segments = splitArchivePath(filePath)
  return segments[segments.length - 1] || ''
}

function archiveExtName(filePath: string): string {
  return path.posix.extname(archiveBaseName(filePath)).toLowerCase()
}

function isFileLike(filePath: string): boolean {
  return archiveBaseName(filePath).includes('.')
}

function isDocFile(filePath: string): boolean {
  const base = archiveBaseName(filePath).toLowerCase()
  return DOC_BASENAMES.has(base) || base.startsWith('readme') || base.startsWith('license') || base.startsWith('changelog')
}

function sanitizeFolderName(name: string, fallback = 'elden_ring_mod'): string {
  const value = String(name || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return value || fallback
}

function isBaseName(filePath: string, name: string): boolean {
  return archiveBaseName(filePath).toLowerCase() === name.toLowerCase()
}

function findFileByBaseName(files: string[], name: string): string | undefined {
  return files.find((file) => isBaseName(file, name))
}

function isUnderSegments(filePath: string, rootSegments: string[]): boolean {
  const segments = splitArchivePath(filePath)
  if (segments.length <= rootSegments.length) return false
  return rootSegments.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())
}

function removeLeadingSegments(filePath: string, count: number): string {
  return splitArchivePath(filePath).slice(count).join('/')
}

function getRootSegmentsForAnchor(anchorFile: string): string[] {
  return splitArchivePath(anchorFile).slice(0, -1)
}

function getFallbackFolderId(stagingPath?: string): string {
  const clean = String(stagingPath || '').replace(/[\\/]+$/, '')
  const leaf = clean.split(/[\\/]/).pop() || 'elden_ring_mod'
  return sanitizeFolderName(leaf.replace(/\.installing$/i, ''), 'elden_ring_mod')
}

function findLooseContentRootIndex(filePath: string): number {
  const segments = splitArchivePath(filePath)
  return segments.findIndex((segment) => LOOSE_CONTENT_ROOTS.has(segment.toLowerCase()))
}

function isModEngineLoader(files: string[]): boolean {
  return !!findFileByBaseName(files, MOD_ENGINE_LAUNCHER)
    && !!findFileByBaseName(files, MOD_ENGINE_DLL)
}

function isDllCandidate(filePath: string): boolean {
  return isFileLike(filePath)
    && archiveExtName(filePath) === '.dll'
    && !isBaseName(filePath, MOD_ENGINE_DLL)
    && !isDocFile(filePath)
}

function collectDllCandidates(files: string[]): string[] {
  return files.filter((file) => normalizeArchivePath(file) && isDllCandidate(file))
}

function findPrimaryDllCandidate(files: string[], preferredNames: string[] = []): string | undefined {
  for (const preferredName of preferredNames) {
    const preferred = findFileByBaseName(files, preferredName)
    if (preferred) return preferred
  }

  const candidates = collectDllCandidates(files)
  if (candidates.length === 1) return candidates[0]
  return undefined
}

function findPreferredDllCandidate(files: string[], preferredNames: string[]): string | undefined {
  for (const preferredName of preferredNames) {
    const preferred = findFileByBaseName(files, preferredName)
    if (preferred) return preferred
  }
  return undefined
}

function hasLooseModContent(files: string[]): boolean {
  return files.some((file) => findLooseContentRootIndex(file) >= 0)
}

function buildLooseRelativePath(filePath: string): string {
  const knownIndex = findLooseContentRootIndex(filePath)
  if (knownIndex >= 0) {
    return removeLeadingSegments(filePath, knownIndex)
  }
  return splitArchivePath(filePath).length > 1
    ? removeLeadingSegments(filePath, 1)
    : archiveBaseName(filePath)
}

function escapeTomlString(value: string): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function normalizeConfigPathSegment(segment: string): string {
  return String(segment).replace(/\\/g, '/').split('/').filter(Boolean).join('\\')
}

function buildExternalDllPath(...segments: string[]): string {
  return segments.map(normalizeConfigPathSegment).filter(Boolean).join('\\')
}

function unescapeTomlString(value: string): string {
  return String(value).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function parseTomlStringArray(text: string, key: string): string[] {
  const match = text.match(new RegExp(`${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm'))
  if (!match) return []
  const values: string[] = []
  const pattern = /"((?:\\.|[^"\\])*)"/g
  let valueMatch: RegExpExecArray | null
  while ((valueMatch = pattern.exec(match[1]))) {
    values.push(unescapeTomlString(valueMatch[1]))
  }
  return values
}

function parseBoolean(text: string, key: string, fallback: boolean): boolean {
  const match = text.match(new RegExp(`${key}\\s*=\\s*(true|false)`, 'i'))
  return match ? match[1].toLowerCase() === 'true' : fallback
}

function parseSection(text: string, sectionName: string): string {
  const lines = String(text || '').split(/\r?\n/)
  const result: string[] = []
  let active = false
  for (const line of lines) {
    const sectionMatch = line.trim().match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      if (active) break
      active = sectionMatch[1] === sectionName
      continue
    }
    if (active) result.push(line)
  }
  return result.join('\n')
}

function parseConfigSettings(text: string): ConfigSettings {
  const modengine = parseSection(text, 'modengine')
  const modLoader = parseSection(text, 'extension.mod_loader')
  const scyllaHide = parseSection(text, 'extension.scylla_hide')
  return {
    debug: parseBoolean(modengine, 'debug', DEFAULT_CONFIG_SETTINGS.debug),
    looseParams: parseBoolean(modLoader, 'loose_params', DEFAULT_CONFIG_SETTINGS.looseParams),
    scyllaHide: parseBoolean(scyllaHide, 'enabled', DEFAULT_CONFIG_SETTINGS.scyllaHide),
  }
}

function parseModLoaderEntries(text: string): ModLoaderEntry[] {
  const match = text.match(/mods\s*=\s*\[([\s\S]*?)\]/m)
  if (!match) return []
  const entries: ModLoaderEntry[] = []
  const pattern = /\{\s*enabled\s*=\s*(true|false)\s*,\s*name\s*=\s*"((?:\\.|[^"\\])*)"\s*,\s*path\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*\}/g
  let entryMatch: RegExpExecArray | null
  while ((entryMatch = pattern.exec(match[1]))) {
    entries.push({
      enabled: entryMatch[1].toLowerCase() === 'true',
      name: unescapeTomlString(entryMatch[2]),
      path: unescapeTomlString(entryMatch[3]),
    })
  }
  return entries
}

// 从一个 mod 文件列表中选择需要交给 Mod Engine 2 加载的 DLL。
function pickExternalDllForFiles(files: string[], folderName: string): string | undefined {
  const dllFiles = files.filter((file) => archiveExtName(file) === '.dll')
  for (const preferred of PREFERRED_EXTERNAL_DLLS) {
    const match = dllFiles.find((file) => archiveBaseName(file).toLowerCase() === preferred)
    if (match) return match
  }

  const rootDlls = dllFiles.filter((file) => {
    const segments = splitArchivePath(file)
    return segments.length === 2 && segments[0].toLowerCase() === folderName.toLowerCase()
  })
  if (rootDlls.length === 1) return rootDlls[0]
  if (dllFiles.length === 1) return dllFiles[0]
  return undefined
}

function managedModFolder(filePath: string): string {
  const segments = splitArchivePath(filePath)
  if (segments.length < 3) return ''
  if (segments[0].toLowerCase() !== MOD_ENGINE_DIR.toLowerCase() || segments[1].toLowerCase() !== 'mod') return ''
  return sanitizeFolderName(segments[2], '')
}

export function discoverExternalDlls(managedPaths: string[]): string[] {
  const filesByFolder = new Map<string, string[]>()
  for (const file of managedPaths) {
    const folder = managedModFolder(file)
    if (!folder || archiveExtName(file) !== '.dll') continue
    const files = filesByFolder.get(folder) || []
    files.push(file)
    filesByFolder.set(folder, files)
  }

  const entries: string[] = []
  for (const [folder, files] of filesByFolder) {
    const dllPath = pickExternalDllForFiles(files.map((file) => {
      const segments = splitArchivePath(file)
      return [folder, ...segments.slice(3)].join('/')
    }), folder)
    if (!dllPath) continue
    const relative = splitArchivePath(dllPath).join('/')
    entries.push(buildExternalDllPath('mod', relative))
  }
  return Array.from(new Set(entries)).sort((a, b) => a.localeCompare(b))
}

function discoverLooseParams(managedPaths: string[]): boolean {
  return managedPaths.some((file) => splitArchivePath(file).some((segment) => segment.toLowerCase() === 'param'))
}

export function discoverModLoaderEntries(managedPaths: string[]): ModLoaderEntry[] {
  const folders = new Map<string, boolean>()
  for (const file of managedPaths) {
    const segments = splitArchivePath(file)
    const folder = managedModFolder(file)
    if (!folder || segments.length < 4) continue
    if (LOOSE_CONTENT_ROOTS.has(segments[3].toLowerCase())) folders.set(folder, true)
  }

  const entries = Array.from(folders.keys()).map((folder) => ({
    enabled: true,
    name: folder,
    path: buildExternalDllPath('mod', folder),
  }))
  return entries.length > 0 ? entries.sort((a, b) => a.name.localeCompare(b.name)) : []
}

function mergeExternalDlls(existing: string[], discovered: string[]): string[] {
  const result: string[] = []
  for (const entry of existing) {
    if (!result.some((value) => value.toLowerCase() === entry.toLowerCase())) result.push(entry)
  }
  for (const entry of discovered) {
    if (!result.some((value) => value.toLowerCase() === entry.toLowerCase())) result.push(entry)
  }
  return result
}

function mergeModLoaderEntries(existing: ModLoaderEntry[], discovered: ModLoaderEntry[]): ModLoaderEntry[] {
  const discoveredByPath = new Map(discovered.map((entry) => [entry.path.toLowerCase(), entry]))
  const result: ModLoaderEntry[] = []

  for (const entry of existing) {
    const discoveredEntry = discoveredByPath.get(entry.path.toLowerCase())
    result.push({
      enabled: entry.enabled ?? discoveredEntry?.enabled ?? true,
      name: entry.name || discoveredEntry?.name || archiveBaseName(entry.path),
      path: entry.path,
    })
  }

  for (const entry of discovered) {
    if (result.some((value) => value.path.toLowerCase() === entry.path.toLowerCase())) continue
    result.push(entry)
  }

  return result.length > 0 ? result : [{ name: 'default', path: 'mod' }]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findTomlArrayEnd(text: string, start: number): number {
  let depth = 0
  let quote = ''
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '[') depth += 1
    if (char === ']') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  return start
}

function updateTomlAssignment(section: string, key: string, value: string): string {
  const match = new RegExp(`(^[\\t ]*${escapeRegExp(key)}[\\t ]*=[\\t ]*)`, 'm').exec(section)
  const newline = section.includes('\r\n') ? '\r\n' : '\n'
  if (!match || match.index === undefined) {
    const separator = section.length === 0 || section.endsWith('\n') ? '' : newline
    return `${section}${separator}${key} = ${value}${newline}`
  }

  const valueStart = match.index + match[0].length
  const arrayEnd = section[valueStart] === '[' ? findTomlArrayEnd(section, valueStart) : valueStart
  if (arrayEnd > valueStart) {
    return `${section.slice(0, valueStart)}${value}${section.slice(arrayEnd)}`
  }

  const lineEnd = section.indexOf('\n', valueStart)
  const valueEnd = lineEnd >= 0 ? lineEnd : section.length
  const commentIndex = section.slice(valueStart, valueEnd).indexOf('#')
  const suffix = commentIndex >= 0 ? section.slice(valueStart + commentIndex, valueEnd) : ''
  return `${section.slice(0, valueStart)}${value}${suffix ? ` ${suffix.trimStart()}` : ''}${section.slice(valueEnd)}`
}

function updateTomlSection(text: string, name: string, values: Array<[string, string]>): string {
  const header = new RegExp(`^[\\t ]*\\[${escapeRegExp(name)}\\][\\t ]*(?:#.*)?$`, 'mi').exec(text)
  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  if (!header || header.index === undefined) {
    const prefix = text.length === 0 ? '' : `${text.endsWith('\n') ? '' : newline}${newline}`
    const body = values.map(([key, value]) => `${key} = ${value}`).join(newline)
    return `${text}${prefix}[${name}]${newline}${body}${newline}`
  }

  const bodyStart = header.index + header[0].length
  const remaining = text.slice(bodyStart)
  const nextHeader = /^[\t ]*\[[^\]]+\]/m.exec(remaining)
  const bodyEnd = nextHeader?.index === undefined ? text.length : bodyStart + nextHeader.index
  let section = text.slice(bodyStart, bodyEnd)
  for (const [key, value] of values) section = updateTomlAssignment(section, key, value)
  return `${text.slice(0, bodyStart)}${section}${text.slice(bodyEnd)}`
}

function formatTomlStringArray(values: string[]): string {
  const lines = values.map((value) => `  "${escapeTomlString(value)}"`)
  return lines.length > 0 ? `[\n${lines.join(',\n')}\n]` : '[]'
}

function formatTomlModEntries(entries: ModLoaderEntry[]): string {
  const lines = (entries.length > 0 ? entries : [{ name: 'default', path: 'mod' }])
    .map((mod) => `  { enabled = ${mod.enabled === false ? 'false' : 'true'}, name = "${escapeTomlString(mod.name)}", path = "${escapeTomlString(mod.path)}" },`)
  return `[\n${lines.join('\n')}\n]`
}

function updateManagedModEngineConfig(text: string, externalDlls: string[], modEntries: ModLoaderEntry[], looseParams: boolean): string {
  let result = updateTomlSection(text, 'modengine', [
    ['external_dlls', formatTomlStringArray(externalDlls)],
  ])
  result = updateTomlSection(result, 'extension.mod_loader', [
    ['loose_params', looseParams ? 'true' : 'false'],
    ['mods', formatTomlModEntries(modEntries)],
  ])
  return result
}

function applyConfigCleanup(
  externalDlls: string[],
  modEntries: ModLoaderEntry[],
  cleanup: ModEngineConfigContribution,
  mode?: ConfigCleanupMode,
): { externalDlls: string[], modEntries: ModLoaderEntry[] } {
  const removedDlls = new Set((cleanup.externalDlls || []).map((entry) => entry.toLowerCase()))
  const removedModPaths = new Set((cleanup.modEntries || []).map((entry) => entry.path.toLowerCase()))
  return {
    externalDlls: externalDlls.filter((entry) => !removedDlls.has(entry.toLowerCase())),
    modEntries: modEntries
      .filter((entry) => mode !== 'uninstall' || !removedModPaths.has(entry.path.toLowerCase()))
      .map((entry) => mode === 'disable' && removedModPaths.has(entry.path.toLowerCase())
        ? { ...entry, enabled: false }
        : entry),
  }
}

// 只把托管部署产生的 DLL 和松散文件写入 Mod Engine 2 配置。
export function refreshModEngineConfig(
  gamePath: string,
  managedPaths: string[] = [],
  cleanup: ModEngineConfigContribution = {},
  cleanupMode?: ConfigCleanupMode,
): string[] {
  const modEnginePath = path.join(gamePath, MOD_ENGINE_DIR)
  fs.mkdirSync(modEnginePath, { recursive: true })
  const configPath = path.join(modEnginePath, MOD_ENGINE_CONFIG)
  const existingConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : ''
  const settings = existingConfig ? parseConfigSettings(existingConfig) : DEFAULT_CONFIG_SETTINGS
  const discoveredExternalDlls = discoverExternalDlls(managedPaths)
  const discoveredModEntries = discoverModLoaderEntries(managedPaths)
  const existingConfigEntries = applyConfigCleanup(
    parseTomlStringArray(existingConfig, 'external_dlls'),
    parseModLoaderEntries(existingConfig),
    cleanup,
    cleanupMode,
  )
  const externalDlls = mergeExternalDlls(existingConfigEntries.externalDlls, discoveredExternalDlls)
  const modEntries = mergeModLoaderEntries(existingConfigEntries.modEntries, discoveredModEntries)
  const looseParams = settings.looseParams || discoverLooseParams(managedPaths)
  const nextConfig = existingConfig
    ? updateManagedModEngineConfig(existingConfig, externalDlls, modEntries, looseParams)
    : buildConfig(externalDlls, modEntries, { ...settings, looseParams })
  fs.writeFileSync(configPath, nextConfig, 'utf8')
  return externalDlls
}

function buildConfig(externalDlls: string[] = [], modEntries: ModLoaderEntry[] = [{ name: 'default', path: 'mod' }], settings: ConfigSettings = DEFAULT_CONFIG_SETTINGS): string {
  return [
    '[modengine]',
    `debug = ${settings.debug ? 'true' : 'false'}`,
    `external_dlls = ${formatTomlStringArray(externalDlls)}`,
    '',
    '[extension.mod_loader]',
    'enabled = true',
    `loose_params = ${settings.looseParams ? 'true' : 'false'}`,
    '',
    'mods = [',
    ...(modEntries.length > 0 ? modEntries : [{ name: 'default', path: 'mod' }])
      .map((mod) => `  { enabled = ${mod.enabled === false ? 'false' : 'true'}, name = "${escapeTomlString(mod.name)}", path = "${escapeTomlString(mod.path)}" },`),
    ']',
    '',
    '[extension.scylla_hide]',
    `enabled = ${settings.scyllaHide ? 'true' : 'false'}`,
    '',
  ].join('\n')
}

export function buildDefaultConfig(externalDlls: string[] = [], modEntries?: ModLoaderEntry[], settings?: ConfigSettings): string {
  return buildConfig(externalDlls, modEntries, settings)
}

// 生成 Steam 使用的短启动脚本，避免把完整游戏路径塞进启动项。
export function buildStarterScript(gamePath: string): string {
  const launcherPath = path.join(gamePath, MOD_ENGINE_DIR, MOD_ENGINE_LAUNCHER)
  const configPath = path.join(gamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG)
  const gameExePath = path.join(gamePath, EXECUTABLE)
  return [
    '@echo off',
    `cd /d "${path.join(gamePath, MOD_ENGINE_DIR)}"`,
    `"${launcherPath}" -t er -c "${configPath}" -p "${gameExePath}"`,
    '',
  ].join('\r\n')
}

export function buildSteamLaunchOptions(gamePath: string): string {
  return `"${path.join(gamePath, MOD_ENGINE_STARTER)}" %command%`
}

function isHeyboxModEngineLaunchOptions(launchOptions: unknown): boolean {
  const value = String(launchOptions || '').toLowerCase()
  return value.includes(MOD_ENGINE_STARTER.toLowerCase())
}

function getUiResponsePayload(response: any): any {
  return response?.payload && typeof response.payload === 'object' ? response.payload : {}
}

// 判断压缩包是否为 Mod Engine 2 本体。
export function testModEngine(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && isModEngineLoader(files),
    requiredFiles: [MOD_ENGINE_LAUNCHER, MOD_ENGINE_DLL],
  }
}

// 将 Mod Engine 2 本体部署到游戏目录下的隔离文件夹。
export function installModEngine(files: string[]) {
  const launcher = findFileByBaseName(files, MOD_ENGINE_LAUNCHER)
  if (!launcher) return { instructions: [], modType: MOD_TYPE_MOD_ENGINE }

  const rootSegments = getRootSegmentsForAnchor(launcher)
  const instructions: InstallInstruction[] = files
    .filter((file) => normalizeArchivePath(file)
      && isFileLike(file)
      && !isBaseName(file, MOD_ENGINE_CONFIG)
      && (rootSegments.length === 0 || isUnderSegments(file, rootSegments)))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: path.posix.join(MOD_ENGINE_DIR, removeLeadingSegments(file, rootSegments.length)),
    }))

  return { instructions, modType: MOD_TYPE_MOD_ENGINE }
}

// 判断压缩包是否包含 ME2 可加载的松散资源目录。
export function testModEngineMod(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && !isModEngineLoader(files) && hasLooseModContent(files),
    requiredFiles: [],
  }
}

// 将松散文件 mod 保持在 ModEngine2/mod/<modName> 下，避免覆盖原版文件。
export function installModEngineMod(files: string[], stagingPath?: string) {
  const folderId = getFallbackFolderId(stagingPath)
  const instructions: CopyInstruction[] = []

  for (const file of files) {
    if (!normalizeArchivePath(file) || !isFileLike(file) || isDocFile(file) || isDllCandidate(file)) continue
    const knownIndex = findLooseContentRootIndex(file)
    const relative = knownIndex >= 0
      ? removeLeadingSegments(file, knownIndex)
      : splitArchivePath(file).length > 1
        ? removeLeadingSegments(file, 1)
        : archiveBaseName(file)
    if (!relative) continue

    instructions.push({
      type: 'copy',
      source: file,
      destination: path.posix.join(MOD_ENGINE_MOD_DIR, folderId, relative),
    })
  }

  instructions.push({
    type: 'attribute',
    key: MOD_ENGINE_CONFIG_ATTRIBUTE,
    value: {
      modEntries: [{ enabled: true, name: folderId, path: buildExternalDllPath('mod', folderId) }],
    },
  })

  return { instructions, modType: MOD_TYPE_MOD_ENGINE_MOD }
}

// 判断压缩包是否为只有一个主 DLL 的注入类 mod。
export function testModEngineDll(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && !isModEngineLoader(files) && !!findPrimaryDllCandidate(files),
    requiredFiles: [],
  }
}

// 安装单主 DLL mod；实际 external_dlls 配置由托管部署刷新阶段维护。
export function installModEngineDll(files: string[], stagingPath?: string) {
  const folderId = getFallbackFolderId(stagingPath)
  const dllSource = findPrimaryDllCandidate(files)
  if (!dllSource) return { instructions: [], modType: MOD_TYPE_MOD_ENGINE_DLL }

  const dllName = archiveBaseName(dllSource)
  const rootSegments = getRootSegmentsForAnchor(dllSource)
  const dllRelative = rootSegments.length > 0 ? removeLeadingSegments(dllSource, rootSegments.length) : dllName
  const instructions: InstallInstruction[] = files
    .filter((file) => normalizeArchivePath(file) && isFileLike(file) && !isDocFile(file) && (rootSegments.length === 0 || isUnderSegments(file, rootSegments)))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: path.posix.join(MOD_ENGINE_MOD_DIR, folderId, removeLeadingSegments(file, rootSegments.length)),
    }))

  instructions.push({
    type: 'attribute',
    key: MOD_ENGINE_CONFIG_ATTRIBUTE,
    value: { externalDlls: [buildExternalDllPath('mod', folderId, dllRelative)] },
  })

  return { instructions, modType: MOD_TYPE_MOD_ENGINE_DLL }
}

// 根据固定 DLL 名称识别 Seamless Coop，避免误识别其他 DLL mod。
export function testSeamlessCoop(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && !isModEngineLoader(files) && !!findPreferredDllCandidate(files, ['elden_ring_seamless_coop.dll', 'ersc.dll']),
    requiredFiles: [],
  }
}

// 安装 Seamless Coop 文件，并由配置刷新阶段登记其主 DLL。
export function installSeamlessCoop(files: string[], stagingPath?: string) {
  const folderId = getFallbackFolderId(stagingPath)
  const dllSource = findPreferredDllCandidate(files, ['elden_ring_seamless_coop.dll', 'ersc.dll'])
  if (!dllSource) return { instructions: [], modType: MOD_TYPE_SEAMLESS_COOP }

  const dllRelative = buildLooseRelativePath(dllSource)
  const instructions: InstallInstruction[] = files
    .filter((file) => normalizeArchivePath(file) && isFileLike(file) && !isDocFile(file))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: path.posix.join(MOD_ENGINE_MOD_DIR, folderId, buildLooseRelativePath(file)),
    }))

  if (!instructions.some((instruction) => instruction.type === 'copy' && instruction.destination === path.posix.join(MOD_ENGINE_MOD_DIR, folderId, dllRelative))) {
    instructions.push({
      type: 'copy',
      source: dllSource,
      destination: path.posix.join(MOD_ENGINE_MOD_DIR, folderId, dllRelative),
    })
  }

  instructions.push({
    type: 'attribute',
    key: MOD_ENGINE_CONFIG_ATTRIBUTE,
    value: { externalDlls: [buildExternalDllPath('mod', folderId, dllRelative)] },
  })

  return { instructions, modType: MOD_TYPE_SEAMLESS_COOP }
}

async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath
}

async function getModEngineStatus(context: IExtensionContext, gamePath?: string) {
  const resolvedGamePath = gamePath || await findGamePath(context) || ''
  const modEnginePath = resolvedGamePath ? path.join(resolvedGamePath, MOD_ENGINE_DIR) : ''
  const launcherPath = modEnginePath ? path.join(modEnginePath, MOD_ENGINE_LAUNCHER) : ''
  const dllPath = modEnginePath ? path.join(modEnginePath, 'modengine2', 'bin', MOD_ENGINE_DLL) : ''
  const configPath = modEnginePath ? path.join(modEnginePath, MOD_ENGINE_CONFIG) : ''
  const installed = !!launcherPath && fs.existsSync(launcherPath) && fs.existsSync(dllPath)

  return {
    installed,
    gamePath: resolvedGamePath,
    modEnginePath,
    launcherPath,
    configPath,
    requirements: installed ? [] : [{
      key: 'elden-ring-mod-engine-2',
      name: 'Mod Engine 2',
      modId: MOD_ENGINE_MOD_ID,
      modType: MOD_TYPE_MOD_ENGINE,
      openModDetailDialog: false,
      requirement: 'enabled',
    }],
  }
}

// 仅在用户启用 Mod Engine 2 后准备其配置和启动脚本。
async function setupModEngineFiles(gamePath: string) {
  if (!gamePath) return
  const modEnginePath = path.join(gamePath, MOD_ENGINE_DIR)
  fs.mkdirSync(path.join(modEnginePath, 'mod'), { recursive: true })

  const configPath = path.join(modEnginePath, MOD_ENGINE_CONFIG)
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, buildDefaultConfig(), 'utf8')
  }

  const starterPath = path.join(gamePath, MOD_ENGINE_STARTER)
  const starterData = buildStarterScript(gamePath)
  if (!fs.existsSync(starterPath) || fs.readFileSync(starterPath, 'utf8') !== starterData) {
    fs.writeFileSync(starterPath, starterData, 'utf8')
  }
}

function readConfigContribution(entry: any): ModEngineConfigContribution {
  const value = entry?.metaInfo?.[MOD_ENGINE_CONFIG_ATTRIBUTE]
  if (!value || typeof value !== 'object') return {}
  return {
    externalDlls: Array.isArray(value.externalDlls) ? value.externalDlls.filter((item: unknown) => typeof item === 'string') : [],
    modEntries: Array.isArray(value.modEntries) ? value.modEntries.filter((item: any) => item && typeof item.path === 'string') : [],
  }
}

type ManagedModEngineState = {
  paths: string[]
  cleanup: ModEngineConfigContribution
}

// 查询托管文件和配置归属，过滤掉用户手动放入 ModEngine2/mod 的文件。
async function getManagedModEngineState(
  context: IExtensionContext,
  removingModKey = '',
): Promise<ManagedModEngineState> {
  const paths: string[] = []
  const cleanup: ModEngineConfigContribution = { externalDlls: [], modEntries: [] }
  const vfs = context.api.vfs
  if (!vfs?.runManagedDeploymentMutation) return { paths, cleanup }

  for (const modType of [MOD_TYPE_SEAMLESS_COOP, MOD_TYPE_MOD_ENGINE_DLL, MOD_TYPE_MOD_ENGINE_MOD]) {
    await vfs.runManagedDeploymentMutation({ modType }, (mutation: any) => {
      for (const entry of Array.isArray(mutation?.entries) ? mutation.entries : []) {
        const contribution = readConfigContribution(entry)
        if (removingModKey && String(entry?.modKey || '') === removingModKey) {
          cleanup.externalDlls?.push(...(contribution.externalDlls || []))
          cleanup.modEntries?.push(...(contribution.modEntries || []))
        }
        if (entry?.exists === false || typeof entry?.targetPath !== 'string') continue
        const normalized = normalizeArchivePath(entry.targetPath)
        if (normalized) paths.push(normalized)
      }
    })
  }

  return {
    paths: Array.from(new Set(paths)),
    cleanup: {
      externalDlls: Array.from(new Set(cleanup.externalDlls)),
      modEntries: Array.from(new Map((cleanup.modEntries || []).map((entry) => [entry.path.toLowerCase(), entry])).values()),
    },
  }
}

// 在托管部署完成后同步 Mod Engine 2 配置。
async function refreshModEngineConfigForContext(
  context: IExtensionContext,
  payload: any = {},
  cleanupMode?: ConfigCleanupMode,
) {
  const gamePath = await findGamePath(context)
  if (!gamePath) return
  const state = await getManagedModEngineState(context, cleanupMode ? String(payload?.modKey || '') : '')
  refreshModEngineConfig(gamePath, state.paths, state.cleanup, cleanupMode)
}

async function ensureSteamLaunchOptions(context: IExtensionContext, gamePath?: string) {
  const resolvedGamePath = gamePath || await findGamePath(context) || ''
  if (!resolvedGamePath) return

  await setupModEngineFiles(resolvedGamePath)
  const expected = buildSteamLaunchOptions(resolvedGamePath)
  const current = await context.api.util.steam.getLaunchOptions(GAME_ID)
  if (current.length > 0 && current.every((entry: any) => String(entry?.launchOptions || '') === expected)) return

  const response = await context.api.util.ui.request({
    type: 'steam_launch_options_confirm',
    title: '配置艾尔登法环 Mod Engine 2 启动项',
    content: [
      '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
      '<strong>将为本机 Steam 游戏写入 Mod Engine 2 启动项，并自动重启 Steam 客户端。</strong>',
      `<code style="box-sizing:border-box;width:100%;padding:10px 12px;border-radius:6px;background:rgba(255,255,255,0.06);font-size:13px;line-height:18px;word-break:break-all;white-space:pre-wrap;">${expected.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`,
      '<small>未携带该启动项运行游戏，可能导致 Mod Engine 2 无法正常加载。</small>',
      '</div>',
    ].join(''),
    confirm: { text: '写入启动项', type: 'primary' },
    cancel: { text: '暂不调整', type: 'cancel', visible: true },
    requiresSteamClosed: true,
    relaunchSteamAfterWrite: true,
  })
  if (!response?.confirmed) return
  if (getUiResponsePayload(response).steamClosed === false) return

  const written = await context.api.util.steam.setLaunchOptions(GAME_ID, expected)
  const verified = await context.api.util.steam.getLaunchOptions(GAME_ID)
  if (written.length === 0 || verified.length === 0 || !verified.every((entry: any) => String(entry?.launchOptions || '') === expected)) {
    context.api.util.ui.notify({
      type: 'elden_ring_modengine_launch_options_failed',
      display: 'toast',
      variant: 'error',
      title: 'Steam 启动项写入失败',
      content: '无法写入 Mod Engine 2 启动项，请完全退出 Steam 后重试。',
    })
    return
  }

  context.api.util.ui.notify({
    type: 'elden_ring_modengine_launch_options_success',
    display: 'toast',
    variant: 'success',
    title: 'Mod Engine 2 启动项已配置',
    content: '现在从 Steam 启动艾尔登法环时将通过 Mod Engine 2 加载。',
  })

  if (getUiResponsePayload(response).relaunchSteam === false) return
  await context.api.util.steam.launchClient()
}

async function clearSteamLaunchOptions(context: IExtensionContext) {
  const current = await context.api.util.steam.getLaunchOptions(GAME_ID)
  if (current.length === 0 || current.every((entry: any) => !isHeyboxModEngineLaunchOptions(entry?.launchOptions))) return

  const response = await context.api.util.ui.request({
    type: 'steam_launch_options_confirm',
    title: '清除艾尔登法环 Mod Engine 2 启动项',
    content: [
      '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
      '<strong>将清空检测到的 Steam 用户启动项，并自动重启 Steam 客户端。</strong>',
      '<small>未启用本 Mod 时携带启动项，可能导致游戏无法正常运行。</small>',
      '</div>',
    ].join(''),
    confirm: { text: '清除启动项', type: 'primary' },
    cancel: { text: '保留启动项', type: 'cancel', visible: true },
    requiresSteamClosed: true,
    relaunchSteamAfterWrite: true,
  })
  if (!response?.confirmed) return
  if (getUiResponsePayload(response).steamClosed === false) return

  const cleared = await context.api.util.steam.clearLaunchOptions(GAME_ID)
  const verified = await context.api.util.steam.getLaunchOptions(GAME_ID)
  if (cleared.length === 0 || verified.some((entry: any) => isHeyboxModEngineLaunchOptions(entry?.launchOptions))) {
    context.api.util.ui.notify({
      type: 'elden_ring_modengine_launch_options_clear_failed',
      display: 'toast',
      variant: 'error',
      title: 'Steam 启动项清除失败',
      content: '请完全退出 Steam 后重试。',
    })
    return
  }

  context.api.util.ui.notify({
    type: 'elden_ring_modengine_launch_options_cleared',
    display: 'toast',
    variant: 'success',
    title: '已恢复原版启动',
    content: '已清除艾尔登法环的 Steam 启动项。',
  })

  if (getUiResponsePayload(response).relaunchSteam === false) return
  await context.api.util.steam.launchClient()
}

function registerModEngineHooks(context: IExtensionContext) {
  context.once(() => {
    if (typeof context.registerManagedDeploymentHook === 'function') {
      context.registerManagedDeploymentHook('afterEnable', { modType: MOD_TYPE_MOD_ENGINE }, async () => ensureSteamLaunchOptions(context))
      context.registerManagedDeploymentHook('afterDisable', { modType: MOD_TYPE_MOD_ENGINE }, async () => clearSteamLaunchOptions(context))
      context.registerManagedDeploymentHook('afterUninstall', { modType: MOD_TYPE_MOD_ENGINE }, async () => clearSteamLaunchOptions(context))
      for (const modType of [MOD_TYPE_SEAMLESS_COOP, MOD_TYPE_MOD_ENGINE_DLL, MOD_TYPE_MOD_ENGINE_MOD]) {
        context.registerManagedDeploymentHook('afterEnable', { modType }, async () => refreshModEngineConfigForContext(context))
        context.registerManagedDeploymentHook('afterDisable', { modType }, async (payload: any) => refreshModEngineConfigForContext(context, payload, 'disable'))
        context.registerManagedDeploymentHook('afterUninstall', { modType }, async (payload: any) => refreshModEngineConfigForContext(context, payload, 'uninstall'))
      }
    }

    context.api.onAsync?.('did-enable-mod-file', async (payload: any) => {
      const modType = String(payload?.modType || payload?.mod_type || payload?.modTypeId || payload?.mod_type_id || '')
      if (modType === MOD_TYPE_MOD_ENGINE) await ensureSteamLaunchOptions(context)
      if (shouldRefreshModEngineConfigForModType(modType)) await refreshModEngineConfigForContext(context, payload)
    })
    context.api.onAsync?.('did-disable-mod-file', async (payload: any) => {
      const modType = String(payload?.modType || payload?.mod_type || payload?.modTypeId || payload?.mod_type_id || '')
      if (modType === MOD_TYPE_MOD_ENGINE) await clearSteamLaunchOptions(context)
      if (shouldRefreshModEngineConfigForModType(modType)) await refreshModEngineConfigForContext(context, payload, 'disable')
    })
  })
}

async function main(context: IExtensionContext): Promise<boolean> {
  let cachedGamePath = ''

  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    modPath: MOD_ENGINE_MOD_DIR,
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      cachedGamePath = await findGamePath(context) || ''
      return cachedGamePath || undefined
    },
    queryModPath: () => MOD_ENGINE_MOD_DIR,
    setup: async (discovery: any) => {
      cachedGamePath = String(discovery?.path || discovery?.gamePath || cachedGamePath || '')
      return getModEngineStatus(context, cachedGamePath)
    },
    environment: { SteamAPPId: STEAM_APP_ID },
    details: {
      steamAppId: GAME_ID,
      customOpenModsPath: MOD_ENGINE_MOD_DIR,
      mergeMods: true,
      supportsSymlinks: true,
    },
  })

  context.registerModType(MOD_TYPE_MOD_ENGINE, 100, (gameId: number | string) => Number(gameId) === GAME_ID, () => path.join('{gamePath}', MOD_ENGINE_DIR), () => Promise.resolve(false), { name: 'Mod Engine 2' })
  context.registerModType(MOD_TYPE_SEAMLESS_COOP, 80, (gameId: number | string) => Number(gameId) === GAME_ID, () => path.join('{gamePath}', MOD_ENGINE_MOD_DIR), () => Promise.resolve(false), { name: 'Seamless Coop' })
  context.registerModType(MOD_TYPE_MOD_ENGINE_DLL, 70, (gameId: number | string) => Number(gameId) === GAME_ID, () => path.join('{gamePath}', MOD_ENGINE_MOD_DIR), () => Promise.resolve(false), { name: 'Mod Engine 2 DLL' })
  context.registerModType(MOD_TYPE_MOD_ENGINE_MOD, 50, (gameId: number | string) => Number(gameId) === GAME_ID, () => path.join('{gamePath}', MOD_ENGINE_MOD_DIR), () => Promise.resolve(false), { name: 'Mod Engine 2 Loose Files' })

  context.registerInstaller(MOD_TYPE_MOD_ENGINE, 100, testModEngine, installModEngine)
  context.registerInstaller(MOD_TYPE_SEAMLESS_COOP, 80, testSeamlessCoop, (files: string[], stagingPath: string) => installSeamlessCoop(files, stagingPath))
  context.registerInstaller(MOD_TYPE_MOD_ENGINE_DLL, 70, testModEngineDll, (files: string[], stagingPath: string) => installModEngineDll(files, stagingPath))
  context.registerInstaller(MOD_TYPE_MOD_ENGINE_MOD, 50, testModEngineMod, (files: string[], stagingPath: string) => installModEngineMod(files, stagingPath))

  context.registerExtensionAction(GAME_ID, 'getModEngineStatus', (gamePath) => getModEngineStatus(context, String(gamePath || '')))
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', (gamePath) => getModEngineStatus(context, String(gamePath || '')))
  context.registerExtensionAction(GAME_ID, 'configureModEngineSteamLaunchOptions', (gamePath) => ensureSteamLaunchOptions(context, String(gamePath || '')))
  context.registerExtensionAction(GAME_ID, 'clearModEngineSteamLaunchOptions', () => clearSteamLaunchOptions(context))

  registerModEngineHooks(context)

  return true
}

export default main
