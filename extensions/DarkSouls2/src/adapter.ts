import type { IExtensionContext, InstallerInstall, InstallerTest } from 'heybox-mod-api'
import { ME2_CONFIG, SOTFS_CONFIG } from './loader-config'

declare const require: any

export interface SoulsGame {
  appid: number
  name: string
  executable: string
  directory: string
  nexusDomain: string
  resourceDirectories: readonly string[]
  resourceFiles: readonly string[]
  loader: 'me2' | 'sotfs'
}

export const OVERRIDE_DIRECTORY = 'heybox-mods'
export const LOADER_MARKER = 'heybox-souls-loader.json'
const ROOT_MARKERS = new Set(['dinput8.dll', 'dxgi.dll', 'd3d11.dll', 'd3d9.dll', 'winmm.dll', 'version.dll'])
type ArchiveFile = { source: string; path: string }

function archiveFiles(input: string[]): ArchiveFile[] {
  return input.filter(file => !/[\\/]$/.test(file)).map(source => {
    const path = source.replace(/\\/g, '/').replace(/^\.\//, '')
    const parts = path.split('/')
    if (!path || parts.some(part => !part || part === '.' || part === '..' || /[:\u0000-\u001f]/.test(part))) {
      throw new Error(`Unsafe archive path: ${source}`)
    }
    return { source, path }
  })
}

function rootAnchor(files: ArchiveFile[]): string | undefined {
  const markers = files.filter(file => ROOT_MARKERS.has(file.path.split('/').at(-1)!.toLowerCase()))
  const roots = [...new Set(markers.map(file => file.path.slice(0, file.path.lastIndexOf('/') + 1)))]
  if (roots.length > 1) throw new Error('Multiple game-root packages: select one package before installing')
  return roots[0]
}

function resourceAnchor(files: ArchiveFile[], game: SoulsGame): string | undefined {
  const roots = new Set<string>()
  for (const file of files) {
    const parts = file.path.split('/')
    const index = parts.findIndex((part, i) => i < parts.length - 1
      ? game.resourceDirectories.includes(part.toLowerCase())
      : game.resourceFiles.includes(part.toLowerCase()))
    if (index >= 0) roots.add(parts.slice(0, index).join('/') + (index ? '/' : ''))
  }
  if (roots.size > 1) throw new Error('Multiple resource roots: select one variant before installing')
  return [...roots][0]
}

function copyTree(files: ArchiveFile[], prefix: string, destination: string) {
  const destinations = new Set<string>()
  return files.filter(file => file.path.startsWith(prefix)).map(file => {
    const target = destination + file.path.slice(prefix.length)
    const key = target.toLowerCase()
    if (destinations.has(key)) throw new Error(`Duplicate Windows destination: ${target}`)
    destinations.add(key)
    return { type: 'copy' as const, source: file.source, destination: target }
  })
}

export function createInstallers(game: SoulsGame) {
  const rootType = `${game.appid}-game-root`
  const resourceType = `${game.appid}-resource`
  function matches(input: string[], gameId: number | string, kind: 'root' | 'resource'): boolean {
    if (Number(gameId) !== game.appid) return false
    try {
      const files = archiveFiles(input)
      const root = rootAnchor(files)
      return kind === 'root' ? root !== undefined : root === undefined && resourceAnchor(files, game) !== undefined
    } catch { return false }
  }
  const testRoot: InstallerTest = (files, gameId) => ({ supported: matches(files, gameId, 'root') })
  const testResources: InstallerTest = (files, gameId) => ({ supported: matches(files, gameId, 'resource') })
  const installRoot: InstallerInstall = input => {
    const files = archiveFiles(input)
    const prefix = rootAnchor(files)
    if (prefix === undefined) throw new Error('No game-root loader or proxy found')
    return { instructions: copyTree(files, prefix, ''), modType: rootType }
  }
  const installResources: InstallerInstall = input => {
    const files = archiveFiles(input)
    if (rootAnchor(files) !== undefined) throw new Error('Install loader bundles with the game-root installer')
    const prefix = resourceAnchor(files, game)
    if (prefix === undefined) throw new Error('No supported Souls resource layout found')
    return { instructions: copyTree(files, prefix, ''), modType: resourceType }
  }
  return { rootType, resourceType, testRoot, testResources, installRoot, installResources }
}

export async function getLoaderStatus(context: IExtensionContext, game: SoulsGame, gamePath?: string) {
  const resolved = String(gamePath || (await context.api.util.GameStoreHelper.findByAppId(game.appid))?.gamePath || '')
  const join = context.api.util.path.join
  const directory = resolved ? join(resolved, game.directory) : ''
  const files = game.loader === 'me2'
    ? ['dinput8.dll', LOADER_MARKER, 'modengine.toml', '.heybox-souls-loader/modengine2.dll', '.heybox-souls-loader/lua.dll']
    : ['dinput8.dll', LOADER_MARKER, 'modengine.ini']
  const checks = await Promise.all(files.map(async file => {
    if (!directory) return false
    try { return Boolean((await context.api.util.fs.stat(join(directory, file))).isFile) } catch { return false }
  }))
  let profileMatches = false
  if (directory && checks.every(Boolean)) {
    try {
      const [rawProfile, rawConfig] = await Promise.all([
        context.api.util.fs.readFile(join(directory, LOADER_MARKER), 'utf8'),
        context.api.util.fs.readFile(join(directory, game.loader === 'me2' ? 'modengine.toml' : 'modengine.ini'), 'utf8'),
      ])
      const profile = JSON.parse(String(rawProfile))
      const expectedConfig = game.loader === 'me2' ? ME2_CONFIG : SOTFS_CONFIG
      profileMatches = profile.schemaVersion === 1 && profile.appid === game.appid
        && profile.loader === game.loader && profile.overrideDirectory === OVERRIDE_DIRECTORY
        && String(rawConfig).replace(/\r/g, '').trim() === expectedConfig.trim()
      if (profileMatches) {
        const crypto = require('crypto')
        const binaries = files.filter(file => file.endsWith('.dll'))
        const hashes = await Promise.all(binaries.map(async file => {
          const expected = profile.payloadHashes?.[file]
          if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) return false
          const bytes = await context.api.util.fs.readFile(join(directory, file))
          return crypto.createHash('sha256').update(bytes).digest('hex') === expected
        }))
        profileMatches = hashes.every(Boolean)
      }
    } catch { /* A different loader/profile must not satisfy this deployment layout. */ }
  }
  const requirements = profileMatches ? [] : [{
    key: `souls-resource-loader-${game.appid}`, name: `${game.name} 资源加载前置（小黑盒配置）`,
    requirement: 'enabled', modType: `${game.appid}-game-root`,
    // No published Heybox Mod id exists yet. Keep the existing manual prerequisite flow.
    url: game.loader === 'me2' ? 'https://github.com/Cloudef/ModEngine2' : 'https://github.com/rainergeis/ModEngine-DS2-Compatible',
  }]
  return { installed: profileMatches, gamePath: resolved, requirements }
}

export async function getRequiredMods(context: IExtensionContext, game: SoulsGame, gamePath?: string) {
  const status = await getLoaderStatus(context, game, gamePath)
  return status.installed ? status : {
    ...status, code: 'EXTENSION_REQUIRED_MODS_MISSING',
    requirement: { code: 'EXTENSION_REQUIRED_MODS_MISSING', requirements: status.requirements },
  }
}

export function registerSoulsGame(context: IExtensionContext, game: SoulsGame): boolean {
  const installers = createInstallers(game)
  const target = `{gamePath}${game.directory ? `/${game.directory}` : ''}`
  context.registerGame({
    id: game.appid, name: game.name, executable: game.executable, requiredFiles: [game.executable],
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(game.appid))?.gamePath,
    environment: { SteamAPPId: String(game.appid) }, details: { steamAppId: game.appid, nexusGameDomainName: game.nexusDomain },
    setup: (discovery: { path?: string }) => getRequiredMods(context, game, discovery?.path),
  })
  const register = (id: string, priority: number, path: string, test: InstallerTest, install: InstallerInstall, name: string) => {
    context.registerModType(id, priority, id => Number(id) === game.appid, () => path,
      input => Array.isArray(input) && (test(input.map(String), game.appid) as { supported: boolean }).supported, { name })
    context.registerInstaller(id, priority, test, install)
  }
  register(installers.rootType, 30, target, installers.testRoot, installers.installRoot, `${game.name} Loader / Root`)
  register(installers.resourceType, 20, `${target}/${OVERRIDE_DIRECTORY}`, installers.testResources, async files => {
    const status = await getRequiredMods(context, game)
    if (!status.installed) throw Object.assign(new Error('Souls resource loader prerequisite missing'), { result: status })
    return installers.installResources(files)
  }, `${game.name} Resources`)
  context.registerExtensionAction(game.appid, 'getExtensionRequiredMods', () => getRequiredMods(context, game))
  return true
}
