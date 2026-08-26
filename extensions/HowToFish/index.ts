import type { IExtensionContext } from 'heybox-mod-api'
import path from 'path'

const GAME_ID = 4001890
const GAME_NAME = 'How to Fish'
const STEAM_APP_ID = String(GAME_ID)
const EXECUTABLE = 'How to Fish.exe'
const GAME_SUBDIRECTORY = 'How To Fish'
const GAME_ROOT_TARGET = `{gamePath}/${GAME_SUBDIRECTORY}`

const MOD_TYPE_BEPINEX = `${GAME_ID}-bepinex-plugin`
const MOD_TYPE_MELONLOADER = `${GAME_ID}-melonloader-mod`
const MOD_TYPE_MELON_BEPINEX_BRIDGE = `${GAME_ID}-melon-bepinex-bridge`
const MOD_TYPE_BEPINEX_RUNTIME = `${GAME_ID}-bepinex-runtime`
const MOD_TYPE_MELONLOADER_RUNTIME = `${GAME_ID}-melonloader-runtime`
const MOD_TYPE_ROOT = `${GAME_ID}-root-loader`
const MELON_BEPINEX_BRIDGE_MOD_ID = '41287'

type Instruction = { type: 'copy'; source: string; destination: string }
type InstallerResult = { instructions: Instruction[]; modType: string }

interface RequirementStatus {
  installed: boolean
  gamePath: string
  requirements: Array<Record<string, unknown>>
}

function normalizeArchivePath(value: string): string {
  const normalized = String(value ?? '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/^(\.\/)+/, '')
  if (!normalized || /^[a-z]:\//i.test(normalized) || normalized.includes('://')) return ''
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => part === '.' || part === '..')) return ''
  return parts.join('/')
}

function lower(value: string): string { return normalizeArchivePath(value).toLowerCase() }
function parts(value: string): string[] { const normalized = normalizeArchivePath(value); return normalized ? normalized.split('/') : [] }
function hasPathSegment(file: string, segment: string): boolean { return parts(file).some((part) => part.toLowerCase() === segment.toLowerCase()) }
function isDll(file: string): boolean { return lower(file).endsWith('.dll') }

function hasBepInExPluginPath(files: string[]): boolean {
  return files.some((file) => { const value = lower(file); return value.includes('/bepinex/plugins/') || value.startsWith('bepinex/plugins/') })
}
function hasMelonLoaderModPath(files: string[]): boolean {
  return files.some((file) => { const value = lower(file); return value.includes('/mods/') || value.startsWith('mods/') || value.includes('/mlloader/mods/') || value.startsWith('mlloader/mods/') })
}
function hasLoaderRootFiles(files: string[]): boolean {
  return files.some((file) => {
    const value = lower(file)
    return value === 'winhttp.dll' || value === 'doorstop_config.ini' || value.startsWith('bepinex/core/') || value.startsWith('melonloader/')
  })
}
function hasBepInExRuntimeFiles(files: string[]): boolean {
  return files.some((file) => {
    const value = lower(file)
    return value === 'winhttp.dll' || value === 'doorstop_config.ini' || value.startsWith('bepinex/core/')
  })
}
function findMelonLoaderRuntimeRoot(files: string[]): string[] | null {
  const normalized = files.map((file) => normalizeArchivePath(file)).filter(Boolean)
  const versionFiles = normalized.filter((file) => path.posix.basename(file).toLowerCase() === 'version.dll')
  for (const versionFile of versionFiles) {
    const versionParts = versionFile.split('/')
    const versionRoot = versionParts.slice(0, -1)
    const hasSiblingMelonLoader = normalized.some((file) => {
      const fileParts = file.split('/')
      const melonIndex = fileParts.findIndex((part) => part.toLowerCase() === 'melonloader')
      return melonIndex >= 0
        && melonIndex === versionRoot.length
        && fileParts.slice(0, melonIndex).every((part, index) => part.toLowerCase() === versionRoot[index]?.toLowerCase())
        && fileParts.length > melonIndex + 1
    })
    if (hasSiblingMelonLoader) return versionRoot
  }
  return null
}
function findMelonBepInExBridgeRoot(files: string[]): string[] | null {
  const normalized = files.map((file) => normalizeArchivePath(file)).filter(Boolean)
  for (const winhttpFile of normalized) {
    if (path.posix.basename(winhttpFile).toLowerCase() !== 'winhttp.dll') continue
    const root = winhttpFile.split('/').slice(0, -1)
    const hasSiblingDirectory = (name: string) => normalized.some((file) => {
      const fileParts = file.split('/')
      return fileParts.length > root.length
        && fileParts.slice(0, root.length).every((part, index) => part.toLowerCase() === root[index]?.toLowerCase())
        && fileParts[root.length]?.toLowerCase() === name.toLowerCase()
    })
    if (hasSiblingDirectory('MLLoader') && hasSiblingDirectory('BepInEx')) return root
  }
  return null
}
function isGameArchive(gameId: string | number): boolean { return String(gameId) === String(GAME_ID) || Number(gameId) === GAME_ID }
function findAnchor(file: string, anchor: string): number { return parts(file).findIndex((part) => part.toLowerCase() === anchor.toLowerCase()) }

function installUnderFolder(files: string[], folder: 'BepInEx' | 'MLLoader/Mods', modType: string): InstallerResult {
  const instructions: Instruction[] = []
  for (const source of files) {
    const rel = normalizeArchivePath(source)
    if (!rel) continue
    const sourceParts = rel.split('/')
    let anchorDepth = 1
    const anchorIndex = folder === 'MLLoader/Mods'
      ? (() => {
        const fileParts = sourceParts.map((part) => part.toLowerCase())
        const mlloaderIndex = fileParts.indexOf('mlloader')
        if (mlloaderIndex >= 0 && fileParts[mlloaderIndex + 1] === 'mods') {
          anchorDepth = 2
          return mlloaderIndex
        }
        return fileParts.indexOf('mods')
      })()
      : findAnchor(rel, folder)
    if (anchorIndex < 0) {
      if (isDll(rel) && !hasPathSegment(rel, 'BepInEx') && !hasPathSegment(rel, 'Mods') && !hasPathSegment(rel, 'MLLoader')) {
        if (folder === 'BepInEx') {
          instructions.push({ type: 'copy', source, destination: path.posix.join('BepInEx/plugins', path.posix.basename(rel)) })
          instructions.push({ type: 'copy', source, destination: path.posix.join('MLLoader/Mods', path.posix.basename(rel)) })
        } else {
          instructions.push({ type: 'copy', source, destination: path.posix.join('MLLoader/Mods', path.posix.basename(rel)) })
        }
      }
      continue
    }
    const relative = sourceParts.slice(anchorIndex + anchorDepth).join('/')
    if (!relative) continue
    instructions.push({ type: 'copy', source, destination: path.posix.join(folder, relative) })
  }
  return { instructions, modType }
}

function installMelonBepInExBridge(files: string[]): InstallerResult {
  const root = findMelonBepInExBridgeRoot(files)
  if (!root) return { instructions: [], modType: MOD_TYPE_MELON_BEPINEX_BRIDGE }
  const instructions: Instruction[] = []
  for (const source of files) {
    const rel = normalizeArchivePath(source)
    if (!rel) continue
    const sourceParts = rel.split('/')
    const matchesRoot = root.every((part, index) => sourceParts[index]?.toLowerCase() === part.toLowerCase())
    if (!matchesRoot || sourceParts.length <= root.length) continue
    instructions.push({ type: 'copy', source, destination: sourceParts.slice(root.length).join('/') })
  }
  return { instructions, modType: MOD_TYPE_MELON_BEPINEX_BRIDGE }
}

function installRoot(files: string[]): InstallerResult {
  const instructions: Instruction[] = []
  for (const source of files) {
    const rel = normalizeArchivePath(source)
    if (!rel) continue
    const sourceParts = rel.split('/')
    const bepinexIndex = findAnchor(rel, 'BepInEx')
    const melonIndex = findAnchor(rel, 'MelonLoader')
    if (bepinexIndex >= 0) instructions.push({ type: 'copy', source, destination: sourceParts.slice(bepinexIndex).join('/') })
    else if (melonIndex >= 0) instructions.push({ type: 'copy', source, destination: sourceParts.slice(melonIndex).join('/') })
    else if (['winhttp.dll', 'doorstop_config.ini'].includes(path.posix.basename(rel).toLowerCase())) instructions.push({ type: 'copy', source, destination: path.posix.basename(rel) })
  }
  return { instructions, modType: MOD_TYPE_ROOT }
}

function installMelonLoaderRuntime(files: string[]): InstallerResult {
  const root = findMelonLoaderRuntimeRoot(files)
  if (!root) return { instructions: [], modType: MOD_TYPE_MELONLOADER_RUNTIME }
  const instructions: Instruction[] = []
  for (const source of files) {
    const rel = normalizeArchivePath(source)
    if (!rel) continue
    const sourceParts = rel.split('/')
    const isUnderRuntimeRoot = root.every((part, index) => sourceParts[index]?.toLowerCase() === part.toLowerCase())
    if (!isUnderRuntimeRoot || sourceParts.length <= root.length) continue
    instructions.push({
      type: 'copy',
      source,
      destination: sourceParts.slice(root.length).join('/'),
    })
  }
  return { instructions, modType: MOD_TYPE_MELONLOADER_RUNTIME }
}

function testBepInEx(files: string[], gameId: string | number) {
  return Promise.resolve({ supported: isGameArchive(gameId) && (hasBepInExPluginPath(files) || (files.some(isDll) && !hasMelonLoaderModPath(files) && !hasLoaderRootFiles(files))), requiredFiles: [] })
}
function testMelonLoader(files: string[], gameId: string | number) { return Promise.resolve({ supported: isGameArchive(gameId) && hasMelonLoaderModPath(files), requiredFiles: [] }) }
function testMelonBepInExBridge(files: string[], gameId: string | number) { return Promise.resolve({ supported: isGameArchive(gameId) && findMelonBepInExBridgeRoot(files) !== null, requiredFiles: [] }) }
function testRoot(files: string[], gameId: string | number) { return Promise.resolve({ supported: isGameArchive(gameId) && hasLoaderRootFiles(files), requiredFiles: [] }) }
function testBepInExRuntime(files: string[], gameId: string | number) {
  return Promise.resolve({
    supported: isGameArchive(gameId) && hasBepInExRuntimeFiles(files) && findMelonLoaderRuntimeRoot(files) === null,
    requiredFiles: [],
  })
}
function testMelonLoaderRuntime(files: string[], gameId: string | number) { return Promise.resolve({ supported: isGameArchive(gameId) && findMelonLoaderRuntimeRoot(files) !== null, requiredFiles: [] }) }

async function fileExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  if (!filePath) return false
  try {
    const stat = await context.api.util.fs.stat(filePath)
    return Boolean(stat?.isFile)
  } catch {
    return false
  }
}

async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID)
  return game?.gamePath
}

function getMelonBepInExBridgeRequirement() {
  return {
    key: 'howtofish-melon-bepinex-bridge',
    name: 'MelonLoader + BepInEx Bridge',
    modId: MELON_BEPINEX_BRIDGE_MOD_ID,
    mod_id: MELON_BEPINEX_BRIDGE_MOD_ID,
    modType: MOD_TYPE_MELON_BEPINEX_BRIDGE,
    openModDetailDialog: false,
    requirement: 'enabled',
  }
}

async function getRequirementStatus(context: IExtensionContext, gamePath?: string): Promise<RequirementStatus> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const winhttpPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, GAME_SUBDIRECTORY, 'winhttp.dll') : ''
  const mlLoaderPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, GAME_SUBDIRECTORY, 'MLLoader') : ''
  const hasWinhttp = !!resolvedGamePath && await fileExists(context, winhttpPath)
  let hasMLLoader = false
  try {
    const stat = await context.api.util.fs.stat(mlLoaderPath)
    hasMLLoader = Boolean(stat?.isDirectory)
  } catch {
    hasMLLoader = false
  }
  const requirements: Array<Record<string, unknown>> = []
  if (!hasWinhttp || !hasMLLoader) requirements.push(getMelonBepInExBridgeRequirement())
  return {
    installed: requirements.length === 0,
    gamePath: resolvedGamePath,
    requirements,
  }
}

async function getExtensionRequiredMods(context: IExtensionContext, gamePath?: string) {
  const status = await getRequirementStatus(context, gamePath)
  if (status.installed) return status
  return {
    ...status,
    code: 'EXTENSION_REQUIRED_MODS_MISSING',
    requirement: {
      code: 'EXTENSION_REQUIRED_MODS_MISSING',
      requirements: status.requirements,
    },
  }
}

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID, name: GAME_NAME, executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [`${GAME_SUBDIRECTORY}/${EXECUTABLE}`],
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || discovery?.gamePath || '')),
    environment: { SteamAPPId: STEAM_APP_ID }, details: { steamAppId: GAME_ID },
  })
  context.registerModType(MOD_TYPE_BEPINEX, 25, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'BepInEx Plugin' })
  context.registerModType(MOD_TYPE_MELONLOADER, 25, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'MelonLoader Mod' })
  context.registerModType(MOD_TYPE_MELON_BEPINEX_BRIDGE, 1, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'MelonLoader + BepInEx Bridge' })
  context.registerModType(MOD_TYPE_BEPINEX_RUNTIME, 25, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'BepInEx 5 (x64)' })
  context.registerModType(MOD_TYPE_MELONLOADER_RUNTIME, 25, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'MelonLoader' })
  context.registerModType(MOD_TYPE_ROOT, 25, (gameId: string | number) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: 'Runtime Loader' })
  context.registerInstaller(MOD_TYPE_MELON_BEPINEX_BRIDGE, 1, testMelonBepInExBridge, (files: string[]) => installMelonBepInExBridge(files))
  context.registerInstaller(MOD_TYPE_BEPINEX_RUNTIME, 10, testBepInExRuntime, (files: string[]) => ({ ...installRoot(files), modType: MOD_TYPE_BEPINEX_RUNTIME }))
  context.registerInstaller(MOD_TYPE_MELONLOADER_RUNTIME, 11, testMelonLoaderRuntime, (files: string[]) => installMelonLoaderRuntime(files))
  context.registerInstaller(MOD_TYPE_ROOT, 20, testRoot, (files: string[]) => installRoot(files))
  context.registerInstaller(MOD_TYPE_BEPINEX, 20, testBepInEx, (files: string[]) => installUnderFolder(files, 'BepInEx', MOD_TYPE_BEPINEX))
  context.registerInstaller(MOD_TYPE_MELONLOADER, 20, testMelonLoader, (files: string[]) => installUnderFolder(files, 'MLLoader/Mods', MOD_TYPE_MELONLOADER))
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))
  return true
}

export default main
