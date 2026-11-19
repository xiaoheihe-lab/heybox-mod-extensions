const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path').posix
const { createHash } = require('node:crypto')

module.exports = function verify(adapter, expected) {
  const { game } = adapter
  const resource = `${game.resourceDirectories[0]}/example.bnd.dcx`
  const payload = ['release/Game/mod/' + resource, 'release/Game/mod/readme.txt', 'release/launcher.exe', 'unrelated.txt']
  const config = game.loader === 'me2' ? 'modengine.toml' : 'modengine.ini'
  const files = ['dinput8.dll', 'heybox-souls-loader.json', config,
    ...(game.loader === 'me2' ? ['.heybox-souls-loader/modengine2.dll', '.heybox-souls-loader/lua.dll'] : [])]
  let missing = new Set()
  let wrongType = ''
  let badConfig = false
  let replacedBinary = false
  let profile = { schemaVersion: 1, appid: game.appid, loader: game.loader, overrideDirectory: 'heybox-mods',
    payloadHashes: Object.fromEntries(files.filter(file => file.endsWith('.dll')).map(file =>
      [file, createHash('sha256').update('payload').digest('hex')])),
  }
  const statCalls = []
  const root = path.join('/steam/game', game.directory)
  const registered = { installers: [], types: [], actions: [] }
  const context = {
    api: { util: {
      path,
      GameStoreHelper: { findByAppId: async id => {
        assert.equal(id, expected.appid)
        return { gamePath: '/steam/game' }
      } },
      fs: {
        stat: async file => {
          statCalls.push(file)
          const relative = path.relative(root, file)
          if (missing.has(relative)) throw new Error('ENOENT')
          return { isFile: relative !== wrongType, isDirectory: relative === wrongType }
        },
        readFile: async file => file.endsWith('.json') ? JSON.stringify(profile)
          : file.endsWith('.dll') ? replacedBinary ? 'another loader' : 'payload'
          : badConfig ? 'mods = []' : game.loader === 'me2' ? adapter.ME2_CONFIG : adapter.SOTFS_CONFIG,
      },
    } },
    registerGame: value => { registered.game = value },
    registerModType: (...args) => registered.types.push(args),
    registerInstaller: (...args) => registered.installers.push(args),
    registerExtensionAction: (...args) => registered.actions.push(args),
  }
  adapter.default(context)

  test('registers only the current Steam edition and the correct executable root', async () => {
    assert.equal(game.appid, expected.appid)
    assert.equal(registered.game.id, expected.appid)
    assert.equal(registered.game.environment.SteamAPPId, String(expected.appid))
    assert.equal(registered.game.executable, expected.executable)
    assert.equal(await registered.game.queryPath(), '/steam/game')
    assert.equal(registered.types.find(type => type[0].endsWith('-resource'))[3](),
      `{gamePath}${game.directory ? '/' + game.directory : ''}/heybox-mods`)
    for (const oldId of [211420, 236430, 999]) {
      assert.equal(adapter.testResources([resource], oldId).supported, false)
      assert.equal(adapter.testRoot(['dinput8.dll'], oldId).supported, false)
    }
  })

  test('keeps resources in the override tree and excludes siblings outside the chosen archive root', () => {
    assert.equal(adapter.testResources(payload, game.appid).supported, true)
    assert.deepEqual(adapter.installResources(payload).instructions.map(item => item.destination), [resource, 'readme.txt'])
    assert.equal(adapter.testResources(['loose.dds'], game.appid).supported, false)
    assert.equal(adapter.testResources(['DarkSoulsIII.exe'], game.appid).supported, false)
    assert.equal(adapter.testResources(['a/mod/' + resource, 'b/mod/' + resource], game.appid).supported, false)
  })

  test('installs the prerequisite before it is ready, with all files managed as one root mod', async () => {
    missing = new Set(files)
    const install = registered.installers.find(item => item[0].endsWith('-game-root'))[3]
    const source = ['package/dinput8.dll', 'package/' + config, 'package/heybox-souls-loader.json', 'outside.txt']
    assert.equal(adapter.testRoot(source, game.appid).supported, true)
    assert.equal(adapter.testResources(source, game.appid).supported, false)
    const result = await install(source)
    assert.deepEqual(result.instructions.map(item => item.destination), ['dinput8.dll', config, 'heybox-souls-loader.json'])
    missing = new Set()
  })

  test('checks all prerequisite files, rejects directories and profiles for a different edition', async () => {
    statCalls.length = 0
    missing = new Set(files)
    const absent = await adapter.getExtensionRequiredMods(context)
    assert.equal(absent.code, 'EXTENSION_REQUIRED_MODS_MISSING')
    assert.equal(absent.requirements.length, 1)
    assert.equal(statCalls.length, files.length)
    missing = new Set()
    wrongType = 'dinput8.dll'
    assert.equal((await adapter.getExtensionRequiredMods(context)).installed, false)
    wrongType = ''
    profile = { ...profile, appid: 211420 }
    assert.equal((await adapter.getExtensionRequiredMods(context)).installed, false)
    profile = { ...profile, appid: game.appid }
    assert.equal((await adapter.getExtensionRequiredMods(context)).installed, true)
    badConfig = true
    assert.equal((await adapter.getExtensionRequiredMods(context)).installed, false)
    badConfig = false
    replacedBinary = true
    assert.equal((await adapter.getExtensionRequiredMods(context)).installed, false)
    replacedBinary = false
  })

  test('the registered resource installer enforces readiness on every enable', async () => {
    const install = registered.installers.find(item => item[0].endsWith('-resource'))[3]
    missing = new Set(['dinput8.dll'])
    await assert.rejects(() => install([resource]), error => error.result?.code === 'EXTENSION_REQUIRED_MODS_MISSING')
    missing = new Set()
    assert.equal((await install([resource])).instructions[0].destination, resource)
    missing = new Set(['dinput8.dll'])
    await assert.rejects(() => install([resource]))
    missing = new Set()
  })

  test('rejects path traversal, Windows ADS paths and case-insensitive destination collisions', () => {
    for (const unsafe of ['../' + resource, 'C:escape/' + resource, '/absolute/' + resource, resource + ':stream']) {
      assert.equal(adapter.testResources([unsafe], game.appid).supported, false)
      assert.throws(() => adapter.installResources([unsafe]))
    }
    assert.throws(() => adapter.installResources([resource, resource.toUpperCase()]), /Duplicate Windows destination/)
    assert.throws(() => adapter.installRoot(['a/dinput8.dll', 'b/dxgi.dll']), /Multiple game-root/)
  })
}
