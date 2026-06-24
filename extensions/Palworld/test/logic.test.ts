import assert from 'node:assert/strict'
import { MOD_TYPE_BLUEPRINT_PAK, MOD_TYPE_LUA, MOD_TYPE_PAK } from '../src/constants'
import {
  getLuaFolderId,
  installLua,
  installPak,
  installUnrealPakTool,
  testPak,
  testRoot,
  testUe4ss,
  testUnrealPakTool,
} from '../src/installers'
import { parsePakListOutput } from '../src/pak'

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

  assert.equal(testRoot(['Pal/Content/Paks/Foo.pak'], 1623730).supported, true)
  assert.equal(testRoot(['Random/Foo.pak'], 1623730).supported, false)

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

  const luaInstall = installLua(['CoolLua/scripts/main.lua'], 'ignored.installing', MOD_TYPE_LUA)
  assert.equal(luaInstall.modType, MOD_TYPE_LUA)
  assert.deepEqual(luaInstall.instructions[0], { type: 'attribute', key: 'palworldFolderId', value: 'CoolLua' })
}

void main()
