import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { deserializeWitcherLoadOrder, resolveModsSettingsPath, serializeWitcherLoadOrder, registerWitcherLoadOrder } from '../src/loadOrder'
import { mergeMenuXml, mergeMenuSettings, registerMenuMergers } from '../src/menuMerge'
import { readMergeInventory } from '../src/mergeInventory'
import { createScriptMergerSupport } from '../src/scriptMerger'
import { scriptStyle } from '../src/scriptStyle'
import { isRemastered, gameWarnings } from '../src/edition'
import { iniKey, iniValues, patchIni } from '../src/ini'
import { SCRIPT_MERGER_DIRECTORY } from '../src/constants'

// Format algorithms use the parser port; real XML codec + VFS are exercised separately
// against the SDK. Keeping this suite dependency-free avoids a second XML implementation.
export async function testParity() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'witcher3-parity-'))
  const oldRoot = process.env.WITCHER3_DOCUMENTS_ROOT
  process.env.WITCHER3_DOCUMENTS_ROOT = path.join(root, 'documents')
  const gamePath = path.join(root, 'game')
  const write = async (file: string, data: string | Buffer) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); return file }
  const parser = { parseXmlToObject: async (text: string) => JSON.parse(text), buildXmlFromObject: async (value: any) => JSON.stringify(value) }
  let tool: any, provider: any
  const hooks: Array<{ phase: string; callback: (input: any) => Promise<void> }> = []
  const api: any = {
    api: { util: { path, fs: { stat: async (file: string) => ({ isFile: (await fs.stat(file)).isFile() }) }, fileParseApi: parser, ui: { request: async () => ({ confirmed: true }) } }, loadOrder: { deploy: async () => {} } },
    registerFileMerge: () => {}, registerModTool: (value: any) => { tool = value },
    registerManagedDeploymentHook: (phase: string, _filter: any, callback: any) => hooks.push({ phase, callback }),
    registerPostInstallerAttributeExtractor: () => {}, registerLoadOrder: (value: any) => { provider = value }, registerExtensionAction: () => {},
  }
  try {
    const settings = await resolveModsSettingsPath()
    assert.ok(settings.startsWith(process.env.WITCHER3_DOCUMENTS_ROOT!), 'explicit empty Documents override must never fall through to the user directory')
    await write(settings, '; player comment\n[modManual]\nEnabled=0\nPriority=9\nCustom=keep\n[modGone]\nEnabled=1\n')
    for (const name of ['modManual', 'mod0000_MergedFiles', 'modManaged']) await fs.mkdir(path.join(gamePath, 'Mods', name), { recursive: true })
    const mods = [{ modKey: 'one', modType: '292030-mods', enabled: true, metaInfo: { witcher3ModNames: ['modManaged'] } }]
    const orderContext: any = { gamePath, mods, savedOrder: [], deploymentStatus: 'clean' }
    const order = await deserializeWitcherLoadOrder(orderContext)
    assert.equal(order[0].id, 'external:mod0000_mergedfiles')
    assert.equal(order[0].external, true)
    assert.equal(order[0].locked, true)
    assert.equal(order.find(item => item.id === 'external:modmanual')?.enabled, false)
    assert.ok(!order.some(item => item.id === 'external:modgone'))
    await serializeWitcherLoadOrder(order)
    const saved = await fs.readFile(settings, 'utf8')
    assert.match(saved, /; player comment/); assert.match(saved, /Custom=keep/)
    const changedOutside = saved.replace(/\[modManual\][\s\S]*?Priority=\d+/, match => match.replace(/Priority=\d+/, 'Priority=0'))
    await write(settings, changedOutside)
    const fresh = await deserializeWitcherLoadOrder({ ...orderContext, savedOrder: order.map(item => item.id) })
    assert.equal(fresh[1].id, 'external:modmanual')

    const base = await write(path.join(root, 'base.ini'), '; preserve\n[General]\nUser=original\nModValue=base\n[ContentManager/Mods]\nEnabledLocal=false\n')
    const a = await write(path.join(root, 'a.part.txt'), '[General]\nModValue=A\nAddedA=1\n[ContentManager/Mods]\nEnabledLocal=true\n')
    const b = await write(path.join(root, 'b.part.txt'), '[General]\nAddedB=1\n')
    const live = await write(path.join(root, 'live.ini'), await fs.readFile(base))
    const files = [{ modKey: 'a', path: a, metaInfo: {} }, { modKey: 'b', path: b, metaInfo: {} }]
    const mergeContext: any = { gamePath, targetPath: live, liveFile: live, baseFile: base, files, reason: 'enable' }
    await assert.rejects(() => mergeMenuSettings({ ...mergeContext, baseFile: undefined }), /先运行一次游戏/)
    assert.equal(iniValues(patchIni('[A]\nK=old\nK=old2', [{ section: 'A', key: 'K', value: 'new' }])).get(iniKey('A', 'K'))?.value, 'new')
    const first = await mergeMenuSettings(mergeContext)
    assert.equal(iniValues(first.data).get(iniKey('ContentManager/Mods', 'EnabledLocal'))?.value, 'false')
    const previous = await write(path.join(root, 'previous.ini'), first.data)
    await write(live, first.data.replace('User=original', 'User=player'))
    const removed = await mergeMenuSettings({ ...mergeContext, files: [files[1]], previousFile: previous, state: first.state, reason: 'disable' })
    assert.match(removed.data, /User=player/); assert.match(removed.data, /ModValue=base/)
    assert.doesNotMatch(removed.data, /AddedA=/); assert.match(removed.data, /AddedB=1/)
    assert.match(removed.baseData!, /User=player/)
    const empty = await mergeMenuSettings({ ...mergeContext, files: [], previousFile: previous, state: first.state, reason: 'disable' })
    assert.doesNotMatch(empty.data, /Added[AB]=/)

    const variable = (id: string, value: string) => ({ $: { id, value }, KeptChild: ['native'] })
    const xmlBase = await write(path.join(root, 'base.xml'), JSON.stringify({ UserConfig: { Group: [{ $: { id: 'Controls' }, VisibleVars: [{ Var: [variable('Shared', 'base'), variable('Native', 'native')] }] }] } }))
    const xmlMod = await write(path.join(root, 'mod.xml'), JSON.stringify({ UserConfig: { Group: [{ $: { id: 'Controls' }, VisibleVars: [{ Var: [{ $: { id: 'Shared', value: 'mod' } }, variable('Added', 'added')] }] }, { $: { id: 'NewGroup' }, VisibleVars: [{ Var: [] }] }] } }))
    const xmlContext: any = { gamePath, targetPath: 'input.xml', liveFile: xmlBase, baseFile: xmlBase, files: [{ modKey: 'xml', path: xmlMod, metaInfo: {} }], reason: 'enable' }
    const xml = JSON.parse((await mergeMenuXml(xmlContext, api)).data)
    assert.equal(xml.UserConfig.Group.length, 2)
    assert.equal(xml.UserConfig.Group[0].VisibleVars[0].Var.length, 3)
    assert.deepEqual(xml.UserConfig.Group[0].VisibleVars[0].Var[0].KeptChild, ['native'])
    api.api.util.ui.request = async () => ({ confirmed: false })
    await assert.rejects(() => mergeMenuXml({ ...xmlContext, baseFile: undefined }, api), /缺少原始/)

    const ws = await write(path.join(root, 'annotation.ws'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('@wrapMethod(CActor)\nfunction run() {}', 'utf16le')]))
    assert.equal(await scriptStyle(['annotation.ws'], root, {}), 'annotation')
    await write(ws, 'function ordinaryOverride() {}')
    assert.equal(await scriptStyle(['annotation.ws'], root, {}), 'override')
    assert.equal(await scriptStyle(['texture.bundle'], root, {}), 'none')

    const toolRoot = path.join(gamePath, SCRIPT_MERGER_DIRECTORY)
    await write(path.join(toolRoot, 'MergeInventory.xml'), JSON.stringify({ MergeInventory: '' }))
    assert.deepEqual(await readMergeInventory(api, gamePath), [])
    await write(path.join(toolRoot, 'WitcherScriptMerger.exe'), 'fixture, never executed')
    const support = createScriptMergerSupport(api, async () => gamePath, '123')
    support.registerTool(api)
    await tool.beforeRun({ gamePath, mods: [] })
    const config = JSON.parse(await fs.readFile(path.join(toolRoot, 'WitcherScriptMerger.exe.config'), 'utf8'))
    assert.equal(config.configuration.appSettings[0].add.find((item: any) => item.$.key === 'VanillaScriptsDirectory').$.value, path.join(gamePath, 'content/content0/scripts'))
    await write(path.join(toolRoot, 'MergeInventory.xml'), JSON.stringify({ MergeInventory: { Merge: [{ MergedModName: ['modCustomMerge'], IncludedMod: [{ _: 'modManaged' }, 'modManual'] }] } }))
    await fs.mkdir(path.join(gamePath, 'Mods/modCustomMerge'), { recursive: true })
    assert.deepEqual(await readMergeInventory(api, gamePath), [{ name: 'modCustomMerge', sources: ['modManaged', 'modManual'], missing: false }])
    registerWitcherLoadOrder(api, { mergedOutputs: input => readMergeInventory(api, input) })
    const withInventory = await provider.deserializeLoadOrder(orderContext)
    assert.equal(withInventory.find((item: any) => item.id === 'external:modcustommerge').locked, true)
    await tool.afterRun({ gamePath, mods, exitCode: 0 })
    assert.equal((await tool.status({ gamePath, mods })).needsMerge, false)
    assert.equal((await tool.status({ gamePath, mods: [{ ...mods[0], versionId: 2 }] })).needsMerge, true)
    for (const hook of hooks.filter(item => item.phase === 'beforeDisable')) await hook.callback({ gamePath })
    await fs.rm(path.join(toolRoot, 'MergeInventory.xml'))
    for (const hook of hooks.filter(item => item.phase === 'afterDisable')) await hook.callback({ gamePath })
    assert.equal((await readMergeInventory(api, gamePath))[0].missing, false)
    await fs.rm(path.join(gamePath, 'Mods/modCustomMerge'), { recursive: true })
    assert.equal((await tool.status({ gamePath, mods })).outputs[0].missing, true)

    assert.equal(isRemastered(gamePath), false)
    await write(path.join(gamePath, 'bin/x64_DX12/witcher3.exe'), 'fixture')
    await write(path.join(path.dirname(settings), 'dx12user.settings'), '[ContentManager/Mods]\nEnabledLocal=false\n')
    assert.equal(isRemastered(gamePath), true)
    assert.equal((await gameWarnings(gamePath, ['m'.repeat(64)])).length, 2)
    const registrations: any[] = []
    registerMenuMergers({ ...api, registerFileMerge: (registration: any) => registrations.push(registration) })
    assert.equal(registrations[0].test('bin/config/r4game/user_config_matrix/pc/graphicsdx11.xml', gamePath), false)
    console.log('Witcher 3 parity: external order, player settings, XML model, inventory, tool state, edition fixtures passed.')
  } finally {
    if (oldRoot === undefined) delete process.env.WITCHER3_DOCUMENTS_ROOT
    else process.env.WITCHER3_DOCUMENTS_ROOT = oldRoot
    await fs.rm(root, { recursive: true, force: true })
  }
}
