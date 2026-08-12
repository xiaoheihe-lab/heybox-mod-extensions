import type { IExtensionContext } from 'heybox-mod-api'
import path from 'path'

export const GAME_ID = 233860
export const STEAM_APP_ID = '233860'
const GAME_NAME = 'Kenshi'
const GAME_SHORT_NAME = 'Kenshi'
const EXECUTABLE = 'kenshi_x64.exe'
const MOD_PATH = 'mods'
export const MOD_TYPE_ID = 'kenshi-local-mod'

export function normalizeArchivePath(filePath: string): string | null {
  const normalized = String(filePath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^(\.\/)+/g, '')
    .replace(/\/+/g, '/')
    .trim()

  if (!normalized || normalized.endsWith('/')) return null
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null

  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '.' || segment === '..')) return null
  return segments.join('/')
}

export function archiveBaseName(filePath: string): string {
  const normalized = normalizeArchivePath(filePath)
  return normalized ? path.posix.basename(normalized) : ''
}

export function archiveDirName(filePath: string): string {
  const normalized = normalizeArchivePath(filePath)
  if (!normalized) return ''
  const dir = path.posix.dirname(normalized)
  return dir === '.' ? '' : dir
}

function hasModFile(filePath: string): boolean {
  return archiveBaseName(filePath).toLowerCase().endsWith('.mod')
}

function sanitizeModName(name: string): string {
  const value = String(name || 'Kenshi Mod')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
  return value || 'Kenshi Mod'
}

function isUnderRoot(filePath: string, root: string): boolean {
  const rel = normalizeArchivePath(filePath)
  if (!rel) return false
  if (!root) return true
  return rel === root || rel.startsWith(`${root}/`)
}

export function getKenshiModFile(files: string[]): string | undefined {
  const modFiles = files.filter(hasModFile)
  if (modFiles.length > 1) {
    throw new Error('Kenshi installer does not support archives with multiple .mod files')
  }
  return modFiles[0]
}

export function installKenshiMod(files: string[]) {
  const modFile = getKenshiModFile(files)
  const instructions: Array<{ type: 'copy'; source: string; destination: string }> = []
  if (!modFile) return { instructions }

  const modName = sanitizeModName(path.posix.basename(archiveBaseName(modFile), '.mod'))
  const root = archiveDirName(modFile)
  const prefix = root ? `${root}/` : ''

  for (const source of files) {
    const relSource = normalizeArchivePath(source)
    if (!relSource || !isUnderRoot(relSource, root)) continue
    const relativeInsideMod = prefix ? relSource.slice(prefix.length) : relSource
    if (!relativeInsideMod) continue

    instructions.push({
      type: 'copy',
      source,
      destination: path.posix.join(modName, relativeInsideMod),
    })
  }

  return { instructions }
}

export function testKenshiMod(files: string[], gameId: number | string) {
  let supported = false
  try {
    supported = Number(gameId) === GAME_ID && !!getKenshiModFile(files)
  } catch {
    supported = false
  }
  return Promise.resolve({
    supported,
    requiredFiles: [],
  })
}

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    modPath: MOD_PATH,
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID)
      return game?.gamePath
    },
    queryModPath: () => MOD_PATH,
    mergeMods: true,
    requiresCleanup: true,
    environment: {
      SteamAPPId: STEAM_APP_ID,
    },
    details: {
      steamAppId: GAME_ID,
      supportsSymlinks: true,
    },
  })

  context.registerModType(
    MOD_TYPE_ID,
    25,
    (gameId: number) => Number(gameId) === GAME_ID,
    () => path.join('{gamePath}', MOD_PATH),
    () => Promise.resolve(false),
    { name: 'Kenshi Mod' },
  )

  context.registerInstaller(MOD_TYPE_ID, 25, testKenshiMod, installKenshiMod)

  return true
}

export default main
