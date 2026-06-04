
// @ts-nocheck
import type { IExtensionContext } from 'heybox-mod-api'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { createConfigModActions } from './configMod'
import { createManifestAttributeExtractor, isManifest, parseManifestFile } from './manifests'

const GAME_ID = 'stardewvalley'
const STEAM_APPID = 413150
const MODS_REL_PATH = 'Mods'
const MOD_TYPE_SMAPI = 'SMAPI'
const MOD_TYPE_ROOT = 'sdvrootfolder'
const MOD_TYPE_CONFIG = 'sdv-configuration-mod'
const INSTALLER_ID_SMAPI = 'smapi-installer'
const INSTALLER_ID_ROOT = 'sdvrootfolder'
const INSTALLER_ID_MANIFEST = 'stardew-valley-installer'
// const SMAPI_MOD_ID = 592
const SMAPI_MOD_ID = 90
const SMAPI_BUNDLED_MODS = ['ErrorHandler', 'ConsoleCommands', 'SaveBackup']

type InstallerResult = {
  instructions: any[]
  modType?: string
}

function normalizeRel(input: string): string {
  const raw = String(input ?? '').replace(/\\/g, '/').replace(/^\/+/g, '').replace(/^(\.\/)+/g, '')
  if (!raw || /^[a-zA-Z]:/.test(raw) || raw.includes('://')) return ''
  const parts = raw.split('/').filter(Boolean)
  if (parts.some((part) => part === '.' || part === '..')) return ''
  return parts.join('/')
}

function normalizedPathEndsWith(file: string, suffix: string): boolean {
  const value = String(file ?? '').replace(/\\/g, '/').replace(/^(\.\/)+/g, '').toLowerCase()
  const expected = String(suffix ?? '').replace(/\\/g, '/').replace(/^\/+/g, '').replace(/^(\.\/)+/g, '').toLowerCase()
  return !!value && !!expected && value.endsWith(expected)
}

function pathParts(input: string): string[] {
  return normalizeRel(input).split('/').filter(Boolean)
}

function isGameArchive(gameId: string | number): boolean {
  return String(gameId) === GAME_ID || Number(gameId) === STEAM_APPID
}

function basenameLower(file: string): string {
  return path.posix.basename(String(file).replace(/\\/g, '/')).toLowerCase()
}

function hasContentFolder(files: string[]): boolean {
  return files.some((file) => pathParts(file).some((part) => part.toLowerCase() === 'content'))
}

function hasSmapiInstallerDll(files: string[]): boolean {
  return files.some((file) => basenameLower(file) === 'smapi.installer.dll')
}

function hasSmapiExecutable(files: string[]): boolean {
  const platform = getSmapiPlatform()
  if (platform.unsupported) return false
  return files.some((file) => normalizedPathEndsWith(file, platform.executableName))
}

function testSMAPI(files: string[], gameId: string | number) {
  return Promise.resolve({ supported: isGameArchive(gameId) && (hasSmapiInstallerDll(files) || hasSmapiExecutable(files)), requiredFiles: [] })
}

function testRootFolder(files: string[], gameId: string | number) {
  return Promise.resolve({ supported: isGameArchive(gameId) && hasContentFolder(files), requiredFiles: [] })
}

function testSupported(files: string[], gameId: string | number) {
  return Promise.resolve({ supported: isGameArchive(gameId) && files.some(isManifest) && !hasContentFolder(files) && !hasSmapiInstallerDll(files), requiredFiles: [] })
}

function sanitizeName(name: string, fallback: string): string {
  const value = String(name || fallback || 'Stardew Mod')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return value || fallback || 'Stardew Mod'
}

function installStardewValley(files: string[], stagingPath: string): InstallerResult {
  const manifestFiles = files.filter(isManifest)
  if (manifestFiles.length === 0) {
    throw new Error('No Stardew Valley manifest.json found')
  }

  const instructions: any[] = []
  for (const manifestFile of manifestFiles) {
    const relManifest = normalizeRel(manifestFile)
    const manifestDir = path.posix.dirname(relManifest)
    const rootFolder = manifestDir === '.' ? '' : manifestDir
    const manifest = parseManifestFile(path.join(stagingPath, relManifest))
    const modName = sanitizeName(rootFolder ? path.posix.basename(rootFolder) : manifest?.Name, 'Stardew Mod')
    const prefix = rootFolder ? `${rootFolder}/` : ''

    for (const source of files) {
      const relSource = normalizeRel(source)
      if (!relSource || (prefix && !relSource.startsWith(prefix))) continue
      const relativeInsideMod = prefix ? relSource.slice(prefix.length) : relSource
      if (!relativeInsideMod) continue
      instructions.push({
        type: 'copy',
        source,
        destination: path.posix.join(modName, relativeInsideMod),
      })
    }
  }

  return { instructions, modType: MOD_TYPE_SMAPI }
}

function findContentRoot(files: string[]): string {
  for (const file of files) {
    const parts = pathParts(file)
    const idx = parts.findIndex((part) => part.toLowerCase() === 'content')
    if (idx >= 0) return parts.slice(0, idx).join('/')
  }
  return ''
}

function installRootFolder(files: string[]): InstallerResult {
  const root = findContentRoot(files)
  const prefix = root ? `${root}/` : ''
  const instructions = files
    .map((source) => normalizeRel(source))
    .filter((source) => source && (!prefix || source.startsWith(prefix)))
    .filter((source) => !source.toLowerCase().endsWith('.txt'))
    .map((source) => ({
      type: 'copy',
      source,
      destination: prefix ? source.slice(prefix.length) : source,
    }))
  return { instructions, modType: MOD_TYPE_ROOT }
}

function posixRelative(root: string, file: string): string {
  const rel = path.posix.relative(normalizeRel(root), normalizeRel(file))
  return rel && rel !== '.' ? rel : ''
}

function getSmapiPlatform() {
  const platform = os.platform()
  if (platform === 'win32') {
    return { id: 'windows', archiveFolder: 'windows', executableName: 'StardewModdingAPI.exe', dataFiles: ['windows-install.dat', 'install.dat'] }
  }
  if (platform === 'linux') {
    return { id: 'linux', archiveFolder: 'linux', executableName: 'StardewModdingAPI', dataFiles: ['linux-install.dat', 'install.dat'] }
  }
  return {
    id: 'macos',
    archiveFolder: 'macOS',
    executableName: 'StardewModdingAPI',
    dataFiles: ['macos-install.dat', 'install.dat'],
    unsupported: 'SMAPI automatic installation on macOS is not implemented yet. Please install SMAPI manually.',
  }
}

function buildSmapiSteamLaunchOptions(smapiExePath: string): string {
  return `"${smapiExePath}" %command%`
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildSteamLaunchOptionWriteDesc(launchOptions: string): string {
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    '<strong>将为本机Steam游戏写入启动项，此操作将自动重启Steam客户端</strong>',
    `<code style="box-sizing:border-box;width:100%;padding:10px 12px;border-radius:6px;background:rgba(255,255,255,0.06);font-size:13px;line-height:18px;word-break:break-all;white-space:pre-wrap;">${escapeHtml(launchOptions)}</code>`,
    '<small>未携带启动项进行游戏，可能导致Mod无法正常识别</small>',
    '</div>',
  ].join('')
}

function buildSteamLaunchOptionClearDesc(): string {
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    '<strong>将清空检测到的Steam用户的星露谷物语启动项。此操作将自动重启Steam客户端</strong>',
    '<small>未启用本Mod时携带启动项，可能导致游戏无法正常运行</small>',
    '</div>',
  ].join('')
}

function isCorrectPlatformPath(filePath: string, platformFolder: string): boolean {
  return pathParts(filePath).some((part) => part.toLowerCase() === platformFolder.toLowerCase())
}

function findSmapiDataFile(files: string[], platform: ReturnType<typeof getSmapiPlatform>): string {
  const dataFiles = new Set((platform.dataFiles || []).map((fileName) => fileName.toLowerCase()))
  return files
    .map((file) => normalizeRel(file))
    .find((file) => file && isCorrectPlatformPath(file, platform.archiveFolder) && dataFiles.has(basenameLower(file))) || ''
}

async function installSMAPI(
  getGameInstallPath: () => string,
  files: string[],
  stagingPath: string,
  archiveApi: IExtensionContext['api']['util']['archive'],
  onSmapiExeResolved?: (filePath: string) => void
): Promise<InstallerResult> {
  const platform = getSmapiPlatform()
  if (platform.unsupported) throw new Error(platform.unsupported)

  let smapiFiles = files.map((file) => normalizeRel(file)).filter(Boolean)
  let exeFile = smapiFiles.find((file) => normalizedPathEndsWith(file, platform.executableName))
  if (!exeFile) {
    const dataFile = findSmapiDataFile(files, platform)
    if (!dataFile) {
      throw new Error('Failed to find the SMAPI data files; please re-download SMAPI and try again')
    }
    smapiFiles = await archiveApi.extractZip(path.join(stagingPath, dataFile), stagingPath)
    exeFile = smapiFiles.find((file) => normalizedPathEndsWith(file, platform.executableName))
    if (!exeFile) {
      throw new Error(`Failed to extract ${platform.executableName}; please re-download SMAPI and try again`)
    }
  }

  const gamePath = getGameInstallPath()
  const targetSmapiExePath = path.join(gamePath, platform.executableName)
  if (typeof onSmapiExeResolved === 'function') onSmapiExeResolved(targetSmapiExePath)

  const exeRel = normalizeRel(exeFile)
  const smapiRoot = path.posix.dirname(exeRel)
  const smapiPrefix = smapiRoot === '.' ? '' : `${smapiRoot}/`
  const instructions = smapiFiles
    .map((file) => normalizeRel(file))
    .filter((file) => file && (!smapiPrefix || file.startsWith(smapiPrefix)))
    .map((source) => {
      const rel = smapiPrefix ? posixRelative(smapiRoot, source) : source
      return {
        type: 'copy',
        source,
        destination: path.join(gamePath, rel),
      }
    })

  const depsPath = path.join(gamePath, 'Stardew Valley.deps.json')
  if (fs.existsSync(depsPath)) {
    instructions.push({
      type: 'generatefile',
      data: fs.readFileSync(depsPath, 'utf8'),
      destination: path.join(gamePath, 'StardewModdingAPI.deps.json'),
    })
  }

  instructions.push({ type: 'attribute', key: 'smapiBundledMods', value: SMAPI_BUNDLED_MODS.map((mod) => mod.toLowerCase()) })
  return { instructions, modType: MOD_TYPE_ROOT }
}

function makeRequiredModsError(gamePath: string) {
  const err: any = new Error('Extension required mods are missing')
  err.name = 'ClientInvokeError'
  err.status = 'failed'
  err.msg = 'Extension required mods are missing'
  err.result = {
    code: 'EXTENSION_REQUIRED_MODS_MISSING',
    gameId: GAME_ID,
    gamePath,
    requirements: [
      {
        key: 'stardew-smapi',
        name: 'SMAPI',
        modId: SMAPI_MOD_ID,
        openModDetailDialog: false,
        requirement: 'enabled',
      },
    ],
  }
  return err
}

function main(context: IExtensionContext) {
  let cachedGamePath = ''
  let cachedSmapiExePath = ''
  const getGameInstallPath = () => {
    if (!cachedGamePath) throw new Error('Stardew Valley was not discovered')
    return cachedGamePath
  }
  const setSmapiExePath = (filePath: string) => {
    cachedSmapiExePath = String(filePath || '')
  }
  const queryPath = async () => {
    const found = await context.api.util.GameStoreHelper.findByAppId([
      String(STEAM_APPID),
      '1453375253',
      'ConcernedApe.StardewValleyPC',
    ])
    cachedGamePath = String(found?.gamePath || '')
    return cachedGamePath || undefined
  }
  const executable = () => os.platform() === 'win32' ? 'Stardew Valley.exe' : 'StardewValley'
  const smapiExecutable = () => getSmapiPlatform().executableName
  const resolveSmapiExePath = async () => {
    if (!cachedGamePath) await queryPath()
    const exePath = cachedGamePath ? path.join(cachedGamePath, smapiExecutable()) : ''
    cachedSmapiExePath = exePath && fs.existsSync(exePath) ? exePath : ''
    return cachedSmapiExePath
  }
  const getSmapiStatus = async () => {
    if (!cachedGamePath) await queryPath()
    const exePath = cachedGamePath ? path.join(cachedGamePath, smapiExecutable()) : ''
    if (exePath && fs.existsSync(exePath)) cachedSmapiExePath = exePath
    return {
      installed: !!exePath && fs.existsSync(exePath),
      gamePath: cachedGamePath,
      executable: smapiExecutable(),
      requirements: makeRequiredModsError(cachedGamePath).result.requirements,
    }
  }

  context.registerGame({
    id: GAME_ID,
    name: 'Stardew Valley',
    logo: 'assets/gameart.jpg',
    requiredFiles: os.platform() === 'win32' ? ['Stardew Valley.exe'] : ['StardewValley'],
    environment: { SteamAPPId: String(STEAM_APPID) },
    details: { steamAppId: STEAM_APPID },
    supportedTools: [{
      id: 'smapi',
      name: 'SMAPI',
      executable: smapiExecutable,
      requiredFiles: [smapiExecutable()],
      shell: true,
      exclusive: true,
      relative: true,
      defaultPrimary: true,
    }],
    mergeMods: true,
    requiresCleanup: true,
    shell: true,
    queryPath,
    executable,
    queryModPath: () => MODS_REL_PATH,
    setup: async (discovery: any) => {
      cachedGamePath = String(discovery?.path || cachedGamePath || '')
      if (cachedGamePath) fs.mkdirSync(path.join(cachedGamePath, MODS_REL_PATH), { recursive: true })
      return getSmapiStatus()
    },
  })

  context.registerModType(MOD_TYPE_SMAPI, 30, (gameId: any) => String(gameId) === GAME_ID, () => path.join('{gamePath}', MODS_REL_PATH), () => Promise.resolve(false), { name: 'SMAPI' })
  context.registerModType(MOD_TYPE_CONFIG, 30, (gameId: any) => String(gameId) === GAME_ID, () => path.join('{gamePath}', MODS_REL_PATH), () => Promise.resolve(false), { name: 'Stardew Configuration' })
  context.registerModType(MOD_TYPE_ROOT, 25, (gameId: any) => String(gameId) === GAME_ID, () => '{gamePath}', () => Promise.resolve(false), { name: 'Stardew Root Folder' })

  context.registerInstaller(INSTALLER_ID_SMAPI, 30, testSMAPI, (files: string[], stagingPath: string) => installSMAPI(getGameInstallPath, files, stagingPath, context.api.util.archive, setSmapiExePath))
  context.registerInstaller(INSTALLER_ID_ROOT, 50, testRootFolder, (files: string[]) => installRootFolder(files))
  context.registerInstaller(INSTALLER_ID_MANIFEST, 50, testSupported, async (files: string[], stagingPath: string) => installStardewValley(files, stagingPath))

  context.registerAttributeExtractor(25, createManifestAttributeExtractor())

  const configModActions = createConfigModActions(getGameInstallPath)
  context.registerExtensionAction(GAME_ID, 'getSmapiStatus', getSmapiStatus)
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', getSmapiStatus)
  context.registerExtensionAction(GAME_ID, 'syncModConfigurations', configModActions.collectConfigFiles)
  context.registerExtensionAction(GAME_ID, 'getConfigModStatus', configModActions.getConfigModStatus)

  function getUiResponsePayload(response: any): any {
    return response?.payload && typeof response.payload === 'object' ? response.payload : {}
  }

  async function requestLaunchOptionWriteConfirm(payload: any): Promise<any | null> {
    const response = await context.api.util.ui.request(payload)
    if (!response?.confirmed) return null
    return response
  }

  async function relaunchSteamAfterLaunchOptionWrite(response: any) {
    const responsePayload = getUiResponsePayload(response)
    if (responsePayload.relaunchSteam === false) return

    const launchResponse = await context.api.util.steam.launchClient()
    const launchPayload = getUiResponsePayload(launchResponse)
    if (launchResponse?.confirmed && launchPayload.success !== false) return

    context.api.util.ui.notify({
      type: 'steam_launch_client_failed',
      display: 'toast',
      variant: 'error',
      title: 'Steam launch failed',
      content: String(launchPayload.error || 'Steam did not report a successful launch. Please open Steam manually.'),
    })
  }

  async function ensureSmapiSteamLaunchOptions(payload: any) {
    if (Number(payload?.mod_id ?? payload?.modId ?? 0) !== SMAPI_MOD_ID) return

    const smapiExePath = cachedSmapiExePath || await resolveSmapiExePath()
    if (!smapiExePath) return

    const expected = buildSmapiSteamLaunchOptions(smapiExePath)
    const current = await context.api.util.steam.getLaunchOptions(STEAM_APPID)
    if (current.length > 0 && current.every((entry: any) => String(entry?.launchOptions || '') === expected)) {
      return
    }

    const response = await requestLaunchOptionWriteConfirm({
      type: 'steam_launch_options_confirm',
      title: '设置 Steam 启动项',
      content: buildSteamLaunchOptionWriteDesc(expected),
      confirm: { text: '写入', type: 'primary' },
      cancel: { text: '暂不调整', type: 'cancel', visible: true },
      requiresSteamClosed: true,
      relaunchSteamAfterWrite: true,
    })
    if (!response) return

    const written = await context.api.util.steam.setLaunchOptions(STEAM_APPID, expected)
    const verified = await context.api.util.steam.getLaunchOptions(STEAM_APPID)
    if (written.length === 0 || verified.length === 0 || !verified.every((entry: any) => String(entry?.launchOptions || '') === expected)) {
      context.api.util.ui.notify({
        type: 'steam_launch_options_failed',
        display: 'toast',
        variant: 'error',
        title: 'Steam 启动项写入失败',
        content: 'SMAPI 启动项未成功写入，请确认 Steam 已完全退出后重试。',
      })
      return
    }
    context.api.util.ui.notify({
      type: 'steam_launch_options_success',
      display: 'toast',
      variant: 'success',
      title: 'Steam 启动项已设置',
      content: 'SMAPI 启动项已写入，正在重新打开 Steam。',
    })
    await relaunchSteamAfterLaunchOptionWrite(response)
  }

  async function clearSmapiSteamLaunchOptions(payload: any) {
    if (Number(payload?.mod_id ?? payload?.modId ?? 0) !== SMAPI_MOD_ID) return

    const current = await context.api.util.steam.getLaunchOptions(STEAM_APPID)
    if (current.length > 0 && current.every((entry: any) => String(entry?.launchOptions || '') === '')) {
      return
    }

    const response = await requestLaunchOptionWriteConfirm({
      type: 'steam_launch_options_confirm',
      title: '清空 Steam 启动项',
      content: buildSteamLaunchOptionClearDesc(),
      confirm: { text: '清空', type: 'primary' },
      cancel: { text: '暂不调整', type: 'cancel', visible: true },
      requiresSteamClosed: true,
      relaunchSteamAfterWrite: true,
    })
    if (!response) return

    const cleared = await context.api.util.steam.clearLaunchOptions(STEAM_APPID)
    const verified = await context.api.util.steam.getLaunchOptions(STEAM_APPID)
    if (cleared.length === 0 || verified.length === 0 || !verified.every((entry: any) => String(entry?.launchOptions || '') === '')) {
      context.api.util.ui.notify({
        type: 'steam_launch_options_clear_failed',
        display: 'toast',
        variant: 'error',
        title: 'Steam 启动项清理失败',
        content: 'SMAPI 启动项未成功清空，请确认 Steam 已完全退出后重试。',
      })
      return
    }
    context.api.util.ui.notify({
      type: 'steam_launch_options_cleared',
      display: 'toast',
      variant: 'success',
      title: 'Steam 启动项已清空',
      content: 'SMAPI 启动项已清空，正在重新打开 Steam。',
    })
    await relaunchSteamAfterLaunchOptionWrite(response)
  }

  context.once(() => {
    context.api.onAsync('did-enable-mod-file', ensureSmapiSteamLaunchOptions)
    context.api.onAsync('did-disable-mod-file', clearSmapiSteamLaunchOptions)
  })
}

export default main
