import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { GameContext } from 'fixture-sdk/classes/gameContext.ts'
import { ExtensionSandboxManager } from 'fixture-sdk/classes/extensionSandboxManager.ts'
import { GameVFS } from 'fixture-sdk/vfs/index.ts'
import { HashPool } from 'fixture-sdk/vfs/hash-pool.ts'
import { FileManifest } from 'fixture-sdk/vfs/file-manifest.ts'
import { fileParseApi } from 'fixture-sdk/tools/api/file-parse.ts'

export async function run(adapterPath, root) {
  const oldDocuments = process.env.WITCHER3_DOCUMENTS_ROOT
  process.env.WITCHER3_DOCUMENTS_ROOT = path.join(root, 'documents')
  const gamePath = path.join(root, 'game')
  const docs = path.join(process.env.WITCHER3_DOCUMENTS_ROOT, 'The Witcher 3')
  const write = async (file, data) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data) }
  const xmlPath = 'bin/config/r4game/user_config_matrix/pc/input.xml'
  const native = '<UserConfig><Group id="Controls"><VisibleVars><Var id="Shared" value="base"/><Var id="Native" value="keep"/></VisibleVars></Group></UserConfig>'
  await write(path.join(gamePath, xmlPath), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(native, 'utf16le')]))
  await write(path.join(docs, 'input.settings'), '; player settings\n[Controls]\nPlayer=original\nValue=base\n')
  const pool = new HashPool(path.join(root, 'pool')); await pool.load()
  const manifest = new FileManifest(path.join(root, 'manifest.json'))
  const vfs = new GameVFS({ appid: '292030', gamePath })
  Object.assign(vfs, { hashPool: pool, fileManifest: manifest })
  let context, mergerTool
  const sandbox = new ExtensionSandboxManager({
    onRegisterGame: (_id, config) => { context = new GameContext(292030, config); context.vfs = vfs },
    onRegisterModType: (_id, message) => context.addModType(message.typeId, {
      priority: message.priority, targetPathResolved: gamePath, targetPathTemplate: '{gamePath}',
      tester: sandbox.createCallbackProxy(292030, message.testerRef),
    }),
    onRegisterInstaller: (_id, ...args) => context.addInstaller(...args),
    onRegisterPostInstallerAttributeExtractor: (_id, ...args) => context.addPostInstallerAttributeExtractor(...args),
    onRegisterManagedDeploymentHook: (_id, ...args) => context.addManagedDeploymentHook(...args),
    onRegisterLoadOrder: (_id, registration) => context.addLoadOrderProvider(registration),
    onRegisterFileMerge: (_id, registration) => context.addFileMerge(registration),
    onRegisterModTool: (_id, registration) => { mergerTool = registration; context.modTools.register(registration) },
    onRegisterExtensionAction: (_id, _game, name, callback) => context.addAction(name, callback),
    onDeployLoadOrder: (_id, provider) => context.deployLoadOrder(provider),
  }, () => ({ util: {
    path, fileParseApi,
    fs: { stat: async file => ({ isFile: (await fs.stat(file)).isFile() }) },
    GameStoreHelper: { findByAppId: async () => ({ gamePath }) },
    ui: { request: async () => ({ confirmed: true }) },
  } }))
  try {
    await sandbox.loadExtension(292030, { code: await fs.readFile(adapterPath, 'utf8'), filename: adapterPath, dirname: path.dirname(adapterPath), loadSource: 'developer' })
    await context.config.setup({ gamePath })
    for (const [key, name] of [['1_1', 'A'], ['2_2', 'B']]) {
      const contents = {
        [`Mods/mod${name}/content/scripts/${name}.ws`]: 'function override() {}',
        [xmlPath]: `<UserConfig><Group id="Controls"><VisibleVars><Var id="Shared" value="${name}"/><Var id="Added${name}" value="1"/></VisibleVars></Group></UserConfig>`,
        'input.settings.part.txt': `[Controls]\nValue=${name}\nAdded${name}=1\n`,
        'menus/extra/input.settings.part.txt': `[Extra]\nAdditional${name}=yes\n`,
      }
      const tree = {}
      for (const [file, data] of Object.entries(contents)) tree[file] = (await pool.ingestFromStream(Readable.from([data]))).hash
      manifest.registerRawMod(key, { modId: Number(key[0]), fileId: 1, versionId: 1, metaInfo: { name: `Fixture ${name}` } }, tree)
      await context.enableLocalMod(key)
    }
    const variable = async id => {
      const bytes = await fs.readFile(path.join(gamePath, xmlPath))
      const text = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8')
      const data = await fileParseApi.parseXmlToObject(text)
      return data.UserConfig.Group[0].VisibleVars[0].Var.find(value => value.$.id === id)?.$.value
    }
    assert.equal(await variable('Native'), 'keep')
    assert.equal(await variable('Shared'), 'A')
    assert.equal(await variable('AddedB'), '1')
    assert.equal((await fs.readdir(path.join(gamePath, 'Mods/modA'))).includes('input.settings.part.txt'), false)
    assert.match(await fs.readFile(path.join(docs, 'input.settings'), 'utf8'), /Value=A/)
    assert.match(await fs.readFile(path.join(docs, 'input.settings'), 'utf8'), /AdditionalA=yes/)
    assert.match(await fs.readFile(path.join(docs, 'input.settings'), 'utf8'), /AdditionalB=yes/)
    await fs.mkdir(path.join(gamePath, 'Mods/mod0000_MergedFiles'), { recursive: true })
    let order = await context.getLoadOrder('witcher3-mods')
    assert.equal(order.entries[0].external, true)
    assert.equal(order.entries[0].locked, true)
    await context.setLoadOrder('witcher3-mods', order.revision, [order.entries[0].id, ...order.entries.slice(1).map(entry => entry.id).reverse()])
    assert.equal(await variable('Shared'), 'B')
    const settings = path.join(docs, 'input.settings')
    await write(settings, (await fs.readFile(settings, 'utf8')).replace('Player=original', 'Player=changed-in-game'))
    await context.disableMod('1_1')
    assert.equal(await variable('Shared'), 'B')
    assert.equal(await variable('AddedA'), undefined)
    assert.match(await fs.readFile(settings, 'utf8'), /Player=changed-in-game/)
    assert.doesNotMatch(await fs.readFile(settings, 'utf8'), /AddedA=/)
    assert.doesNotMatch(await fs.readFile(settings, 'utf8'), /AdditionalA=/)
    await context.disableMod('2_2')
    assert.equal(await variable('Shared'), 'base')
    assert.match(await fs.readFile(settings, 'utf8'), /Player=changed-in-game/)
    assert.doesNotMatch(await fs.readFile(settings, 'utf8'), /Added[AB]=/)
    const tools = await context.callAction('getExtensionTools', [])
    assert.equal(tools[0].id, 'witcher3-script-merger')
    assert.equal(tools[0].status.installed, false)
    assert.equal((await fs.stat(path.join(gamePath, 'Mods/mod0000_MergedFiles'))).isDirectory(), true)
    const toolTree = {}
    for (const [file, data] of Object.entries({
      'WitcherScriptMerger.exe': 'fixture, never executed',
      'WitcherScriptMerger.exe.config': '<configuration><appSettings><add key="Custom" value="keep"/></appSettings></configuration>',
      'MergeInventory.xml': '<MergeInventory/>',
    })) toolTree[file] = (await pool.ingestFromStream(Readable.from([data]))).hash
    manifest.registerRawMod('3_3', { modId: 3, fileId: 3, versionId: 1 }, toolTree)
    await context.enableLocalMod('3_3')
    const toolRoot = path.join(gamePath, 'WitcherScriptMerger')
    const config = await fileParseApi.parseXmlToObject(await fs.readFile(path.join(toolRoot, 'WitcherScriptMerger.exe.config'), 'utf8'))
    assert.equal(config.configuration.appSettings[0].add.find(item => item.$.key === 'GameDirectory').$.value, gamePath)
    assert.equal(config.configuration.appSettings[0].add.find(item => item.$.key === 'Custom').$.value, 'keep')
    await write(path.join(toolRoot, 'MergeInventory.xml'), '<MergeInventory><Merge><MergedModName>mod0000_MergedFiles</MergedModName><IncludedMod>modA</IncludedMod><IncludedMod>modB</IncludedMod></Merge></MergeInventory>')
    await mergerTool.afterRun({ gamePath, mods: vfs.createLoadOrderInventory(), exitCode: 0 })
    assert.deepEqual((await context.callAction('getExtensionTools', []))[0].status.outputs[0].sources, ['modA', 'modB'])
    await context.disableMod('3_3')
    assert.equal((await context.callAction('getExtensionTools', []))[0].status.installed, false)
    assert.match(await fs.readFile(path.join(toolRoot, 'MergeInventory.xml'), 'utf8'), /modA/)
    await context.enableLocalMod('3_3')
    assert.equal((await context.callAction('getExtensionTools', []))[0].status.installed, true)
    assert.match(await fs.readFile(path.join(toolRoot, 'MergeInventory.xml'), 'utf8'), /modA/)
    console.log('REAL SDK/WORKER PASS: routing, UTF-16 XML, part files, reorder, losing-layer disable, player edits, vanilla restore, real Merger inventory/config and disable/reinstall state.')
  } finally {
    await sandbox.dispose()
    await manifest.save()
    if (oldDocuments === undefined) delete process.env.WITCHER3_DOCUMENTS_ROOT
    else process.env.WITCHER3_DOCUMENTS_ROOT = oldDocuments
  }
}
