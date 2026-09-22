import type { IExtensionContext } from 'heybox-mod-api'
import { installPakArchive, testPakArchive } from './pak-installer'
import { hasRootLayout, installRoot, ROOT_MOD_TYPE, testRoot } from './root-installer'
export { installRoot, testRoot } from './root-installer'

const GAME_ID = 1627720
const MOD_TYPE = `${GAME_ID}-pak`
const MOD_PATH = 'LiesofP/Content/Paks/~mods'
const PRIORITY = 25
const OPTIONS = { gameId: GAME_ID, gameName: 'Lies of P', modType: MOD_TYPE, requirePatchSuffix: false }

export function testPak(files: string[], gameId: number | string) {
  if (hasRootLayout(files)) return { supported: false, requiredFiles: [] }
  return testPakArchive(files, gameId, OPTIONS)
}

export function installPak(files: string[]) {
  return installPakArchive(files, OPTIONS)
}

export default function main(context: IExtensionContext): boolean {
  context.registerGame({
    id: GAME_ID,
    name: 'Lies of P',
    executable: 'LOP.exe',
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(String(GAME_ID)))?.gamePath,
    requiredFiles: ['LOP.exe'],
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: 'liesofp', customOpenModsPath: MOD_PATH },
  })
  context.registerModType(
    MOD_TYPE,
    PRIORITY,
    gameId => String(gameId) === String(GAME_ID),
    () => '{gamePath}/' + MOD_PATH,
    (input: unknown) => {
      const files = Array.isArray(input) ? input : (input as { files?: unknown } | null)?.files
      return Array.isArray(files) && testPak(files.map(String), GAME_ID).supported
    },
    { name: 'Lies of P Pak Mod' },
  )
  context.registerInstaller(MOD_TYPE, PRIORITY, testPak, installPak)
  context.registerModType(
    ROOT_MOD_TYPE,
    30,
    gameId => String(gameId) === String(GAME_ID),
    () => '{gamePath}',
    (input: unknown) => {
      const files = Array.isArray(input) ? input : (input as { files?: unknown } | null)?.files
      return Array.isArray(files) && testRoot(files.map(String), GAME_ID).supported
    },
    { name: 'Lies of P Root Mod' },
  )
  context.registerInstaller(ROOT_MOD_TYPE, 30, testRoot, installRoot)
  return true
}
