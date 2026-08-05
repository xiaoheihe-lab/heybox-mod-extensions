import assert from 'node:assert/strict'
import path from 'node:path'
import {
  GAME_ID,
  MOD_TYPE_FOMOD,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  PAK_ATTRIBUTE,
  PAK_LOAD_ORDER_PROVIDER_ID,
  UE4SS_REQUIREMENT_MOD_ID,
} from '../src/constants'
import {
  FALLBACK_INSTALL_CANCELLED,
  INSTALL_CANCELLED,
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
} from '../src/installers'
import { makeLoadOrderPrefix, planPakLoadOrderMutation, serializePakLoadOrder } from '../src/loadOrder/deployer'
import { extractFomodPakAttributes } from '../src/loadOrder/fomod'
import { registerPakLoadOrder } from '../src/loadOrder'
import { deserializePakLoadOrder } from '../src/loadOrder/provider'
import { registerClairObscurExpedition33ModTypes } from '../src/modTypes'
import { getExtensionRequiredMods, getRequirementItems, getRequirementStatus } from '../src/requirements'

function requirementContext(existingFiles: string[]) {
  const files = new Set(existingFiles.map((file) => path.normalize(file).toLowerCase()))
  return {
    api: {
      util: {
        path,
        GameStoreHelper: { findByAppId: async () => null },
        fs: {
          stat: async (target: string) => {
            if (files.has(path.normalize(target).toLowerCase())) return { isFile: true }
            throw new Error('ENOENT')
          },
        },
      },
    },
  } as any
}

function selectionContext(response: any) {
  return {
    api: {
      util: {
        ui: { request: async () => response },
      },
    },
  } as any
}

async function main() {
  assert.equal(GAME_ID, 1903340)
  assert.equal(UE4SS_REQUIREMENT_MOD_ID, '8577')
  assert.deepEqual(getRequirementItems().map((item) => item.modId), ['8577'])

  const registeredTypes: Array<{ id: string, priority: number, name: string }> = []
  const registeredInstallers: Array<{ id: string, priority: number }> = []
  const postInstallerExtractors: any[] = []
  registerClairObscurExpedition33ModTypes({
    registerModType: (id: string, priority: number, _supported: any, _target: any, _tester: any, options: any) => {
      registeredTypes.push({ id, priority, name: String(options?.name || '') })
    },
    registerInstaller: (id: string, priority: number) => registeredInstallers.push({ id, priority }),
    registerPostInstallerAttributeExtractor: (_priority: number, extractor: any) => postInstallerExtractors.push(extractor),
  } as any)
  assert.equal(registeredTypes.length, 10)
  assert.equal(registeredInstallers.length, 10)
  assert.equal(registeredTypes.find((item) => item.id === MOD_TYPE_FOMOD)?.priority, 1000)
  assert.equal(postInstallerExtractors.length, 1)
  assert.equal(Math.max(...Object.values(MOD_TYPE_PRIORITY)), MOD_TYPE_PRIORITY.combo)
  assert.ok(MOD_TYPE_PRIORITY.combo > MOD_TYPE_PRIORITY.ue4ss)
  assert.equal(registeredTypes.some((item) => /save|config/i.test(`${item.id} ${item.name}`)), false)

  assert.deepEqual(extractFomodPakAttributes({
    installerTypeId: MOD_TYPE_FOMOD,
    modTypeId: MOD_TYPE_FOMOD,
    instructions: [
      { type: 'copy', source: 'A.pak', destination: 'Sandfall/Content/Paks/~mods/A.pak' },
      { type: 'copy', source: 'A.ucas', destination: 'Sandfall\\Content\\Paks\\~mods\\A.ucas' },
      { type: 'copy', source: 'A.utoc', destination: 'D:\\Games\\E33\\Sandfall\\Content\\Paks\\~mods\\A.utoc' },
      { type: 'copy', source: 'Readme.txt', destination: 'Sandfall/Content/Paks/~mods/Readme.txt' },
    ],
  }), { [PAK_ATTRIBUTE]: ['A.pak', 'A.ucas', 'A.utoc'] })

  const comboFiles = [
    'Wrapper/Sandfall/',
    'Wrapper/Sandfall/Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua',
    'Wrapper/Sandfall/Content/Paks/LogicMods/Combo.pak',
  ]
  assert.equal(testUe4ssCombo(comboFiles, GAME_ID).supported, true)
  assert.deepEqual(installUe4ssCombo(comboFiles).instructions, [
    { type: 'copy', source: 'Wrapper/Sandfall/Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua' },
    { type: 'copy', source: 'Wrapper/Sandfall/Content/Paks/LogicMods/Combo.pak', destination: 'Sandfall/Content/Paks/LogicMods/Combo.pak' },
  ])

  const logicFiles = ['Wrapper/LogicMods/', 'Wrapper/LogicMods/Mod.pak', 'Wrapper/LogicMods/Mod.ucas', 'Wrapper/LogicMods/Mod.utoc']
  assert.equal(testLogic(logicFiles, GAME_ID).supported, true)
  assert.deepEqual(installLogic(logicFiles).instructions, [
    { type: 'copy', source: 'Wrapper/LogicMods/Mod.pak', destination: 'Sandfall/Content/Paks/LogicMods/Mod.pak' },
    { type: 'copy', source: 'Wrapper/LogicMods/Mod.ucas', destination: 'Sandfall/Content/Paks/LogicMods/Mod.ucas' },
    { type: 'copy', source: 'Wrapper/LogicMods/Mod.utoc', destination: 'Sandfall/Content/Paks/LogicMods/Mod.utoc' },
  ])

  const fomodFiles = ['fomod/ModuleConfig.xml', 'Sandfall/', 'Sandfall/Content/Paks/Foo.pak']
  assert.equal(testPak(fomodFiles, GAME_ID).supported, false)
  assert.equal(testRoot(fomodFiles, GAME_ID).supported, false)
  assert.equal(testBinaries(fomodFiles, GAME_ID).supported, false)

  const ue4ssFiles = [
    'UE4SS/dwmapi.dll',
    'UE4SS/ue4ss/UE4SS.dll',
    'UE4SS/ue4ss/Mods/mods.txt',
    'UE4SS/LICENSE',
    'README.md',
  ]
  assert.equal(testUe4ss(ue4ssFiles, GAME_ID).supported, true)
  assert.equal(testUe4ss(['UE4SS/dwmapi.dll'], GAME_ID).supported, false)
  assert.equal(testUe4ss(['UE4SS/dwmapi.dll', 'Other/ue4ss/UE4SS.dll'], GAME_ID).supported, false)
  assert.deepEqual(installUe4ss(ue4ssFiles).instructions, [
    { type: 'copy', source: 'UE4SS/dwmapi.dll', destination: 'Sandfall/Binaries/Win64/dwmapi.dll' },
    { type: 'copy', source: 'UE4SS/ue4ss/UE4SS.dll', destination: 'Sandfall/Binaries/Win64/ue4ss/UE4SS.dll' },
    { type: 'copy', source: 'UE4SS/ue4ss/Mods/mods.txt', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/mods.txt' },
    { type: 'copy', source: 'UE4SS/LICENSE', destination: 'Sandfall/Binaries/Win64/LICENSE' },
  ])

  const gamePath = path.join('D:', 'Games', 'Expedition33')
  const win64Path = path.join(gamePath, 'Sandfall/Binaries/Win64')
  const installedRequirement = requirementContext([
    path.join(win64Path, 'dwmapi.dll'),
    path.join(win64Path, 'ue4ss/UE4SS.dll'),
  ])
  assert.equal((await getRequirementStatus(installedRequirement, gamePath)).installed, true)
  const rootDllOnly = requirementContext([
    path.join(win64Path, 'dwmapi.dll'),
    path.join(win64Path, 'UE4SS.dll'),
  ])
  const missingRequirement = await getRequirementStatus(rootDllOnly, gamePath)
  assert.equal(missingRequirement.installed, false)
  assert.deepEqual(missingRequirement.requirements.map((item) => item.name), ['UE4SS for Clair Obscur: Expedition 33'])
  assert.equal((await getExtensionRequiredMods(rootDllOnly, gamePath)).code, 'EXTENSION_REQUIRED_MODS_MISSING')

  const scriptFiles = ['CoolMod/Scripts/', 'CoolMod/Scripts/main.lua', 'CoolMod/config.json']
  assert.equal(testScript(scriptFiles, GAME_ID).supported, true)
  assert.deepEqual(installScript(scriptFiles, 'ignored.installing').instructions, [
    { type: 'copy', source: 'CoolMod/Scripts/main.lua', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/CoolMod/Scripts/main.lua' },
    { type: 'copy', source: 'CoolMod/config.json', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/CoolMod/config.json' },
    { type: 'generatefile', data: '', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/CoolMod/enabled.txt' },
  ])

  const dllFiles = ['DllMod/dlls/', 'DllMod/dlls/main.dll']
  assert.equal(testDll(dllFiles, GAME_ID).supported, true)
  assert.deepEqual(installDll(dllFiles, 'ignored.installing').instructions, [
    { type: 'copy', source: 'DllMod/dlls/main.dll', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/DllMod/dlls/main.dll' },
    { type: 'generatefile', data: '', destination: 'Sandfall/Binaries/Win64/ue4ss/Mods/DllMod/enabled.txt' },
  ])

  const rootFiles = ['Wrapper/Sandfall/', 'Wrapper/Sandfall/Content/Movies/intro.bk2']
  assert.deepEqual(installRoot(rootFiles).instructions, [
    { type: 'copy', source: 'Wrapper/Sandfall/Content/Movies/intro.bk2', destination: 'Sandfall/Content/Movies/intro.bk2' },
  ])
  const contentFiles = ['Wrapper/Content/', 'Wrapper/Content/Movies/intro.bk2']
  assert.equal(testContent(contentFiles, GAME_ID).supported, true)
  assert.deepEqual(installContent(contentFiles).instructions, [
    { type: 'copy', source: 'Wrapper/Content/Movies/intro.bk2', destination: 'Sandfall/Content/Movies/intro.bk2' },
  ])

  const iostoreFiles = ['Nested/Foo.pak', 'Nested/Foo.ucas', 'Nested/Foo.utoc']
  assert.equal(testPak(iostoreFiles, GAME_ID).supported, true)
  assert.deepEqual((await installPak(selectionContext(null), iostoreFiles)).instructions, [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: ['Foo.pak', 'Foo.ucas', 'Foo.utoc'] },
    { type: 'copy', source: 'Nested/Foo.pak', destination: 'Sandfall/Content/Paks/~mods/Foo.pak' },
    { type: 'copy', source: 'Nested/Foo.ucas', destination: 'Sandfall/Content/Paks/~mods/Foo.ucas' },
    { type: 'copy', source: 'Nested/Foo.utoc', destination: 'Sandfall/Content/Paks/~mods/Foo.utoc' },
  ])
  assert.deepEqual((await installPak(selectionContext({ confirmed: true, payload: { choiceIds: ['iostore-1'] } }), [
    'OptionA/A.pak', 'OptionA/A.ucas', 'OptionB/B.pak', 'OptionB/B.ucas',
  ])).instructions, [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: ['B.pak', 'B.ucas'] },
    { type: 'copy', source: 'OptionB/B.pak', destination: 'Sandfall/Content/Paks/~mods/B.pak' },
    { type: 'copy', source: 'OptionB/B.ucas', destination: 'Sandfall/Content/Paks/~mods/B.ucas' },
  ])
  await assert.rejects(installPak(selectionContext({ confirmed: false }), ['A.pak', 'B.pak']), new RegExp(INSTALL_CANCELLED))
  await assert.rejects(
    installPak(selectionContext({ confirmed: true, payload: { choiceIds: ['iostore-0', 'iostore-1'] } }), ['A/Foo.pak', 'B/foo.PAK']),
    /重名/,
  )

  assert.deepEqual((await installBinaries(selectionContext({ confirmed: true }), ['Plugin.dll', 'Sub/Config.ini'])).instructions, [
    { type: 'copy', source: 'Plugin.dll', destination: 'Sandfall/Binaries/Win64/Plugin.dll' },
    { type: 'copy', source: 'Sub/Config.ini', destination: 'Sandfall/Binaries/Win64/Sub/Config.ini' },
  ])
  await assert.rejects(installBinaries(selectionContext({ confirmed: false }), ['Plugin.dll']), new RegExp(FALLBACK_INSTALL_CANCELLED))

  assert.equal(makeLoadOrderPrefix(0), 'AAA')
  assert.equal(makeLoadOrderPrefix(25), 'AAZ')
  assert.equal(makeLoadOrderPrefix(26), 'ABA')
  const loadOrderContext = {
    appid: GAME_ID,
    gameId: GAME_ID,
    gamePath: 'D:/Games/Expedition33',
    revision: 1,
    reason: 'open',
    savedOrder: ['2_20', '1_10'],
    mods: [
      { modKey: '1_10', modType: MOD_TYPE_PAK, enabled: true, metaInfo: { name: 'Alpha', [PAK_ATTRIBUTE]: ['A.pak'] } },
      { modKey: '2_20', modType: MOD_TYPE_PAK, enabled: false, metaInfo: { name: 'Beta', [PAK_ATTRIBUTE]: ['B.pak', 'B.ucas', 'B.utoc'] } },
      { modKey: '3_30', modType: MOD_TYPE_FOMOD, enabled: true, metaInfo: { name: 'FOMOD Pak', [PAK_ATTRIBUTE]: ['C.pak'] } },
      { modKey: '4_40', modType: MOD_TYPE_FOMOD, enabled: true, metaInfo: { name: 'FOMOD without Pak', [PAK_ATTRIBUTE]: [] } },
    ],
  }
  const ordered = deserializePakLoadOrder(loadOrderContext)
  assert.deepEqual(ordered.map((entry) => entry.id), ['2_20', '1_10', '3_30'])
  assert.equal(ordered[0]?.name, 'Beta (3 IO Store files)')

  const moves: any[] = []
  assert.equal(planPakLoadOrderMutation({
    entries: [
      { modKey: '1_10', targetPath: 'Sandfall/Content/Paks/~mods/A.pak', expectedHash: 'hash-a', exists: true },
      { modKey: '2_20', targetPath: 'Sandfall/Content/Paks/~mods/OLD-2_20/B.ucas', expectedHash: 'hash-b', exists: true },
    ],
    moveDeployment: (input: any) => moves.push(input),
    warn: () => assert.fail('all deployment entries exist'),
  }, ordered), 2)
  assert.deepEqual(moves, [
    { modKey: '1_10', from: 'Sandfall/Content/Paks/~mods/A.pak', to: 'Sandfall/Content/Paks/~mods/AAB-1_10/A.pak', expectedHash: 'hash-a' },
    { modKey: '2_20', from: 'Sandfall/Content/Paks/~mods/OLD-2_20/B.ucas', to: 'Sandfall/Content/Paks/~mods/AAA-2_20/B.ucas', expectedHash: 'hash-b' },
  ])

  const deployedTypes: string[] = []
  await serializePakLoadOrder({
    api: {
      vfs: {
        runManagedDeploymentMutation: async (options: any, callback: any) => {
          deployedTypes.push(options.modType)
          callback({ entries: [], moveDeployment: () => undefined, warn: () => undefined })
          return { ok: true, warnings: [] }
        },
      },
    },
  } as any, ordered, loadOrderContext)
  assert.deepEqual(deployedTypes, [MOD_TYPE_PAK, MOD_TYPE_FOMOD])

  let registration: any
  let actionName = ''
  registerPakLoadOrder({
    registerLoadOrder: (value: any) => { registration = value },
    registerExtensionAction: (_gameId: number, name: string) => { actionName = name },
    api: { loadOrder: { deploy: async () => ({}) } },
  } as any)
  assert.equal(registration.id, PAK_LOAD_ORDER_PROVIDER_ID)
  assert.deepEqual(registration.modTypes, [MOD_TYPE_PAK, MOD_TYPE_FOMOD])
  assert.equal(actionName, 'deployPakLoadOrder')
}

void main()
