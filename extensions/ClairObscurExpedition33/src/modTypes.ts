import type { IExtensionContext } from 'heybox-mod-api'
import { registerFomodInstaller } from '@heybox-mod-extensions/fomod-utils'
import {
  GAME_ID,
  MOD_TYPE_BINARIES,
  MOD_TYPE_CONTENT,
  MOD_TYPE_DLL,
  MOD_TYPE_FOMOD,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UE4SS_COMBO,
} from './constants'
import {
  installBinaries,
  installContent,
  installDll,
  installLogic,
  installPak,
  installRoot,
  installScript,
  installUe4ss,
  installUe4ssCombo,
  testBinaries,
  testContent,
  testDll,
  testLogic,
  testPak,
  testRoot,
  testScript,
  testUe4ss,
  testUe4ssCombo,
} from './installers'
import { registerFomodPakAttributeExtractor } from './loadOrder/fomod'
import { normalizeDeploymentPath } from './utils/archivePaths'

type Tester = (files: string[], gameId: number | string) => { supported: boolean }

const MUTABLE_UE4SS_FILES = new Set([
  'sandfall/binaries/win64/ue4ss-settings.ini',
  'sandfall/binaries/win64/ue4ss/ue4ss-settings.ini',
  'sandfall/binaries/win64/ue4ss/mods/mods.txt',
  'sandfall/binaries/win64/ue4ss/mods/mods.json',
])

function isExpedition33(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function filesFromLocalInfo(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String)
  const value = input as { files?: unknown } | null
  return Array.isArray(value?.files) ? value.files.map(String) : []
}

export function applyMutableFilePolicies(result: any): any {
  if (!result || !Array.isArray(result.instructions)) return result
  return {
    ...result,
    instructions: result.instructions.map((instruction: any) => {
      if (!instruction || !MUTABLE_UE4SS_FILES.has(normalizeDeploymentPath(instruction.destination))) return instruction
      return { ...instruction, verification: 'exists', conflictPolicy: 'overwrite' }
    }),
  }
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
    isExpedition33,
    () => '{gamePath}',
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name },
  )
  context.registerInstaller(typeId, installerPriority, test, async (...args: any[]) => (
    applyMutableFilePolicies(await install(...args))
  ))
}

export function registerClairObscurExpedition33ModTypes(context: IExtensionContext): void {
  registerFomodInstaller(context, {
    gameId: GAME_ID,
    typeId: MOD_TYPE_FOMOD,
    priority: 100,
    name: 'FOMOD Installer',
  })
  registerFomodPakAttributeExtractor(context)

  register(context, MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, 'UE4SS Runtime', 1, testUe4ss, installUe4ss)
  register(context, MOD_TYPE_UE4SS_COMBO, MOD_TYPE_PRIORITY.combo, 'UE4SS Script + LogicMod', 25, testUe4ssCombo, installUe4ssCombo)
  register(context, MOD_TYPE_LOGIC, MOD_TYPE_PRIORITY.logic, 'UE4SS LogicMod', 30, testLogic, installLogic)
  register(context, MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, 'UE5 IO Store Pak Mod', 35, testPak, (files) => installPak(context, files))
  register(context, MOD_TYPE_SCRIPT, MOD_TYPE_PRIORITY.script, 'UE4SS Script Mod', 50, testScript, installScript)
  register(context, MOD_TYPE_DLL, MOD_TYPE_PRIORITY.dll, 'UE4SS DLL Mod', 53, testDll, installDll)
  register(context, MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, 'Root Game Folder Mod', 55, testRoot, installRoot)
  register(context, MOD_TYPE_CONTENT, MOD_TYPE_PRIORITY.content, 'Content Folder Mod', 57, testContent, installContent)
  register(context, MOD_TYPE_BINARIES, MOD_TYPE_PRIORITY.binaries, 'Binaries Fallback Mod', 60, testBinaries, (files) => installBinaries(context, files))
}
