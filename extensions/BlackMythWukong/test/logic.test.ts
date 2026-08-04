import assert from 'node:assert/strict'
import path from 'node:path'
import {
  GAME_ID,
  MOD_TYPE_FOMOD,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_UE4SS,
  PAK_ATTRIBUTE,
  PAK_LOAD_ORDER_PROVIDER_ID,
  SIGNATURE_BYPASS_REQUIREMENT_MOD_ID,
  UE4SS_REQUIREMENT_MOD_ID,
} from '../src/constants'
import {
  INSTALL_CANCELLED,
  installDll,
  installLogic,
  installPak,
  installRoot,
  installScript,
  installSignatureBypass,
  installUe4ss,
  installUe4ssCombo,
  testDll,
  testLogic,
  testPak,
  testRoot,
  testScript,
  testSignatureBypass,
  testUe4ss,
  testUe4ssCombo,
} from '../src/installers'
import { makeLoadOrderPrefix, planPakLoadOrderMutation, serializePakLoadOrder } from '../src/loadOrder/deployer'
import { extractFomodPakAttributes } from '../src/loadOrder/fomod'
import { registerPakLoadOrder } from '../src/loadOrder'
import { deserializePakLoadOrder } from '../src/loadOrder/provider'
import type { LoadOrderEntry } from '../src/loadOrder/protocol'
import { applyMutableFilePolicies, registerBlackMythWukongModTypes } from '../src/modTypes'
import { getExtensionRequiredMods, getRequirementItems, getRequirementStatus } from '../src/requirements'

function selectionContext(response: any) {
  return {
    api: {
      util: {
        ui: {
          request: async () => response,
        },
      },
    },
  } as any
}

function requirementContext(existingFiles: string[]) {
  const normalize = (value: string) => path.normalize(value).toLowerCase()
  const files = new Set(existingFiles.map(normalize))
  const directories = new Set<string>()
  for (const file of existingFiles) {
    let current = path.dirname(path.normalize(file))
    while (current && current !== path.dirname(current)) {
      directories.add(normalize(current))
      current = path.dirname(current)
    }
  }
  return {
    api: {
      util: {
        path,
        GameStoreHelper: {
          findByAppId: async () => null,
        },
        fs: {
          stat: async (target: string) => {
            const key = normalize(target)
            if (files.has(key)) return { isFile: true, isDirectory: false }
            if (directories.has(key)) return { isFile: false, isDirectory: true }
            throw new Error('ENOENT')
          },
          readdir: async (target: string) => {
            const key = normalize(target)
            if (!directories.has(key)) throw new Error('ENOENT')
            const children = new Set<string>()
            for (const candidate of [...files, ...directories]) {
              if (normalize(path.dirname(candidate)) === key) children.add(path.basename(candidate))
            }
            return [...children]
          },
        },
      },
    },
  } as any
}

async function main() {
  assert.equal(GAME_ID, 2358720)

  const registeredTypes: Array<{ id: string, priority: number, name: string }> = []
  const registeredInstallers: Array<{ id: string, priority: number }> = []
  const postInstallerExtractors: any[] = []
  registerBlackMythWukongModTypes({
    registerModType: (id: string, priority: number, _supported: any, _target: any, _tester: any, options: any) => {
      registeredTypes.push({ id, priority, name: String(options?.name || '') })
    },
    registerInstaller: (id: string, priority: number) => registeredInstallers.push({ id, priority }),
    registerPostInstallerAttributeExtractor: (_priority: number, extractor: any) => postInstallerExtractors.push(extractor),
  } as any)
  assert.equal(registeredTypes.length, 9)
  assert.equal(registeredInstallers.length, 9)
  assert.equal(registeredTypes.find((item) => item.id === MOD_TYPE_FOMOD)?.priority, 1000)
  assert.equal(postInstallerExtractors.length, 1)
  assert.equal(Math.max(...Object.values(MOD_TYPE_PRIORITY)), MOD_TYPE_PRIORITY.ue4ss)
  assert.equal(
    registeredInstallers.find((item) => item.id === MOD_TYPE_UE4SS)?.priority,
    Math.min(...registeredInstallers.map((item) => item.priority)),
  )
  assert.equal(registeredTypes.some((item) => /save|config/i.test(`${item.id} ${item.name}`)), false)

  assert.deepEqual(extractFomodPakAttributes({
    installerTypeId: MOD_TYPE_FOMOD,
    modTypeId: MOD_TYPE_FOMOD,
    instructions: [
      { type: 'copy', source: 'A.pak', destination: 'b1/Content/Paks/~mods/A.pak' },
      { type: 'copy', source: 'B.pak', destination: 'b1\\Content\\Paks\\~mods\\Choice\\B.pak' },
      { type: 'copy', source: 'C.pak', destination: 'D:\\Games\\BlackMythWukong\\b1\\Content\\Paks\\~mods\\C.pak' },
      { type: 'copy', source: 'Loose.pak', destination: 'b1/Content/Paks/Loose.pak' },
      { type: 'copy', source: 'readme.txt', destination: 'b1/Content/Paks/~mods/readme.txt' },
    ],
  }), { [PAK_ATTRIBUTE]: ['A.pak', 'B.pak', 'C.pak'] })
  assert.deepEqual(extractFomodPakAttributes({
    installerTypeId: MOD_TYPE_FOMOD,
    modTypeId: MOD_TYPE_FOMOD,
    instructions: [],
  }), { [PAK_ATTRIBUTE]: [] })
  assert.deepEqual(extractFomodPakAttributes({
    installerTypeId: MOD_TYPE_PAK,
    modTypeId: MOD_TYPE_PAK,
    instructions: [{ type: 'copy', source: 'A.pak', destination: 'b1/Content/Paks/~mods/A.pak' }],
  }), {})

  const comboFiles = [
    'Wrapper/b1/',
    'Wrapper/b1/Binaries/',
    'Wrapper/b1/Binaries/Win64/Injector.dll',
    'Wrapper/b1/Content/Paks/LogicMods/Combo.pak',
  ]
  assert.equal(testUe4ssCombo(comboFiles, GAME_ID).supported, true)
  assert.deepEqual(installUe4ssCombo(comboFiles).instructions, [
    { type: 'copy', source: 'Wrapper/b1/Binaries/Win64/Injector.dll', destination: 'b1/Binaries/Win64/Injector.dll' },
    { type: 'copy', source: 'Wrapper/b1/Content/Paks/LogicMods/Combo.pak', destination: 'b1/Content/Paks/LogicMods/Combo.pak' },
  ])

  assert.equal(testLogic(['Wrapper/LogicMods/'], GAME_ID).supported, false)
  const logicFiles = ['Wrapper/LogicMods/', 'Wrapper/LogicMods/Foo.pak', 'Wrapper/LogicMods/Foo.txt']
  assert.equal(testLogic(logicFiles, GAME_ID).supported, true)
  assert.deepEqual(installLogic(logicFiles).instructions, [
    { type: 'copy', source: 'Wrapper/LogicMods/Foo.pak', destination: 'b1/Content/Paks/LogicMods/Foo.pak' },
    { type: 'copy', source: 'Wrapper/LogicMods/Foo.txt', destination: 'b1/Content/Paks/LogicMods/Foo.txt' },
  ])

  const fomodFiles = ['fomod/ModuleConfig.xml', 'b1/', 'b1/Content/Paks/Foo.pak']
  assert.equal(testPak(fomodFiles, GAME_ID).supported, false)
  assert.equal(testRoot(fomodFiles, GAME_ID).supported, false)

  const ue4ssFiles = [
    'UE4SS/dwmapi.dll',
    'UE4SS/ue4ss/UE4SS.dll',
    'UE4SS/ue4ss/UE4SS-settings.ini',
    'UE4SS/ue4ss/Mods/mods.txt',
    'UE4SS/LICENSE',
    'README.md',
  ]
  assert.equal(testUe4ss(ue4ssFiles, GAME_ID).supported, true)
  assert.equal(testUe4ss(['A/dwmapi.dll', 'B/UE4SS.dll'], GAME_ID).supported, true)
  assert.equal(testUe4ss(['A/dwmapi.dll'], GAME_ID).supported, false)
  assert.equal(testUe4ss(['fomod/ModuleConfig.xml', 'UE4SS/dwmapi.dll', 'UE4SS/ue4ss/UE4SS.dll'], GAME_ID).supported, false)
  const ue4ss = installUe4ss(ue4ssFiles)
  assert.deepEqual(ue4ss.instructions, [
    { type: 'copy', source: 'UE4SS/dwmapi.dll', destination: 'b1/Binaries/Win64/dwmapi.dll' },
    { type: 'copy', source: 'UE4SS/ue4ss/UE4SS.dll', destination: 'b1/Binaries/Win64/ue4ss/UE4SS.dll' },
    { type: 'copy', source: 'UE4SS/ue4ss/UE4SS-settings.ini', destination: 'b1/Binaries/Win64/ue4ss/UE4SS-settings.ini' },
    { type: 'copy', source: 'UE4SS/ue4ss/Mods/mods.txt', destination: 'b1/Binaries/Win64/ue4ss/Mods/mods.txt' },
    { type: 'copy', source: 'UE4SS/LICENSE', destination: 'b1/Binaries/Win64/LICENSE' },
  ])
  const mutable = applyMutableFilePolicies(ue4ss)
  assert.deepEqual(mutable.instructions.slice(2), [
    {
      type: 'copy',
      source: 'UE4SS/ue4ss/UE4SS-settings.ini',
      destination: 'b1/Binaries/Win64/ue4ss/UE4SS-settings.ini',
      verification: 'exists',
      conflictPolicy: 'overwrite',
    },
    {
      type: 'copy',
      source: 'UE4SS/ue4ss/Mods/mods.txt',
      destination: 'b1/Binaries/Win64/ue4ss/Mods/mods.txt',
      verification: 'exists',
      conflictPolicy: 'overwrite',
    },
    {
      type: 'copy',
      source: 'UE4SS/LICENSE',
      destination: 'b1/Binaries/Win64/LICENSE',
    },
  ])

  const signatureFiles = [
    'Signature/dsound.dll',
    'Signature/ue4ss/Mods/shared/Scripts/sig.lua',
    'Signature/LICENSE',
  ]
  assert.equal(testSignatureBypass(signatureFiles, GAME_ID).supported, true)
  assert.equal(testSignatureBypass(['A/dsound.dll', 'B/sig.lua'], GAME_ID).supported, false)
  assert.deepEqual(installSignatureBypass(signatureFiles).instructions, [
    { type: 'copy', source: 'Signature/dsound.dll', destination: 'b1/Binaries/Win64/dsound.dll' },
    { type: 'copy', source: 'Signature/ue4ss/Mods/shared/Scripts/sig.lua', destination: 'b1/Binaries/Win64/ue4ss/Mods/shared/Scripts/sig.lua' },
    { type: 'copy', source: 'Signature/LICENSE', destination: 'b1/Binaries/Win64/LICENSE' },
  ])

  const scriptFiles = ['CoolMod/Scripts/', 'CoolMod/Scripts/main.lua', 'CoolMod/config.json']
  assert.equal(testScript(scriptFiles, GAME_ID).supported, true)
  assert.deepEqual(installScript(scriptFiles, 'ignored.installing').instructions, [
    { type: 'copy', source: 'CoolMod/Scripts/main.lua', destination: 'b1/Binaries/Win64/ue4ss/Mods/CoolMod/Scripts/main.lua' },
    { type: 'copy', source: 'CoolMod/config.json', destination: 'b1/Binaries/Win64/ue4ss/Mods/CoolMod/config.json' },
  ])

  const dllFiles = ['DllMod/dlls/', 'DllMod/dlls/main.dll']
  assert.equal(testDll(dllFiles, GAME_ID).supported, true)
  assert.deepEqual(installDll(dllFiles, 'ignored.installing').instructions, [
    { type: 'copy', source: 'DllMod/dlls/main.dll', destination: 'b1/Binaries/Win64/ue4ss/Mods/DllMod/dlls/main.dll' },
    { type: 'generatefile', data: '', destination: 'b1/Binaries/Win64/ue4ss/Mods/DllMod/enabled.txt' },
  ])

  const rootFiles = ['Wrapper/b1/', 'Wrapper/b1/Content/Movies/intro.bk2']
  assert.deepEqual(installRoot(rootFiles).instructions, [
    { type: 'copy', source: 'Wrapper/b1/Content/Movies/intro.bk2', destination: 'b1/Content/Movies/intro.bk2' },
  ])

  const singlePak = await installPak(selectionContext(null), ['Nested/Foo.pak', 'Nested/Foo.utoc'])
  assert.deepEqual(singlePak.instructions, [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: ['Foo.pak'] },
    { type: 'copy', source: 'Nested/Foo.pak', destination: 'b1/Content/Paks/~mods/Foo.pak' },
  ])
  const selectedPak = await installPak(selectionContext({
    confirmed: true,
    payload: { choiceIds: ['pak-1'] },
  }), ['OptionA/A.pak', 'OptionB/B.pak'])
  assert.deepEqual(selectedPak.instructions, [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: ['B.pak'] },
    { type: 'copy', source: 'OptionB/B.pak', destination: 'b1/Content/Paks/~mods/B.pak' },
  ])
  const selectedByChoicePayload = await installPak(selectionContext({
    confirmed: true,
    payload: { choices: [{ payload: { file: 'OptionA/A.pak' } }] },
  }), ['OptionA/A.pak', 'OptionB/B.pak'])
  assert.deepEqual(selectedByChoicePayload.instructions, [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: ['A.pak'] },
    { type: 'copy', source: 'OptionA/A.pak', destination: 'b1/Content/Paks/~mods/A.pak' },
  ])
  await assert.rejects(
    installPak(selectionContext({ confirmed: false }), ['A.pak', 'B.pak']),
    new RegExp(INSTALL_CANCELLED),
  )
  await assert.rejects(
    installPak(selectionContext({ confirmed: true, payload: { choiceIds: ['pak-0', 'pak-1'] } }), ['A/Foo.pak', 'B/foo.PAK']),
    /扁平化后重名/,
  )

  assert.equal(makeLoadOrderPrefix(0), 'AAA')
  assert.equal(makeLoadOrderPrefix(25), 'AAZ')
  assert.equal(makeLoadOrderPrefix(26), 'ABA')
  const loadOrderContext = {
    appid: GAME_ID,
    gameId: GAME_ID,
    gamePath: 'D:/Games/BlackMythWukong',
    revision: 1,
    reason: 'open',
    savedOrder: ['2_20', '1_10'],
    mods: [
      { modKey: '1_10', modType: MOD_TYPE_PAK, enabled: true, metaInfo: { name: 'Alpha', [PAK_ATTRIBUTE]: ['A.pak'] } },
      { modKey: '2_20', modType: MOD_TYPE_PAK, enabled: false, metaInfo: { name: 'Beta', [PAK_ATTRIBUTE]: ['B.pak', 'C.pak'] } },
    ],
  }
  const ordered = deserializePakLoadOrder(loadOrderContext)
  assert.deepEqual(ordered.map((entry) => ({ id: entry.id, enabled: entry.enabled, name: entry.name })), [
    { id: '2_20', enabled: false, name: 'Beta（2 个 Pak）' },
    { id: '1_10', enabled: true, name: 'Alpha' },
  ])
  const orderedWithFomod = deserializePakLoadOrder({
    ...loadOrderContext,
    savedOrder: ['3_30', '2_20', '1_10'],
    mods: [
      ...loadOrderContext.mods,
      { modKey: '3_30', modType: MOD_TYPE_FOMOD, enabled: true, metaInfo: { name: 'FOMOD Pak', [PAK_ATTRIBUTE]: ['F.pak'] } },
      { modKey: '4_40', modType: MOD_TYPE_FOMOD, enabled: true, metaInfo: { name: 'FOMOD without Pak', [PAK_ATTRIBUTE]: [] } },
    ],
  })
  assert.deepEqual(orderedWithFomod.map((entry) => entry.id), ['3_30', '2_20', '1_10'])

  const moves: any[] = []
  const warnings: any[] = []
  const mutation = {
    entries: [
      { modKey: '1_10', modType: MOD_TYPE_PAK, targetPath: 'b1/Content/Paks/~mods/A.pak', expectedHash: 'hash-a', exists: true },
      { modKey: '2_20', modType: MOD_TYPE_PAK, targetPath: 'b1/Content/Paks/~mods/OLD-2_20/B.pak', expectedHash: 'hash-b', exists: true },
      { modKey: '3_30', modType: MOD_TYPE_PAK, targetPath: 'b1/Content/Paks/~mods/C.pak', expectedHash: 'hash-c', exists: true },
    ],
    moveDeployment: (input: any) => moves.push(input),
    warn: (message: string, details: any) => warnings.push({ message, details }),
  }
  assert.equal(planPakLoadOrderMutation(mutation, ordered), 2)
  assert.deepEqual(moves, [
    {
      modKey: '1_10',
      from: 'b1/Content/Paks/~mods/A.pak',
      to: 'b1/Content/Paks/~mods/AAB-1_10/A.pak',
      expectedHash: 'hash-a',
    },
    {
      modKey: '2_20',
      from: 'b1/Content/Paks/~mods/OLD-2_20/B.pak',
      to: 'b1/Content/Paks/~mods/AAA-2_20/B.pak',
      expectedHash: 'hash-b',
    },
  ])
  assert.deepEqual(warnings, [])

  const missingWarnings: any[] = []
  assert.equal(planPakLoadOrderMutation({
    entries: [{ modKey: '1_10', targetPath: 'b1/Content/Paks/~mods/A.pak', expectedHash: 'hash-a', exists: false }],
    moveDeployment: () => assert.fail('missing deployment should not move'),
    warn: (message: string, details: any) => missingWarnings.push({ message, details }),
  }, ordered), 0)
  assert.equal(missingWarnings.length, 1)

  const deployedModTypes: string[] = []
  await serializePakLoadOrder({
    api: {
      vfs: {
        runManagedDeploymentMutation: async (options: any, callback: any) => {
          deployedModTypes.push(options.modType)
          callback({ entries: [], moveDeployment: () => undefined, warn: () => undefined })
          return { ok: true, warnings: [] }
        },
      },
    },
  } as any, orderedWithFomod, loadOrderContext)
  assert.deepEqual(deployedModTypes, [MOD_TYPE_PAK, MOD_TYPE_FOMOD])

  await assert.rejects(serializePakLoadOrder({
    api: {
      vfs: {
        runManagedDeploymentMutation: async (_options: any, callback: any) => {
          callback({ entries: [], moveDeployment: () => undefined, warn: () => undefined })
          return { ok: false, warnings: [{ message: 'mutation failed' }] }
        },
      },
    },
  } as any, ordered, loadOrderContext), /mutation failed/)

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

  const requirementItems = getRequirementItems()
  assert.equal(UE4SS_REQUIREMENT_MOD_ID, '8096')
  assert.equal(SIGNATURE_BYPASS_REQUIREMENT_MOD_ID, '8099')
  assert.equal(requirementItems[0]?.modId, UE4SS_REQUIREMENT_MOD_ID)
  assert.equal(requirementItems[0]?.mod_id, UE4SS_REQUIREMENT_MOD_ID)
  assert.equal(requirementItems[1]?.modId, SIGNATURE_BYPASS_REQUIREMENT_MOD_ID)
  assert.equal(requirementItems[1]?.mod_id, SIGNATURE_BYPASS_REQUIREMENT_MOD_ID)
  assert.equal('url' in requirementItems[0], false)
  assert.equal('sourceUrl' in requirementItems[1], false)

  const gamePath = path.join('D:', 'Games', 'BlackMythWukong')
  const win64 = path.join(gamePath, 'b1/Binaries/Win64')
  const allRequirements = requirementContext([
    path.join(win64, 'dwmapi.dll'),
    path.join(win64, 'ue4ss/UE4SS.dll'),
    path.join(win64, 'dsound.dll'),
    path.join(win64, 'ue4ss/Mods/shared/Scripts/sig.lua'),
  ])
  assert.equal((await getRequirementStatus(allRequirements, gamePath)).installed, true)

  const rootUe4ssOnly = requirementContext([
    path.join(win64, 'dwmapi.dll'),
    path.join(win64, 'UE4SS.dll'),
    path.join(win64, 'dsound.dll'),
    path.join(win64, 'ue4ss/Mods/shared/Scripts/sig.lua'),
  ])
  assert.deepEqual(
    (await getRequirementStatus(rootUe4ssOnly, gamePath)).requirements.map((item) => item.name),
    ['UE4SS for Black Myth: Wukong'],
  )

  const missingSignature = requirementContext([
    path.join(win64, 'dwmapi.dll'),
    path.join(win64, 'ue4ss/UE4SS.dll'),
  ])
  const missingStatus = await getRequirementStatus(missingSignature, gamePath)
  assert.equal(missingStatus.installed, false)
  assert.deepEqual(missingStatus.requirements.map((item) => item.name), ['Signature Bypass'])
  assert.equal((await getExtensionRequiredMods(missingSignature, gamePath)).code, 'EXTENSION_REQUIRED_MODS_MISSING')
}

void main()
