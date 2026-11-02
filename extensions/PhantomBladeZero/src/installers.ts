import type { IExtensionContext } from 'heybox-mod-api'
import {
  BINARIES_PATH,
  CONTENT_ROOT_DIRECTORIES,
  DLL_EXTENSIONS,
  ENABLED_FILE,
  GAME_FOLDER,
  GAME_ID,
  LOGIC_MODS_PATH,
  LUA_EXTENSIONS,
  MODS_FILE,
  MODS_FILE_BACKUP,
  MOD_TYPE_BINARIES,
  MOD_TYPE_COMBO,
  MOD_TYPE_CONTENT,
  MOD_TYPE_DLL,
  MOD_TYPE_JS,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_PAK_ALT,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UE4SS_FOLDER,
  PAK_MODS_PATH,
  PBZ_MODLOADER_MODS_PATH,
  ROOT_DIRECTORIES,
  JS_ENTRY_FILE,
  UE_CONFIG_INI_NAMES,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_MODS_PATH,
  UE4SS_PROXY_DLLS,
  UE4SS_SETTINGS,
} from './constants'
import {
  archiveBaseName,
  archiveExtName,
  archiveJoin,
  fallbackFolderId,
  findSegment,
  getStagingSourcePath,
  isArchiveFile,
  normalizeArchivePath,
  removeLeadingSegments,
  safeArchivePath,
  splitArchivePath,
} from './paths'

type Instruction = Record<string, unknown>

const PATCH_EXTENSIONS = ['.pak', '.ucas', '.utoc', '.sig']
const FOMOD_CONFIG = /(^|\/)fomod\/moduleconfig\.xml$/i
const CONTENT_MARKERS = new Set(CONTENT_ROOT_DIRECTORIES.map((directory) => directory.toLowerCase()))

function isPbz(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function testResult(supported: boolean) {
  return { supported, requiredFiles: [] }
}

function hasBaseName(files: string[], name: string): boolean {
  const lower = name.toLowerCase()
  return files.some((file) => {
    const filePath = safeArchivePath(file)
    return Boolean(filePath && archiveBaseName(filePath).toLowerCase() === lower)
  })
}

function isFomodPackage(files: string[]): boolean {
  return files.some((source) => {
    const file = safeArchivePath(source)
    return Boolean(file && FOMOD_CONFIG.test(file))
  })
}

function isPakLike(file: string): boolean {
  return PATCH_EXTENSIONS.includes(archiveExtName(file))
}

/** True when the archive holds at least one deployable pak or a complete Io Store pair. */
function hasInstallablePak(files: string[]): boolean {
  const byStem = new Map<string, Set<string>>()
  for (const entry of collectEntries(files)) {
    if (!PATCH_EXTENSIONS.includes(archiveExtName(entry.file))) continue
    const stem = entry.file.slice(0, -archiveExtName(entry.file).length).toLowerCase()
    const extensions = byStem.get(stem) || new Set<string>()
    extensions.add(archiveExtName(entry.file))
    byStem.set(stem, extensions)
  }
  for (const extensions of byStem.values()) {
    if (extensions.has('.pak') || (extensions.has('.utoc') && extensions.has('.ucas'))) return true
  }
  return false
}

function pushUnique(instructions: Instruction[], instruction: Instruction): void {
  const destination = String(instruction.destination).toLowerCase()
  const previous = instructions.find((item) => String(item.destination).toLowerCase() === destination)
  if (!previous) {
    instructions.push(instruction)
    return
  }
  if (previous.type === instruction.type && previous.source === instruction.source) return
  throw new Error(`Phantom Blade Zero: multiple archive files target ${instruction.destination}`)
}

interface PakGroup {
  /** Source of the primary chunk; `.pak` when present, otherwise the `.utoc`. */
  primary: string
  /** File name (no directory) used for the primary chunk destination. */
  baseName: string
  /** File name without its extension, used to derive companion destinations. */
  stem: string
  /** `LogicMods` when the group lives under a LogicMods folder, otherwise undefined. */
  logicRoot?: string[]
  companions: Array<{ source: string; extension: string }>
}

function collectEntries(files: string[]): Array<{ source: string; file: string }> {
  return files.flatMap((source) => {
    const file = safeArchivePath(source)
    return file && isArchiveFile(file, files) ? [{ source, file }] : []
  })
}

function groupPaks(files: string[]): PakGroup[] {
  const entries = collectEntries(files)
  const byStem = new Map<string, Array<{ source: string; file: string; extension: string }>>()
  for (const entry of entries) {
    if (!PATCH_EXTENSIONS.includes(archiveExtName(entry.file))) continue
    const stem = entry.file.slice(0, -archiveExtName(entry.file).length).toLowerCase()
    const list = byStem.get(stem) || []
    list.push({ ...entry, extension: archiveExtName(entry.file) })
    byStem.set(stem, list)
  }

  const groups: PakGroup[] = []
  for (const items of byStem.values()) {
    const pak = items.find((item) => item.extension === '.pak')
    const utoc = items.find((item) => item.extension === '.utoc')
    const ucas = items.find((item) => item.extension === '.ucas')
    const primary = pak ?? utoc ?? ucas

    if (!primary) {
      throw new Error(
        `Phantom Blade Zero: ${normalizeArchivePath(items[0].file)} is a signature file without a .pak or IO Store chunk`,
      )
    }
    if (Boolean(utoc) !== Boolean(ucas)) {
      throw new Error(`Phantom Blade Zero: incomplete IO Store pair for ${normalizeArchivePath(primary.file)}`)
    }

    // A UE5 IoStore mod may ship as .utoc + .ucas with no .pak at all.
    const companions = items.filter((item) => item !== primary)
    const baseName = archiveBaseName(primary.file)
    const logicIndex = findSegment(primary.file, 'LogicMods')
    groups.push({
      primary: primary.source,
      baseName,
      stem: baseName.slice(0, -primary.extension.length),
      logicRoot: logicIndex >= 0 ? splitArchivePath(primary.file).slice(0, logicIndex) : undefined,
      companions: companions.map((item) => ({ source: item.source, extension: item.extension })),
    })
  }
  return groups
}

/**
 * Resolves the deployment instruction for one pak group. LogicMods containers
 * keep their sub-path; ordinary patch containers are flattened into ~mods.
 */
function pakInstructions(group: PakGroup): Instruction[] {
  const instructions: Instruction[] = []
  if (group.logicRoot) {
    const relative = removeLeadingSegments(group.primary, group.logicRoot.length + 1)
    instructions.push({
      type: 'copy',
      source: group.primary,
      destination: archiveJoin(LOGIC_MODS_PATH, relative),
    })
    for (const companion of group.companions) {
      const companionFile = safeArchivePath(companion.source) || ''
      const relativeCompanion = removeLeadingSegments(companionFile, group.logicRoot.length + 1)
      instructions.push({
        type: 'copy',
        source: companion.source,
        destination: archiveJoin(LOGIC_MODS_PATH, relativeCompanion),
      })
    }
    return instructions
  }

  instructions.push({
    type: 'copy',
    source: group.primary,
    destination: archiveJoin(PAK_MODS_PATH, group.baseName),
  })
  for (const companion of group.companions) {
    instructions.push({
      type: 'copy',
      source: companion.source,
      destination: archiveJoin(PAK_MODS_PATH, `${group.stem}${companion.extension}`),
    })
  }
  return instructions
}

/** Proxy DLLs (dwmapi / xinput) that load UE4SS into the game process. */
function isProxyDll(filePath: string): boolean {
  const base = archiveBaseName(filePath).toLowerCase()
  return UE4SS_PROXY_DLLS.some((proxy) => proxy.toLowerCase() === base)
}

function isSettingsFile(filePath: string): boolean {
  return archiveBaseName(filePath).toLowerCase() === UE4SS_SETTINGS.toLowerCase()
}

interface LoaderAnchor {
  rootSegments: string[]
  proxyFiles: string[]
}

/**
 * Locates the loader install root. A valid loader has a proxy DLL (dwmapi /
 * xinput1_3 / xinput1_4) or a UE4SS-settings.ini next to either an `ue4ss/`
 * runtime folder or a flat `UE4SS.dll`.
 */
function findLoaderAnchor(files: string[]): LoaderAnchor | null {
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath) continue
    if (!isProxyDll(filePath) && !isSettingsFile(filePath)) continue
    const rootSegments = splitArchivePath(filePath).slice(0, -1)
    const proxies: string[] = []
    let hasRuntime = false
    for (const candidate of files) {
      const candidatePath = safeArchivePath(candidate)
      if (!candidatePath) continue
      const segments = splitArchivePath(candidatePath)
      const inRoot = rootSegments.every(
        (segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase(),
      )
      if (!inRoot) continue
      const relative = segments.slice(rootSegments.length)
      if (isProxyDll(candidatePath) && relative.length === 1) proxies.push(candidate)
      if (relative.length === 1 && archiveBaseName(candidatePath).toLowerCase() === UE4SS_DLL.toLowerCase()) {
        hasRuntime = true
      }
      if (
        relative.length === 2
        && relative[0].toLowerCase() === 'ue4ss'
        && archiveBaseName(candidatePath).toLowerCase() === UE4SS_DLL.toLowerCase()
      ) {
        hasRuntime = true
      }
    }
    if (hasRuntime) return { rootSegments, proxyFiles: proxies }
  }
  return null
}

function isLoaderLayout(files: string[]): boolean {
  return findLoaderAnchor(files) !== null
}

function findLogicAnchor(files: string[]): string[] | null {
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isPakLike(filePath)) continue
    const idx = findSegment(filePath, 'LogicMods')
    if (idx >= 0) return splitArchivePath(filePath).slice(0, idx)
  }
  return null
}

/**
 * Locates the UE4SS mod root by a payload marker (`Scripts` or `dlls`) and
 * returns the path prefix up to and including the mod folder.
 */
function findUe4ssModRoot(files: string[], marker?: { segment: string, extensions: string[] }): string[] | null {
  const markers = marker
    ? [marker]
    : [
      { segment: 'scripts', extensions: LUA_EXTENSIONS },
      { segment: 'dlls', extensions: DLL_EXTENSIONS },
    ]
  for (const { segment, extensions } of markers) {
    for (const file of files) {
      const filePath = safeArchivePath(file)
      if (!filePath || !extensions.includes(archiveExtName(filePath))) continue
      const segments = splitArchivePath(filePath)
      const markerIndex = segments.findIndex((part) => part.toLowerCase() === segment)
      if (markerIndex < 0) continue
      return segments.slice(0, markerIndex)
    }
  }
  return null
}

const SCRIPT_MARKER = { segment: 'scripts', extensions: LUA_EXTENSIONS }
const DLL_MARKER = { segment: 'dlls', extensions: DLL_EXTENSIONS }

interface JsModRoot {
  /** Folder that contains `main.js`; its tree is deployed verbatim. */
  prefix: string[]
  /** Deployed folder name under `PBZModLoader/mods`; empty when unnamed. */
  folderId: string
}

/**
 * Every PBZModLoader mod folder: a directory holding a `main.js` entry. A
 * trailing `dist` segment is the build output folder, so the name comes from
 * the project folder above it (the loader docs say not to install `dist`).
 */
function collectJsModRoots(files: string[]): JsModRoot[] {
  const found: JsModRoot[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    if (archiveBaseName(filePath).toLowerCase() !== JS_ENTRY_FILE) continue
    const dir = splitArchivePath(filePath).slice(0, -1)
    const key = dir.map((part) => part.toLowerCase()).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    let folderId = dir[dir.length - 1] ?? ''
    if (folderId.toLowerCase() === 'dist') folderId = dir[dir.length - 2] ?? ''
    found.push({ prefix: dir, folderId })
  }
  // A root nested inside another root is that mod's own sub-folder, not a
  // second mod.
  return found.filter((candidate) => !found.some((other) => (
    other !== candidate
    && other.prefix.length < candidate.prefix.length
    && other.prefix.every((segment, index) => (
      candidate.prefix[index]?.toLowerCase() === segment.toLowerCase()
    ))
  )))
}

/**
 * Subfolders that hold a mod's payload rather than being the mod itself.
 * `MyMod/Content/Scripts/x.lua` must land in `Mods/MyMod/Content/Scripts/`,
 * not in `Mods/Content/Scripts/`.
 */
const UE4SS_DATA_FOLDERS = new Set(['content', 'data', 'config', 'configs', 'binaries', 'plugins', 'paks', 'icons', 'menu', 'assets'])

function isDataFolder(segment: string): boolean {
  return UE4SS_DATA_FOLDERS.has(segment.toLowerCase())
}

/**
 * Splits a marker-derived root into the deployed mod folder and the relative
 * path below it. Everything up to the last non-data segment is the prefix that
 * gets re-anchored under `ue4ss/Mods/`.
 */
function splitModRoot(root: string[]): { prefixLength: number, folderId: string } {
  for (let index = root.length - 1; index >= 0; index -= 1) {
    if (isDataFolder(root[index])) continue
    return { prefixLength: index + 1, folderId: root[index] }
  }
  return { prefixLength: root.length, folderId: '' }
}

interface Ue4ssModRoot {
  /** Archive prefix re-anchored under `ue4ss/Mods/<folderId>`. */
  prefix: string[]
  /** Deployed folder name; empty when the archive has no named mod folder. */
  folderId: string
}

/**
 * Every distinct UE4SS mod root in the archive. `Scripts` / `dlls` payload
 * markers name the mod; a named `enabled.txt` folder also counts, so archives
 * that ship dll-only mods (no Scripts tree) are not silently skipped.
 */
function collectUe4ssModRoots(files: string[]): Ue4ssModRoot[] {
  const found: Ue4ssModRoot[] = []
  const seen = new Set<string>()
  const push = (markerIndex: number, segments: string[]) => {
    const root = segments.slice(0, markerIndex)
    const { prefixLength, folderId } = splitModRoot(root)
    const prefix = root.slice(0, prefixLength)
    const key = prefix.map((part) => part.toLowerCase()).join('/')
    if (seen.has(key)) return
    seen.add(key)
    found.push({ prefix, folderId })
  }
  for (const { segment, extensions } of [SCRIPT_MARKER, DLL_MARKER]) {
    for (const file of files) {
      const filePath = safeArchivePath(file)
      if (!filePath || !extensions.includes(archiveExtName(filePath))) continue
      const segments = splitArchivePath(filePath)
      const markerIndex = segments.findIndex((part) => part.toLowerCase() === segment)
      if (markerIndex < 0) continue
      push(markerIndex, segments)
    }
  }
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || archiveBaseName(filePath).toLowerCase() !== ENABLED_FILE.toLowerCase()) continue
    const segments = splitArchivePath(filePath)
    // A root-level enabled.txt has no mod folder name to deploy under.
    if (segments.length < 2) continue
    const markerIndex = segments.length - 1
    push(markerIndex, segments)
  }
  // A root nested inside another root is that mod's own sub-tree (e.g.
  // `ModA/Scripts/...` plus `ModA/Sub/Scripts/...`), not a second mod. Keep the
  // shallowest root so it deploys as one folder instead of sprouting an extra one.
  return found.filter((candidate) => !found.some((other) => (
    other !== candidate
    && other.prefix.length < candidate.prefix.length
    && other.prefix.every((segment, index) => (
      candidate.prefix[index]?.toLowerCase() === segment.toLowerCase()
    ))
  )))
}

/**
 * Anchor on the shallowest recognized game directory. Archives are regularly
 * wrapped one or more levels deep (release folder, extracted game root), so the
 * anchor may sit at any index; everything above it is wrapper noise.
 */
function findRootAnchor(file: string): { anchorIndex: number } | null {
  const segments = splitArchivePath(file)
  const roots = new Set(ROOT_DIRECTORIES.map((directory) => directory.toLowerCase()))
  for (let index = 0; index < segments.length; index += 1) {
    if (roots.has(segments[index].toLowerCase())) return { anchorIndex: index }
  }
  return null
}

/** True when at least one file is laid out from the game install root. */
function isGameRelativeLayout(files: string[]): boolean {
  return files.some((file) => {
    const filePath = safeArchivePath(file)
    return Boolean(filePath && isArchiveFile(file, files) && findRootAnchor(filePath) !== null)
  })
}

/**
 * The index of the first project-relative top segment (`Content` / `Config` /
 * `Binaries`), optionally after one shared wrapper folder.
 */
function findContentAnchor(filePaths: string[]): number | null {
  const parsed = filePaths.map(splitArchivePath).filter((segments) => segments.length > 0)
  if (parsed.length === 0) return null
  const at = (segments: string[], index: number) => (
    segments.length > index + 1 && CONTENT_MARKERS.has(segments[index].toLowerCase())
  )
  // Project-relative tree at the archive root, with optional loose sibling files.
  if (
    parsed.some((segments) => at(segments, 0))
    && parsed.every((segments) => segments.length === 1 || CONTENT_MARKERS.has(segments[0].toLowerCase()))
  ) {
    return 0
  }
  // The same tree wrapped in one mod-name folder.
  const top = parsed[0][0].toLowerCase()
  if (
    parsed.every((segments) => segments[0].toLowerCase() === top)
    && parsed.every((segments) => segments.length >= 2)
    && parsed.some((segments) => at(segments, 1))
  ) {
    return 1
  }
  return null
}

/** Anchor on the `Paks` directory of a bundled project tree (not `~mods`). */
function findPaksAnchor(files: string[]): number | null {
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isPakLike(filePath)) continue
    const idx = findSegment(filePath, 'Paks')
    if (idx < 0) continue
    const segments = splitArchivePath(filePath)
    if (segments.some((segment) => segment.toLowerCase() === '~mods')) continue
    if (segments.some((segment) => segment.toLowerCase() === 'logicmods')) continue
    return idx
  }
  return null
}

/** The directory holding the given marker file, or null. */
function findMarkerDir(files: string[], predicate: (filePath: string) => boolean): string[] | null {
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files) || !predicate(filePath)) continue
    return splitArchivePath(filePath).slice(0, -1)
  }
  return null
}

function isReShadeIni(filePath: string): boolean {
  return archiveBaseName(filePath).toLowerCase() === 'reshade.ini'
}

function isUeConfigIni(filePath: string): boolean {
  return UE_CONFIG_INI_NAMES.includes(archiveBaseName(filePath).toLowerCase())
}

function isLoosePresetIni(filePath: string): boolean {
  return archiveExtName(filePath) === '.ini' && !isReShadeIni(filePath) && !isUeConfigIni(filePath)
}

/** Files under `rootSegments`, with paths relative to it. */
function filesUnderRoot(files: string[], rootSegments: string[]): Array<{ source: string, relative: string }> {
  const result: Array<{ source: string, relative: string }> = []
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    const segments = splitArchivePath(filePath)
    const inRoot = rootSegments.every(
      (segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase(),
    )
    if (!inRoot) continue
    const relative = segments.slice(rootSegments.length).join('/')
    if (!relative) continue
    result.push({ source: file, relative })
  }
  return result
}

function deploySubtree(files: string[], rootSegments: string[], placeAt: string): Instruction[] {
  return filesUnderRoot(files, rootSegments).map(({ source, relative }) => ({
    type: 'copy',
    source,
    destination: archiveJoin(placeAt, relative),
  }))
}

export function testUe4ss(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isGameRelativeLayout(files)
    && isLoaderLayout(files),
  )
}

export function testCombo(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isLoaderLayout(files)
    && !isGameRelativeLayout(files)
    && hasInstallablePak(files)
    // Any identified UE4SS mod root counts, including an enabled.txt-keyed
    // folder that carries no Scripts/dlls tree.
    && collectUe4ssModRoots(files).length > 0,
  )
}

export function testLogic(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isLoaderLayout(files)
    && !isGameRelativeLayout(files)
    && findLogicAnchor(files) !== null,
  )
}

export function testScript(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isLoaderLayout(files)
    && !isGameRelativeLayout(files)
    && findUe4ssModRoot(files, SCRIPT_MARKER) !== null,
  )
}

export function testDll(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isLoaderLayout(files)
    && !isGameRelativeLayout(files)
    && findUe4ssModRoot(files, DLL_MARKER) !== null,
  )
}

/** A UE4SS mod folder keyed only by `enabled.txt`. */
export function testUe4ssFolder(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (findUe4ssModRoot(files) !== null) return testResult(false)
  if (hasInstallablePak(files)) return testResult(false)
  const anchor = findMarkerDir(files, (filePath) => archiveBaseName(filePath).toLowerCase() === ENABLED_FILE.toLowerCase())
  return testResult(anchor !== null && anchor.length > 0)
}

/** A bare `.lua` mod without a Scripts folder. */
export function testLua(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (findUe4ssModRoot(files) !== null || hasInstallablePak(files)) return testResult(false)
  if (hasBaseName(files, ENABLED_FILE)) return testResult(false)
  return testResult(findMarkerDir(files, (filePath) => archiveExtName(filePath) === '.lua') !== null)
}

export function testContent(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  const paths = collectEntries(files).map((entry) => entry.file)
  return testResult(findContentAnchor(paths) !== null)
}

export function testPakAlt(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (!hasInstallablePak(files)) return testResult(false)
  if (findLogicAnchor(files) !== null) return testResult(false)
  return testResult(findPaksAnchor(files) !== null)
}

export function testPak(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (!hasInstallablePak(files)) return testResult(false)
  if (findLogicAnchor(files) !== null) return testResult(false)
  // A bundled project tree (`Paks/` folder) belongs to pak-alt, which keeps it intact.
  if (findPaksAnchor(files) !== null) return testResult(false)
  const paths = collectEntries(files).map((entry) => entry.file)
  if (findContentAnchor(paths) !== null) return testResult(false)
  // Scripts/dlls next to a pak make it a hybrid mod; the combo installer owns that layout.
  if (findUe4ssModRoot(files) !== null) return testResult(false)
  if (hasBaseName(files, ENABLED_FILE)) return testResult(false)
  return testResult(true)
}

/** ReShade proper: an archive shipping ReShade.ini (and its shader tree). */
export function testReshade(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (hasInstallablePak(files)) return testResult(false)
  return testResult(hasBaseName(files, 'ReShade.ini'))
}

/** A bare ReShade preset `.ini` without ReShade itself. */
export function testPreset(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (hasInstallablePak(files) || hasBaseName(files, ENABLED_FILE)) return testResult(false)
  if (hasBaseName(files, 'ReShade.ini')) return testResult(false)
  if (findUe4ssModRoot(files) !== null) return testResult(false)
  return testResult(findMarkerDir(files, isLoosePresetIni) !== null)
}

/** A loose native DLL plugin (ASI/winmm proxies, engine plugins) for the game exe dir. */
export function testBinaryDll(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (hasInstallablePak(files) || hasBaseName(files, ENABLED_FILE)) return testResult(false)
  if (findUe4ssModRoot(files) !== null) return testResult(false)
  // A JavaScript mod folder owns its `main.js` and neighbouring files.
  if (collectJsModRoots(files).length > 0) return testResult(false)
  const hasReshade = hasBaseName(files, 'ReShade.ini')
  if (hasReshade) return testResult(false)
  const paths = collectEntries(files).map((entry) => entry.file)
  if (findContentAnchor(paths) !== null) return testResult(false)
  return testResult(findMarkerDir(files, (filePath) => archiveExtName(filePath) === '.dll') !== null)
}

/** A game-relative tree that already contains the loader itself. */
function isModLoaderLayout(files: string[]): boolean {
  return files.some((file) => {
    const filePath = safeArchivePath(file)
    return Boolean(filePath && findSegment(filePath, 'PBZModLoader') >= 0 && isArchiveFile(file, files))
  })
}

/** A PBZModLoader JavaScript/TypeScript mod folder (has a `main.js` entry). */
export function testJs(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false)
  if (isGameRelativeLayout(files)) return testResult(false)
  if (hasInstallablePak(files) || hasBaseName(files, ENABLED_FILE)) return testResult(false)
  if (findUe4ssModRoot(files) !== null) return testResult(false)
  return testResult(collectJsModRoots(files).length > 0)
}

export function testRoot(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files)) return testResult(false)
  return testResult(isGameRelativeLayout(files))
}

/** `ue4ss/Mods` folder keyed by enabled.txt or a bare Lua payload. */
export function testUe4ssFolderOrLua(files: string[], gameId: number | string) {
  const folder = testUe4ssFolder(files, gameId)
  return folder.supported ? folder : testLua(files, gameId)
}

export function installUe4ssFolderOrLua(files: string[], stagingPath?: string) {
  return testUe4ssFolder(files, GAME_ID).supported
    ? installUe4ssFolder(files, stagingPath)
    : installLua(files, stagingPath)
}

/** ReShade bundle, bare preset, or a loose native DLL plugin. */
export function testBinaries(files: string[], gameId: number | string) {
  const reshade = testReshade(files, gameId)
  if (reshade.supported) return reshade
  const preset = testPreset(files, gameId)
  if (preset.supported) return preset
  return testBinaryDll(files, gameId)
}

export function installBinaries(files: string[]) {
  if (testReshade(files, GAME_ID).supported) return installReshade(files)
  if (testPreset(files, GAME_ID).supported) return installPreset(files)
  return installBinaryDll(files)
}

function readTextSettings(context: IExtensionContext, sourcePath: string, encoding = 'utf8') {
  return context.api.util.fs.readFile(sourcePath, { encoding } as any)
}

async function rewriteSettings(
  context: IExtensionContext,
  file: string,
  stagingPath: string | undefined,
  options: any,
  destination: string,
): Promise<Instruction> {
  try {
    const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile)
    const data = String(await readTextSettings(context, sourcePath))
    return {
      type: 'generatefile',
      data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gim, 'bUseUObjectArrayCache = false'),
      destination,
    }
  } catch {
    return { type: 'copy', source: file, destination }
  }
}

export async function installUe4ss(
  context: IExtensionContext,
  files: string[],
  stagingPath?: string,
  options?: any,
) {
  const anchor = findLoaderAnchor(files)
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS }

  const instructions: Instruction[] = []
  for (const { source, relative } of filesUnderRoot(files, anchor.rootSegments)) {
    const lowerRelative = relative.toLowerCase()

    if (isProxyDll(relative) && !lowerRelative.includes('/')) {
      instructions.push({ type: 'copy', source, destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative)) })
      continue
    }

    if (lowerRelative.startsWith('ue4ss/')) {
      const insideUe4ss = relative.slice('ue4ss/'.length)
      const destination = archiveJoin(BINARIES_PATH, 'ue4ss', insideUe4ss)

      if (insideUe4ss.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
        instructions.push(await rewriteSettings(context, source, stagingPath, options, destination))
        continue
      }

      if (insideUe4ss.toLowerCase() === `mods/${MODS_FILE.toLowerCase()}`) {
        // Store the packaged default beside the live list instead of replacing it.
        // Here mods activate through `enabled.txt`, so the player's own mods.txt
        // entries (CheatManager, console enablers) must never be clobbered.
        instructions.push({
          type: 'copy',
          source,
          destination: archiveJoin(BINARIES_PATH, 'ue4ss', 'Mods', MODS_FILE_BACKUP),
        })
        continue
      }

      instructions.push({ type: 'copy', source, destination })
      continue
    }

    // Flat loader layouts put UE4SS.dll and its settings beside the proxy DLL.
    if (isSettingsFile(relative) && !lowerRelative.includes('/')) {
      instructions.push(await rewriteSettings(context, source, stagingPath, options, archiveJoin(BINARIES_PATH, UE4SS_SETTINGS)))
      continue
    }

    if (DLL_EXTENSIONS.includes(archiveExtName(relative)) && !lowerRelative.includes('/')) {
      instructions.push({ type: 'copy', source, destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative)) })
      continue
    }

    // Anything else that ships with the loader (README, a stray pak) is deployed
    // beside it rather than dropped, matching a whole-archive loader install.
    if (!relative.endsWith('/')) {
      instructions.push({ type: 'copy', source, destination: archiveJoin(BINARIES_PATH, relative) })
    }
  }

  return { instructions, modType: MOD_TYPE_UE4SS }
}

export function installCombo(context: IExtensionContext, files: string[], stagingPath?: string) {
  const instructions: Instruction[] = []
  const pakGroups = groupPaks(files)
  // LogicMods containers (and their info sidecars) route through the LogicMod
  // installer; every other pak group flattens into ~mods.
  for (const instruction of installLogic(files).instructions) pushUnique(instructions, instruction)
  for (const group of pakGroups) {
    if (group.logicRoot) continue
    for (const instruction of pakInstructions(group)) pushUnique(instructions, instruction)
  }

  const modInstall = installUe4ssMod(files, stagingPath, MOD_TYPE_COMBO)
  for (const instruction of modInstall.instructions) {
    if (instruction.type === 'attribute') continue
    pushUnique(instructions, instruction)
  }

  if (instructions.length > 0) {
    instructions.unshift({
      type: 'attribute',
      key: 'phantomBladeZeroPakFiles',
      value: pakGroups.map((group) => group.baseName),
    })
  }

  return { instructions, modType: MOD_TYPE_COMBO }
}

export function installLogic(files: string[]) {
  // Resolve LogicMods per file so archives that nest containers under different
  // wrappers still deploy all of them instead of only the first anchor. Non-pak
  // sidecars inside the folder (logicmod info files) ride along unchanged.
  const instructions: Instruction[] = []
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    const idx = findSegment(filePath, 'LogicMods')
    if (idx < 0) continue
    const relative = splitArchivePath(filePath).slice(idx + 1).join('/')
    if (!relative) continue
    pushUnique(instructions, {
      type: 'copy',
      source: file,
      destination: archiveJoin(LOGIC_MODS_PATH, relative),
    })
  }
  return { instructions, modType: MOD_TYPE_LOGIC }
}

export function installUe4ssMod(files: string[], stagingPath: string | undefined, modType: string) {
  const roots = collectUe4ssModRoots(files)
  if (roots.length === 0) return { instructions: [] as Instruction[], modType }

  const fallbackId = fallbackFolderId(stagingPath)
  const resolved = roots.map((root) => ({
    prefix: root.prefix,
    folderId: root.folderId || fallbackId,
  }))

  // Two different roots must not collapse into one folder: their files would
  // silently merge into a single mod.
  const claimed = new Map<string, string>()
  for (const root of resolved) {
    const key = root.folderId.toLowerCase()
    const prefixKey = root.prefix.join('/').toLowerCase()
    const previous = claimed.get(key)
    if (previous !== undefined && previous !== prefixKey) {
      throw new Error(
        `Phantom Blade Zero: two UE4SS mods in this archive are named "${root.folderId}" (${previous || '<archive root>'} and ${prefixKey || '<archive root>'}); rename one so the folders stay separate`,
      )
    }
    claimed.set(key, prefixKey)
  }

  // The deepest matching prefix owns a file, so nested roots never deploy the
  // same file twice.
  const ordered = [...resolved].sort((a, b) => b.prefix.length - a.prefix.length)
  const instructions: Instruction[] = [
    { type: 'attribute', key: 'phantomBladeZeroUe4ssFolderId', value: resolved[0].folderId },
  ]
  if (resolved.length > 1) {
    instructions.push({
      type: 'attribute',
      key: 'phantomBladeZeroUe4ssFolderIds',
      value: resolved.map((root) => root.folderId),
    })
  }

  const enabledFolders = new Set<string>()
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    // Pak chunks belong to ~mods, never inside a UE4SS mod folder.
    if (isPakLike(filePath)) continue
    const segments = splitArchivePath(filePath)
    const owner = ordered.find((root) => (
      root.prefix.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())
    ))
    if (!owner) continue

    let destination: string | null = null
    // A path already inside a `ue4ss/Mods` tree keeps its folder name.
    const ue4ssModsIndex = segments.findIndex((segment, index) => (
      segment.toLowerCase() === 'ue4ss' && segments[index + 1]?.toLowerCase() === 'mods'
    ))
    if (ue4ssModsIndex >= 0 && segments.length > ue4ssModsIndex + 2) {
      const relativePath = segments.slice(ue4ssModsIndex + 2).join('/')
      if (relativePath) destination = archiveJoin(UE4SS_MODS_PATH, relativePath)
    }
    if (!destination) {
      const relativePath = segments.slice(owner.prefix.length).join('/')
      if (!relativePath) continue
      destination = archiveJoin(UE4SS_MODS_PATH, owner.folderId, relativePath)
    }

    if (archiveBaseName(filePath).toLowerCase() === ENABLED_FILE.toLowerCase()) {
      enabledFolders.add(destination.split('/').slice(0, -1).join('/').toLowerCase())
    }
    pushUnique(instructions, { type: 'copy', source: file, destination })
  }

  // Every deployed mod folder gets an enabled.txt so UE4SS actually loads it.
  for (const root of resolved) {
    const folderPath = archiveJoin(UE4SS_MODS_PATH, root.folderId)
    const deployed = instructions.some((instruction) => (
      instruction.type === 'copy'
      && String(instruction.destination).toLowerCase().startsWith(`${folderPath.toLowerCase()}/`)
    ))
    if (!deployed || enabledFolders.has(folderPath.toLowerCase())) continue
    instructions.push({
      type: 'generatefile',
      data: '',
      destination: archiveJoin(folderPath, ENABLED_FILE),
    })
  }

  return { instructions, modType }
}

export function installScript(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, MOD_TYPE_SCRIPT)
}

export function installDll(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, MOD_TYPE_DLL)
}

/**
 * Installs `enabled.txt`-keyed mod folder(s) under `ue4ss/Mods/`. Delegates to
 * the shared multi-root installer so an archive shipping several mod folders
 * deploys all of them instead of only the first.
 */
export function installUe4ssFolder(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, MOD_TYPE_UE4SS_FOLDER)
}

/** Installs a bare `.lua` payload as a UE4SS mod folder. */
export function installLua(files: string[], stagingPath?: string) {
  const anchor = findMarkerDir(files, (filePath) => archiveExtName(filePath) === '.lua')
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS_FOLDER }
  const folderId = anchor.length > 0 ? anchor[anchor.length - 1] : fallbackFolderId(stagingPath)
  const rootSegments = anchor.length > 0 ? anchor : []
  const instructions: Instruction[] = [
    { type: 'attribute', key: 'phantomBladeZeroUe4ssFolderId', value: folderId },
    ...deploySubtree(files, rootSegments, archiveJoin(UE4SS_MODS_PATH, folderId)),
    {
      type: 'generatefile',
      data: '',
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, ENABLED_FILE),
    },
  ]
  return { instructions, modType: MOD_TYPE_UE4SS_FOLDER }
}

export function installContent(files: string[]) {
  const paths = collectEntries(files).map((entry) => entry.file)
  const anchor = findContentAnchor(paths)
  if (anchor === null) return { instructions: [], modType: MOD_TYPE_CONTENT }
  const instructions: Instruction[] = []
  for (const { source, file } of collectEntries(files)) {
    const segments = splitArchivePath(file)
    const relativePath = segments.slice(anchor).join('/')
    if (!relativePath) continue
    pushUnique(instructions, {
      type: 'copy',
      source,
      destination: archiveJoin(GAME_FOLDER, relativePath),
    })
  }
  return { instructions, modType: MOD_TYPE_CONTENT }
}

/** Keeps a bundled `Paks/` tree under `ProjectPBZ/Content`. */
export function installPakAlt(files: string[]) {
  const anchor = findPaksAnchor(files)
  if (anchor === null) return { instructions: [], modType: MOD_TYPE_PAK_ALT }
  const instructions: Instruction[] = []
  for (const { source, file } of collectEntries(files)) {
    const segments = splitArchivePath(file)
    if (segments.length <= anchor) continue
    const relativePath = segments.slice(anchor).join('/')
    pushUnique(instructions, {
      type: 'copy',
      source,
      destination: archiveJoin(GAME_FOLDER, 'Content', relativePath),
    })
  }
  return { instructions, modType: MOD_TYPE_PAK_ALT }
}

export function installPak(context: IExtensionContext, files: string[]) {
  const groups = groupPaks(files)
  const instructions: Instruction[] = []
  for (const group of groups) {
    for (const instruction of pakInstructions(group)) pushUnique(instructions, instruction)
  }
  if (instructions.length > 0) {
    instructions.unshift({
      type: 'attribute',
      key: 'phantomBladeZeroPakFiles',
      value: groups.map((group) => group.baseName),
    })
  }
  return { instructions, modType: MOD_TYPE_PAK }
}

function installIntoBinaries(files: string[], anchor: string[] | null, modType: string) {
  if (!anchor) return { instructions: [] as Instruction[], modType }
  return {
    instructions: deploySubtree(files, anchor, BINARIES_PATH),
    modType,
  }
}

/** ReShade bundle: its whole folder (ini + shader tree) goes beside the game exe. */
export function installReshade(files: string[]) {
  return installIntoBinaries(files, findMarkerDir(files, isReShadeIni), MOD_TYPE_BINARIES)
}

/** Bare ReShade preset `.ini`. */
export function installPreset(files: string[]) {
  return installIntoBinaries(files, findMarkerDir(files, isLoosePresetIni), MOD_TYPE_BINARIES)
}

/** Loose native DLL plugin(s); each plugin folder is flattened beside the game exe. */
export function installBinaryDll(files: string[]) {
  const anchors: string[][] = []
  const seen = new Set<string>()
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files) || archiveExtName(filePath) !== '.dll') continue
    const dir = splitArchivePath(filePath).slice(0, -1)
    const key = dir.map((part) => part.toLowerCase()).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    anchors.push(dir)
  }
  const instructions: Instruction[] = []
  for (const anchor of anchors) {
    for (const instruction of deploySubtree(files, anchor, BINARIES_PATH)) pushUnique(instructions, instruction)
  }
  return { instructions, modType: MOD_TYPE_BINARIES }
}

/**
 * Installs PBZModLoader mod folders under `ProjectPBZ/PBZModLoader/mods/`.
 * The whole folder that holds `main.js` is copied verbatim, never just the
 * entry file, which is what the loader's discovery expects.
 */
export function installJs(files: string[], stagingPath?: string) {
  const roots = collectJsModRoots(files)
  if (roots.length === 0) return { instructions: [] as Instruction[], modType: MOD_TYPE_JS }

  const fallbackId = fallbackFolderId(stagingPath, 'PBZMod')
  const resolved = roots.map((root) => ({
    prefix: root.prefix,
    folderId: root.folderId || fallbackId,
  }))

  // Two mods must never collapse into one folder.
  const claimed = new Map<string, string>()
  for (const root of resolved) {
    const key = root.folderId.toLowerCase()
    const prefixKey = root.prefix.join('/').toLowerCase()
    const previous = claimed.get(key)
    if (previous !== undefined && previous !== prefixKey) {
      throw new Error(
        `Phantom Blade Zero: two PBZModLoader mods in this archive are named "${root.folderId}" (${previous || '<archive root>'} and ${prefixKey || '<archive root>'}); rename one so the folders stay separate`,
      )
    }
    claimed.set(key, prefixKey)
  }

  // The deepest matching prefix owns a file, so nested roots never deploy twice.
  const ordered = [...resolved].sort((a, b) => b.prefix.length - a.prefix.length)
  const instructions: Instruction[] = [
    { type: 'attribute', key: 'phantomBladeZeroJsModIds', value: resolved.map((root) => root.folderId) },
  ]

  for (const { source, file } of collectEntries(files)) {
    const segments = splitArchivePath(file)
    const owner = ordered.find((root) => (
      root.prefix.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())
    ))
    if (!owner) continue
    const relativePath = segments.slice(owner.prefix.length).join('/')
    if (!relativePath) continue
    pushUnique(instructions, {
      type: 'copy',
      source,
      destination: archiveJoin(PBZ_MODLOADER_MODS_PATH, owner.folderId, relativePath),
    })
  }

  return { instructions, modType: MOD_TYPE_JS }
}

export function installRoot(files: string[]) {
  const instructions: Instruction[] = []
  for (const { source, file } of collectEntries(files)) {
    const anchor = findRootAnchor(file)
    if (!anchor) continue
    const destination = splitArchivePath(file).slice(anchor.anchorIndex).join('/')
    pushUnique(instructions, { type: 'copy', source, destination })
  }
  return { instructions, modType: MOD_TYPE_ROOT }
}
