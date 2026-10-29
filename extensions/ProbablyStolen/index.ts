import type { IExtensionContext } from 'heybox-mod-api'

const GAME_ID = 4348910
const MELONLOADER_REQUIREMENT_MOD_ID = '129002'
const EXECUTABLE = 'Probably Stolen.exe'
const REQUIRED_GAME_FILES = [EXECUTABLE, 'UnityPlayer.dll', 'GameAssembly.dll',
  'Probably Stolen_Data/il2cpp_data/Metadata/global-metadata.dat']
type Loader = 'melonloader' | 'bepinex'
type Kind = Loader | 'mods'
type Copy = { type: 'copy'; source: string; destination: string }
const modType = (kind: Kind) => `${GAME_ID}-${kind}`
const RUNTIME_FILES: Record<Loader, string[]> = {
  melonloader: ['version.dll', 'MelonLoader/net6/MelonLoader.dll', 'MelonLoader/net6/MelonLoader.runtimeconfig.json'],
  bepinex: ['winhttp.dll', 'doorstop_config.ini', 'BepInEx/core/BepInEx.Unity.IL2CPP.dll',
    'BepInEx/core/BepInEx.Core.dll', 'dotnet/coreclr.dll'],
}
const ROOTS = new Map(['Mods', 'Plugins', 'UserData', 'UserLibs', 'BepInEx'].map(p => [p.toLowerCase(), p]))
const BLOCKED = /\.(exe|bat|cmd|ps1|vbs|msi|lnk|reg|sh)$/i
const INJECTORS = new Set(['version.dll', 'winhttp.dll', 'dobby.dll', 'gameassembly.dll', 'unityplayer.dll'])

// Reject absolute paths, traversal, ADS and Windows path aliases before mapping.
function safePath(source: string): string | undefined {
  if (!source || /^[\\/]/.test(source) || /[:\x00-\x1f]/.test(source)) return undefined
  const value = source.replace(/\\/g, '/').replace(/^(\.\/)+/, '')
  if (value.endsWith('/')) return undefined
  const parts = value.split('/')
  if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p)
    || /[<>"|?*]/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) return undefined
  return value
}

function runtimeRoot(files: string[], loader: Loader): string | undefined {
  const paths = files.map(safePath).filter((p): p is string => !!p)
  const names = new Set(paths.map(p => p.toLowerCase()))
  const marker = RUNTIME_FILES[loader][0].toLowerCase()
  for (const path of paths) {
    if (path.split('/').at(-1)?.toLowerCase() !== marker) continue
    const prefix = path.slice(0, -marker.length)
    if (RUNTIME_FILES[loader].every(p => names.has((prefix + p).toLowerCase()))) return prefix
  }
  return undefined
}

function looksLikeRuntime(files: string[]): boolean {
  return files.some(source => {
    const path = safePath(source)?.toLowerCase()
    return !!path && (path.split('/').some(p => p === 'melonloader' || p === 'dotnet')
      || /(^|\/)bepinex\/core\//.test(path)
      || INJECTORS.has(path.split('/').at(-1)!))
  })
}

function checkedInstructions(instructions: Copy[]): Copy[] {
  const seen = new Set<string>()
  for (const instruction of instructions) {
    const key = instruction.destination.toLowerCase()
    if (seen.has(key)) throw new Error(`压缩包有重复目标文件：${instruction.destination}`)
    seen.add(key)
  }
  return instructions
}

function runtimeInstructions(files: string[], loader: Loader): Copy[] {
  const prefix = runtimeRoot(files, loader)
  if (prefix === undefined) throw new Error('请选择完整的 Windows x64 IL2CPP 预载器 ZIP。')
  const result: Copy[] = []
  for (const source of files) {
    const path = safePath(source)
    if (!path || !path.toLowerCase().startsWith(prefix.toLowerCase())) continue
    const destination = path.slice(prefix.length)
    const lower = destination.toLowerCase()
    const allowed = loader === 'melonloader'
      ? lower.startsWith('melonloader/') || lower === 'version.dll' || lower === 'dobby.dll'
      : lower.startsWith('bepinex/') || lower.startsWith('dotnet/')
        || lower === 'winhttp.dll' || lower === 'doorstop_config.ini' || lower === '.doorstop_version'
    if (allowed) result.push({ type: 'copy', source, destination })
  }
  return checkedInstructions(result)
}

function modInstructions(files: string[]): Copy[] {
  if (looksLikeRuntime(files)) return []
  const paths = files.map(source => ({ source, path: safePath(source) })).filter(p => !!p.path)
  const structured: Copy[] = []
  for (const { source, path } of paths) {
    const parts = path!.split('/')
    const anchor = parts.findIndex(p => ROOTS.has(p.toLowerCase()))
    if (anchor < 0 || anchor === parts.length - 1 || BLOCKED.test(path!)) continue
    const root = ROOTS.get(parts[anchor].toLowerCase())!
    if (root === 'BepInEx' && !['plugins', 'patchers', 'config'].includes(parts[anchor + 1].toLowerCase())) continue
    structured.push({ type: 'copy', source, destination: [root, ...parts.slice(anchor + 1)].join('/') })
  }
  // Explicit directory layouts define the package boundary; do not pull in sibling files.
  if (structured.length) return checkedInstructions(structured)
  const looseFiles = paths.filter(({ path }) => !BLOCKED.test(path!)
    && !/(^|\/)(readme[^/]*|changelog[^/]*|license[^/]*|manifest\.json|icon\.png)$/i.test(path!)
    && !/\.(md|png|jpe?g|webp)$/i.test(path!))
  const dlls = looseFiles.filter(({ path }) => /\.dll$/i.test(path!))
  if (!dlls.length) return []
  let prefix = dlls[0].path!.split('/').slice(0, -1)
  for (const { path } of looseFiles) {
    const pieces = path!.split('/').slice(0, -1)
    while (!prefix.every((p, i) => pieces[i] === p)) prefix.pop()
  }
  return checkedInstructions(looseFiles.flatMap(({ source, path }) => {
    return [{ type: 'copy' as const, source, destination: `Mods/${path!.split('/').slice(prefix.length).join('/')}` }]
  }))
}

export default async function main(context: IExtensionContext): Promise<boolean> {
  let selectedPath: string | undefined
  const exists = async (root: string, relative: string) => {
    try { return Boolean((await context.api.util.fs.stat(context.api.util.path.join(root, relative)))?.isFile) }
    catch { return false }
  }
  const validGame = async (path: string) => (await Promise.all(REQUIRED_GAME_FILES.map(p => exists(path, p)))).every(Boolean)
  const findGamePath = async (): Promise<string | undefined> => {
    if (selectedPath && await validGame(selectedPath)) return selectedPath
    const found = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
    if (!found?.gamePath) return undefined
    for (const path of [found.gamePath, context.api.util.path.join(found.gamePath, 'Probably Stolen')]) {
      if (await validGame(path)) return path
    }
    return undefined
  }
  const getLoaderStatus = async () => {
    const gamePath = await findGamePath()
    const read = async (loader: Loader) => {
      const missingFiles: string[] = []
      for (const file of RUNTIME_FILES[loader]) if (!gamePath || !await exists(gamePath, file)) missingFiles.push(file)
      return { installed: missingFiles.length === 0, missingFiles,
        injectorPresent: !!gamePath && await exists(gamePath, RUNTIME_FILES[loader][0]) }
    }
    const melonloader = await read('melonloader')
    const bepinex = await read('bepinex')
    return { gamePath: gamePath ?? '', melonloader, bepinex,
      conflict: melonloader.injectorPresent && bepinex.injectorPresent }
  }
  const getExtensionRequiredMods = async () => {
    const status = await getLoaderStatus()
    if (status.conflict) throw new Error('检测到 MelonLoader 和 BepInEx 同时启用，请只保留一种预载器。')
    if (status.bepinex.injectorPresent && !status.bepinex.installed)
      throw new Error('检测到不完整的 BepInEx 安装，请先修复或移除，再安装 MelonLoader。')
    // An explicitly installed BepInEx runtime is an alternative, not a reason to install both loaders.
    const requirements = status.melonloader.installed || status.bepinex.installed ? [] : [{
      key: 'probably-stolen-melonloader',
      name: 'MelonLoader 0.7.3 (x64)',
      modId: MELONLOADER_REQUIREMENT_MOD_ID,
      mod_id: MELONLOADER_REQUIREMENT_MOD_ID,
      modType: modType('melonloader'),
      openModDetailDialog: false,
      requirement: 'enabled',
    }]
    const result = { installed: requirements.length === 0, gamePath: status.gamePath, requirements }
    if (result.installed) return result
    return { ...result, code: 'EXTENSION_REQUIRED_MODS_MISSING',
      requirement: { code: 'EXTENSION_REQUIRED_MODS_MISSING', requirements } }
  }
  context.registerGame({
    id: GAME_ID, name: 'Probably Stolen',
    executable: EXECUTABLE, requiredFiles: REQUIRED_GAME_FILES, queryPath: findGamePath,
    setup: async (discovery: { path?: string; gamePath?: string }) => {
      const candidate = discovery?.path || discovery?.gamePath
      if (candidate && !await validGame(candidate)) throw new Error('请选择包含 Probably Stolen.exe 的 IL2CPP 游戏目录。')
      selectedPath = candidate || await findGamePath()
      return getExtensionRequiredMods()
    },
    localModFeatures: [{ modId: Number(MELONLOADER_REQUIREMENT_MOD_ID), marked: true,
      mark: { type: 'prerequisite', label: '前置模组' } }],
    environment: { SteamAPPId: String(GAME_ID) }, details: { steamAppId: GAME_ID },
  })
  const supportedGame = (id: string | number) => String(id) === String(GAME_ID)
  for (const loader of ['melonloader', 'bepinex'] as const) {
    context.registerModType(modType(loader), 60, supportedGame, () => '{gamePath}',
      () => false, { name: loader === 'melonloader' ? 'MelonLoader IL2CPP Runtime' : 'BepInEx 6 IL2CPP Runtime' })
    context.registerInstaller(modType(loader), 60,
      (files, id) => ({ supported: supportedGame(id) && runtimeRoot(files, loader) !== undefined }),
      async files => {
        if (runtimeRoot(files, loader === 'melonloader' ? 'bepinex' : 'melonloader') !== undefined)
          throw new Error('压缩包同时包含两种预载器，请拆分并只启用一种。')
        const status = await getLoaderStatus()
        const other = loader === 'melonloader' ? 'bepinex' : 'melonloader'
        if (status[other].injectorPresent) throw new Error(`请先禁用或移除 ${other} 预载器，再安装 ${loader}。`)
        return { instructions: runtimeInstructions(files, loader), modType: modType(loader) }
      })
  }
  context.registerModType(modType('mods'), 30, supportedGame, () => '{gamePath}',
    () => false, { name: 'Probably Stolen Mods / Content Packs' })
  context.registerInstaller(modType('mods'), 30,
    (files, id) => ({ supported: supportedGame(id) && modInstructions(files).length > 0 }),
    files => ({ instructions: modInstructions(files), modType: modType('mods') }))
  context.registerExtensionAction(GAME_ID, 'getLoaderStatus', getLoaderStatus)
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', getExtensionRequiredMods)
  return true
}
