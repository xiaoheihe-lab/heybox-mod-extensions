import assert from 'node:assert/strict'
import path from 'node:path'
import {
  BINARIES_PATH,
  GAME_FOLDER,
  GAME_ID,
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
  MOD_TYPE_JS,
  JS_MODS_PATH,
  LOGIC_MODS_PATH,
  PAK_MODS_PATH,
  UE4SS_MODS_PATH,
} from '../src/constants'
import {
  installBinaries,
  installCombo,
  installContent,
  installDll,
  installJs,
  installLogic,
  installLua,
  installPak,
  installPakAlt,
  installPreset,
  installReshade,
  installRoot,
  installScript,
  installUe4ss,
  installUe4ssFolder,
  testBinaries,
  testCombo,
  testContent,
  testDll,
  testJs,
  testLogic,
  testLua,
  testPak,
  testPakAlt,
  testPreset,
  testReshade,
  testRoot,
  testScript,
  testUe4ss,
  testUe4ssFolder,
} from '../src/installers'
import { registerPhantomBladeZeroModTypes } from '../src/modTypes'
import { applyMutableFilePolicies } from '../src/policy'
import { getExtensionRequiredMods, getLocalModFeatures, getRequirementItems, getRequirementStatus } from '../src/requirements'

function requirementContext(existingFiles: string[], existingDirectories: string[] = []) {
  const existing = new Set(existingFiles.map((file) => path.normalize(file).toLowerCase()))
  const directories = new Set(existingDirectories.map((directory) => path.normalize(directory).toLowerCase()))
  return {
    api: {
      util: {
        path,
        fs: {
          stat: async (file: string) => {
            const normalized = path.normalize(file).toLowerCase()
            if (!existing.has(normalized) && !directories.has(normalized)) throw new Error('ENOENT')
            return { isFile: existing.has(normalized), isDirectory: directories.has(normalized) }
          },
        },
      },
    },
  } as any
}

function destinations(result: { instructions: Array<Record<string, unknown>> }): string[] {
  return result.instructions
    .filter((instruction) => instruction.type === 'copy' || instruction.type === 'generatefile')
    .map((instruction) => String(instruction.destination))
}

async function main() {
  // --- UE4SS runtime ---
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  // A flat runtime beside the proxy DLL is a valid loader too.
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/UE4SS.dll'], GAME_ID).supported, true)
  // xinput proxies are shipped by some repacks.
  assert.equal(testUe4ss(['UE4SS-3.0.1/xinput1_3.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  assert.equal(testUe4ss(['UE4SS-3.0.1/xinput1_4.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  // A settings-only marker next to a runtime is also a loader.
  assert.equal(testUe4ss(['UE4SS-3.0.1/UE4SS-settings.ini', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll'], GAME_ID).supported, false)
  assert.equal(testUe4ss(['UE4SS-3.0.1/dwmapi.dll', 'UE4SS-3.0.1/ue4ss/UE4SS.dll'], GAME_ID + 1).supported, false)
  assert.equal(testUe4ss(['Fomod/ModuleConfig.xml', 'dwmapi.dll', 'ue4ss/UE4SS.dll'], GAME_ID).supported, false)
  // A game-relative loader tree belongs to root so no file is dropped.
  assert.equal(testUe4ss(['PBZ/platform/steam/dwmapi.dll', 'PBZ/platform/steam/ue4ss/UE4SS.dll'], GAME_ID).supported, false)

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
    { type: 'copy', source: 'UE4SS-3.0.1/README.md', destination: 'platform/steam/README.md' },
  ])

  const flatLoader = await installUe4ss(settingsContext, [
    'UE4SS/dwmapi.dll',
    'UE4SS/UE4SS.dll',
    'UE4SS/UE4SS-settings.ini',
  ], 'unused.installing')
  assert.deepEqual(destinations(flatLoader), [
    `${BINARIES_PATH}/dwmapi.dll`,
    `${BINARIES_PATH}/UE4SS.dll`,
    `${BINARIES_PATH}/UE4SS-settings.ini`,
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
  // A game-relative pak tree is owned by root, which keeps every file.
  assert.equal(testPak(['ProjectPBZ/Content/Paks/~mods/Foo.pak'], GAME_ID).supported, false)

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

  // The bare triple at the archive root or in a mod folder flattens into ~mods.
  for (const prefix of ['', 'MyMod/', 'A/B/C/']) {
    const files = ['Foo_P.pak', 'Foo_P.utoc', 'Foo_P.ucas'].map((name) => `${prefix}${name}`)
    assert.equal(testPak(files, GAME_ID).supported, true)
    assert.deepEqual(
      destinations(installPak({} as any, files)),
      ['Foo_P.pak', 'Foo_P.utoc', 'Foo_P.ucas'].map((name) => `${PAK_MODS_PATH}/${name}`),
    )
  }

  // --- Bundled Paks/ tree (Nexus `pak-alt`) ---
  const pakAltFiles = ['mod/Paks/sub/x.pak', 'mod/Paks/sub/x.ucas', 'mod/Paks/sub/x.utoc']
  assert.equal(testPakAlt(pakAltFiles, GAME_ID).supported, true)
  assert.equal(testPak(pakAltFiles, GAME_ID).supported, false)
  assert.deepEqual(destinations(installPakAlt(pakAltFiles)), [
    `${GAME_FOLDER}/Content/Paks/sub/x.pak`,
    `${GAME_FOLDER}/Content/Paks/sub/x.ucas`,
    `${GAME_FOLDER}/Content/Paks/sub/x.utoc`,
  ])

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

  // A full-game-path Lua mod is game-relative, so root keeps the whole tree intact.
  const legacy = installRoot(['PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua'])
  assert.deepEqual(legacy.instructions, [
    {
      type: 'copy',
      source: 'PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
      destination: 'platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
    },
  ])
  assert.equal(testScript(['PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua'], GAME_ID).supported, false)
  // A game-relative archive that also ships a pak stays whole with root, so neither
  // half is dropped (Nexus mod 7 / 19 shape).
  assert.equal(testScript([
    'PBZ/ProjectPBZ/Content/Paks/~mods/Foo_P.pak',
    'PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
  ], GAME_ID).supported, false)
  assert.equal(testCombo([
    'PBZ/ProjectPBZ/Content/Paks/~mods/Foo_P.pak',
    'PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
  ], GAME_ID).supported, false)
  assert.deepEqual(destinations(installRoot([
    'PBZ/ProjectPBZ/Content/Paks/~mods/Foo_P.pak',
    'PBZ/platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
  ])), [
    'ProjectPBZ/Content/Paks/~mods/Foo_P.pak',
    'platform/steam/ue4ss/Mods/CoolMod/Scripts/main.lua',
  ])

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

  // Several mods in one archive deploy side by side, each into its own folder.
  for (const files of [
    ['ModA/Scripts/a.lua', 'ModB/Scripts/b.lua'],
    ['A/ModA/Scripts/a.lua', 'C/D/ModB/Scripts/b.lua'],
    ['ModA/Scripts/a.lua', 'ModB/dlls/B.dll'],
  ]) {
    const result = installScript(files, 'unused.installing')
    const deployed = result.instructions.filter((instruction: any) => instruction.type === 'copy')
    // Both mods land, under two distinct folders.
    assert.ok(deployed.some((instruction: any) => instruction.destination.startsWith(`${UE4SS_MODS_PATH}/ModA/`)))
    assert.ok(deployed.some((instruction: any) => instruction.destination.startsWith(`${UE4SS_MODS_PATH}/ModB/`)))
    assert.equal(deployed.length, 2)
  }

  // Two mod folders are deployed separately, never merged into one folder.
  const twoMods = installScript(['ModA/Scripts/a.lua', 'ModB/Scripts/b.lua'], 'unused.installing')
  assert.deepEqual(destinations(twoMods).sort(), [
    `${UE4SS_MODS_PATH}/ModA/Scripts/a.lua`,
    `${UE4SS_MODS_PATH}/ModA/enabled.txt`,
    `${UE4SS_MODS_PATH}/ModB/Scripts/b.lua`,
    `${UE4SS_MODS_PATH}/ModB/enabled.txt`,
  ])
  assert.deepEqual(twoMods.instructions[0], {
    type: 'attribute',
    key: 'phantomBladeZeroUe4ssFolderId',
    value: 'ModA',
  })
  assert.deepEqual(twoMods.instructions[1], {
    type: 'attribute',
    key: 'phantomBladeZeroUe4ssFolderIds',
    value: ['ModA', 'ModB'],
  })
  // Two mods nested at different depths still land as separate folders.
  const nestedMods = installScript(['A/ModA/Scripts/a.lua', 'C/D/ModB/Scripts/b.lua'], 'unused.installing')
  assert.deepEqual(destinations(nestedMods).sort(), [
    `${UE4SS_MODS_PATH}/ModA/Scripts/a.lua`,
    `${UE4SS_MODS_PATH}/ModA/enabled.txt`,
    `${UE4SS_MODS_PATH}/ModB/Scripts/b.lua`,
    `${UE4SS_MODS_PATH}/ModB/enabled.txt`,
  ])
  // One folder that ships both Scripts and dlls is a single mod.
  const scriptAndDll = installScript(['ModA/Scripts/a.lua', 'ModA/dlls/A.dll'], 'unused.installing')
  assert.equal(scriptAndDll.instructions.filter((instruction: any) => instruction.type === 'copy').length, 2)
  // A root nested inside another root is that mod's own sub-tree, not a second mod.
  const nestedTree = installScript(['ModA/Scripts/a.lua', 'ModA/Sub/Scripts/b.lua'], 'unused.installing')
  assert.deepEqual(destinations(nestedTree), [
    `${UE4SS_MODS_PATH}/ModA/Scripts/a.lua`,
    `${UE4SS_MODS_PATH}/ModA/Sub/Scripts/b.lua`,
    `${UE4SS_MODS_PATH}/ModA/enabled.txt`,
  ])
  // Two different roots claiming the same folder name must not silently merge.
  assert.throws(
    () => installScript(['A/ModA/Scripts/a.lua', 'B/ModA/Scripts/b.lua'], 'unused.installing'),
    /two UE4SS mods in this archive are named "ModA"/,
  )

  // --- Real archive: Lua mod + C++ DLL mod side by side under ue4ss/Mods ---
  // PBZ Shared Finishers 1.2.0 ships a Lua mod and a companion `dlls/main.dll`
  // mod. The manual instructions say to extract into `platform/steam/`, which is
  // exactly where these paths already point.
  const mixedUe4ss = [
    'README.md',
    'ue4ss/Mods/pbzt-shared-finishers/README.md',
    'ue4ss/Mods/pbzt-shared-finishers/enabled.txt',
    'ue4ss/Mods/pbzt-shared-finishers/lang/en.json',
    'ue4ss/Mods/pbzt-shared-finishers/lang/sc.json',
    'ue4ss/Mods/pbzt-shared-finishers/Scripts/config.lua',
    'ue4ss/Mods/pbzt-shared-finishers/Scripts/gui.lua',
    'ue4ss/Mods/pbzt-shared-finishers/Scripts/i18n.lua',
    'ue4ss/Mods/pbzt-shared-finishers/Scripts/main.lua',
    'ue4ss/Mods/pbzt-shared-finishers-menu/dlls/main.dll',
    'ue4ss/Mods/pbzt-shared-finishers-menu/enabled.txt',
  ]
  assert.equal(testScript(mixedUe4ss, GAME_ID).supported, true)
  assert.equal(testDll(mixedUe4ss, GAME_ID).supported, true)
  // The archive predecessor threw "contains 2 UE4SS mods"; it now deploys both.
  const mixedInstall = installScript(mixedUe4ss, 'C:/staging/pbzt.installing')
  assert.deepEqual(mixedInstall.instructions[0], {
    type: 'attribute',
    key: 'phantomBladeZeroUe4ssFolderId',
    value: 'pbzt-shared-finishers',
  })
  assert.deepEqual(mixedInstall.instructions[1], {
    type: 'attribute',
    key: 'phantomBladeZeroUe4ssFolderIds',
    value: ['pbzt-shared-finishers', 'pbzt-shared-finishers-menu'],
  })
  assert.deepEqual(destinations(mixedInstall), [
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/README.md`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/enabled.txt`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/lang/en.json`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/lang/sc.json`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/Scripts/config.lua`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/Scripts/gui.lua`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/Scripts/i18n.lua`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers/Scripts/main.lua`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers-menu/dlls/main.dll`,
    `${UE4SS_MODS_PATH}/pbzt-shared-finishers-menu/enabled.txt`,
  ])
  // The archive-root README has no mod folder of its own and is not deployed.
  assert.equal(
    destinations(mixedInstall).some((destination) => destination === `${UE4SS_MODS_PATH}/README.md`),
    false,
  )
  // Installing through the DLL rule deploys the same complete set.
  assert.deepEqual(destinations(installDll(mixedUe4ss, 'C:/staging/pbzt.installing')), destinations(mixedInstall))

  // --- enabled.txt-keyed mod folder (Nexus `ue4ss-lua-enabled`) ---
  const folderMod = ['ZCUnlocked/enabled.txt', 'ZCUnlocked/Payload.dll', 'README.txt']
  assert.equal(testUe4ssFolder(folderMod, GAME_ID).supported, true)
  assert.equal(testDll(folderMod, GAME_ID).supported, false)
  assert.deepEqual(destinations(installUe4ssFolder(folderMod, 'unused.installing')), [
    `${UE4SS_MODS_PATH}/ZCUnlocked/enabled.txt`,
    `${UE4SS_MODS_PATH}/ZCUnlocked/Payload.dll`,
  ])
  // A root-level enabled.txt has no mod folder name to deploy under.
  assert.equal(testUe4ssFolder(['enabled.txt', 'Payload.dll'], GAME_ID).supported, false)

  // --- Bare Lua (Nexus `ue4ss-lua-bare`) ---
  const bareLua = ['LuaMod/main.lua', 'LuaMod/helper.lua']
  assert.equal(testLua(bareLua, GAME_ID).supported, true)
  assert.equal(testScript(bareLua, GAME_ID).supported, false)
  assert.deepEqual(destinations(installLua(bareLua, 'unused.installing')), [
    `${UE4SS_MODS_PATH}/LuaMod/main.lua`,
    `${UE4SS_MODS_PATH}/LuaMod/helper.lua`,
    `${UE4SS_MODS_PATH}/LuaMod/enabled.txt`,
  ])
  // A bare .lua at the archive root uses the staging folder name.
  assert.deepEqual(destinations(installLua(['main.lua'], 'C:/staging/MyLuaMod.installing')), [
    `${UE4SS_MODS_PATH}/MyLuaMod/main.lua`,
    `${UE4SS_MODS_PATH}/MyLuaMod/enabled.txt`,
  ])

  // --- Project content folder (Nexus `content-folder`) ---
  const contentFiles = ['Content/Foo.uasset', 'Content/Bar.uexp', 'Config/DefaultEngine.ini']
  assert.equal(testContent(contentFiles, GAME_ID).supported, true)
  assert.equal(testPak(contentFiles, GAME_ID).supported, false)
  assert.deepEqual(destinations(installContent(contentFiles)), [
    `${GAME_FOLDER}/Content/Foo.uasset`,
    `${GAME_FOLDER}/Content/Bar.uexp`,
    `${GAME_FOLDER}/Config/DefaultEngine.ini`,
  ])
  // The same tree wrapped in a mod folder keeps the wrapper stripped.
  assert.equal(testContent(['MyMod/Content/Foo.uasset', 'MyMod/Config/DefaultEngine.ini'], GAME_ID).supported, true)
  assert.deepEqual(
    destinations(installContent(['MyMod/Content/Foo.uasset', 'MyMod/Config/DefaultEngine.ini'])),
    [`${GAME_FOLDER}/Content/Foo.uasset`, `${GAME_FOLDER}/Config/DefaultEngine.ini`],
  )

  // --- ReShade / preset / loose DLL (Nexus `reshade`, `reshade-preset`, `native-dll`) ---
  const reshade = ['WarmSun/ReShade.ini', 'WarmSun/WarmSun.ini', 'WarmSun/reshade-shaders/Shaders/Clarity.fx']
  assert.equal(testReshade(reshade, GAME_ID).supported, true)
  assert.equal(testPreset(reshade, GAME_ID).supported, false)
  assert.equal(testBinaries(reshade, GAME_ID).supported, true)
  assert.deepEqual(destinations(installReshade(reshade)), [
    `${BINARIES_PATH}/ReShade.ini`,
    `${BINARIES_PATH}/WarmSun.ini`,
    `${BINARIES_PATH}/reshade-shaders/Shaders/Clarity.fx`,
  ])

  const preset = ['Vibrant Reshade.ini', 'ReadMe.txt']
  assert.equal(testPreset(preset, GAME_ID).supported, true)
  assert.equal(testReshade(preset, GAME_ID).supported, false)
  assert.deepEqual(destinations(installPreset(preset)), [
    `${BINARIES_PATH}/Vibrant Reshade.ini`,
    `${BINARIES_PATH}/ReadMe.txt`,
  ])
  // UE user config ini files are not presets and stay unsupported by design.
  for (const name of ['Engine.ini', 'Game.ini', 'GameUserSettings.ini', 'Input.ini', 'Scalability.ini']) {
    assert.equal(testPreset([name], GAME_ID).supported, false)
    assert.equal(testBinaries([name], GAME_ID).supported, false)
  }

  const nativeDll = ['SomePlugin.dll']
  assert.equal(testBinaries(nativeDll, GAME_ID).supported, true)
  assert.deepEqual(destinations(installBinaries(nativeDll)), [`${BINARIES_PATH}/SomePlugin.dll`])
  // A nested plugin folder is flattened beside the game executable.
  assert.deepEqual(
    destinations(installBinaries(['Ultimate-ASI-Loader/winmm.dll', 'Ultimate-ASI-Loader/Readme.txt'])),
    [`${BINARIES_PATH}/winmm.dll`, `${BINARIES_PATH}/Readme.txt`],
  )

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
  // A LogicMod sidecar (info file) inside the container folder rides along.
  const logicSidecar = installCombo({} as any, [
    'Bundle/LogicMods/Menu.pak',
    'Bundle/LogicMods/Menu.ue4sslogicmod.info',
    'Bundle/Scripts/main.lua',
  ], 'unused.installing')
  assert.ok(logicSidecar.instructions.some((instruction: any) => (
    instruction.type === 'copy'
    && instruction.destination === `${LOGIC_MODS_PATH}/Menu.ue4sslogicmod.info`
  )))
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

  // A pak plus an enabled.txt-only mod folder (no Scripts/dlls tree) is also a combo.
  const pakWithEnabledOnly = ['SomeMod/Some_P.pak', 'SomeMod/enabled.txt']
  assert.equal(testCombo(pakWithEnabledOnly, GAME_ID).supported, true)
  assert.deepEqual(destinations(installCombo({} as any, pakWithEnabledOnly, 'unused.installing')), [
    `${PAK_MODS_PATH}/Some_P.pak`,
    `${UE4SS_MODS_PATH}/SomeMod/enabled.txt`,
  ])

  // A real Nexus archive: one pak triplet plus two independent Lua mods, each
  // already laid out under its own `ue4ss/Mods/<name>/` folder.
  const multiLuaCombo = installCombo({} as any, [
    'README.txt',
    'files/ChenQianyu_Independent13_P.ucas',
    'files/ChenQianyu_Independent13_P.utoc',
    'files/ChenQianyu_Independent13_P.pak',
    'ue4ss/Mods/CQ11Release/enabled.txt',
    'ue4ss/Mods/CQHideOriginalCloth/enabled.txt',
    'ue4ss/Mods/CQ11Release/Scripts/main.lua',
    'ue4ss/Mods/CQHideOriginalCloth/Scripts/main.lua',
  ], 'C:/staging/CQ11Release.installing')
  assert.equal(multiLuaCombo.modType, MOD_TYPE_COMBO)
  assert.deepEqual(multiLuaCombo.instructions, [
    { type: 'attribute', key: 'phantomBladeZeroPakFiles', value: ['ChenQianyu_Independent13_P.pak'] },
    { type: 'copy', source: 'files/ChenQianyu_Independent13_P.pak', destination: `${PAK_MODS_PATH}/ChenQianyu_Independent13_P.pak` },
    { type: 'copy', source: 'files/ChenQianyu_Independent13_P.ucas', destination: `${PAK_MODS_PATH}/ChenQianyu_Independent13_P.ucas` },
    { type: 'copy', source: 'files/ChenQianyu_Independent13_P.utoc', destination: `${PAK_MODS_PATH}/ChenQianyu_Independent13_P.utoc` },
    { type: 'copy', source: 'ue4ss/Mods/CQ11Release/enabled.txt', destination: `${UE4SS_MODS_PATH}/CQ11Release/enabled.txt` },
    { type: 'copy', source: 'ue4ss/Mods/CQHideOriginalCloth/enabled.txt', destination: `${UE4SS_MODS_PATH}/CQHideOriginalCloth/enabled.txt` },
    { type: 'copy', source: 'ue4ss/Mods/CQ11Release/Scripts/main.lua', destination: `${UE4SS_MODS_PATH}/CQ11Release/Scripts/main.lua` },
    { type: 'copy', source: 'ue4ss/Mods/CQHideOriginalCloth/Scripts/main.lua', destination: `${UE4SS_MODS_PATH}/CQHideOriginalCloth/Scripts/main.lua` },
  ])

  // --- PBZModLoader JavaScript mods ---
  // Real Nexus shape (PBZ Sandbox 0.3.0): a project folder holding main.js.
  const jsMod = [
    'README.txt',
    'pbz-sandbox/main.js',
    'pbz-sandbox/feature-controls.js',
    'pbz-sandbox/features/auto-deflect.js',
    'pbz-sandbox/ui/feature-panel.js',
  ]
  assert.equal(testJs(jsMod, GAME_ID).supported, true)
  assert.equal(testBinaries(jsMod, GAME_ID).supported, false)
  assert.equal(testRoot(jsMod, GAME_ID).supported, false)
  assert.deepEqual(installJs(jsMod, 'C:/staging/pbz-sandbox.installing').instructions, [
    { type: 'attribute', key: 'phantomBladeZeroJsModIds', value: ['pbz-sandbox'] },
    { type: 'copy', source: 'pbz-sandbox/main.js', destination: `${JS_MODS_PATH}/pbz-sandbox/main.js` },
    { type: 'copy', source: 'pbz-sandbox/feature-controls.js', destination: `${JS_MODS_PATH}/pbz-sandbox/feature-controls.js` },
    { type: 'copy', source: 'pbz-sandbox/features/auto-deflect.js', destination: `${JS_MODS_PATH}/pbz-sandbox/features/auto-deflect.js` },
    { type: 'copy', source: 'pbz-sandbox/ui/feature-panel.js', destination: `${JS_MODS_PATH}/pbz-sandbox/ui/feature-panel.js` },
  ])
  // The whole folder is copied: a sibling dll stays with its mod.
  assert.deepEqual(destinations(installJs(['MyMod/main.js', 'MyMod/native.dll'], 'unused.installing')), [
    `${JS_MODS_PATH}/MyMod/main.js`,
    `${JS_MODS_PATH}/MyMod/native.dll`,
  ])
  // A release wrapper folder is stripped, and several mods deploy side by side.
  const wrappedJs = installJs(['PBZ-Sandbox-0.3.0/pbz-sandbox/main.js', 'PBZ-Sandbox-0.3.0/pbz-sandbox/ui/p.js'], 'unused.installing')
  assert.deepEqual(destinations(wrappedJs), [
    `${JS_MODS_PATH}/pbz-sandbox/main.js`,
    `${JS_MODS_PATH}/pbz-sandbox/ui/p.js`,
  ])
  const twoJs = installJs(['modA/main.js', 'modB/main.js'], 'unused.installing')
  assert.deepEqual(twoJs.instructions[0], { type: 'attribute', key: 'phantomBladeZeroJsModIds', value: ['modA', 'modB'] })
  assert.deepEqual(destinations(twoJs), [`${JS_MODS_PATH}/modA/main.js`, `${JS_MODS_PATH}/modB/main.js`])
  // A `dist` build-output wrapper is not installed as its own folder.
  assert.deepEqual(destinations(installJs(['my-mod/dist/main.js'], 'unused.installing')), [
    `${JS_MODS_PATH}/my-mod/main.js`,
  ])
  assert.deepEqual(installJs(['my-mod/dist/main.js'], 'unused.installing').instructions[0].value, ['my-mod'])
  // Two different roots claiming the same mod name must not silently merge.
  assert.throws(
    () => installJs(['a/MyMod/main.js', 'b/MyMod/main.js'], 'unused.installing'),
    /two PBZModLoader mods in this archive are named "MyMod"/,
  )
  // No main.js means this is not a JS mod.
  assert.equal(testJs(['MyMod/lib/x.js'], GAME_ID).supported, false)
  // The loader itself is a game-relative tree, handled by root, never as a mod.
  const loaderArchive = ['ProjectPBZ/PBZModLoader/bootstrap.js', 'platform/steam/version.dll']
  assert.equal(testRoot(loaderArchive, GAME_ID).supported, true)
  assert.equal(testJs(loaderArchive, GAME_ID).supported, false)

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
  // A game-relative tree deploys whole, including paks, scripts and the loader, so
  // no file is dropped (Nexus `root` / `wrapped-root`).
  assert.deepEqual(installRoot([
    'ABZ/ProjectPBZ/Content/Paks/~mods/No-Intro_P.pak',
    'ABZ/platform/steam/No-Intro.asi',
    'ABZ/readme.txt',
  ]).instructions, [
    { type: 'copy', source: 'ABZ/ProjectPBZ/Content/Paks/~mods/No-Intro_P.pak', destination: 'ProjectPBZ/Content/Paks/~mods/No-Intro_P.pak' },
    { type: 'copy', source: 'ABZ/platform/steam/No-Intro.asi', destination: 'platform/steam/No-Intro.asi' },
  ])
  assert.equal(testRoot(['PBZ/platform/steam/dwmapi.dll', 'PBZ/platform/steam/ue4ss/UE4SS.dll'], GAME_ID).supported, true)
  assert.equal(testRoot(['Mod/ProjectPBZ/Content/Paks/LogicMods/Menu.pak'], GAME_ID).supported, true)
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
    MOD_TYPE_UE4SS_FOLDER,
    MOD_TYPE_CONTENT,
    MOD_TYPE_PAK_ALT,
    MOD_TYPE_PAK,
    MOD_TYPE_BINARIES,
    MOD_TYPE_JS,
    MOD_TYPE_ROOT,
  ])
  assert.equal(modTypes[0].priority, Math.max(...Object.values(MOD_TYPE_PRIORITY)))
  assert.deepEqual(installers.map((item) => item.id), modTypes.map((item) => item.id))
  assert.equal(Math.min(...installers.map((item) => item.priority)), installers[0].priority)
  assert.ok(modTypes.every((item) => Boolean(item.name)))

  // --- Requirements ---
  assert.deepEqual(getRequirementItems().map((item) => item.name), ['UE4SS (Phantom Blade Zero build)', 'PBZModLoader'])
  const requirement = getRequirementItems()[0]
  assert.equal(requirement.modId, '128413')
  assert.equal(requirement.mod_id, '128413')
  assert.equal(requirement.requirement, 'enabled')
  assert.equal(requirement.openModDetailDialog, false)
  assert.equal(requirement.modType, MOD_TYPE_UE4SS)
  assert.deepEqual(getRequirementItems()[1], {
    key: 'phantom-blade-zero-pbzmodloader',
    name: 'PBZModLoader',
    modId: '129441',
    mod_id: '129441',
    modType: MOD_TYPE_ROOT,
    openModDetailDialog: false,
    requirement: 'enabled',
  })
  assert.deepEqual(getLocalModFeatures(), [
    {
      modId: 128413,
      marked: true,
      mark: { type: 'prerequisite', label: '前置模组' },
    },
    {
      modId: 129441,
      marked: true,
      mark: { type: 'prerequisite', label: '前置模组' },
    },
  ])
  const gamePath = path.join('E:', 'SteamLibrary', 'steamapps', 'common', 'PBZ')
  const dwmapiPath = path.join(gamePath, 'platform/steam', 'dwmapi.dll')
  const xinputPath = path.join(gamePath, 'platform/steam', 'xinput1_4.dll')
  const dllPath = path.join(gamePath, 'platform/steam', 'ue4ss', 'UE4SS.dll')
  const flatDllPath = path.join(gamePath, 'platform/steam', 'UE4SS.dll')
  const versionPath = path.join(gamePath, 'platform/steam', 'version.dll')
  const loaderPath = path.join(gamePath, 'ProjectPBZ', 'PBZModLoader')
  for (const ue4ssFiles of [[dwmapiPath, dllPath], [xinputPath, dllPath], [dwmapiPath, flatDllPath]]) {
    assert.equal((await getRequirementStatus(requirementContext([...ue4ssFiles, versionPath], [loaderPath]), gamePath)).installed, true)
  }
  assert.equal((await getRequirementStatus(requirementContext([dwmapiPath]), gamePath)).installed, false)
  assert.equal((await getRequirementStatus(requirementContext([dllPath]), gamePath)).installed, false)
  // Check every partial installation, including both missing in one response.
  for (const hasUe4ss of [false, true]) {
    for (const hasVersion of [false, true]) {
      for (const hasLoader of [false, true]) {
        const files = [...(hasUe4ss ? [dwmapiPath, dllPath] : []), ...(hasVersion ? [versionPath] : [])]
        const context = requirementContext(files, hasLoader ? [loaderPath] : [])
        const expected = [...(hasUe4ss ? [] : ['128413']), ...(hasVersion && hasLoader ? [] : ['129441'])]
        const result = await getExtensionRequiredMods(context, gamePath)
        assert.deepEqual(result.requirements.map((item) => item.modId), expected)
        assert.equal(result.installed, expected.length === 0)
        if ('requirement' in result) {
          assert.equal(result.code, 'EXTENSION_REQUIRED_MODS_MISSING')
          assert.equal(result.requirement.code, result.code)
          assert.deepEqual(result.requirement.requirements, result.requirements)
        } else {
          assert.equal(expected.length, 0)
        }
      }
    }
  }
  // A file cannot stand in for the loader directory, nor a directory for the DLL.
  for (const context of [
    requirementContext([dwmapiPath, dllPath, versionPath, loaderPath]),
    requirementContext([dwmapiPath, dllPath], [versionPath, loaderPath]),
    requirementContext([dwmapiPath, dllPath, path.join(gamePath, 'version.dll')], [loaderPath]),
  ]) {
    assert.deepEqual((await getRequirementStatus(context, gamePath)).requirements.map((item) => item.modId), ['129441'])
  }

  console.log('phantom blade zero extension tests passed')
}

void main()
