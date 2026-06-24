import type { IExtensionContext } from 'heybox-mod-api'
import {
  archiveExtName,
  installReEngineAutorun,
  installReEngineNatives,
  installReEnginePak,
  installReEnginePlugins,
  installReEngineReframework,
  installReEngineReframeworkLoader,
  normalizeArchivePath,
  registerReEnginePakNormalizeHook,
  testReEngineAutorun,
  testReEngineNatives,
  testReEnginePak,
  testReEnginePlugins,
  testReEngineReframework,
  testReEngineReframeworkLoader,
} from '@heybox-mod-extensions/engine-utils/re-engine'

const GAME_ID = 1446780
const GAME_NAME = 'Monster Hunter Rise'
const EXECUTABLE = 'MonsterHunterRise.exe'
const REFRAMEWORK_DLL = 'dinput8.dll'
const REFRAMEWORK_MOD_ID = 1560
const MOD_TYPE_PRIORITY = 25
const MOD_TYPE_REFRAMEWORK_LOADER = `${GAME_ID}-reframework-loader`
const MOD_TYPE_REFRAMEWORK = `${GAME_ID}-reframework`
const MOD_TYPE_AUTORUN = `${GAME_ID}-autorun`
const MOD_TYPE_PLUGINS = `${GAME_ID}-plugins`
const MOD_TYPE_NATIVES = `${GAME_ID}-natives`
const MOD_TYPE_PAK = `${GAME_ID}-pak`
const ROOT_METADATA_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'])

function getRootArchiveFileName(filePath: string): string {
  const normalized = normalizeArchivePath(filePath)
  if (!normalized || normalized.includes('/')) return ''
  return normalized.toLowerCase()
}

function isRootMetadataImage(filePath: string): boolean {
  return !!getRootArchiveFileName(filePath) && ROOT_METADATA_IMAGE_EXTENSIONS.has(archiveExtName(filePath))
}

function filterMonsterHunterArchiveFiles(files: string[]): string[] {
  const hasRootModInfo = files.some((file) => getRootArchiveFileName(file) === 'modinfo.ini')
  if (!hasRootModInfo) return files

  return files.filter((file) => {
    const rootFileName = getRootArchiveFileName(file)
    return rootFileName !== 'modinfo.ini' && !isRootMetadataImage(file)
  })
}

async function findGame(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
  return game?.gamePath
}

async function fileExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    const stat = await context.api.util.fs.stat(filePath)
    return !!stat.isFile
  } catch {
    return false
  }
}

async function getGameRoot(context: IExtensionContext): Promise<string> {
  const gamePath = await findGame(context)
  if (!gamePath) {
    throw new Error(`${GAME_NAME} game path is unavailable: appid=${GAME_ID}`)
  }
  return gamePath
}

function getReframeworkRequirements() {
  return [
    {
      key: 'monster-hunter-rise-reframework',
      name: 'REFramework',
      modId: REFRAMEWORK_MOD_ID,
      mod_id: REFRAMEWORK_MOD_ID,
      openModDetailDialog: false,
      requirement: 'enabled',
    },
  ]
}

async function getReframeworkStatus(context: IExtensionContext, gamePath?: string) {
  const resolvedGamePath = String(gamePath || await findGame(context) || '')
  const dllPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, REFRAMEWORK_DLL) : ''
  return {
    installed: !!dllPath && await fileExists(context, dllPath),
    gamePath: resolvedGamePath,
    executable: REFRAMEWORK_DLL,
    requirements: getReframeworkRequirements(),
  }
}

function registerReframeworkLoader(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_REFRAMEWORK_LOADER, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'REFramework' })
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK_LOADER,
    10,
    (files, gameId) => testReEngineReframeworkLoader(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({ ...installReEngineReframeworkLoader(context.api.util.path, filterMonsterHunterArchiveFiles(files)), modType: MOD_TYPE_REFRAMEWORK_LOADER })
  )
}

function registerReframework(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_REFRAMEWORK, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'REFramework Folder' })
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK,
    11,
    (files, gameId) => testReEngineReframework(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({ ...installReEngineReframework(context.api.util.path, filterMonsterHunterArchiveFiles(files)), modType: MOD_TYPE_REFRAMEWORK })
  )
}

function registerAutorun(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_AUTORUN, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'REFramework Autorun' })
  context.registerInstaller(
    MOD_TYPE_AUTORUN,
    12,
    (files, gameId) => testReEngineAutorun(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({ ...installReEngineAutorun(context.api.util.path, filterMonsterHunterArchiveFiles(files)), modType: MOD_TYPE_AUTORUN })
  )
}

function registerPlugins(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_PLUGINS, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'REFramework Plugins' })
  context.registerInstaller(
    MOD_TYPE_PLUGINS,
    13,
    (files, gameId) => testReEnginePlugins(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({ ...installReEnginePlugins(context.api.util.path, filterMonsterHunterArchiveFiles(files)), modType: MOD_TYPE_PLUGINS })
  )
}

function registerNatives(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_NATIVES, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'RE Engine Natives' })
  context.registerInstaller(
    MOD_TYPE_NATIVES,
    14,
    (files, gameId) => testReEngineNatives(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({ ...installReEngineNatives(context.api.util.path, filterMonsterHunterArchiveFiles(files)), modType: MOD_TYPE_NATIVES })
  )
}

function registerPak(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_PAK, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'RE Engine Pak' })
  context.registerInstaller(
    MOD_TYPE_PAK,
    15,
    (files, gameId) => testReEnginePak(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    async (files) => {
      const gameRoot = await getGameRoot(context)
      return { ...await installReEnginePak(context.api.util.path, context.api.util.fs, filterMonsterHunterArchiveFiles(files), gameRoot), modType: MOD_TYPE_PAK }
    }
  )
  registerReEnginePakNormalizeHook(context, MOD_TYPE_PAK)
}

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGame(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery: any) => getReframeworkStatus(context, String(discovery?.path || '')),
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID },
  })

  registerReframeworkLoader(context)
  registerReframework(context)
  registerAutorun(context)
  registerPlugins(context)
  registerNatives(context)
  registerPak(context)

  context.registerExtensionAction(GAME_ID, 'getReframeworkStatus', () => getReframeworkStatus(context))
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getReframeworkStatus(context))

  return true
}

export default main
