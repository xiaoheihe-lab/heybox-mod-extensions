import assert from 'node:assert/strict'
import path from 'node:path'
import {
  GAME_ID,
  MOD_TYPE_COMBO,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_ROOT,
  MOD_TYPE_UE4SS,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_DLL,
  LOGIC_MODS_PATH,
  PAK_MODS_PATH,
  UE4SS_MODS_PATH,
} from '../src/constants'
import {
  installCombo,
  installLogic,
  installPak,
  installRoot,
  installUe4ss,
  installScript,
  installDll,
  testCombo,
  testLogic,
  testPak,
  testRoot,
  testUe4ss,
  testScript,
  testDll,
} from '../src/installers'
import { registerPhantomBladeZeroModTypes } from '../src/modTypes'
import { applyMutableFilePolicies } from '../src/policy'
import { getLocalModFeatures, getRequirementItems, getRequirementStatus } from '../src/requirements'

function requirementContext(existingFiles: string[]) {
  const existing = new Set(existingFiles.map((file) => path.normalize(file).toLowerCase()))
  return {
    api: {
      util: {
        path,
        fs: {
          stat: async (file: string) => {
            if (!existing.has(path.normalize(file).toLowerCase())) throw new Error('ENOENT')
            return { isFile: true }
          },
        },
      },
    },
  } as any
}

async function main() {
  // --- UE4SS runtime ---
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/UE4SS.dll'], GAME_ID).supported, false)
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll'], GAME_ID).supported, false)
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID + 1).supported, false)
  assert.equal(testUe4ss(['Fomod/ModuleConfig.xml', 'dwmapi.dll', 'ue4ss/UE4SS.dll'], GAME_ID).supported, false)

  const settingsContext = {
    api: {
      util: {
        fs: {
          readFile: async (file: string) => (
            String(file).toLowerCase().endsWith('ue4ss-settings.ini')
              ? 'bUseUObjectArrayCache = true\nOtherSetting = 1'
              : 'CheatManagerEnablerMod : 1'
          ),
        },
      },
    },
  } as any

  const ue4ss = await installUe4ss(settingsContext, [
    'UE4SS-3.0.1/dwmapi.dll',
    'UE4SS-3.0.1/ue4ss/UE4SS.dll',
    'UE4SS-3.0.1/ue4ss/UE4SS-settings.ini',
    'UE4SS-3.0.1/ue4ss/Mods/mods.txt',
    'UE4SS-3.0.1/ue4ss/Mods/shared/Types.lua',
    'UE4SS-3.0.1/xinput1_3.dll',
    'UE4SS-3.0.1/README.md',
    'Other/ue4ss/UE4SS.dll',
  ], 'unused.installing')
  assert.equal(ue4ss.modType, MOD_TYPE_UE4SS)
  assert.deepEqual(ue4ss.instructions, [
    { type: 'copy', source: 'UE4SS-3.0.1/dwmapi.dll', destination: 'platform/steam/dwmapi.dll' },
    { type: 'copy', source: 'UE4SS-3.0.1/ue4ss/UE4SS.dll', destination: 'platform/steam/ue4ss/UE4SS.dll' },
    {
      type: 'generatefile',
      data: 'bUseUObjectArrayCache = false\nOtherSetting = 1',
      destination: 'platform/steam/ue4ss/UE4SS-settings.ini',
    },
    {
      type: 'copy',
      source: 'UE4SS-3.0.1/ue4ss/Mods/mods.txt',
      destination: 'platform/steam/ue4ss/Mods/mods.txt.original',
    },
    {
      type: 'copy',
      source: 'UE4SS-3.0.1/ue4ss/Mods/shared/Types.lua',
      destination: 'platform/steam/ue4ss/Mods/shared/Types.lua',
    },
    { type: 'copy', source: 'UE4SS-3.0.1/xinput1_3.dll', destination: 'platform/steam/xinput1_3.dll' },
  ])

  const mutable = applyMutableFilePolicies(ue4ss)
  assert.deepEqual(mutable.instructions[2], {
    type: 'generatefile',
    data: 'bUseUObjectArrayCache = false\nOtherSetting = 1',
    destination: 'platform/steam/ue4ss/UE4SS-settings.ini',
    verification: 'exists',
    conflictPolicy: 'overwrite',
  })
  assert.deepEqual(mutable.instructions[3].conflictPolicy, 'overwrite')

  // --- Pak mods ---
  assert.equal(testPak(['PBZLightsaber_P.pak'], GAME_ID).supported, true)
  assert.equal(testPak(['PBZLightsaber_P.utoc', 'PBZLightsaber_P.ucas'], GAME_ID).supported, true)
  assert.equal(testPak(['PBZLightsaber_P.utoc'], GAME_ID).supported, false)
  assert.equal(testPak(['PBZLightsaber_P.ucas'], GAME_ID).supported, false)
  assert.equal(testPak(['readme.txt'], GAME_ID).supported, false)
  assert.equal(testPak(['PBZLightsaber_P.pak'], GAME_ID + 1).supported, false)
  assert.equal(testPak(['Fomod/ModuleConfig.xml', 'a.pak'], GAME_ID).supported, false)
  assert.equal(testPak(['LogicMods/BossRush.pak'], GAME_ID).supported, false)
  assert.equal(testPak(['Scripts/main.lua', 'a.pak'], GAME_ID).supported, false)
  assert.equal(testPak(['dwmapi.dll', 'ue4ss/UE4SS.dll', 'a.pak'], GAME_ID).supported, false)

  const pak = installPak({} as any, [
    'Outer/Mod/PBZLightsaber_P.pak',
    'Outer/Mod/PBZLightsaber_P.utoc',
    'Outer/Mod/PBZLightsaber_P.ucas',
    'Outer/Mod/PBZLightsaber_P.sig',
    'Outer/Mod/readme.txt',
  ])
  assert.equal(pak.modType, MOD_TYPE_PAK)
  assert.deepEqual(pak.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['PBZLightsaber_P.pak'] },
    { type: 'copy', source: 'Outer/Mod/PBZLightsaber_P.pak', destination: `${PAK_MODS_PATH}/PBZLightsaber_P.pak` },
    { type: 'copy', source: 'Outer/Mod/PBZLightsaber_P.utoc', destination: `${PAK_MODS_PATH}/PBZLightsaber_P.utoc` },
    { type: 'copy', source: 'Outer/Mod/PBZLightsaber_P.ucas', destination: `${PAK_MODS_PATH}/PBZLightsaber_P.ucas` },
    { type: 'copy', source: 'Outer/Mod/PBZLightsaber_P.sig', destination: `${PAK_MODS_PATH}/PBZLightsaber_P.sig` },
  ])

  assert.throws(() => installPak({} as any, ['a.pak', 'a.ucas']), /incomplete IO Store pair/)
  assert.throws(() => installPak({} as any, ['a.sig']), /signature file without a \.pak or IO Store chunk/)
  assert.throws(() => installPak({} as any, ['a.pak', 'Sub/a.pak']), /multiple archive files target/)
  assert.equal(testPak(['../a.pak'], GAME_ID).supported, false)

  const ioStoreOnly = installPak({} as any, ['Mod/PBZFoo_P.utoc', 'Mod/PBZFoo_P.ucas'])
  assert.deepEqual(ioStoreOnly.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['PBZFoo_P.utoc'] },
    { type: 'copy', source: 'Mod/PBZFoo_P.utoc', destination: `${PAK_MODS_PATH}/PBZFoo_P.utoc` },
    { type: 'copy', source: 'Mod/PBZFoo_P.ucas', destination: `${PAK_MODS_PATH}/PBZFoo_P.ucas` },
  ])

  // The bare triple at the archive root, in a mod folder, or wrapped deep all flatten into ~mods.
  for (const prefix of ['', 'MyMod/', 'MyMod/Paks/', 'A/B/C/']) {
    const files = ['Foo_P.pak', 'Foo_P.utoc', 'Foo_P.ucas'].map((name) => `${prefix}${name}`)
    assert.equal(testPak(files, GAME_ID).supported, true)
    assert.deepEqual(
      installPak({} as any, files).instructions.filter((instruction: any) => instruction.type === 'copy').map((instruction: any) => instruction.destination),
      ['Foo_P.pak', 'Foo_P.utoc', 'Foo_P.ucas'].map((name) => `${PAK_MODS_PATH}/${name}`),
    )
  }

  // --- LogicMods ---
  assert.equal(testLogic(['Wrapper/LogicMods/BossRush.pak'], GAME_ID).supported, true)
  assert.equal(testLogic(['Wrapper/LogicMods'], GAME_ID).supported, false)
  assert.equal(testLogic(['Wrapper/LogicMods/BossRush.pak'], GAME_ID + 1).supported, false)

  // Containers nested under different wrappers must all deploy, not just the first anchor.
  const splitLogic = installLogic(['A/LogicMods/A.pak', 'B/C/LogicMods/B.pak', 'B/C/LogicMods/B.utoc', 'B/C/LogicMods/B.ucas'])
  assert.deepEqual(splitLogic.instructions, [
    { type: 'copy', source: 'A/LogicMods/A.pak', destination: `${LOGIC_MODS_PATH}/A.pak` },
    { type: 'copy', source: 'B/C/LogicMods/B.pak', destination: `${LOGIC_MODS_PATH}/B.pak` },
    { type: 'copy', source: 'B/C/LogicMods/B.utoc', destination: `${LOGIC_MODS_PATH}/B.utoc` },
    { type: 'copy', source: 'B/C/LogicMods/B.ucas', destination: `${LOGIC_MODS_PATH}/B.ucas` },
  ])

  const logic = installLogic([
    'Wrapper/LogicMods/BossRush.pak',
    'Wrapper/LogicMods/BossRush.utoc',
    'Wrapper/LogicMods/BossRush.ucas',
    'Wrapper/readme.txt',
  ])
  assert.equal(logic.modType, MOD_TYPE_LOGIC)
  assert.deepEqual(logic.instructions, [
    { type: 'copy', source: 'Wrapper/LogicMods/BossRush.pak', destination: `${LOGIC_MODS_PATH}/BossRush.pak` },
    { type: 'copy', source: 'Wrapper/LogicMods/BossRush.utoc', destination: `${LOGIC_MODS_PATH}/BossRush.utoc` },
    { type: 'copy', source: 'Wrapper/LogicMods/BossRush.ucas', destination: `${LOGIC_MODS_PATH}/BossRush.ucas` },
  ])

  // --- UE4SS script / DLL mods ---
  assert.equal(testScript(['pbz-auto-defense/Scripts/main.lua'], GAME_ID).supported, true)
  assert.equal(testScript(['CoolMod/dlls/Cool.dll'], GAME_ID).supported, false)
  assert.equal(testDll(['CoolMod/dlls/Cool.dll'], GAME_ID).supported, true)
  assert.equal(testDll(['pbz-auto-defense/Scripts/main.lua'], GAME_ID).supported, false)
  assert.equal(testScript(['readme.txt'], GAME_ID).supported, false)
  assert.equal(testScript(['Scripts/main.lua'], GAME_ID + 1).supported, false)

  const script = installScript(['pbz-auto-defense/Scripts/main.lua', 'pbz-auto-defense/README.md'], 'unused.installing')
  assert.equal(script.modType, MOD_TYPE_SCRIPT)
  assert.deepEqual(script.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroUe4ssFolderId', value: 'pbz-auto-defense' },
    {
      type: 'copy',
      source: 'pbz-auto-defense/Scripts/main.lua',
      destination: `${UE4SS_MODS_PATH}/pbz-auto-defense/Scripts/main.lua`,
    },
    {
      type: 'copy',
      source: 'pbz-auto-defense/README.md',
      destination: `${UE4SS_MODS_PATH}/pbz-auto-defense/README.md`,
    },
    { type: 'generatefile', data: '', destination: `${UE4SS_MODS_PATH}/pbz-auto-defense/enabled.txt` },
  ])

  const dll = installDll(['CoolMod/dlls/Cool.dll'], 'unused.installing')
  assert.equal(dll.modType, MOD_TYPE_DLL)

  const alreadyEnabled = installScript(['CoolMod/enabled.txt', 'CoolMod/Scripts/main.lua'], 'unused.installing')
  assert.equal(
    alreadyEnabled.instructions.some((instruction: any) => (
      instruction.type === 'generatefile' && String(instruction.destination).endsWith('/enabled.txt')
    )),
    false,
  )

  const legacy = installScript(
    ['PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua'],
    'unused.installing',
  )
  assert.deepEqual(legacy.instructions[0], { type: 'attribute', key: 'phantomBladeZeroUe4ssFolderId', value: 'CoolMod' })

  const looseLua = installScript(['Scripts/main.lua'], 'C:/staging/MyCoolMod.installing')
  assert.deepEqual(looseLua.instructions[0], {
    type: 'attribute',
    key: 'phantomBladeZeroUe4ssFolderId',
    value: 'MyCoolMod',
  })
  assert.equal(looseLua.instructions[1].destination, `${UE4SS_MODS_PATH}/MyCoolMod/Scripts/main.lua`)

  // Layout depth must not matter: a mod folder, a wrapped mod folder, or a bare Scripts/.
  for (const [prefix, expectedFolder] of [['', 'MyCoolMod'], ['MyMod/', 'MyMod'], ['A/B/MyMod/', 'MyMod']]) {
    const result = installScript([`${prefix}Scripts/main.lua`], 'C:/staging/MyCoolMod.installing')
    assert.equal(result.instructions[0].value, expectedFolder)
    assert.equal(
      result.instructions.find((instruction: any) => instruction.type === 'copy').destination,
      `${UE4SS_MODS_PATH}/${expectedFolder}/Scripts/main.lua`,
    )
  }

  // A payload subfolder keeps its relative path instead of becoming the mod name.
  const contentLayout = installScript(
    ['MyMod/Content/Scripts/helper.lua', 'MyMod/Scripts/main.lua'],
    'C:/staging/Ignored.installing',
  )
  assert.equal(contentLayout.instructions[0].value, 'MyMod')
  assert.deepEqual(
    contentLayout.instructions.filter((instruction: any) => instruction.type === 'copy').map((instruction: any) => instruction.destination),
    [
      `${UE4SS_MODS_PATH}/MyMod/Content/Scripts/helper.lua`,
      `${UE4SS_MODS_PATH}/MyMod/Scripts/main.lua`,
    ],
  )

  // Sibling data files follow the same rule at archive root.
  const flatData = installScript(['Scripts/main.lua', 'Icons/a.png'], 'C:/staging/Flat.installing')
  assert.deepEqual(
    flatData.instructions.filter((instruction: any) => instruction.type === 'copy').map((instruction: any) => instruction.destination),
    [`${UE4SS_MODS_PATH}/Flat/Scripts/main.lua`, `${UE4SS_MODS_PATH}/Flat/Icons/a.png`],
  )

  // One archive holding two different mod roots is rejected, whatever their depth.
  for (const files of [
    ['ModA/Scripts/a.lua', 'ModB/Scripts/b.lua'],
    ['A/ModA/Scripts/a.lua', 'C/D/ModB/Scripts/b.lua'],
    ['ModA/Scripts/a.lua', 'ModB/dlls/B.dll'],
  ]) {
    assert.throws(() => installScript(files, 'unused.installing'), /contains 2 UE4SS mods/)
  }

  // A bundle holding two mod folders must not be silently installed half-way.
  assert.throws(
    () => installScript(['ModA/Scripts/a.lua', 'ModB/Scripts/b.lua'], 'unused.installing'),
    /contains 2 UE4SS mods \(ModA, ModB\)/,
  )
  // One folder that ships both Scripts and dlls is a single mod.
  const scriptAndDll = installScript(['ModA/Scripts/a.lua', 'ModA/dlls/A.dll'], 'unused.installing')
  assert.equal(scriptAndDll.instructions.filter((instruction: any) => instruction.type === 'copy').length, 2)

  // --- Mixed script + pak combo ---
  const comboFiles = [
    'Bundle/BossRush_P.pak',
    'Bundle/BossRush_P.utoc',
    'Bundle/BossRush_P.ucas',
    'Bundle/Scripts/main.lua',
  ]
  assert.equal(testCombo(comboFiles, GAME_ID).supported, true)
  assert.equal(testCombo(['Bundle/BossRush_P.pak'], GAME_ID).supported, false)
  assert.equal(testCombo(['Scripts/main.lua'], GAME_ID).supported, false)
  assert.equal(testCombo(['dwmapi.dll', 'ue4ss/UE4SS.dll', 'a.pak', 'Scripts/main.lua'], GAME_ID).supported, false)
  // A LogicMod container plus scripts is still a mixed mod: both halves must land.
  assert.equal(testCombo(['Bundle/LogicMods/Menu.pak', 'Bundle/Scripts/main.lua'], GAME_ID).supported, true)
  assert.equal(testLogic(['Bundle/LogicMods/Menu.pak', 'Bundle/Scripts/main.lua'], GAME_ID).supported, true)
  // A pak next to an unrelated loose file is still a plain pak mod.
  assert.equal(testPak(['Bundle/Cool_P.pak', 'Bundle/readme.lua'], GAME_ID).supported, true)

  // The two halves of a mixed mod may sit at different depths in the same archive.
  const mixedDepth = installCombo({} as any, [
    'A/B/C/Deep_P.pak',
    'A/B/C/Deep_P.utoc',
    'A/B/C/Deep_P.ucas',
    'ShallowMod/Scripts/main.lua',
  ], 'C:/staging/Ignored.installing')
  assert.equal(mixedDepth.modType, MOD_TYPE_COMBO)
  assert.deepEqual(
    mixedDepth.instructions.filter((instruction: any) => instruction.type === 'copy').map((instruction: any) => instruction.destination),
    [
      `${PAK_MODS_PATH}/Deep_P.pak`,
      `${PAK_MODS_PATH}/Deep_P.utoc`,
      `${PAK_MODS_PATH}/Deep_P.ucas`,
      `${UE4SS_MODS_PATH}/ShallowMod/Scripts/main.lua`,
    ],
  )

  // A mixed mod in a single mod folder keeps the folder name for the script half.
  const namedCombo = installCombo({} as any, [
    'MyMod/MyMod_P.pak',
    'MyMod/MyMod_P.utoc',
    'MyMod/MyMod_P.ucas',
    'MyMod/Scripts/main.lua',
  ], 'C:/staging/Ignored.installing')
  assert.deepEqual(
    namedCombo.instructions.find((instruction: any) => instruction.type === 'attribute'),
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['MyMod_P.pak'] },
  )
  assert.equal(
    namedCombo.instructions.find((instruction: any) => instruction.type === 'copy' && String(instruction.destination).includes('Mods/'))?.destination,
    `${UE4SS_MODS_PATH}/MyMod/Scripts/main.lua`,
  )

  const logicCombo = installCombo({} as any, [
    'Bundle/LogicMods/Menu.pak',
    'Bundle/LogicMods/Menu.utoc',
    'Bundle/LogicMods/Menu.ucas',
    'Bundle/Scripts/main.lua',
  ], 'unused.installing')
  assert.deepEqual(logicCombo.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['Menu.pak'] },
    { type: 'copy', source: 'Bundle/LogicMods/Menu.pak', destination: `${LOGIC_MODS_PATH}/Menu.pak` },
    { type: 'copy', source: 'Bundle/LogicMods/Menu.utoc', destination: `${LOGIC_MODS_PATH}/Menu.utoc` },
    { type: 'copy', source: 'Bundle/LogicMods/Menu.ucas', destination: `${LOGIC_MODS_PATH}/Menu.ucas` },
    { type: 'copy', source: 'Bundle/Scripts/main.lua', destination: `${UE4SS_MODS_PATH}/Bundle/Scripts/main.lua` },
    { type: 'generatefile', data: '', destination: `${UE4SS_MODS_PATH}/Bundle/enabled.txt` },
  ])

  const combo = installCombo({} as any, comboFiles, 'unused.installing')
  assert.equal(combo.modType, MOD_TYPE_COMBO)
  assert.deepEqual(combo.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['BossRush_P.pak'] },
    { type: 'copy', source: 'Bundle/BossRush_P.pak', destination: `${PAK_MODS_PATH}/BossRush_P.pak` },
    { type: 'copy', source: 'Bundle/BossRush_P.utoc', destination: `${PAK_MODS_PATH}/BossRush_P.utoc` },
    { type: 'copy', source: 'Bundle/BossRush_P.ucas', destination: `${PAK_MODS_PATH}/BossRush_P.ucas` },
    { type: 'copy', source: 'Bundle/Scripts/main.lua', destination: `${UE4SS_MODS_PATH}/Bundle/Scripts/main.lua` },
    { type: 'generatefile', data: '', destination: `${UE4SS_MODS_PATH}/Bundle/enabled.txt` },
  ])

  // --- Root mods ---
  assert.equal(testRoot(['Mod/Engine/Binaries/Win64/Foo.dll'], GAME_ID).supported, true)
  assert.equal(testRoot(['Mod/ProjectPBZ/Content/Movies/intro.bk2'], GAME_ID).supported, true)
  assert.equal(testRoot(['Mod/Engine/Config/BaseEngine.ini'], GAME_ID).supported, true)
  // Engine paks are still root-replaceable; game content paks are not.
  assert.equal(testRoot(['Mod/Engine/Content/Paks/EngineChunk.pak'], GAME_ID).supported, true)
  // Root anchors must resolve at any wrapper depth.
  for (const prefix of ['', 'Mod/', 'A/B/C/', 'Extracted/PBZ/']) {
    assert.equal(testRoot([`${prefix}Engine/Binaries/Win64/Foo.dll`], GAME_ID).supported, true)
    assert.deepEqual(installRoot([`${prefix}Engine/Binaries/Win64/Foo.dll`]).instructions, [
      { type: 'copy', source: `${prefix}Engine/Binaries/Win64/Foo.dll`, destination: 'Engine/Binaries/Win64/Foo.dll' },
    ])
  }
  assert.equal(testRoot(['Mod/steam/PBZ.exe'], GAME_ID).supported, true)
  // The shallowest recognized directory wins, so nested look-alikes keep their prefix.
  assert.deepEqual(installRoot(['W/ProjectPBZ/Engine/foo.ini']).instructions, [
    { type: 'copy', source: 'W/ProjectPBZ/Engine/foo.ini', destination: 'ProjectPBZ/Engine/foo.ini' },
  ])
  // Two variants of the same file under different wrappers must not silently merge.
  assert.throws(
    () => installRoot(['A/Engine/Config/BaseEngine.ini', 'B/C/Engine/Config/BaseEngine.ini']),
    /multiple archive files target Engine\/Config\/BaseEngine\.ini/,
  )
  // A complete UE4SS proxy install belongs to the UE4SS type even when it sits under the game root.
  assert.equal(testRoot(['PBZ/platform/steam/dwmapi.dll', 'PBZ/platform/steam/ue4ss/UE4SS.dll'], GAME_ID).supported, false)
  assert.deepEqual(installRoot(['PBZ/platform/steam/dwmapi.dll', 'PBZ/platform/steam/ue4ss/UE4SS.dll']).instructions, [])
  // Dedicated layouts must never be deployed through the root route.
  assert.equal(testRoot(['Mod/platform/steam/ue4ss/Mods/Cool/Scripts/main.lua'], GAME_ID).supported, false)
  assert.equal(testRoot(['Mod/platform/steam/ue4ss/UE4SS-settings.ini'], GAME_ID).supported, false)
  assert.equal(testRoot(['Mod/ProjectPBZ/Content/Paks/~mods/Foo.pak'], GAME_ID).supported, false)
  assert.equal(testRoot(['Mod/ProjectPBZ/Content/Paks/Foo.pak'], GAME_ID).supported, false)
  assert.equal(testRoot(['Mod/ProjectPBZ/Content/Paks/LogicMods/Menu.pak'], GAME_ID).supported, false)
  assert.equal(testRoot(['Mod/Engine/Binaries/Win64/Foo.dll'], GAME_ID + 1).supported, false)

  const root = installRoot([
    'Mod/Engine/Binaries/Win64/Foo.dll',
    'Mod/ProjectPBZ/Content/Movies/intro.bk2',
    'Mod/readme.txt',
  ])
  assert.equal(root.modType, MOD_TYPE_ROOT)
  assert.deepEqual(root.instructions, [
    { type: 'copy', source: 'Mod/Engine/Binaries/Win64/Foo.dll', destination: 'Engine/Binaries/Win64/Foo.dll' },
    { type: 'copy', source: 'Mod/ProjectPBZ/Content/Movies/intro.bk2', destination: 'ProjectPBZ/Content/Movies/intro.bk2' },
  ])
  assert.throws(() => installRoot(['A/ProjectPBZ/Content/Movies/a.bk2', 'B/ProjectPBZ/Content/Movies/a.bk2']), /multiple archive files target/)
  // Dedicated layouts are filtered out of a root package instead of being double-deployed.
  assert.deepEqual(installRoot([
    'Mod/Engine/Config/BaseEngine.ini',
    'Mod/ProjectPBZ/Content/Paks/~mods/Foo.pak',
    'Mod/platform/steam/ue4ss/Mods/Cool/Scripts/main.lua',
  ]).instructions, [
    { type: 'copy', source: 'Mod/Engine/Config/BaseEngine.ini', destination: 'Engine/Config/BaseEngine.ini' },
  ])

  // --- Registration ---
  const modTypes: Array<{ id: string, priority: number, name?: string }> = []
  const installers: Array<{ id: string, priority: number }> = []
  const context = {
    registerModType: (id: string, priority: number, ...rest: any[]) => {
      modTypes.push({ id, priority, name: rest[3]?.name })
    },
    registerInstaller: (id: string, priority: number) => installers.push({ id, priority }),
  } as any
  registerPhantomBladeZeroModTypes(context)

  assert.deepEqual(modTypes.map((item) => item.id), [
    MOD_TYPE_UE4SS,
    MOD_TYPE_COMBO,
    MOD_TYPE_LOGIC,
    MOD_TYPE_SCRIPT,
  MOD_TYPE_DLL,
    MOD_TYPE_PAK,
    MOD_TYPE_ROOT,
  ])
  assert.equal(modTypes[0].priority, Math.max(...Object.values(MOD_TYPE_PRIORITY)))
  assert.deepEqual(installers.map((item) => item.id), modTypes.map((item) => item.id))
  assert.equal(Math.min(...installers.map((item) => item.priority)), installers[0].priority)
  assert.ok(modTypes.every((item) => Boolean(item.name)))

  // --- Requirements ---
  assert.deepEqual(getRequirementItems().map((item) => item.name), ['UE4SS (Phantom Blade Zero build)'])
  const requirement = getRequirementItems()[0]
  assert.equal(requirement.modId, '128413')
  assert.equal(requirement.mod_id, '128413')
  assert.equal(requirement.requirement, 'enabled')
  assert.equal(requirement.openModDetailDialog, false)
  assert.equal(requirement.modType, MOD_TYPE_UE4SS)
  assert.deepEqual(getLocalModFeatures(), [
    {
      modId: 128413,
      marked: true,
      mark: { type: 'prerequisite', label: '前置模组' },
    },
  ])
  const gamePath = path.join('E:', 'SteamLibrary', 'steamapps', 'common', 'PBZ')
  const dwmapiPath = path.join(gamePath, 'platform/steam', 'dwmapi.dll')
  const dllPath = path.join(gamePath, 'platform/steam', 'ue4ss', 'UE4SS.dll')
  assert.equal((await getRequirementStatus(requirementContext([dwmapiPath, dllPath]), gamePath)).installed, true)
  assert.equal((await getRequirementStatus(requirementContext([dwmapiPath]), gamePath)).installed, false)
  assert.equal((await getRequirementStatus(requirementContext([dllPath]), gamePath)).installed, false)
  assert.equal((await getRequirementStatus(requirementContext([]), gamePath)).requirements.length, 1)

  console.log('phantom blade zero extension tests passed')
}

void main()
