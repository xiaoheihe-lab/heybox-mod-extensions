const assert = require('node:assert/strict')
const { test } = require('node:test')

function verifyAdapter(adapter, { id, folder, suffix, executable }) {
  const { default: main, testPak, installPak } = adapter
  const target = stem => `${stem}${suffix ? '_P' : ''}`
  const destinations = files => installPak(files).instructions.map(i => i.destination)

  test('only accepts Pak archives for the registered game', () => {
    for (const gameId of [id, String(id)]) assert.equal(testPak(['a.PAK'], gameId).supported, true)
    assert.equal(testPak(['a.pak'], id + 1).supported, false)
    for (const files of [[], ['a.sig'], ['a.ucas', 'a.utoc'], ['readme.txt']]) {
      assert.equal(testPak(files, id).supported, false)
      assert.throws(() => installPak(files), /no supported Pak layout/)
    }
  })

  test('unwraps root, arbitrary wrapper and full game directory archives', () => {
    for (const prefix of ['', 'Download/MyMod/', `${folder}/Content/Paks/`, `Bundle/${folder}/Content/Paks/~mods/`]) {
      const files = Object.freeze([`${prefix}a.pak`, `${prefix}a.sig`, `${prefix}readme.txt`, `${prefix}preview.png`])
      assert.deepEqual(installPak(files).instructions, [
        { type: 'copy', source: `${prefix}a.pak`, destination: `${target('a')}.pak` },
        { type: 'copy', source: `${prefix}a.sig`, destination: `${target('a')}.sig` },
      ])
    }
  })

  test('selects the first Pak subtree with exact directory boundaries', () => {
    const files = ['Outer/Mod/a.pak', 'Outer/Mod/Sub/b.pak', 'Outer/ModExtra/c.pak', 'Other/d.pak']
    assert.deepEqual(destinations(files), [`${target('a')}.pak`, `Sub/${target('b')}.pak`])
    assert.deepEqual(destinations(['a.pak', 'Sub/b.pak']), [`${target('a')}.pak`, `Sub/${target('b')}.pak`])
  })

  test('copies only same-directory same-stem companions and keeps original sources', () => {
    const files = ['./Wrap\\A.PAK', 'Wrap/a.SIG', 'Wrap/a.UCAS', 'Wrap/A.UTOC', 'Wrap/unrelated.sig', 'Other/a.sig']
    const result = installPak(files)
    assert.equal(result.instructions[0].source, files[0])
    assert.deepEqual(result.instructions.map(i => i.destination), ['pak', 'sig', 'ucas', 'utoc'].map(ext => `${target('A')}.${ext}`))
    assert.equal(result.modType, `${id}-pak`)
  })

  test('fails incomplete IO Store companions instead of deploying broken pairs', () => {
    for (const extension of ['ucas', 'utoc']) assert.throws(() => installPak(['a.pak', `a.${extension}`]), /incomplete IO Store pair/)
  })

  test('does not partially install FOMOD, LogicMods or loader/script bundles', () => {
    for (const special of ['FOMOD/ModuleConfig.xml', 'Bundle/Fomod/moduleconfig.XML', 'LogicMods/b.pak', 'Paks/LogicMods/b.pak', 'loader.DLL', 'a.asi', 'Scripts/main.lua']) {
      const files = ['a.pak', special]
      assert.equal(testPak(files, id).supported, false)
      assert.throws(() => installPak(files), /no supported Pak layout/)
    }
  })

  test('excludes unsafe paths and directory entries', () => {
    const invalid = ['../a.pak', 'C:\\a.pak', '/a.pak', '\\\\server\\a.pak', 'a/../b.pak', 'a.pak/', 'a\0.pak', 'a//b.pak', 'Dir./a.pak', 'Dir /a.pak']
    for (const file of invalid) assert.equal(testPak([file], id).supported, false)
    assert.deepEqual(destinations(['ok.pak', ...invalid]), [`${target('ok')}.pak`])
  })

  test('rejects case-insensitive target collisions and deduplicates exact source repeats', () => {
    assert.throws(() => installPak(['a.pak', 'A.PAK']), /multiple archive files target/)
    assert.throws(() => installPak(['a.pak', 'a.sig', 'A.SIG']), /multiple archive files target/)
    assert.deepEqual(destinations(['a.pak', 'a.pak']), [`${target('a')}.pak`])
  })

  test('applies the game-specific patch filename policy', () => {
    assert.deepEqual(destinations(['a_P.pak', 'a_P.sig']), ['a_P.pak', 'a_P.sig'])
    if (suffix) {
      assert.deepEqual(destinations(['a_p.pak', 'a_p.sig']), ['a_P.pak', 'a_P.sig'])
      assert.throws(() => installPak(['a.pak', 'a_P.pak']), /multiple archive files target/)
    } else {
      assert.deepEqual(destinations(['a.pak', 'a_P.pak']), ['a.pak', 'a_P.pak'])
    }
  })

  test('registers matching game, mod type, tester and installer; resolves final paths', async () => {
    const games = [], types = [], installers = []
    const context = {
      api: { util: { GameStoreHelper: { findByAppId: async gameId => {
        assert.equal(gameId, String(id))
        return { gamePath: 'D:/Games/Test' }
      } } } },
      registerGame: config => games.push(config),
      registerModType: (...args) => types.push(args),
      registerInstaller: (...args) => installers.push(args),
    }
    assert.equal(main(context), true)
    assert.equal(games.length, 1)
    assert.equal(games[0].id, id)
    assert.equal(games[0].executable, executable)
    assert.equal(await games[0].queryPath(), 'D:/Games/Test')
    context.api.util.GameStoreHelper.findByAppId = async () => undefined
    assert.equal(await games[0].queryPath(), undefined)
    assert.equal(types.length, 3)
    assert.equal(installers.length, 3)
    const [modType, priority, supportsGame, getTarget, acceptsFiles] = types[0]
    assert.equal(priority, 25)
    assert.equal(supportsGame(id), true)
    assert.equal(supportsGame(id + 1), false)
    assert.equal(acceptsFiles({ files: ['a.pak'] }), true)
    assert.equal(acceptsFiles(['a.pak']), true)
    assert.equal(acceptsFiles(undefined), false)
    assert.equal(acceptsFiles({ files: ['a.sig'] }), false)
    assert.deepEqual(installers[0], [modType, 25, testPak, installPak])
    const modPath = `${folder}/Content/Paks/~mods`
    assert.equal(games[0].details.customOpenModsPath, modPath)
    assert.equal(getTarget(), `{gamePath}/${modPath}`)
    for (const instruction of installPak([`${folder}/Content/Paks/~mods/a.pak`]).instructions) {
      assert.equal(`${getTarget().replace('{gamePath}', 'D:/Games/Test')}/${instruction.destination}`, `D:/Games/Test/${modPath}/${target('a')}.pak`)
    }
  })
}

verifyAdapter(require('../dist/ProjectWingman/index.cjs'), {"id":895870,"folder":"ProjectWingman","suffix":false,"executable":"ProjectWingman.exe"})

const { default: main, testRoot, installRoot, testPak, installPak, testSkin, installSkin } = require('../dist/ProjectWingman/index.cjs')

test('skin installer accepts all-PNG archives and explicit Skins paths', () => {
  assert.equal(testSkin(['Outer/face.png', 'Outer/body.png'], 895870).supported, true)
  assert.equal(testSkin(['Outer/ProjectWingman/Mods/Skins/Jet/face.png', 'Outer/ProjectWingman/Mods/Skins/Jet/meta.json'], 895870).supported, true)
  assert.equal(testSkin(['Outer/face.png', 'Outer/readme.txt'], 895870).supported, false)
  assert.equal(testSkin(['Outer/Mods/Skins/Jet/face.png'], 895870).supported, true)
  assert.equal(testSkin(['Outer/Mods/Skins/Jet/face.png'], 1).supported, false)
})

test('skin installer trims wrappers and Skins anchor into ProjectWingman/Mods/Skins', () => {
  assert.deepEqual(installSkin(['Outer/face.png', 'Outer/body.png']).instructions, [
    { type: 'copy', source: 'Outer/face.png', destination: 'face.png' },
    { type: 'copy', source: 'Outer/body.png', destination: 'body.png' },
  ])
  assert.deepEqual(installSkin(['Outer/ProjectWingman/Mods/Skins/Jet/face.png', 'Outer/ProjectWingman/Mods/Skins/Jet/meta.json']).instructions, [
    { type: 'copy', source: 'Outer/ProjectWingman/Mods/Skins/Jet/face.png', destination: 'Jet/face.png' },
    { type: 'copy', source: 'Outer/ProjectWingman/Mods/Skins/Jet/meta.json', destination: 'Jet/meta.json' },
  ])
})

test('skin installer rejects unsafe paths and destination collisions', () => {
  for (const files of [[], ['a.txt'], ['../face.png'], ['A/face.png', 'B/face.png']]) {
    if (files.length < 2 || files[0] !== 'A/face.png') assert.equal(testSkin(files, 895870).supported, false)
  }
  assert.throws(() => installSkin(['A/face.png', 'A/Face.png']), /multiple archive files target/)
  assert.throws(() => installSkin(['ProjectWingman/Mods/Skins/../face.png']), /no supported skin archive/)
})

test('root installer preserves all supported game subtrees and filenames', () => {
  for (const wrapper of ['', 'Download/Mod/']) {
    const paths = ['ProjectWingman/Content/Paks/a.pak', 'ProjectWingman/Content/Paks/~mods/A/b.pak', 'ProjectWingman/Content/Paks/~mods/B/c.pak', 'ProjectWingman/Binaries/Win64/loader.dll', 'ProjectWingman/Config/DefaultEngine.ini']
    const files = [...paths.map(p => wrapper + p), wrapper + 'readme.txt', wrapper + 'projectwingman.pak', wrapper + 'Other/game.dll']
    assert.equal(testRoot(files, '895870').supported, true)
    assert.equal(testPak(files, 895870).supported, false)
    assert.deepEqual(installRoot(files), { modType: '895870-root', instructions: paths.map(p => ({ type: 'copy', source: wrapper + p, destination: p })) })
  }
})

test('root tester rejects unrelated games, bare archives, FOMOD and unsafe paths', () => {
  assert.equal(testRoot(['ProjectWingman/Content/Paks/a.pak'], 1).supported, false)
  for (const files of [[], ['a.pak'], ['Paks/a.pak'], ['ProjectWingman/Unknown/a.txt'], ['../ProjectWingman/Content/a.pak'], ['ProjectWingman/Content/../a.pak'], ['ProjectWingman/Content/a.pak/'], ['ProjectWingman/Content/a.pak', 'Wrap/FOMOD/ModuleConfig.xml']]) {
    assert.equal(testRoot(files, 895870).supported, false)
    assert.throws(() => installRoot(files), /no supported root layout/)
  }
  assert.equal(testPak(['Wrap/a.pak'], 895870).supported, true)
})

test('root installer keeps original sources, rejects collisions and ambiguous variants', () => {
  const source = '.\\Wrap\\ProjectWingman\\Content\\Paks\\a.pak'
  assert.deepEqual(installRoot([source, source]).instructions, [{type:'copy', source, destination:'ProjectWingman/Content/Paks/a.pak'}])
  assert.throws(() => installRoot(['ProjectWingman/Content/a.pak', 'ProjectWingman/content/A.PAK']), /multiple archive files target/)
  assert.throws(() => installRoot(['A/ProjectWingman/Content/a.pak', 'B/ProjectWingman/Content/b.pak']), /multiple game roots/)
})

test('root registration wins over loose Pak and resolves destinations against game root', () => {
  const installers = [], types = []
  main({ registerGame() {}, registerModType: (...args) => types.push(args), registerInstaller: (...args) => installers.push(args) })
  const root = types.find(row => row[0] === '895870-root')
  assert.equal(root[1], 30)
  assert.equal(root[2](895870), true)
  assert.equal(root[2](1), false)
  assert.equal(root[3](), '{gamePath}')
  assert.equal(root[4](undefined), false)
  const files = ['Wrap/ProjectWingman/Content/Paks/~mods/A/a.pak', 'Wrap/ProjectWingman/Content/Paks/~mods/B/b.pak', 'loose.pak']
  assert.equal(root[4]({files}), true)
  const chosen = installers.sort((a,b) => b[1]-a[1]).find(row => row[2](files, 895870).supported)
  assert.deepEqual(chosen, ['895870-root', 30, testRoot, installRoot])
  assert.equal(root[3]() + '/' + chosen[3](files).instructions[1].destination, '{gamePath}/ProjectWingman/Content/Paks/~mods/B/b.pak')
  assert.equal(installers.find(row => row[2](['a.pak'], 895870).supported)[3], installPak)
})
