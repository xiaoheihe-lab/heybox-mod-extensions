import type { IExtensionContext } from 'heybox-mod-api'
import {
  BINARIES_PATH,
  DLL_EXTENSIONS,
  ENABLED_FILE,
  GAME_ID,
  LOGIC_MODS_PATH,
  LUA_EXTENSIONS,
  MODS_FILE,
  MODS_FILE_BACKUP,
  MOD_TYPE_COMBO,
  MOD_TYPE_DLL,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_UE4SS,
  PAK_MODS_PATH,
  ROOT_DIRECTORIES,
  UE4SS_DLL,
  UE4SS_DWMAPI,
  UE4SS_MODS_PATH,
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

/** Explicit load-order list of a UE4SS install must never be treated as a mod payload. */
function isUe4ssRuntime(files: string[]): boolean {
  return hasBaseName(files, UE4SS_DWMAPI) && hasBaseName(files, UE4SS_DLL)
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

function findUe4ssAnchor(files: string[]): { rootSegments: string[], dwmapiFile: string } | null {
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || archiveBaseName(filePath).toLowerCase() !== UE4SS_DWMAPI) continue
    const rootSegments = splitArchivePath(filePath).slice(0, -1)
    const dllSegments = [...rootSegments, 'ue4ss', UE4SS_DLL]
    const hasRuntime = files.some((candidate) => {
      const candidatePath = safeArchivePath(candidate)
      if (!candidatePath) return false
      const segments = splitArchivePath(candidatePath)
      return segments.length === dllSegments.length
        && dllSegments.every((segment, index) => segments[index].toLowerCase() === segment.toLowerCase())
    })
    if (hasRuntime) return { rootSegments, dwmapiFile: file }
  }
  return null
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

/** Every distinct UE4SS mod root in the archive, with nested duplicates collapsed. */
function collectUe4ssModRoots(files: string[]): string[][] {
  const found: string[][] = []
  const seen = new Set<string>()
  for (const { segment, extensions } of [SCRIPT_MARKER, DLL_MARKER]) {
    for (const file of files) {
      const filePath = safeArchivePath(file)
      if (!filePath || !extensions.includes(archiveExtName(filePath))) continue
      const segments = splitArchivePath(filePath)
      const markerIndex = segments.findIndex((part) => part.toLowerCase() === segment)
      if (markerIndex < 0) continue
      const root = segments.slice(0, markerIndex)
      const { prefixLength } = splitModRoot(root)
      const key = root.slice(0, prefixLength).map((part) => part.toLowerCase()).join('/')
      if (seen.has(key)) continue
      seen.add(key)
      found.push(root)
    }
  }
  return found
}

/**
 * A root mod replaces files in place. Layouts owned by a dedicated modifier are
 * excluded so the same file is never deployed through two routes.
 */
function isDedicatedModLayout(filePath: string): boolean {
  const segments = splitArchivePath(filePath)
  const lower = segments.map((segment) => segment.toLowerCase())
  // The UE4SS runtime is installed as a whole by its own mod type.
  if (lower.includes('ue4ss')) return true
  if (lower.includes('logicmods')) return true
  // Game content paks belong to the pak installer; engine paks are left to root mods.
  if (isPakLike(filePath) && lower.includes('projectpbz') && lower.includes('paks')) return true
  return false
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

export function testUe4ss(files: string[], gameId: number | string) {
  return testResult(isPbz(gameId) && !isFomodPackage(files) && findUe4ssAnchor(files) !== null)
}

export function testCombo(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isUe4ssRuntime(files)
    // A pak plus a UE4SS payload needs both halves deployed; the combo installer
    // routes LogicMods containers and ~mods containers to their own folders.
    && hasInstallablePak(files)
    && findUe4ssModRoot(files) !== null,
  )
}

export function testLogic(files: string[], gameId: number | string) {
  return testResult(isPbz(gameId) && !isFomodPackage(files) && findLogicAnchor(files) !== null)
}

export function testScript(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isUe4ssRuntime(files)
    && findUe4ssModRoot(files, SCRIPT_MARKER) !== null,
  )
}

export function testDll(files: string[], gameId: number | string) {
  return testResult(
    isPbz(gameId)
    && !isFomodPackage(files)
    && !isUe4ssRuntime(files)
    && findUe4ssModRoot(files, DLL_MARKER) !== null,
  )
}

export function testPak(files: string[], gameId: number | string) {
  const supported = isPbz(gameId)
    && !isFomodPackage(files)
    && hasInstallablePak(files)
    && findLogicAnchor(files) === null
    // Scripts/dlls next to a pak make it a hybrid mod; the combo installer owns that layout.
    && findUe4ssModRoot(files) === null
    && !findUe4ssAnchor(files)
  return testResult(supported)
}

export function testRoot(files: string[], gameId: number | string) {
  if (!isPbz(gameId) || isFomodPackage(files)) return testResult(false)
  // A complete UE4SS proxy install is the UE4SS mod type, never a root pack.
  if (findUe4ssAnchor(files) !== null) return testResult(false)
  const anchored = files.some((file) => {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files) || isDedicatedModLayout(filePath)) return false
    return findRootAnchor(filePath) !== null
  })
  return testResult(anchored)
}

function readTextSettings(context: IExtensionContext, sourcePath: string, encoding = 'utf8') {
  return context.api.util.fs.readFile(sourcePath, { encoding } as any)
}

export async function installUe4ss(
  context: IExtensionContext,
  files: string[],
  stagingPath?: string,
  options?: any,
) {
  const anchor = findUe4ssAnchor(files)
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS }

  const instructions: Instruction[] = []
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    const segments = splitArchivePath(filePath)
    const inRoot = anchor.rootSegments.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())
    if (!inRoot) continue

    const relative = segments.slice(anchor.rootSegments.length).join('/')
    const lowerRelative = relative.toLowerCase()

    if (lowerRelative === UE4SS_DWMAPI.toLowerCase()) {
      instructions.push({
        type: 'copy',
        source: file,
        destination: archiveJoin(BINARIES_PATH, UE4SS_DWMAPI),
      })
      continue
    }

    if (lowerRelative.startsWith('ue4ss/')) {
      const insideUe4ss = relative.slice('ue4ss/'.length)
      const destination = archiveJoin(BINARIES_PATH, 'ue4ss', insideUe4ss)

      if (insideUe4ss.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
        try {
          const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile)
          const data = String(await readTextSettings(context, sourcePath))
          instructions.push({
            type: 'generatefile',
            data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gim, 'bUseUObjectArrayCache = false'),
            destination,
          })
        } catch {
          instructions.push({ type: 'copy', source: file, destination })
        }
        continue
      }

      if (insideUe4ss.toLowerCase() === `mods/${MODS_FILE.toLowerCase()}`) {
        // Store the packaged default beside the live list instead of replacing it.
        // Here mods activate through `enabled.txt`, so the player's own mods.txt
        // entries (CheatManager, console enablers) must never be clobbered.
        instructions.push({
          type: 'copy',
          source: file,
          destination: archiveJoin(BINARIES_PATH, 'ue4ss', 'Mods', MODS_FILE_BACKUP),
        })
        continue
      }

      instructions.push({ type: 'copy', source: file, destination })
      continue
    }

    const isRootDll = DLL_EXTENSIONS.includes(archiveExtName(relative)) && segments.length === anchor.rootSegments.length + 1
    if (isRootDll) {
      instructions.push({
        type: 'copy',
        source: file,
        destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative)),
      })
    }
  }

  return { instructions, modType: MOD_TYPE_UE4SS }
}

export function installCombo(context: IExtensionContext, files: string[], stagingPath?: string) {
  const instructions: Instruction[] = []
  const pakGroups = groupPaks(files)
  for (const group of pakGroups) {
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
  // wrappers still deploy all of them instead of only the first anchor.
  const instructions: Instruction[] = []
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files) || !isPakLike(filePath)) continue
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
  if (roots.length > 1) {
    const names = roots.map((root) => splitModRoot(root).folderId || '<archive root>').join(', ')
    throw new Error(
      `Phantom Blade Zero: the archive contains ${roots.length} UE4SS mods (${names}); install them one at a time so their folders stay separate`,
    )
  }

  const root = roots[0]
  const { prefixLength, folderId: detectedFolder } = splitModRoot(root)
  const folderId = detectedFolder || fallbackFolderId(stagingPath)
  const instructions: Instruction[] = [
    { type: 'attribute', key: 'phantomBladeZeroUe4ssFolderId', value: folderId },
  ]
  let hasEnabledFile = false

  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files)) continue
    // Pak chunks belong to ~mods, never inside a UE4SS mod folder.
    if (isPakLike(filePath)) continue
    const segments = splitArchivePath(filePath)
    const inRoot = root.slice(0, prefixLength).every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())
    if (!inRoot) continue
    const relative = segments.slice(prefixLength).join('/')
    if (!relative) continue
    if (archiveBaseName(relative).toLowerCase() === ENABLED_FILE.toLowerCase()) hasEnabledFile = true
    pushUnique(instructions, {
      type: 'copy',
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, relative),
    })
  }

  if (!hasEnabledFile && instructions.some((instruction) => instruction.type === 'copy')) {
    instructions.push({
      type: 'generatefile',
      data: '',
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, ENABLED_FILE),
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

export function installRoot(files: string[]) {
  const instructions: Instruction[] = []
  if (findUe4ssAnchor(files) !== null) return { instructions, modType: MOD_TYPE_ROOT }
  for (const file of files) {
    const filePath = safeArchivePath(file)
    if (!filePath || !isArchiveFile(file, files) || isDedicatedModLayout(filePath)) continue
    const anchor = findRootAnchor(filePath)
    if (!anchor) continue
    const destination = splitArchivePath(filePath).slice(anchor.anchorIndex).join('/')
    pushUnique(instructions, { type: 'copy', source: file, destination })
  }
  return { instructions, modType: MOD_TYPE_ROOT }
}
