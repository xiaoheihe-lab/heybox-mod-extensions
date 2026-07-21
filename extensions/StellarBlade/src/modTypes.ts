import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_BINARIES,
  MOD_TYPE_CNS_JSON,
  MOD_TYPE_DLL,
  MOD_TYPE_LOGIC,
  MOD_TYPE_MENU,
  MOD_TYPE_MOVIE,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_SPLASH,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UE4SS_COMBO,
} from './constants'
import {
  installBinaries,
  installCnsJson,
  installDll,
  installLogic,
  installMenu,
  installMovie,
  installPak,
  installRoot,
  installScript,
  installSplash,
  installUe4ss,
  installUe4ssCombo,
  testBinaries,
  testCnsJson,
  testDll,
  testLogic,
  testMenu,
  testMovie,
  testPak,
  testRoot,
  testScript,
  testSplash,
  testUe4ss,
  testUe4ssCombo,
} from './installers'

type Tester = (files: string[], gameId: number | string) => { supported: boolean }

function isStellarBlade(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function filesFromLocalInfo(input: any): string[] {
  if (Array.isArray(input)) return input
  return Array.isArray(input?.files) ? input.files : []
}

function register(
  context: IExtensionContext,
  typeId: string,
  priority: number,
  name: string,
  installerPriority: number,
  test: Tester,
  install: (...args: any[]) => any,
) {
  context.registerModType(
    typeId,
    priority,
    isStellarBlade,
    () => '{gamePath}',
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name },
  )
  context.registerInstaller(typeId, installerPriority, test, install)
}

export function registerStellarBladeModTypes(context: IExtensionContext): void {
  register(context, MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, 'UE4SS for Stellar Blade', 1, testUe4ss, installUe4ss)
  register(context, MOD_TYPE_UE4SS_COMBO, MOD_TYPE_PRIORITY.ue4ssCombo, 'UE4SS Script + LogicMod', 10, testUe4ssCombo, installUe4ssCombo)
  register(context, MOD_TYPE_LOGIC, MOD_TYPE_PRIORITY.logic, 'UE4SS LogicMod', 11, testLogic, installLogic)
  register(context, MOD_TYPE_SCRIPT, MOD_TYPE_PRIORITY.script, 'UE4SS Script Mod', 14, testScript, (files, stagingPath) => installScript(files, stagingPath))
  register(context, MOD_TYPE_DLL, MOD_TYPE_PRIORITY.dll, 'UE4SS DLL Mod', 15, testDll, (files, stagingPath) => installDll(files, stagingPath))
  register(context, MOD_TYPE_CNS_JSON, MOD_TYPE_PRIORITY.cnsJson, 'CNS JSON Mod', 20, testCnsJson, installCnsJson)
  register(context, MOD_TYPE_MENU, MOD_TYPE_PRIORITY.menu, 'Menu Video Mod', 21, testMenu, installMenu)
  register(context, MOD_TYPE_MOVIE, MOD_TYPE_PRIORITY.movie, 'Movie Mod', 22, testMovie, installMovie)
  register(context, MOD_TYPE_SPLASH, MOD_TYPE_PRIORITY.splash, 'Splash Screen Mod', 23, testSplash, installSplash)
  register(context, MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, 'UE IoStore Pak Mod', 30, testPak, installPak)
  register(context, MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, 'Root Game Folder Mod', 40, testRoot, installRoot)
  register(context, MOD_TYPE_BINARIES, MOD_TYPE_PRIORITY.binaries, 'Binaries / Engine Injector', 50, testBinaries, installBinaries)
}
