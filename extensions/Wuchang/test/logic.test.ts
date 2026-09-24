import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import main from '../src/index'
import { GAME_ID, GAME_FOLDER, PAK_PATH, typeId, UE4SS_REQUIREMENT_MOD_ID } from '../src/constants'
import { getExtensionRequiredMods } from '../src/environment'
import { GROUPS, installGroup, testGroup } from '../src/installers'
import { deserialize, plan, prefix } from '../src/loadOrder'

function mock(files: string[] = [], response: any = { confirmed: true, payload: { choiceIds: ['pak-0', 'pak-1'] } }) {
  const fileSet = new Set(files.map(f => f.toLowerCase()))
  const installers: any[] = [], modTypes: any[] = [], actions: Record<string, any> = {}, loadOrders: any[] = []
  let game: any
  const context: any = {
    registerGame: (g: any) => { game = g }, registerModType: (...args: any[]) => modTypes.push(args),
    registerInstaller: (...args: any[]) => installers.push(args), registerLoadOrder: (g: any) => loadOrders.push(g),
    registerExtensionAction: (_: any, key: string, fn: any) => { actions[key] = fn },
    api: { util: {
      path: path.posix, sanitizeFilename: (name: string, fallback: string) => name || fallback,
      GameStoreHelper: { findByAppId: async () => ({ gamePath: 'G:/Wuchang' }) },
      fs: { stat: async (p: string) => { if (!fileSet.has(p.toLowerCase())) throw new Error('ENOENT'); return { isFile: true } } },
      ui: { request: async () => response },
    } },
  }
  return { context, installers, modTypes, actions, loadOrders, game: () => game }
}
const ue4ss = ['Wrap/dwmapi.dll', 'Wrap/ue4ss/UE4SS.dll', 'Wrap/ue4ss/Mods/Sample/', 'Wrap/ue4ss/Mods/Sample/Scripts/', 'Wrap/ue4ss/Mods/Sample/Scripts/main.lua']
const enabler = ['Wrap/dsound.dll', 'Wrap/scripts/sig.lua']
const destinations = (r: any) => r.instructions.filter((i: any) => i.destination).map((i: any) => i.destination)

test('registered installer and mod-type priorities choose UE4SS, then Mod Enabler', async () => {
  const m = mock(); await main(m.context)
  assert.deepEqual(m.installers.filter(i => i[0] !== typeId('fomod')).map(i => i[1]), [1, 2, 3, 25, 27, 29, 33, 35, 37, 39, 45])
  const mixed = [...ue4ss, ...enabler, 'a.pak']
  const select = async (rows: string[]) => {
    for (const i of [...m.installers].sort((a, b) => a[1] - b[1])) if ((await i[2](rows, GAME_ID)).supported) return i[0]
  }
  assert.equal(await select(mixed), typeId('ue4ss'))
  assert.equal(await select([...enabler, 'a.pak']), typeId('mod-enabler'))
  const type = [...m.modTypes].sort((a, b) => b[1] - a[1]).find(t => t[4]({ files: mixed }))
  assert.equal(type[0], typeId('ue4ss'))
  assert.equal(m.installers.some(i => /-(config|save)$/.test(i[0])), false)
})
test('file-only UE4SS Mods packages preserve whole mod folders without archive wrappers', async () => {
  const files = ['WuchangMinimap-1.4.0/README.md', ...[
    'WuchangMinimap/config_wuchang_minimap.txt', 'WuchangMinimap/dlls/main.dll',
    'WuchangMinimap/enabled.txt', 'WuchangMinimap/maps/a.bin', 'WuchangMinimap/markers/a.json',
    'Second/Scripts/main.lua', 'Second/data.pak', 'mods.txt',
  ].map(p => `WuchangMinimap-1.4.0/ue4ss/Mods/${p}`)]
  for (const layout of ['Win64', 'WinGDK'] as const) {
    const input = layout === 'Win64' ? files : files.map(p => p.replaceAll('/', '\\').replace('ue4ss', 'UE4SS'))
    const m = mock(); await main(m.context)
    const matches = []
    for (const installer of m.installers) if ((await installer[2](input, GAME_ID)).supported) matches.push(installer)
    assert.equal(matches.sort((a, b) => a[1] - b[1])[0][0], typeId('ue4ss-mods'))
    const result = await installGroup(m.context, 'ue4ss-mods', input, layout)
    assert.deepEqual(destinations(result), files.slice(1).map(p => `${GAME_FOLDER}/Binaries/${layout}/ue4ss/Mods/${p.split('/Mods/')[1]}`))
    assert.deepEqual(result.instructions.map(i => i.source), input.slice(1))
    assert(result.instructions.every(i => i.type === 'copy'))
    const modType = [...m.modTypes].sort((a, b) => b[1] - a[1]).find(t => t[4]({ files: input }))
    assert.equal(modType[0], typeId('ue4ss-mods'))
  }
  assert.equal(testGroup('ue4ss-mods', [...files, 'Content/Paks/LogicMods/a.pak'], GAME_ID).supported, false)
  for (const file of ['ue4ss/Mods/mods.txt', 'ue4ss/ModsExtra/A/main.dll', 'Other/Mods/A/main.dll']) {
    assert.equal(testGroup('ue4ss-mods', [file], GAME_ID).supported, false)
  }
  await assert.rejects(installGroup(mock().context, 'ue4ss-mods', [
    'A/ue4ss/Mods/Cool/main.dll', 'B/ue4ss/Mods/cool/main.dll',
  ], 'Win64'), /Multiple files target/)
})
test('UE4SS installation preserves wrapped runtime; mutable config policies are narrow', async () => {
  const m = mock()
  const r = await installGroup(m.context, 'ue4ss', [...ue4ss, 'Wrap/ue4ss/UE4SS-settings.ini', 'Wrap/ue4ss/Mods/mods.txt', 'Outside.txt'], 'Win64')
  assert(destinations(r).includes(`${GAME_FOLDER}/Binaries/Win64/ue4ss/UE4SS.dll`))
  assert(!destinations(r).some(p => p.endsWith('Outside.txt')))
  assert.equal(r.instructions.find(i => i.destination?.endsWith('UE4SS-settings.ini'))?.verification, 'exists')
  assert.equal(r.instructions.find(i => i.destination?.endsWith('UE4SS.dll'))?.verification, undefined)
  assert.equal(testGroup('ue4ss', ['dwmapi.dll'], GAME_ID).supported, false)
  assert.equal(testGroup('ue4ss', ['dwmapi.dll', 'Other/ue4ss/UE4SS.dll'], GAME_ID).supported, false)
})
test('Mod Enabler copies its subtree to the shipping executable directory', async () => {
  assert.deepEqual(destinations(await installGroup(mock().context, 'mod-enabler', enabler, 'WinGDK')), [
    `${GAME_FOLDER}/Binaries/WinGDK/dsound.dll`, `${GAME_FOLDER}/Binaries/WinGDK/scripts/sig.lua`,
  ])
  assert.equal(testGroup('mod-enabler', ['a/dsound.dll', 'b/sig.lua'], GAME_ID).supported, false)
})
test('combo, root, content preserve intended hierarchy and discard wrappers', async () => {
  const m = mock()
  const combo = ['Wrap/Project_Plague/', 'Wrap/Project_Plague/Content/Paks/LogicMods/a.pak', 'Wrap/Project_Plague/Binaries/Win64/ue4ss/Mods/A/Scripts/main.lua', 'Wrap/readme.txt']
  assert.equal(testGroup('combo', combo, GAME_ID).supported, true)
  assert.deepEqual(destinations(await installGroup(m.context, 'combo', combo, 'Win64')), combo.slice(1, 3).map(p => p.slice(5)))
  assert.deepEqual(destinations(await installGroup(m.context, 'root', ['Pack/Project_Plague/', 'Pack/Project_Plague/foo.dll'], 'Win64')), ['Project_Plague/foo.dll'])
  assert.deepEqual(destinations(await installGroup(m.context, 'content', ['Pack/content/', 'Pack/content/Movies/a.bk2'], 'Win64')), ['Project_Plague/Content/Movies/a.bk2'])
})
test('LogicMods requires explicit directory and preserves all nested assets', async () => {
  const files = ['Wrap/LogicMods/', 'Wrap/LogicMods/Inner/a.pak', 'Wrap/LogicMods/Inner/a.json', 'Other.pak']
  assert.equal(testGroup('logic', files.slice(1), GAME_ID).supported, false)
  assert.deepEqual(destinations(await installGroup(mock().context, 'logic', files, 'Win64')), ['Project_Plague/Content/Paks/LogicMods/Inner/a.pak', 'Project_Plague/Content/Paks/LogicMods/Inner/a.json'])
})
test('Script and DLL mods keep siblings and generate one enabled.txt at mod root', async () => {
  for (const [kind, marker, file] of [['script', 'Scripts', 'main.lua'], ['dll', 'dlls', 'main.dll']] as const) {
    const files = [`Wrap/Cool/${marker}/`, `Wrap/Cool/${marker}/${file}`, 'Wrap/Cool/config.json']
    const r = await installGroup(mock().context, kind, files, 'Win64')
    const root = 'Project_Plague/Binaries/Win64/ue4ss/Mods/Cool'
    assert.deepEqual(destinations(r), [`${root}/${marker}/${file}`, `${root}/config.json`, `${root}/enabled.txt`])
    const existing = await installGroup(mock().context, kind, [...files, 'Wrap/Cool/enabled.txt'], 'Win64')
    assert.equal(existing.instructions.filter(i => i.type === 'generatefile').length, 0)
  }
  const r = await installGroup(mock().context, 'script', ['Scripts/', 'Scripts/main.lua'], 'WinGDK', 'T:/Cool.zip.installing')
  assert(destinations(r).includes('Project_Plague/Binaries/WinGDK/ue4ss/Mods/Cool/Scripts/main.lua'))
  assert.equal(testGroup('script', ['Scripts/', 'Elsewhere/a.lua'], GAME_ID).supported, false)
})
test('Pak selection only installs selected .pak files, cancels cleanly, rejects duplicate destinations', async () => {
  const m = mock([], { confirmed: true, payload: { choices: [{ id: 'pak-1' }] } })
  const r = await installGroup(m.context, 'pak', ['A/a.pak', 'B/b.pak', 'B/b.ucas', 'B/b.utoc', 'B/b.sig'], 'Win64')
  assert.deepEqual(destinations(r), [`${PAK_PATH}/b.pak`])
  assert.deepEqual(r.instructions.find(i => i.type === 'attribute')?.value, ['b.pak'])
  await assert.rejects(installGroup(mock([], { confirmed: false }).context, 'pak', ['a.pak', 'b.pak'], 'Win64'), /cancelled/)
  await assert.rejects(installGroup(mock().context, 'pak', ['A/a.pak', 'B/A.pak'], 'Win64'), /Multiple files target/)
})
test('FOMOD packages are excluded from every generic tester', () => {
  for (const group of GROUPS) assert.equal(testGroup(group.kind, [...ue4ss, ...enabler, 'a.pak', 'fomod/ModuleConfig.xml'], GAME_ID).supported, false)
  assert.equal(testGroup('pak', ['a.pak'], '123').supported, false)
})
test('Binaries preserves archive paths and does not swallow unsupported config/save files', async () => {
  assert.deepEqual(destinations(await installGroup(mock().context, 'binaries', ['Wrap/', 'Wrap/dxgi.dll'], 'Win64')), ['Project_Plague/Binaries/Win64/Wrap/dxgi.dll'])
  for (const file of ['Engine.ini', 'save.sav', 'a.pak']) assert.equal(testGroup('binaries', [file], GAME_ID).supported, false)
})
test('shared FOMOD installer produces selected files under ~mods and retains stored selections', async () => {
  const m = mock()
  m.context.api.util.fs.readFileAsync = async () => '<config><moduleName>Test</moduleName></config>'
  m.context.api.util.fileParseApi = { parseXmlToObject: async () => ({ config: {
    moduleName: ['Test'], requiredInstallFiles: [{ file: [{ $: { source: 'Options/a.pak', destination: 'Chosen/a.pak' } }] }],
  } }) }
  m.context.api.util.fomod = { resolveFileDependencies: async () => ({ states: {} }), closeSession: async () => {} }
  await main(m.context)
  const f = m.installers.find(i => i[0] === typeId('fomod'))
  assert.equal((await f[2](['fomod/ModuleConfig.xml', 'Options/a.pak'], GAME_ID)).supported, true)
  const result = await f[3](['fomod/ModuleConfig.xml', 'Options/a.pak'], 'T:/staging')
  assert.deepEqual(destinations(result), [`${PAK_PATH}/Chosen/a.pak`])
  assert(result.instructions.some((i: any) => i.key === 'fomod' && i.value.configHash))
})
test('load order propagates deployment rejection and skips missing files', async () => {
  const m = mock(); await main(m.context)
  m.context.api.vfs = { runManagedDeploymentMutation: async () => ({ ok: false, warnings: [{ message: 'Hash changed' }] }) }
  await assert.rejects(m.loadOrders[0].serializeLoadOrder([]), /Hash changed/)
  const warnings: any[] = []
  plan({ entries: [{ modKey: 'a', targetPath: `${PAK_PATH}/a.pak`, exists: false }],
    warn: (v: any) => warnings.push(v), moveDeployment: () => assert.fail('must not move missing file'),
  } as any, [{ ownerModKey: 'a' }] as any)
  assert.equal(warnings.length, 1)
})
test('bare Pak accepts dot prefixes and root directory entries while retaining original source', async () => {
  for (const file of ['a.pak', './a.pak', '.\\a.pak']) {
    const files = ['.', './', '.\\', file]
    assert.equal(testGroup('pak', files, GAME_ID).supported, true)
    const result = await installGroup(mock().context, 'pak', files, 'Win64')
    assert.deepEqual(result.instructions.filter(i => i.type === 'copy'), [
      { type: 'copy', source: file, destination: `${PAK_PATH}/a.pak` },
    ])
  }
})
test('ambiguous anchors and sibling-prefix matches are rejected', async () => {
  await assert.rejects(installGroup(mock().context, 'ue4ss', [...ue4ss, 'Other/dwmapi.dll'], 'Win64'), /Ambiguous/)
  const r = await installGroup(mock().context, 'ue4ss', [...ue4ss, 'WrapExtra/extra.dll'], 'Win64')
  assert(!destinations(r).some(p => p.endsWith('extra.dll')))
})
test('evaluating every tester on a UE4SS bundle containing multiple sample mods is safe', async () => {
  const m = mock(); await main(m.context)
  const files = [...ue4ss, 'Wrap/ue4ss/Mods/Second/Scripts/', 'Wrap/ue4ss/Mods/Second/Scripts/main.lua']
  const matches = []
  for (const installer of m.installers) if ((await installer[2](files, GAME_ID)).supported) matches.push(installer)
  matches.sort((a, b) => a[1] - b[1])
  assert.equal(matches[0][0], typeId('ue4ss'))
  const r = await matches[0][3](files)
  assert(destinations(r).includes('Project_Plague/Binaries/Win64/ue4ss/Mods/Second/Scripts/main.lua'))
})
test('required environment checks actual files, exposes mod ID, and shares setup/action', async () => {
  const missing = await getExtensionRequiredMods(mock().context)
  assert.equal(missing.code, 'EXTENSION_REQUIRED_MODS_MISSING')
  assert.equal(missing.requirements[0].mod_id, UE4SS_REQUIREMENT_MOD_ID)
  assert.deepEqual(missing.requirement?.requirements, missing.requirements)
  for (const layout of ['Win64', 'WinGDK']) {
    const files = ['G:/Wuchang/Project_Plague/Binaries/' + layout + '/dwmapi.dll', 'G:/Wuchang/Project_Plague/Binaries/' + layout + '/ue4ss/UE4SS.dll']
    if (layout === 'WinGDK') files.push('G:/Wuchang/gamelaunchhelper.exe')
    const m = mock(files); await main(m.context)
    assert.equal((await m.game().setup({ path: 'G:/Wuchang' })).installed, true)
    assert.equal((await m.actions.getExtensionRequiredMods()).installed, true)
    const r = await m.installers.find(i => i[0] === typeId('ue4ss'))[3](ue4ss)
    assert(destinations(r).includes(`Project_Plague/Binaries/${layout}/ue4ss/UE4SS.dll`))
  }
  assert.equal((await getExtensionRequiredMods(mock(['G:/Wuchang/Project_Plague/Binaries/Win64/dwmapi.dll']).context)).installed, false)
})
test('Pak order keeps disabled entries, uses VFS moves and is idempotent', () => {
  const order = deserialize({ savedOrder: ['b', 'a'], mods: [
    { modKey: 'a', modType: typeId('pak'), enabled: true }, { modKey: 'b', modType: typeId('pak'), enabled: false },
    { modKey: 'c', modType: typeId('fomod'), enabled: true },
  ] } as any)
  assert.deepEqual(order.map(e => e.id), ['b', 'a'])
  const moves: any[] = []
  const mutation: any = { entries: [{ modKey: 'a', targetPath: `${PAK_PATH}/a.pak`, expectedHash: 'hash' }], moveDeployment: (m: any) => moves.push(m) }
  plan(mutation, order)
  assert.equal(moves[0].to, `${PAK_PATH}/AAB-61/a.pak`)
  assert.equal(moves[0].expectedHash, 'hash')
  mutation.entries[0].targetPath = moves[0].to
  plan(mutation, order); assert.equal(moves.length, 1)
  assert.equal(prefix(26), 'ABA'); assert.throws(() => prefix(26 ** 3))
})
