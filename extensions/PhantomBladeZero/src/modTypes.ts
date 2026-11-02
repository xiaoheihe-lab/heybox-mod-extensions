import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  INSTALLER_PRIORITY,
  MOD_TYPE_BINARIES,
  MOD_TYPE_COMBO,
  MOD_TYPE_CONTENT,
  MOD_TYPE_DLL,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_PAK_ALT,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UE4SS_FOLDER,
} from './constants'
import {
  installBinaries,
  installCombo,
  installContent,
  installDll,
  installLogic,
  installPak,
  installPakAlt,
  installRoot,
  installScript,
  installUe4ss,
  installUe4ssFolderOrLua,
  testBinaries,
  testCombo,
  testContent,
  testDll,
  testLogic,
  testPak,
  testPakAlt,
  testRoot,
  testScript,
  testUe4ss,
  testUe4ssFolderOrLua,
} from './installers'
import { applyMutableFilePolicies } from './policy'

type Tester = (files: string[], gameId: number | string) => { supported: boolean }

function isPhantomBladeZero(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function filesFromLocalInfo(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String)
  const value = input as { files?: unknown } | null
  return Array.isArray(value?.files) ? value.files.map(String) : []
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
    isPhantomBladeZero,
    () => '{gamePath}',
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name },
  )
  context.registerInstaller(typeId, installerPriority, test, async (...args: any[]) => (
    applyMutableFilePolicies(await install(...args))
  ))
}

export function registerPhantomBladeZeroModTypes(context: IExtensionContext): void {
  register(
    context,
    MOD_TYPE_UE4SS,
    MOD_TYPE_PRIORITY.ue4ss,
    'UE4SS for Phantom Blade Zero',
    INSTALLER_PRIORITY.ue4ss,
    testUe4ss,
    (files: string[], stagingPath: string, options: any) => installUe4ss(context, files, stagingPath, options),
  )
  // The combo tester must run before the individual script/DLL testers,
  // otherwise a hybrid archive would only deploy half of its payload.
  register(
    context,
    MOD_TYPE_COMBO,
    MOD_TYPE_PRIORITY.combo,
    'UE4SS Script + Pak Combo',
    INSTALLER_PRIORITY.combo,
    testCombo,
    (files: string[], stagingPath: string) => installCombo(context, files, stagingPath),
  )
  register(
    context,
    MOD_TYPE_LOGIC,
    MOD_TYPE_PRIORITY.logic,
    'UE4SS LogicMod',
    INSTALLER_PRIORITY.logic,
    testLogic,
    installLogic,
  )
  register(
    context,
    MOD_TYPE_SCRIPT,
    MOD_TYPE_PRIORITY.script,
    'UE4SS Script Mod',
    INSTALLER_PRIORITY.script,
    testScript,
    (files: string[], stagingPath: string) => installScript(files, stagingPath),
  )
  register(
    context,
    MOD_TYPE_DLL,
    MOD_TYPE_PRIORITY.dll,
    'UE4SS DLL Mod',
    INSTALLER_PRIORITY.dll,
    testDll,
    (files: string[], stagingPath: string) => installDll(files, stagingPath),
  )
  register(
    context,
    MOD_TYPE_UE4SS_FOLDER,
    MOD_TYPE_PRIORITY.ue4ssFolder,
    'UE4SS Mod Folder (enabled.txt / bare Lua)',
    INSTALLER_PRIORITY.ue4ssFolder,
    testUe4ssFolderOrLua,
    (files: string[], stagingPath: string) => installUe4ssFolderOrLua(files, stagingPath),
  )
  register(
    context,
    MOD_TYPE_CONTENT,
    MOD_TYPE_PRIORITY.content,
    'Project Content Folder',
    INSTALLER_PRIORITY.content,
    testContent,
    installContent,
  )
  register(
    context,
    MOD_TYPE_PAK_ALT,
    MOD_TYPE_PRIORITY.pakAlt,
    'UE5 Pak Mod (Paks folder)',
    INSTALLER_PRIORITY.pakAlt,
    testPakAlt,
    installPakAlt,
  )
  register(
    context,
    MOD_TYPE_PAK,
    MOD_TYPE_PRIORITY.pak,
    'UE5 Pak Mod',
    INSTALLER_PRIORITY.pak,
    testPak,
    (files: string[]) => installPak(context, files),
  )
  register(
    context,
    MOD_TYPE_BINARIES,
    MOD_TYPE_PRIORITY.binaries,
    'Binaries (ReShade / DLL plugins)',
    INSTALLER_PRIORITY.binaries,
    testBinaries,
    installBinaries,
  )
  register(
    context,
    MOD_TYPE_ROOT,
    MOD_TYPE_PRIORITY.root,
    'Root Game Folder Mod',
    INSTALLER_PRIORITY.root,
    testRoot,
    installRoot,
  )
}
