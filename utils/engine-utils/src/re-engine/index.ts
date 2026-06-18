import type { IExtensionContext } from 'heybox-mod-api'

export type CopyInstruction = {
  type: 'copy'
  source: string
  destination: string
}

export type AttributeInstruction = {
  type: 'attribute'
  key: string
  value: unknown
}

export type InstallInstruction = CopyInstruction | AttributeInstruction

export type InstallerResult = {
  instructions: InstallInstruction[]
  modType?: string
  modTypeId?: string
}

type FileEntry = {
  source: string
  segments: string[]
}

type PathApi = IExtensionContext['api']['util']['path']
type FsApi = IExtensionContext['api']['util']['fs']

type TesterResult = {
  supported: boolean
  requiredFiles: string[]
}

type ReEngineFileFlags = {
  hasDinput: boolean
  hasReframework: boolean
  hasAutorun: boolean
  hasPlugins: boolean
  hasNatives: boolean
  hasPak: boolean
}

export type ReEnginePakDeployment = {
  engineFamily: 're-engine'
  normalizeGroup: string
  originalArchivePath: string
  deployedFilename: string
  patchNumber: number
}

export type ManagedDeploymentEntry = {
  modKey: string
  modId?: number
  fileId?: number
  versionId?: number
  modType?: string
  targetPath: string
  absolutePath: string
  expectedHash: string
  currentHash?: string | null
  exists?: boolean
  metaInfo?: Record<string, unknown>
}

export type ManagedDeploymentGameFile = {
  targetPath: string
  absolutePath: string
  hash?: string | null
  exists?: boolean
  managed?: boolean
}

export type ManagedDeploymentMutation = {
  gamePath: string
  entries: ManagedDeploymentEntry[]
  gameFiles?: ManagedDeploymentGameFile[]
  moveDeployment(input: { modKey: string; from: string; to: string; expectedHash?: string }): void
  adoptDeployment?(input: { modKey: string; from: string; to: string; expectedHash?: string }): void
  setModMetadata(input: { modKey: string; patch: Record<string, unknown> }): void
  warn?(message: string, details?: Record<string, unknown>): void
}

export type ManagedDeploymentHookPhase = 'afterEnable' | 'afterDisable' | 'afterUninstall'

type ManagedDeploymentHookRegistrar = IExtensionContext & {
  registerManagedDeploymentHook?: (
    phase: ManagedDeploymentHookPhase,
    options: { modType?: string },
    callback: (payload: Record<string, unknown>) => unknown | Promise<unknown>
  ) => void
}

function isUnsafeSegment(segment: string): boolean {
  return segment === '.' || segment === '..' || segment.includes('\0')
}

export function normalizeArchivePath(filePath: string): string | null {
  const raw = String(filePath || '')
  if (raw.includes('\0') || raw.includes('://')) return null

  const normalized = raw
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^(\.\/)+/g, '')
    .replace(/\/+/g, '/')
    .trim()

  if (!normalized || normalized.endsWith('/')) return null
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null

  const segments = normalized.split('/').filter(Boolean)
  if (segments.some(isUnsafeSegment)) return null

  return segments.join('/')
}

export function normalizeEntries(files: string[]): FileEntry[] {
  return files
    .map((file) => {
      const source = normalizeArchivePath(file)
      if (!source) return null
      return {
        source,
        segments: source.split('/'),
      }
    })
    .filter(Boolean) as FileEntry[]
}

export function archiveBaseName(filePath: string): string {
  const normalized = normalizeArchivePath(filePath)
  if (!normalized) return ''
  const parts = normalized.split('/')
  return parts[parts.length - 1] || ''
}

export function archiveExtName(filePath: string): string {
  const base = archiveBaseName(filePath)
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot).toLowerCase() : ''
}

function hasSegment(entry: FileEntry, marker: string): boolean {
  const expected = marker.toLowerCase()
  return entry.segments.some((segment) => segment.toLowerCase() === expected)
}

function findSegmentIndex(entry: FileEntry, marker: string): number {
  const expected = marker.toLowerCase()
  return entry.segments.findIndex((segment) => segment.toLowerCase() === expected)
}

function joinPath(pathApi: PathApi, ...segments: string[]): string {
  return pathApi.join(...segments.filter(Boolean))
}

function getFileFlags(files: string[]): ReEngineFileFlags {
  const flags: ReEngineFileFlags = {
    hasDinput: false,
    hasReframework: false,
    hasAutorun: false,
    hasPlugins: false,
    hasNatives: false,
    hasPak: false,
  }

  for (const entry of normalizeEntries(files)) {
    const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || ''
    if (base === 'dinput8.dll') flags.hasDinput = true
    if (hasSegment(entry, 'reframework')) flags.hasReframework = true
    if (hasSegment(entry, 'autorun')) flags.hasAutorun = true
    if (hasSegment(entry, 'plugins')) flags.hasPlugins = true
    if (hasSegment(entry, 'natives')) flags.hasNatives = true
    if (archiveExtName(entry.source) === '.pak') flags.hasPak = true
  }

  return flags
}

function toTesterResult(gameId: number | string, expectedGameId: number, supported: boolean): TesterResult {
  return {
    supported: Number(gameId) === expectedGameId && supported,
    requiredFiles: [],
  }
}

export function testReEngineReframeworkLoader(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  return toTesterResult(gameId, expectedGameId, getFileFlags(files).hasDinput)
}

export function testReEngineReframework(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  const flags = getFileFlags(files)
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && flags.hasReframework)
}

export function testReEngineAutorun(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  const flags = getFileFlags(files)
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && flags.hasAutorun)
}

export function testReEnginePlugins(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  const flags = getFileFlags(files)
  return toTesterResult(
    gameId,
    expectedGameId,
    !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && flags.hasPlugins
  )
}

export function testReEngineNatives(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  const flags = getFileFlags(files)
  return toTesterResult(
    gameId,
    expectedGameId,
    !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && !flags.hasPlugins && flags.hasNatives
  )
}

export function testReEnginePak(files: string[], gameId: number | string, expectedGameId: number): TesterResult {
  const flags = getFileFlags(files)
  return toTesterResult(
    gameId,
    expectedGameId,
    !flags.hasDinput
      && !flags.hasReframework
      && !flags.hasAutorun
      && !flags.hasPlugins
      && !flags.hasNatives
      && flags.hasPak
  )
}

export function buildMarkerFolderInstructions(
  pathApi: PathApi,
  files: string[],
  markerFolder: string,
  targetPrefix: string[]
): CopyInstruction[] {
  const instructions: CopyInstruction[] = []
  for (const entry of normalizeEntries(files)) {
    const markerIndex = findSegmentIndex(entry, markerFolder)
    if (markerIndex < 0) continue

    const suffix = entry.segments.slice(markerIndex + 1)
    if (suffix.length === 0) continue

    instructions.push({
      type: 'copy',
      source: entry.source,
      destination: joinPath(pathApi, ...targetPrefix, ...suffix),
    })
  }
  return instructions
}

export function buildReframeworkSiblingInstructions(pathApi: PathApi, files: string[]): CopyInstruction[] {
  const entries = normalizeEntries(files)
  const roots = new Set<string>()
  for (const entry of entries) {
    const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || ''
    if (base === 'dinput8.dll') {
      roots.add(entry.segments.slice(0, -1).join('/'))
    }
  }

  const instructions: CopyInstruction[] = []
  const seen = new Set<string>()
  for (const root of roots) {
    const rootSegments = root ? root.split('/') : []
    for (const entry of entries) {
      if (entry.segments.length <= rootSegments.length) continue
      const underRoot = rootSegments.every((segment, index) => entry.segments[index] === segment)
      if (!underRoot) continue

      const relativeSegments = entry.segments.slice(rootSegments.length)
      const key = `${entry.source}\0${relativeSegments.join('/')}`
      if (seen.has(key)) continue
      seen.add(key)

      instructions.push({
        type: 'copy',
        source: entry.source,
        destination: joinPath(pathApi, ...relativeSegments),
      })
    }
  }
  return instructions
}

export function extractPatchNumber(fileName: string): number {
  const match = /patch_(\d+)\.pak$/iu.exec(fileName)
  return match ? Number(match[1]) || 0 : 0
}

async function isFile(fsApi: FsApi, filePath: string): Promise<boolean> {
  try {
    const stat = await fsApi.stat(filePath)
    return !!stat.isFile
  } catch {
    return false
  }
}

export async function getNextReEnginePakIndex(pathApi: PathApi, fsApi: FsApi, gameRoot: string): Promise<number> {
  let entries: string[] = []
  try {
    entries = await fsApi.readdir(gameRoot)
  } catch {
    return 1
  }

  let maxPatch = 0
  for (const entry of entries) {
    const fullPath = pathApi.join(gameRoot, entry)
    if (!await isFile(fsApi, fullPath)) continue
    if (!entry.toLowerCase().endsWith('.pak')) continue
    maxPatch = Math.max(maxPatch, extractPatchNumber(entry))
  }
  return maxPatch + 1
}

export function createReEnginePakName(index: number): string {
  return `re_chunk_000.pak.patch_${String(index).padStart(3, '0')}.pak`
}

export function getReEnginePakDeployments(metaInfo: Record<string, unknown> | undefined): ReEnginePakDeployment[] {
  const raw = metaInfo?.reEnginePakDeployments
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      const originalArchivePath = String(value.originalArchivePath || '')
      const deployedFilename = String(value.deployedFilename || '')
      const patchNumber = Number(value.patchNumber || extractPatchNumber(deployedFilename))
      if (!originalArchivePath || !deployedFilename || !Number.isFinite(patchNumber) || patchNumber <= 0) return null
      return {
        engineFamily: 're-engine' as const,
        normalizeGroup: String(value.normalizeGroup || 're_chunk_000.pak'),
        originalArchivePath,
        deployedFilename,
        patchNumber,
      }
    })
    .filter(Boolean) as ReEnginePakDeployment[]
}

function updateReEnginePakDeployment(
  deployments: ReEnginePakDeployment[],
  deploymentToUpdate: ReEnginePakDeployment,
  toFilename: string,
  patchNumber: number
): ReEnginePakDeployment[] {
  return deployments.map((item) => {
    if (
      item.normalizeGroup !== deploymentToUpdate.normalizeGroup ||
      item.originalArchivePath !== deploymentToUpdate.originalArchivePath
    ) return item
    return {
      ...item,
      deployedFilename: toFilename,
      patchNumber,
    }
  })
}

export async function buildPakInstructions(
  pathApi: PathApi,
  fsApi: FsApi,
  files: string[],
  gameRoot: string
): Promise<{ instructions: CopyInstruction[]; deployments: ReEnginePakDeployment[] }> {
  let nextIndex = await getNextReEnginePakIndex(pathApi, fsApi, gameRoot)
  const instructions: CopyInstruction[] = []
  const deployments: ReEnginePakDeployment[] = []

  for (const entry of normalizeEntries(files)) {
    if (archiveExtName(entry.source) !== '.pak') continue
    const deployedFilename = createReEnginePakName(nextIndex)
    instructions.push({
      type: 'copy',
      source: entry.source,
      destination: deployedFilename,
    })
    deployments.push({
      engineFamily: 're-engine',
      normalizeGroup: 're_chunk_000.pak',
      originalArchivePath: entry.source,
      deployedFilename,
      patchNumber: nextIndex,
    })
    nextIndex += 1
  }

  return { instructions, deployments }
}

export function installReEngineReframeworkLoader(pathApi: PathApi, files: string[]): InstallerResult {
  return { instructions: buildReframeworkSiblingInstructions(pathApi, files) }
}

export function installReEngineReframework(pathApi: PathApi, files: string[]): InstallerResult {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, 'reframework', ['reframework']) }
}

export function installReEngineAutorun(pathApi: PathApi, files: string[]): InstallerResult {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, 'autorun', ['reframework', 'autorun']) }
}

export function installReEnginePlugins(pathApi: PathApi, files: string[]): InstallerResult {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, 'plugins', ['reframework', 'plugins']) }
}

export function installReEngineNatives(pathApi: PathApi, files: string[]): InstallerResult {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, 'natives', ['natives']) }
}

export async function installReEnginePak(
  pathApi: PathApi,
  fsApi: FsApi,
  files: string[],
  gameRoot: string
): Promise<InstallerResult> {
  const { instructions, deployments } = await buildPakInstructions(pathApi, fsApi, files, gameRoot)
  return {
    instructions: [
      ...instructions,
      {
        type: 'attribute',
        key: 'reEnginePakDeployments',
        value: deployments,
      },
    ],
  }
}

type NormalizeRecord = {
  entry: ManagedDeploymentEntry
  deployment: ReEnginePakDeployment
  patchNumber: number
  targetFilename: string
  finalFilename: string
  finalPatchNumber: number
}

function normalizeFsComparablePath(input: string): string {
  return String(input || '').replace(/\\/g, '/').toLowerCase()
}

function isManagedGameFile(targetPath: string, entries: ManagedDeploymentEntry[]): boolean {
  const normalized = normalizeFsComparablePath(targetPath)
  return entries.some((entry) => normalizeFsComparablePath(entry.targetPath) === normalized)
}

function findUnmanagedCollision(
  filename: string,
  mutation: ManagedDeploymentMutation,
  selectedEntries: ManagedDeploymentEntry[]
): ManagedDeploymentGameFile | null {
  const expected = filename.toLowerCase()
  for (const file of mutation.gameFiles || []) {
    if (archiveBaseName(file.targetPath).toLowerCase() !== expected) continue
    if (file.managed || isManagedGameFile(file.targetPath, selectedEntries)) continue
    return file
  }
  return null
}

export function normalizeReEnginePakFiles(
  pathApi: PathApi,
  mutation: ManagedDeploymentMutation,
  options: { modType?: string; normalizeGroup?: string } = {}
): void {
  const normalizeGroup = options.normalizeGroup || 're_chunk_000.pak'
  const records: NormalizeRecord[] = []

  for (const entry of mutation.entries) {
    if (options.modType && entry.modType !== options.modType) continue
    if (archiveExtName(entry.targetPath) !== '.pak') continue

    const deployments = getReEnginePakDeployments(entry.metaInfo)
    let currentTargetPath = entry.targetPath
    let currentName = archiveBaseName(currentTargetPath)
    const originalName = currentName
    const deployment = deployments.find((item) =>
      item.normalizeGroup === normalizeGroup &&
      item.deployedFilename.toLowerCase() === currentName.toLowerCase()
    )
      || deployments.find((item) =>
        item.normalizeGroup === normalizeGroup &&
        item.deployedFilename.toLowerCase() === originalName.toLowerCase()
      )
    if (!deployment) continue

    if (entry.exists === false && mutation.adoptDeployment) {
      const candidates = (mutation.gameFiles || []).filter((file) =>
        archiveExtName(file.targetPath) === '.pak' &&
        file.hash === entry.expectedHash &&
        !file.managed
      )
      if (candidates.length === 1) {
        currentTargetPath = candidates[0].targetPath
        currentName = archiveBaseName(currentTargetPath)
        mutation.adoptDeployment({
          modKey: entry.modKey,
          from: entry.targetPath,
          to: currentTargetPath,
          expectedHash: entry.expectedHash,
        })
      } else {
        mutation.warn?.('RE Engine pak normalize skipped a missing managed pak because no unique same-hash candidate was found.', {
          target: entry.targetPath,
          candidates: candidates.length,
        })
        continue
      }
    }

    const patchNumber = extractPatchNumber(currentName)
    const normalizedEntry = currentTargetPath === entry.targetPath
      ? entry
      : { ...entry, targetPath: currentTargetPath, absolutePath: currentTargetPath, exists: true }
    records.push({
      entry: normalizedEntry,
      deployment,
      patchNumber,
      targetFilename: currentName,
      finalFilename: currentName,
      finalPatchNumber: patchNumber,
    })
  }

  if (records.length === 0) return

  records.sort((a, b) =>
    (a.patchNumber - b.patchNumber) ||
    String(a.entry.modKey).localeCompare(String(b.entry.modKey)) ||
    a.targetFilename.localeCompare(b.targetFilename)
  )

  const selectedEntries = records.map((record) => record.entry)
  for (let index = 0; index < records.length; index += 1) {
    const patchNumber = index + 1
    const finalFilename = createReEnginePakName(patchNumber)
    const collision = findUnmanagedCollision(finalFilename, mutation, selectedEntries)
    if (collision) {
      mutation.warn?.('RE Engine pak normalize skipped because target patch is occupied by an unmanaged file.', {
        target: finalFilename,
        path: collision.targetPath,
      })
      return
    }
    records[index].finalFilename = finalFilename
    records[index].finalPatchNumber = patchNumber
  }

  const moving = records.filter((record) => record.targetFilename !== record.finalFilename)
  if (moving.length === 0) return

  const nonce = Date.now().toString(36)
  for (let index = 0; index < moving.length; index += 1) {
    const record = moving[index]
    const tempFilename = `.heybox-normalize-${nonce}-${index + 1}.pak`
    const tempTarget = pathApi.join(mutation.gamePath, tempFilename)
    const finalTarget = pathApi.join(mutation.gamePath, record.finalFilename)

    mutation.moveDeployment({
      modKey: record.entry.modKey,
      from: record.entry.targetPath,
      to: tempTarget,
      expectedHash: record.entry.expectedHash,
    })
    mutation.moveDeployment({
      modKey: record.entry.modKey,
      from: tempTarget,
      to: finalTarget,
      expectedHash: record.entry.expectedHash,
    })

    const deployments = getReEnginePakDeployments(record.entry.metaInfo)
    mutation.setModMetadata({
      modKey: record.entry.modKey,
      patch: {
        reEnginePakDeployments: updateReEnginePakDeployment(
          deployments,
          record.deployment,
          record.finalFilename,
          record.finalPatchNumber
        ),
      },
    })
  }
}

export function registerReEnginePakNormalizeHook(
  context: ManagedDeploymentHookRegistrar,
  modType: string
): void {
  if (typeof context.registerManagedDeploymentHook !== 'function') return
  const phases: ManagedDeploymentHookPhase[] = ['afterEnable', 'afterDisable', 'afterUninstall']
  for (const phase of phases) {
    context.registerManagedDeploymentHook(phase, { modType }, async () => {
      const api = context.api as any
      if (typeof api?.vfs?.runManagedDeploymentMutation !== 'function') return
      await api.vfs.runManagedDeploymentMutation(
        {
          modType,
          includeCurrentHashes: true,
          includeGameFiles: {
            directories: ['{gamePath}'],
            extensions: ['.pak'],
          },
        },
        (mutation: ManagedDeploymentMutation) => {
          normalizeReEnginePakFiles(context.api.util.path, mutation, { modType })
        }
      )
    })
  }
}
