import assert from 'node:assert/strict'
import main, { GAME_ID, __testing } from '../index'
import path from 'node:path'
import { createScriptMergerSupport, needsScriptMerger } from '../src/scriptMerger'
import { testParity } from './parity.test'
import {
  deserializeWitcherLoadOrder,
  validateWitcherLoadOrder,
  serializeWitcherLoadOrder,
} from '../src/loadOrder'

const {
  testScriptMerger,
  testMixed,
  testDlc,
  testMenu,
  testContent,
  testMods,
  testRoot,
  installMixed,
  installDlc,
  installMenu,
  installContent,
  installMods,
  installRoot,
  installScriptMerger,
} = __testing

function supported(test: any, files: string[]) {
  return (test(files, GAME_ID) as { supported: boolean }).supported
}

assert.equal(supported(testMixed, ['pack/Mods/modFoo/content/scripts/foo.ws', 'pack/DLC/dlcFoo/content/metadata.store']), true)
assert.equal(supported(testMixed, ['pack/modFoo/content/scripts/foo.ws', 'pack/dlcFoo/content/metadata.store']), true)
assert.equal(supported(testScriptMerger, ['WitcherScriptMerger.exe']), true)
assert.equal(supported(testDlc, ['DLC/dlcFoo/content/metadata.store']), true)
assert.equal(supported(testMenu, ['pack/bin/config/r4game/user_config_matrix/pc/input.xml']), true)
assert.equal(supported(testMenu, ['modFoo/content/scripts/foo.xml.part.txt']), true)
assert.equal(supported(testContent, ['content/scripts/foo.ws']), true)
assert.equal(supported(testContent, ['pack/modFoo/content/scripts/foo.ws']), true)
assert.equal(supported(testMods, ['pack/Mods/modFoo/content/scripts/foo.ws']), true)
assert.equal(supported(testMods, ['pack/bin/config/r4game/user_config_matrix/pc/input.xml', 'pack/Mods/modFoo/content/scripts/foo.ws']), true)
assert.equal(supported(testRoot, ['bin/x64/witcher3.exe']), true)
assert.equal(supported(testMods, ['../escape.dll']), false)
assert.equal(supported(testMods, ['C:/escape.dll']), false)
assert.throws(() => installMods(__testing.entries(['Mods/modFoo/content/scripts/foo.ws', 'mods/modfoo/content/scripts/foo.ws'])), /Conflicting/)

assert.deepEqual(installMixed(__testing.entries(['pack/Mods/modFoo/content/scripts/foo.ws', 'pack/DLC/dlcFoo/content/metadata.store'])).instructions.map(i => i.destination), [
  'Mods/modFoo/content/scripts/foo.ws',
  'DLC/dlcFoo/content/metadata.store',
])
assert.deepEqual(installMixed(__testing.entries(['pack/modFoo/content/scripts/foo.ws', 'pack/dlcFoo/content/metadata.store'])).instructions.map(i => i.destination), [
  'Mods/modFoo/content/scripts/foo.ws',
  'DLC/dlcFoo/content/metadata.store',
])
assert.deepEqual(installDlc(__testing.entries(['pack/DLC/dlcFoo/content/metadata.store'])).instructions.map(i => i.destination), ['DLC/dlcFoo/content/metadata.store'])
assert.deepEqual(installMenu(__testing.entries(['pack/bin/config/r4game/user_config_matrix/pc/input.xml'])).instructions.map(i => i.destination), ['bin/config/r4game/user_config_matrix/pc/input.xml'])
assert.deepEqual(installMenu(__testing.entries(['pack/bin/config/r4game/user_config_matrix/pc/input.xml', 'pack/Mods/modFoo/content/scripts/foo.ws'])).instructions.map(i => i.destination), [
  'bin/config/r4game/user_config_matrix/pc/input.xml',
  'Mods/modFoo/content/scripts/foo.ws',
])
assert.deepEqual(installMenu(__testing.entries([
  'pack/bin/config/r4game/user_config_matrix/pc/input.xml',
  'pack/bin/config/r4game/user_config_matrix/pc/backup/input.xml',
])).instructions.map(i => i.destination), ['bin/config/r4game/user_config_matrix/pc/input.xml'])
assert.deepEqual(installContent(__testing.entries(['content/scripts/foo.ws'])).instructions.map(i => i.destination), ['Mods/mod/content/scripts/foo.ws'])
assert.deepEqual(installContent(__testing.entries(['pack/modFoo/content/scripts/foo.ws'])).instructions.map(i => i.destination), ['Mods/modFoo/content/scripts/foo.ws'])
assert.deepEqual(installMods(__testing.entries(['pack/Mods/modFoo/content/scripts/foo.ws'])).instructions.map(i => i.destination), ['Mods/modFoo/content/scripts/foo.ws'])
assert.deepEqual(installMods(__testing.entries(['pack/bin/dlc.ini', 'pack/Mods/modFoo/content/scripts/foo.ws'])).instructions.map(i => i.destination), ['bin/dlc.ini', 'Mods/modFoo/content/scripts/foo.ws'])
assert.deepEqual(installRoot(__testing.entries(['bin/x64/witcher3.exe'])).instructions.map(i => i.destination), ['bin/x64/witcher3.exe'])
assert.deepEqual(installScriptMerger(__testing.entries([
  'pack/WitcherScriptMerger.exe',
  'pack/WitcherScriptMerger.exe.config',
  'pack/KDiff3/kdiff3.exe',
  'outside/readme.txt',
])).instructions, [
  { type: 'copy', source: 'pack/WitcherScriptMerger.exe', destination: 'WitcherScriptMerger/WitcherScriptMerger.exe' },
  { type: 'copy', source: 'pack/WitcherScriptMerger.exe.config', destination: 'WitcherScriptMerger/WitcherScriptMerger.exe.config', verification: 'exists' },
  { type: 'copy', source: 'pack/KDiff3/kdiff3.exe', destination: 'WitcherScriptMerger/KDiff3/kdiff3.exe' },
])
assert.equal(installScriptMerger(__testing.entries(['WitcherScriptMerger.exe'])).modType, '292030-script-merger')
assert.throws(() => installScriptMerger(__testing.entries(['one/WitcherScriptMerger.exe', 'two/WitcherScriptMerger.exe'])), /exactly one/)
assert.throws(() => installScriptMerger(__testing.entries(['tool.txt'])), /exactly one/)

let game: any
let types: any[] = []
let installers: any[] = []
let postInstallerExtractor: any
const actions: Record<string, (...args: any[]) => any> = {}
const context: any = {
  api: { util: {
    GameStoreHelper: { findByAppId: async () => ({ gamePath: 'C:/Witcher 3' }) },
    path,
    fs: { stat: async () => ({ isFile: false }) },
  } },
  registerGame: (value: any) => { game = value },
  registerModType: (...args: any[]) => types.push(args),
  registerInstaller: (...args: any[]) => installers.push(args),
  registerPostInstallerAttributeExtractor: (_priority: number, extractor: any) => { postInstallerExtractor = extractor },
  registerLoadOrder: (value: any) => { context.loadOrder = value },
  registerFileMerge: () => {},
  registerModTool: () => {},
  registerManagedDeploymentHook: () => {},
  registerExtensionAction: (_gameId: number, action: string, handler: any) => { actions[action] = handler },
}
assert.equal(main(context), true)
assert.equal(game.id, GAME_ID)
assert.equal(types.length, 7)
assert.equal(installers.length, 7)
assert.equal(types[0][3]({}), '{gamePath}')
assert.equal(context.loadOrder.id, 'witcher3-mods')
assert.deepEqual(postInstallerExtractor({
  modTypeId: `${GAME_ID}-mods`,
  instructions: [
    { type: 'copy', source: 'archive/content/scripts/a.ws', destination: 'Mods/modFromHook/content/scripts/a.ws' },
    { type: 'copy', source: 'archive/readme.txt', destination: 'README.txt' },
  ],
}), { witcher3ModNames: ['modFromHook'] })
assert.deepEqual(postInstallerExtractor({
  gamePath: 'E:/SteamLibrary/steamapps/common/The Witcher 3',
  modTypeId: `${GAME_ID}-content`,
  instructions: [
    { type: 'copy', destination: 'E:\\SteamLibrary\\steamapps\\common\\The Witcher 3\\Mods\\modEnvironmenBlendFix\\content\\scripts\\local\\modPhotoWeatherFix.ws' },
    { type: 'copy', destination: 'E:/SteamLibrary/steamapps/common/Other Game/Mods/modOutside/content/a.ws' },
    { type: 'copy', destination: 'D:/Other Game/Mods/modOtherDrive/content/a.ws' },
    { type: 'copy', destination: 'Mods/../modTraversal/content/a.ws' },
  ],
}), { witcher3ModNames: ['modEnvironmenBlendFix'] })
assert.deepEqual(postInstallerExtractor({
  gamePath: '/games/witcher3',
  modTypeId: `${GAME_ID}-mods`,
  instructions: [{ type: 'copy', destination: '/games/witcher3/Mods/modUnix/content/a.ws' }],
}), { witcher3ModNames: ['modUnix'] })
const scriptMergerInstaller = installers.find(([id]: any[]) => id === '292030-script-merger')
assert.equal(typeof scriptMergerInstaller?.[3], 'function')
assert.equal(scriptMergerInstaller[3](['WitcherScriptMerger.exe']).modType, '292030-script-merger')

async function run() {
  // Match the SDK's installer contract (lower numeric priority first), rather than
  // calling individual install functions and bypassing selection like earlier tests.
  const routingCases = [
    { files: ['Mods/modWhereToSell/content/scripts/local/whereToSell.ws', 'bin/config/r4game/user_config_matrix/pc/modWhereToSell.xml'], type: 'menu', destination: 'bin/config/r4game/user_config_matrix/pc/modWhereToSell.xml' },
    { files: ['mods/modZZUIRE_UireIcons/README-安装说明.txt', 'mods/modZZUIRE_UireIcons/content/scripts/local/ZZUireIcons/zz_uire_icons.ws'], type: 'mods', destination: 'mods/modZZUIRE_UireIcons/README-安装说明.txt' },
    { files: ['mods/modcoloured_map_marker/content/blob0.bundle'], type: 'mods', destination: 'mods/modcoloured_map_marker/content/blob0.bundle' },
    { files: ['modEnvironmenBlendFix/content/scripts/local/modPhotoWeatherFix.ws'], type: 'content', destination: 'Mods/modEnvironmenBlendFix/content/scripts/local/modPhotoWeatherFix.ws' },
    { files: ['Mods/modCounterDmg/content/scripts/game/gameplay/damage/damageManagerProcessor.ws'], type: 'mods', destination: 'Mods/modCounterDmg/content/scripts/game/gameplay/damage/damageManagerProcessor.ws' },
    { files: ['pack/Mods/modFoo/content/scripts/a.ws', 'pack/DLC/dlcFoo/content/metadata.store'], type: 'mixed', destination: 'Mods/modFoo/content/scripts/a.ws' },
    { files: ['pack/bin/config/r4game/user_config_matrix/pc/input.xml', 'pack/Mods/modFoo/content/scripts/a.ws'], type: 'menu', destination: 'bin/config/r4game/user_config_matrix/pc/input.xml' },
    { files: ['pack/DLC/dlcFoo/content/metadata.store'], type: 'dlc', destination: 'DLC/dlcFoo/content/metadata.store' },
    { files: ['content/scripts/a.ws'], type: 'content', destination: 'Mods/mod/content/scripts/a.ws' },
    { files: ['bin/x64/example.dll'], type: 'root', destination: 'bin/x64/example.dll' },
    { files: ['WitcherScriptMerger.exe', 'Mods/modDummy/content/a.ws'], type: 'script-merger', destination: 'WitcherScriptMerger/WitcherScriptMerger.exe' },
  ]
  for (const fixture of routingCases) {
    let selected: any[] | undefined
    for (const installer of [...installers].sort((left, right) => left[1] - right[1])) {
      if ((await installer[2](fixture.files, GAME_ID)).supported) { selected = installer; break }
    }
    assert.equal(selected?.[0], `${GAME_ID}-${fixture.type}`, fixture.files.join(', '))
    const result = await selected![3](fixture.files, '', {})
    assert.equal(result.instructions[0].destination, fixture.destination)
  }

  // A pending publication ID must stay absent from setup warnings and local list markers.
  const unpublished = await actions.getExtensionRequiredMods()
  assert.equal(unpublished.installed, false)
  assert.equal(unpublished.requirementConfigured, false)
  assert.deepEqual(unpublished.requirements, [])
  assert.equal(unpublished.code, undefined)
  assert.deepEqual(game.localModFeatures, [])
  await game.setup({ path: 'D:/Selected Witcher 3' })
  assert.equal((await actions.getScriptMergerStatus()).gamePath, 'D:/Selected Witcher 3')

  const present = new Set<string>()
  let statCalls = 0
  const support = createScriptMergerSupport({ api: { util: { path, fs: {
    stat: async (file: string) => { statCalls += 1; return { isFile: present.has(file) } },
  } } } } as any, async () => 'D:/Witcher 3', '123456')
  assert.deepEqual(support.getLocalModFeatures(), [{ modId: 123456, marked: true, mark: { type: 'prerequisite', label: '前置模组' } }])
  const missing = await support.getRequiredMods()
  assert.equal('code' in missing && missing.code, 'EXTENSION_REQUIRED_MODS_MISSING')
  assert.equal(missing.requirements[0].modId, '123456')
  assert.equal(missing.requirements[0].requirement, 'enabled')

  const layouts: Array<[typeof installContent, string[]]> = [
    [installContent, ['content/scripts/game/foo.ws']],
    [installMods, ['pack/Mods/modFoo/content/scripts/foo.ws']],
    [installMixed, ['Mods/modFoo/content/scripts/foo.ws', 'DLC/dlcFoo/content/a.bundle']],
    [installMenu, ['Mods/modFoo/content/scripts/foo.ws', 'bin/config/r4game/user_config_matrix/pc/input.xml']],
    [installRoot, ['Mods/modFoo/content/scripts/foo.ws']],
  ]
  for (const [install, files] of layouts) {
    const guarded = support.guardInstaller(sources => install(__testing.entries(sources)))
    await assert.rejects(async () => guarded(files), (error: any) => {
      assert.equal(error.result.code, 'EXTENSION_REQUIRED_MODS_MISSING')
      assert.equal(error.result.requirements[0].modId, '123456')
      return true
    })
  }
  const beforeTexture = statCalls
  const textureFiles = ['Mods/modTexture/content/textures/a.xbm']
  const textureInstaller = support.guardInstaller(files => installMods(__testing.entries(files)))
  assert.equal((await textureInstaller(textureFiles)).modType, '292030-mods')
  assert.equal(statCalls, beforeTexture)
  assert.equal(needsScriptMerger([{ type: 'copy', destination: 'Mods/modTexture/content/textures/a.ws.txt' }]), false)
  assert.equal(needsScriptMerger([{ type: 'copy', destination: 'DLC/dlcFoo/content/scripts/a.ws' }]), false)

  present.add(path.join('D:/Witcher 3', 'WitcherScriptMerger/WitcherScriptMerger.exe'))
  assert.equal((await support.getRequiredMods()).installed, true)
  const guard = support.guardInstaller(files => installContent(__testing.entries(files)))
  assert.equal((await guard(['content/scripts/a.ws'])).modType, '292030-content')
  present.clear()
  await assert.rejects(async () => guard(['content/scripts/a.ws']), /Script Merger/)

  const fixtureContext: any = {
    gamePath: 'Z:/missing-witcher',
    savedOrder: [],
    mods: [
      {
        modKey: 'one',
        modType: `${GAME_ID}-mods`,
        enabled: true,
        metaInfo: { name: 'First package', witcher3ModNames: ['modOne'] },
      },
      {
        modKey: 'two',
        modType: `${GAME_ID}-mixed`,
        enabled: false,
        metaInfo: { name: 'Merged package', witcher3ModNames: ['mod0000_MergedFiles'] },
      },
    ],
  }
  const ordered = await deserializeWitcherLoadOrder(fixtureContext)
  assert.deepEqual(ordered.map(entry => entry.id), ['two:mod0000_mergedfiles', 'one:modone'])
  assert.equal(ordered[0].enabled, false)
  assert.throws(() => validateWitcherLoadOrder(ordered, [ordered[1], ordered[0]]), /Script Merger/)

  const tempRoot = `Witcher3-load-order-${Date.now()}-${Math.random().toString(16).slice(2)}`
  process.env.WITCHER3_DOCUMENTS_ROOT = `${process.cwd()}/test/${tempRoot}`
  await serializeWitcherLoadOrder(ordered)
  const fs = await import('node:fs/promises')
  const settings = await fs.readFile(`${process.env.WITCHER3_DOCUMENTS_ROOT}/The Witcher 3/mods.settings`, 'utf8')
  assert.match(settings, /\[mod0000_MergedFiles\][\s\S]*Priority=1/)
  await fs.rm(`${process.env.WITCHER3_DOCUMENTS_ROOT}`, { recursive: true, force: true })
  delete process.env.WITCHER3_DOCUMENTS_ROOT

  assert.equal(await game.queryPath(), 'C:/Witcher 3')
  await testParity()
  console.log(`Witcher 3: ${types.length} mod types, ${installers.length} installers, path safety and layout routing passed.`)
}
export const completion = run()
