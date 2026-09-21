const assert = require('node:assert/strict')
const { test } = require('node:test')
const { default: main, testWrappedPak, installWrappedPak, testLoosePak, installLoosePak } = require('../dist/Ghostrunner/index.cjs')
const destinations = (install, files) => install(files).instructions.map(i => i.destination)

test('testers distinguish wrapped and loose layouts and reject other games', () => {
  for (const id of [1139900, '1139900']) {
    assert.equal(testLoosePak(['Mod.PAK'], id).supported, true)
    assert.equal(testWrappedPak(['Mod.PAK'], id).supported, false)
    assert.equal(testWrappedPak(['Paks/Mod.PAK'], id).supported, true)
    assert.equal(testLoosePak(['Paks/Mod.PAK'], id).supported, false)
  }
  for (const tester of [testWrappedPak, testLoosePak]) {
    assert.equal(tester(['mod.pak', 'Paks/mod.pak'], 2144740).supported, false)
    for (const files of [[], ['mod.sig']]) assert.equal(tester(files, 1139900).supported, false)
  }
  for (const file of ['Bundle/mod.pak', 'LogicMods/mod.pak', 'Paks/Other/mod.pak', 'Paks/~mods/nested/mod.pak']) {
    assert.equal(testWrappedPak([file], 1139900).supported, false)
    assert.equal(testLoosePak([file], 1139900).supported, true)
  }
  assert.throws(() => installWrappedPak(['mod.pak']), /no supported .pak layout/)
  assert.throws(() => installLoosePak(['readme.txt']), /no supported .pak layout/)
})

test('loose installer routes all sibling pak and sig files to LogicMods', () => {
  assert.deepEqual(destinations(installLoosePak, ['mod.pak', 'mod.sig', 'other.sig', 'readme.txt', 'loader.dll']), ['LogicMods/mod.pak', 'LogicMods/mod.sig', 'LogicMods/other.sig'])
  assert.deepEqual(destinations(installLoosePak, ['only.pak']), ['LogicMods/only.pak'])
})

test('screenshot layout installs Katana without images or description', () => {
  const files = ['GRxCSGO01/', 'GRxCSGO01/20240428121751.png', 'GRxCSGO01/20240428123547.png', 'GRxCSGO01/Katana_P.pak', 'GRxCSGO01/grmod简介.txt']
  assert.equal(testLoosePak(files, 1139900).supported, true)
  assert.deepEqual(installLoosePak(files).instructions, [
    { type: 'copy', source: 'GRxCSGO01/Katana_P.pak', destination: 'LogicMods/Katana_P.pak' },
  ])
})

test('fallback selects first pak directory only, including sibling sig with no matching pak', () => {
  const files = ['Outer\\Chosen\\first.PAK', 'Outer/Chosen/second.pak', 'Outer/Chosen/extra.SIG', 'Outer/Chosen/readme.txt', 'Outer/Chosen/Child/child.pak', 'Outer/Chosen2/other.pak', 'Outer/Elsewhere/later.pak', 'root.pak']
  assert.deepEqual(destinations(installLoosePak, files), ['LogicMods/first.PAK', 'LogicMods/second.pak', 'LogicMods/extra.SIG'])
  assert.equal(installLoosePak(files).instructions[0].source, files[0])
})

test('wrapped installer preserves three supported targets and strips outer wrappers', () => {
  for (const folder of ['', 'LogicMods/', '~mods/']) {
    for (const wrapper of ['', 'Bundle/Ghostrunner/Content/']) {
      const prefix = `${wrapper}Paks/${folder}`
      assert.deepEqual(destinations(installWrappedPak, [`${prefix}mod.pak`, `${prefix}mod.sig`]), [`${folder}mod.pak`, `${folder}mod.sig`])
    }
  }
})

test('mixed archives select wrapped installer without importing loose files', () => {
  const files = ['Outer\\PAKS\\logicmods\\Logic.PAK', 'Outer\\PAKS\\logicmods\\logic.SIG', 'Paks/base.pak', 'Paks/base.sig', 'Paks/~mods/skin.pak', 'bare.pak', 'bare.sig']
  assert.equal(testWrappedPak(files, 1139900).supported, true)
  assert.equal(testLoosePak(files, 1139900).supported, false)
  assert.deepEqual(destinations(installWrappedPak, files), ['LogicMods/Logic.PAK', 'LogicMods/Logic.SIG', 'base.pak', 'base.sig', '~mods/skin.pak'])
  assert.equal(installWrappedPak(files).instructions[0].source, files[0])
  assert.deepEqual(destinations(installWrappedPak, ['Paks/a.pak', 'a.sig']), ['a.pak'])
})

test('rejects unsafe paths, directories and unsupported companions', () => {
  const invalid = ['../escape.pak', '/absolute.pak', 'C:\\escape.pak', '\\\\server\\mod.pak', 'a/../escape.pak', 'a.pak/', 'a\0.pak']
  for (const tester of [testWrappedPak, testLoosePak]) for (const file of invalid) assert.equal(tester([file], 1139900).supported, false)
  assert.deepEqual(destinations(installLoosePak, ['mod.pak', ...invalid, 'Folder/mod.pak', 'Paks/a.dll', 'Paks/mod.sig']), ['LogicMods/mod.pak'])
})

test('refuses collisions within each installer', () => {
  assert.throws(() => installWrappedPak(['A/Paks/mod.pak', 'B/Paks/MOD.pak']), /multiple archive files target/)
  assert.throws(() => installLoosePak(['mod.pak', 'MOD.pak']), /multiple archive files target/)
})

test('registers two ordered installers with independent mod types and matching callbacks', async () => {
  const games = [], types = [], installers = []
  const context = {
    api: { util: { GameStoreHelper: { findByAppId: async id => { assert.equal(id, '1139900'); return { gamePath: 'D:/Games/Ghostrunner' } } } } },
    registerGame: game => games.push(game), registerModType: (...args) => types.push(args), registerInstaller: (...args) => installers.push(args),
  }
  assert.equal(main(context), true)
  assert.equal(await games[0].queryPath(), 'D:/Games/Ghostrunner')
  assert.equal(games[0].details.customOpenModsPath, 'Ghostrunner/Content/Paks')
  assert.equal(installers.length, 2)
  assert.equal(types.length, 2)
  for (const [index, [priority, tester, installer, files]] of [[30, testWrappedPak, installWrappedPak, ['Paks/mod.pak']], [25, testLoosePak, installLoosePak, ['mod.pak']]].entries()) {
    assert.equal(installers[index][1], priority)
    assert.equal(installers[index][2], tester)
    assert.equal(installers[index][3], installer)
    assert.equal(types[index][3](), '{gamePath}/Ghostrunner/Content/Paks')
    assert.equal(types[index][4]({ files }), true)
    assert.equal(types[index][4]({ files: ['Other/mod.pak'] }), index === 1)
    assert.equal(types[index][4](undefined), false)
    assert.equal(installer(files).modType, types[index][0])
  }
  const mixed = ['bare.pak', 'Paks/explicit.pak']
  const chosen = [...installers].sort((a,b) => b[1]-a[1]).find(row => row[2](mixed, 1139900).supported)
  assert.equal(chosen[3], installWrappedPak)
})
