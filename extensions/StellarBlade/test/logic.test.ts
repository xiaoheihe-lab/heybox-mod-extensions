import assert from 'node:assert/strict'
import path from 'node:path'
import { MOD_TYPE_LOGIC, MOD_TYPE_PAK, MOD_TYPE_PRIORITY, MOD_TYPE_SCRIPT, MOD_TYPE_UE4SS } from '../src/constants'
import {
  installBinaries,
  installCnsJson,
  installLogic,
  installPak,
  installRoot,
  installScript,
  installUe4ss,
  testBinaries,
  testCnsJson,
  testLogic,
  testMenu,
  testMovie,
  testPak,
  testScript,
  testSplash,
  testUe4ss,
  testUe4ssCombo,
} from '../src/installers'
import { applyMutableFileVerification, registerStellarBladeModTypes } from '../src/modTypes'
import { getRequirementItems, getRequirementStatus } from '../src/requirements'

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
  const requirementItems = getRequirementItems()
  assert.deepEqual(requirementItems.map((item) => item.name), ['UE4SS for Stellar Blade'])
  assert.equal(requirementItems[0]?.modId, '5338')
  assert.equal(requirementItems[0]?.mod_id, '5338')
  assert.equal(requirementItems[0]?.requirement, 'enabled')
  assert.equal(requirementItems[0]?.openModDetailDialog, false)
  assert.equal(MOD_TYPE_PRIORITY.ue4ss, Math.max(...Object.values(MOD_TYPE_PRIORITY)))
  const installerPriorities: Array<{ id: string, priority: number }> = []
  registerStellarBladeModTypes({
    registerModType: () => undefined,
    registerInstaller: (id: string, priority: number) => installerPriorities.push({ id, priority }),
  } as any)
  const highestInstallerPriority = Math.min(...installerPriorities.map((item) => item.priority))
  assert.deepEqual(installerPriorities.find((item) => item.id === MOD_TYPE_UE4SS), {
    id: MOD_TYPE_UE4SS,
    priority: highestInstallerPriority,
  })

  assert.equal(testUe4ss(['Wrapper/dwmapi.dll', 'Wrapper/ue4ss/UE4SS.dll'], 3489700).supported, true)
  assert.equal(testUe4ss(['Wrapper/dwmapi.dll', 'Other/ue4ss/UE4SS.dll'], 3489700).supported, false)
  assert.equal(testUe4ss(['Wrapper/dwmapi.dll', 'Wrapper/UE4SS.dll'], 3489700).supported, false)
  assert.equal(testUe4ss(['UE4SS.dll'], 3489700).supported, false)
  assert.equal(testUe4ssCombo(['SB/Content/Paks/LogicMods/Foo.pak', 'SB/Binaries/Win64/ue4ss/Mods/Foo/Scripts/main.lua'], 3489700).supported, true)
  assert.equal(testLogic(['Wrapper/LogicMods'], 3489700).supported, true)
  assert.equal(testLogic(['Wrapper/LogicMods', 'Wrapper/LogicMods/Foo.pak'], 3489700).supported, true)
  assert.equal(testLogic(['Wrapper/LogicMods/Foo.pak'], 3489700).supported, false)
  assert.equal(testScript(['Foo/Scripts/main.lua'], 3489700).supported, true)
  assert.equal(testMenu(['Menu/intro.webm'], 3489700).supported, true)
  assert.equal(testMovie(['intro.bk2'], 3489700).supported, true)
  assert.equal(testSplash(['Splash.bmp'], 3489700).supported, true)
  assert.equal(testCnsJson(['Suit.dekcns.json'], 3489700).supported, true)
  assert.equal(testCnsJson(['Suit.pak', 'Suit.ucas', 'Suit.utoc', 'Suit.dekcns.json'], 3489700).supported, false)
  assert.equal(testPak(['Foo.pak', 'Foo.utoc', 'Foo.ucas'], 3489700).supported, true)
  assert.equal(testBinaries(['SB/Binaries/Win64/Injector.dll'], 3489700).supported, true)

  const ue4ss = installUe4ss([
    'UE4SS-v1/dwmapi.dll',
    'UE4SS-v1/ue4ss/UE4SS.dll',
    'UE4SS-v1/ue4ss/Mods/shared.txt',
    'UE4SS-v1/ue4ss/LICENSE',
    'UE4SS-v1/README.md',
    'Other/ue4ss/ignored.dll',
  ])
  assert.deepEqual(ue4ss.instructions, [
    { type: 'copy', source: 'UE4SS-v1/dwmapi.dll', destination: 'SB/Binaries/Win64/dwmapi.dll' },
    { type: 'copy', source: 'UE4SS-v1/ue4ss/UE4SS.dll', destination: 'SB/Binaries/Win64/ue4ss/UE4SS.dll' },
    { type: 'copy', source: 'UE4SS-v1/ue4ss/Mods/shared.txt', destination: 'SB/Binaries/Win64/ue4ss/Mods/shared.txt' },
    { type: 'copy', source: 'UE4SS-v1/ue4ss/LICENSE', destination: 'SB/Binaries/Win64/ue4ss/LICENSE' },
  ])

  const verifiedUe4ss = applyMutableFileVerification(installUe4ss([
    'UE4SS-v1/dwmapi.dll',
    'UE4SS-v1/ue4ss/UE4SS.dll',
    'UE4SS-v1/ue4ss/UE4SS-settings.ini',
    'UE4SS-v1/ue4ss/Mods/mods.txt',
    'UE4SS-v1/ue4ss/Mods/mods.json',
    'UE4SS-v1/ue4ss/Mods/Nested/mods.txt',
    'UE4SS-v1/ue4ss/Mods/enabled.txt',
    'UE4SS-v1/ue4ss/Mods/UE4SS-settings.ini',
  ]))
  assert.deepEqual(verifiedUe4ss.instructions.slice(2), [
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/UE4SS-settings.ini',
      destination: 'SB/Binaries/Win64/ue4ss/UE4SS-settings.ini',
      verification: 'exists',
      conflictPolicy: 'overwrite',
    },
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/Mods/mods.txt',
      destination: 'SB/Binaries/Win64/ue4ss/Mods/mods.txt',
      verification: 'exists',
      conflictPolicy: 'overwrite',
    },
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/Mods/mods.json',
      destination: 'SB/Binaries/Win64/ue4ss/Mods/mods.json',
      verification: 'exists',
      conflictPolicy: 'overwrite',
    },
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/Mods/Nested/mods.txt',
      destination: 'SB/Binaries/Win64/ue4ss/Mods/Nested/mods.txt',
    },
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/Mods/enabled.txt',
      destination: 'SB/Binaries/Win64/ue4ss/Mods/enabled.txt',
    },
    {
      type: 'copy',
      source: 'UE4SS-v1/ue4ss/Mods/UE4SS-settings.ini',
      destination: 'SB/Binaries/Win64/ue4ss/Mods/UE4SS-settings.ini',
    },
  ])

  const gamePath = path.join('D:', 'Games', 'StellarBlade')
  const dwmapiPath = path.join(gamePath, 'SB/Binaries/Win64', 'dwmapi.dll')
  const nestedUe4ssPath = path.join(gamePath, 'SB/Binaries/Win64', 'ue4ss', 'UE4SS.dll')
  const rootUe4ssPath = path.join(gamePath, 'SB/Binaries/Win64', 'UE4SS.dll')
  assert.equal((await getRequirementStatus(requirementContext([dwmapiPath, nestedUe4ssPath]), gamePath)).installed, true)
  assert.equal((await getRequirementStatus(requirementContext([dwmapiPath, rootUe4ssPath]), gamePath)).installed, false)

  const script = installScript(['CoolMod/Scripts/main.lua', 'CoolMod/config.json'], 'ignored.installing')
  assert.equal(script.modType, MOD_TYPE_SCRIPT)
  assert.deepEqual(script.instructions, [
    { type: 'attribute', key: 'stellarBladeUe4ssFolderId', value: 'CoolMod' },
    { type: 'copy', source: 'CoolMod/Scripts/main.lua', destination: 'SB/Binaries/Win64/ue4ss/Mods/CoolMod/Scripts/main.lua' },
    { type: 'copy', source: 'CoolMod/config.json', destination: 'SB/Binaries/Win64/ue4ss/Mods/CoolMod/config.json' },
    { type: 'generatefile', data: '', destination: 'SB/Binaries/Win64/ue4ss/Mods/CoolMod/enabled.txt' },
  ])

  const logicPak = installLogic(['Wrapper/LogicMods', 'Wrapper/LogicMods/Foo.pak', 'Wrapper/LogicMods/Foo.utoc', 'Wrapper/LogicMods/Foo.ucas'])
  assert.equal(logicPak.modType, MOD_TYPE_LOGIC)
  assert.deepEqual(logicPak.instructions, [
    { type: 'copy', source: 'Wrapper/LogicMods/Foo.pak', destination: 'SB/Content/Paks/LogicMods/Foo.pak' },
    { type: 'copy', source: 'Wrapper/LogicMods/Foo.utoc', destination: 'SB/Content/Paks/LogicMods/Foo.utoc' },
    { type: 'copy', source: 'Wrapper/LogicMods/Foo.ucas', destination: 'SB/Content/Paks/LogicMods/Foo.ucas' },
  ])

  const normalPak = installPak(['Foo.pak', 'Foo.utoc', 'Foo.ucas', 'Foo.dekcns.json'])
  assert.equal(normalPak.modType, MOD_TYPE_PAK)
  assert.deepEqual(normalPak.instructions.slice(1), [
    { type: 'copy', source: 'Foo.pak', destination: 'SB/Content/Paks/~mods/Foo.pak' },
    { type: 'copy', source: 'Foo.utoc', destination: 'SB/Content/Paks/~mods/Foo.utoc' },
    { type: 'copy', source: 'Foo.ucas', destination: 'SB/Content/Paks/~mods/Foo.ucas' },
    { type: 'copy', source: 'Foo.dekcns.json', destination: 'SB/Content/Paks/~mods/Foo.dekcns.json' },
  ])

  const root = installRoot(['Wrapper/SB/Content/Movies/intro.bk2'])
  assert.deepEqual(root.instructions, [
    { type: 'copy', source: 'Wrapper/SB/Content/Movies/intro.bk2', destination: 'SB/Content/Movies/intro.bk2' },
  ])

  const binaries = installBinaries(['Wrapper/SB/Binaries/Win64/Injector.dll'])
  assert.deepEqual(binaries.instructions, [
    { type: 'copy', source: 'Wrapper/SB/Binaries/Win64/Injector.dll', destination: 'SB/Binaries/Win64/Injector.dll' },
  ])

  const cns = installCnsJson(['Options/Suit.dekcns.json'])
  assert.deepEqual(cns.instructions, [
    { type: 'copy', source: 'Options/Suit.dekcns.json', destination: 'SB/Content/Paks/~mods/CustomNanosuitSystem/Suit.dekcns.json' },
  ])
}

void main()
