import type { IExtensionContext } from 'heybox-mod-api'
import { installPakArchive, testPakArchive } from './pak-installer'
import { hasRootLayout, installRoot, ROOT_MOD_TYPE, testRoot } from './root-installer'
export { installRoot, testRoot } from './root-installer'

const GAME_ID = 1332010
const MOD_TYPE = `${GAME_ID}-pak`
const MOD_PATH = 'Hk_project/Content/Paks/~mods'
const PRIORITY = 25
const OPTIONS = { gameId: GAME_ID, gameName: 'Stray', modType: MOD_TYPE, requirePatchSuffix: true }

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
    name: 'Stray',
    executable: 'Stray.exe',
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(String(GAME_ID)))?.gamePath,
    requiredFiles: ['Stray.exe'],
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: 'stray', customOpenModsPath: MOD_PATH },
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
    { name: 'Stray Pak Mod' },
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
    { name: 'Stray Root Mod' },
  )
  context.registerInstaller(ROOT_MOD_TYPE, 30, testRoot, installRoot)
  return true
}
