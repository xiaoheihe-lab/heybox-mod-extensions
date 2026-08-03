import assert from 'node:assert/strict'
import { MOD_TYPE_BLUEPRINT_PAK, MOD_TYPE_LUA_V2, MOD_TYPE_PAK } from '../src/constants'
import {
  getLuaFolderId,
  installLua,
  installUe4ss,
  installPak,
  installRoot,
  installUnrealPakTool,
  testLua,
  testPak,
  testRoot,
  testUe4ss,
  testUnrealPakTool,
} from '../src/installers'
import { parsePakListOutput } from '../src/pak'
import { getOverridesModsFolderPath, getUe4ssModsPath } from '../src/ue4ss'

declare const require: any

const fs = require('fs')
const os = require('os')
const path = require('path')

function fakeContext() {
  return {
    api: {
      util: {
        GameStoreHelper: {
          findByAppId: async () => null,
        },
      },
    },
  } as any
}

async function main() {
  assert.equal(testUe4ss(['UE4SS.dll', 'dwmapi.dll'], 1623730).supported, true)
  assert.equal(testUe4ss(['UE4SS.dll'], 1623730).supported, false)

  const ue4ssInstall = await installUe4ss({
    api: { util: { fs: { readFile: async () => 'bUseUObjectArrayCache = true' } } },
  } as any, ['release/dwmapi.dll', 'release/ue4ss/UE4SS.dll', 'release/ue4ss/UE4SS-settings.ini', 'release/ue4ss/Mods/mods.txt', 'release/ue4ss/xinput1_3.dll', 'outside/ignored.txt'])
  assert.deepEqual(ue4ssInstall.instructions, [
    { type: 'copy', source: 'release/dwmapi.dll', destination: 'Pal/Binaries/Win64/dwmapi.dll' },
    { type: 'copy', source: 'release/ue4ss/UE4SS.dll', destination: 'Pal/Binaries/Win64/ue4ss/UE4SS.dll' },
    { type: 'generatefile', data: 'bUseUObjectArrayCache = false', destination: 'Pal/Binaries/Win64/ue4ss/UE4SS-settings.ini' },
    { type: 'generatefile', data: 'bUseUObjectArrayCache = true', destination: 'Pal/Binaries/Win64/ue4ss/Mods/mods.txt.original' },
    { type: 'copy', source: 'release/ue4ss/xinput1_3.dll', destination: 'Pal/Binaries/Win64/ue4ss/xinput1_3.dll' },
  ])

  assert.equal(testUnrealPakTool(['UnrealPak.exe'], 1623730).supported, true)
  assert.equal(testUnrealPakTool(['Readme.txt'], 1623730).supported, false)

  assert.equal(testPak(['Foo.pak'], 1623730).supported, true)
  assert.equal(testPak(['Foo.utoc'], 1623730).supported, true)
  assert.equal(testPak(['Foo.ucas'], 1623730).supported, true)

  const bpPak = await installPak(fakeContext(), ['SomeMod/LogicMods/Foo.pak'])
  assert.equal(bpPak.modType, MOD_TYPE_BLUEPRINT_PAK)
  assert.deepEqual(bpPak.instructions, [
    {
      type: 'copy',
      source: 'SomeMod/LogicMods/Foo.pak',
      destination: 'Pal/Content/Paks/LogicMods/Foo.pak',
    },
  ])

  const normalPak = await installPak(fakeContext(), ['SomeMod/Foo.pak'])
  assert.equal(normalPak.modType, MOD_TYPE_PAK)
  assert.deepEqual(normalPak.instructions, [
    {
      type: 'copy',
      source: 'SomeMod/Foo.pak',
      destination: 'Pal/Content/Paks/~mods/Foo.pak',
    },
  ])

  assert.equal(getLuaFolderId(['Mods/CoolLua/scripts/main.lua'], 'ignored.installing'), 'CoolLua')
  assert.equal(getLuaFolderId(['CoolLua/scripts/main.lua'], 'ignored.installing'), 'CoolLua')
  assert.equal(getLuaFolderId(['main.lua'], 'SingleLua.installing'), 'SingleLua')
  assert.equal(getLuaFolderId(['Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/main.lua'], 'ignored.installing'), 'InfiniteWeightInCamp')
  assert.equal(testLua([
    'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/config.lua',
    'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/main.lua',
  ], 1623730).supported, true)

  assert.equal(testRoot(['Pal/Content/Paks/Foo.pak'], 1623730).supported, true)
  assert.equal(testRoot(['Binaries/Win64/ue4ss/Mods/Cool/Scripts/main.lua'], 1623730).supported, true)
  assert.equal(testRoot(['Content/Paks/LogicMods/Cool.pak'], 1623730).supported, true)
  assert.equal(testRoot(['Plugins/Cool/Cool.uplugin'], 1623730).supported, true)
  assert.equal(testRoot(['Random/Foo.pak'], 1623730).supported, false)

  const rootInstall = installRoot([
    'Binaries/Win64/ue4ss/Mods/Cool/Scripts/main.lua',
    'Content/Paks/LogicMods/Cool.pak',
    'Plugins/Cool/Cool.uplugin',
    'Pal/Content/Existing.pak',
  ])
  assert.deepEqual(rootInstall.instructions, [
    { type: 'copy', source: 'Binaries/Win64/ue4ss/Mods/Cool/Scripts/main.lua', destination: 'Pal/Binaries/Win64/ue4ss/Mods/Cool/Scripts/main.lua' },
    { type: 'copy', source: 'Content/Paks/LogicMods/Cool.pak', destination: 'Pal/Content/Paks/LogicMods/Cool.pak' },
    { type: 'copy', source: 'Plugins/Cool/Cool.uplugin', destination: 'Pal/Plugins/Cool/Cool.uplugin' },
    { type: 'copy', source: 'Pal/Content/Existing.pak', destination: 'Pal/Content/Existing.pak' },
  ])

  const toolInstall = installUnrealPakTool(['bin/UnrealPak.exe', 'bin/Tool.dll'])
  assert.deepEqual(toolInstall.instructions, [
    { type: 'copy', source: 'bin/UnrealPak.exe', destination: 'UnrealPakTool/UnrealPak.exe' },
    { type: 'copy', source: 'bin/Tool.dll', destination: 'UnrealPakTool/Tool.dll' },
  ])

  const mountBlueprint = parsePakListOutput([
    'LogPakFile: Display: Mount point ../../../Pal/Content/Mods/Cool/',
    'LogPakFile: Display: "../../../Pal/Content/Foo.uasset" offset: 0, size: 1 bytes, sha1: abc, compression: None.',
  ].join('\n'))
  assert.equal(mountBlueprint?.modType, MOD_TYPE_BLUEPRINT_PAK)

  const fileBlueprint = parsePakListOutput([
    'LogPakFile: Display: Mount point ../../../Pal/Content/',
    'LogPakFile: Display: "../../../Pal/Content/Mods/Cool/Foo.uasset" offset: 0, size: 1 bytes, sha1: abc, compression: None.',
  ].join('\n'))
  assert.equal(fileBlueprint?.modType, MOD_TYPE_BLUEPRINT_PAK)

  const ordinary = parsePakListOutput([
    'LogPakFile: Display: Mount point ../../../Pal/Content/',
    'LogPakFile: Display: "../../../Pal/Content/Foo.uasset" offset: 0, size: 1 bytes, sha1: abc, compression: None.',
  ].join('\n'))
  assert.equal(ordinary?.modType, MOD_TYPE_PAK)

  const luaInstall = await installLua(fakeContext(), ['CoolLua/scripts/main.lua'], 'ignored.installing', MOD_TYPE_LUA_V2)
  assert.equal(luaInstall.modType, MOD_TYPE_LUA_V2)
  assert.deepEqual(luaInstall.instructions[0], { type: 'attribute', key: 'palworldFolderId', value: 'CoolLua' })
  assert.deepEqual(luaInstall.instructions[1], {
    type: 'copy',
    source: 'CoolLua/scripts/main.lua',
      destination: 'Pal/Binaries/Win64/ue4ss/Mods/CoolLua/scripts/main.lua',
  })

  const legacyLuaInstall = await installLua(fakeContext(), [
    'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/config.lua',
    'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/main.lua',
  ], 'ignored.installing', MOD_TYPE_LUA_V2)
  assert.deepEqual(legacyLuaInstall.instructions[0], { type: 'attribute', key: 'palworldFolderId', value: 'InfiniteWeightInCamp' })
  assert.deepEqual(legacyLuaInstall.instructions.slice(1), [
    {
      type: 'copy',
      source: 'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/config.lua',
      destination: 'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/config.lua',
    },
    {
      type: 'copy',
      source: 'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/main.lua',
      destination: 'Pal/Binaries/Win64/ue4ss/Mods/InfiniteWeightInCamp/Scripts/main.lua',
    },
  ])

  assert.equal(getOverridesModsFolderPath('[Overrides]\nModsFolderPath = CustomMods\n'), 'CustomMods')
  assert.equal(getOverridesModsFolderPath('[Other]\nModsFolderPath = Ignored\n'), undefined)
  assert.equal(await getUe4ssModsPath(fakeContext()), 'Pal/Binaries/Win64/ue4ss/Mods')
  const gamePath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'palworld-ue4ss-'))
  try {
    const dllDirectory = path.join(gamePath, 'Pal', 'Binaries', 'Win64', 'ue4ss')
    await fs.promises.mkdir(dllDirectory, { recursive: true })
    const rootDllDirectory = path.dirname(dllDirectory)
    await fs.promises.writeFile(path.join(rootDllDirectory, 'UE4SS.dll'), '')
    await fs.promises.writeFile(path.join(rootDllDirectory, 'UE4SS-settings.ini'), '[Overrides]\nModsFolderPath = RootMods\n')
    await fs.promises.writeFile(path.join(dllDirectory, 'UE4SS.dll'), '')
    await fs.promises.writeFile(path.join(dllDirectory, 'UE4SS-settings.ini'), '[Overrides]\nModsFolderPath = CustomMods\n')
    assert.equal(await getUe4ssModsPath(fakeContext(), gamePath), 'Pal/Binaries/Win64/ue4ss/CustomMods')
    await fs.promises.rm(path.join(dllDirectory, 'UE4SS-settings.ini'))
    assert.equal(await getUe4ssModsPath(fakeContext(), gamePath), 'Pal/Binaries/Win64/ue4ss/Mods')
  } finally {
    await fs.promises.rm(gamePath, { recursive: true, force: true })
  }
}

void main()
