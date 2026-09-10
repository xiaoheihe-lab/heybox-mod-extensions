import assert from 'node:assert/strict'
import path from 'node:path'
import main from '../src/index'
import { ASSEMBLY_FILES, GAME_ID, PAYLOAD_FILES, typeId } from '../src/constants'
import { installers, installKind, testKind, type Kind } from '../src/installers'
import { getExtensionRequiredMods } from '../src/requirements'

let passed = 0
function sample(kind: Kind, files: string[], destinations: string[]) {
  assert.deepEqual(installers.filter(i => testKind(i.kind, files, GAME_ID).supported).map(i => i.kind), [kind])
  assert.ok(!testKind(kind, files, 1).supported)
  const result = installKind(kind, files)
  assert.equal(result.modType, typeId(kind))
  assert.deepEqual(result.instructions.map(i => i.destination), destinations)
  assert.ok(result.instructions.every(i => files.includes(i.source)))
  passed++
}
sample('bepinex', PAYLOAD_FILES.map(f => `Pack/${f}`), PAYLOAD_FILES)
const packFiles = ['.doorstop_version', 'BepInEx/core/BepInEx.dll', 'changelog.txt',
  'doorstop_config.ini', 'doorstop_libs/libdoorstop_x64.so', 'start_game_bepinex.sh',
  'start_server_bepinex.sh', 'winhttp.dll', 'BepInEx/config/README.md', 'unstripped_corlib/mscorlib.dll']
sample('bepinex', [...packFiles.map(f => `BepInExPack_Valheim/${f}`),
  'CHANGELOG.md', 'icon.png', 'manifest.json', 'README.md', 'BepInExPack_Valheim-other/extra.txt'], packFiles)
sample('bepinex', ['Outer\\BepInExPack_Valheim\\WINHTTP.DLL', 'Outer\\BepInExPack_Valheim\\doorstop_libs\\data', 'Outer/README.md'], ['WINHTTP.DLL', 'doorstop_libs/data'])
assert.throws(() => installKind('bepinex', ['a/winhttp.dll', 'b/winhttp.dll']), /Multiple/)
assert.ok(!testKind('bepinex', ['a/winhttp.dll', 'b/winhttp.dll'], GAME_ID).supported)
passed++
sample('bepinex', [...PAYLOAD_FILES, 'unstripped_corlib/mscorlib.dll', 'README.md'], [...PAYLOAD_FILES, 'unstripped_corlib/mscorlib.dll', 'README.md'])
for (const prefix of ['Pack/BepInEx/core_lib', 'Pack/unstripped_corlib', 'Pack/unstripped_managed']) {
  sample('unstripped', [...ASSEMBLY_FILES.map(f => `${prefix}/${f}`), 'Pack/BepInEx/core/BepInEx.dll'], ASSEMBLY_FILES.map(f => `unstripped_corlib/${f}`))
}
sample('inslim-loader', ['pack/inslimvml.ini', 'pack/InSlimVML/Mods/Test.dll', 'pack/doorstop_config.ini'], ['inslimvml.ini', 'InSlimVML/Mods/Test.dll'])
sample('core-remover', ['pack/BepInEx/core/BepInEx.dll', 'pack/BepInEx/config/BepInEx.cfg', 'pack/BepInEx/plugins/Foo/Foo.dll', 'pack/BepInEx/config/Foo.cfg'], ['BepInEx/plugins/Foo/Foo.dll', 'BepInEx/config/Foo.cfg'])
sample('config-manager', ['pack/ConfigurationManager.dll', 'pack/ConfigurationManager.xml', 'README.md'], ['BepInEx/plugins/ConfigurationManager/ConfigurationManager.dll', 'BepInEx/plugins/ConfigurationManager/ConfigurationManager.xml'])
sample('bepinex-root', ['pack/BepInEx/plugins/Foo.dll', 'pack/BepInEx/patchers/Patcher.dll', 'pack/BepInEx/config/Foo.cfg'], ['BepInEx/plugins/Foo.dll', 'BepInEx/patchers/Patcher.dll', 'BepInEx/config/Foo.cfg'])
sample('bepinex-root', ['plugins/Foo/Foo.dll', 'config/Foo.yml'], ['BepInEx/plugins/Foo/Foo.dll', 'BepInEx/config/Foo.yml'])
sample('bepinex-root', ['CustomTextures/foo_tex.png', 'CustomMeshes/mesh.obj'], ['BepInEx/plugins/CustomTextures/foo_tex.png', 'BepInEx/plugins/CustomMeshes/mesh.obj'])
sample('inslim', ['pack/BuildShare_vml.dll', 'pack/data/file.bin'], ['InSlimVML/Mods/BuildShare_vml.dll', 'InSlimVML/Mods/data/file.bin'])
sample('inslim', ['InSlimVML/Mods/Foo.dll'], ['InSlimVML/Mods/Foo.dll'])
sample('better-continents', ['pack/world.bettercontinents', 'pack/world.db', 'pack/world.fwl', 'pack/maps/height.png', 'outside.txt'], ['vortex-worlds/world.bettercontinents', 'vortex-worlds/world.db', 'vortex-worlds/world.fwl', 'vortex-worlds/maps/height.png'])
sample('world', ['pack/World.db', 'pack/World.fwl'], ['vortex-worlds/World.db', 'vortex-worlds/World.fwl'])
sample('vbuild', ['one/Foo.vbuild', 'two/Bar.VBUILD', 'readme.txt'], ['AdvancedBuilder/Builds/Foo.vbuild', 'AdvancedBuilder/Builds/Bar.VBUILD'])
sample('meshes', ['pack/Mesh.obj', 'pack/Mesh.mtl', 'pack/textures/color.png'], ['BepInEx/plugins/CustomMeshes/Mesh.obj', 'BepInEx/plugins/CustomMeshes/Mesh.mtl', 'BepInEx/plugins/CustomMeshes/textures/color.png'])
sample('textures', ['pack/wood_tex.png'], ['BepInEx/plugins/CustomTextures/wood_tex.png'])
sample('engine', ['pack/valheim_Data/sharedassets1.assets', 'pack/valheim_Data/sharedassets1.assets.resS'], ['valheim_Data/sharedassets1.assets', 'valheim_Data/sharedassets1.assets.resS'])
sample('engine', ['wrap/dxgi.dll', 'wrap/ReShade.ini', 'wrap/reshade-shaders/Shaders/Foo.fx'], ['dxgi.dll', 'ReShade.ini', 'reshade-shaders/Shaders/Foo.fx'])
sample('engine', ['sharedassets1.assets'], ['valheim_Data/sharedassets1.assets'])
sample('plugin', ['wrap/MyMod.dll', 'wrap/assets/data', 'wrap/README.md'], ['BepInEx/plugins/MyMod.dll', 'BepInEx/plugins/assets/data'])
sample('bepinex-root', ['Pack\\BEPINEX\\Plugins\\Foo.DLL'], ['BepInEx/Plugins/Foo.DLL'])
for (const bad of ['../evil.dll', '/evil.dll', '\\evil.dll', 'C:\\evil.dll', 'foo/../../evil.dll', 'foo/NUL.dll', 'foo.dll:stream', 'foo./evil.dll']) {
  assert.ok(installers.every(i => !testKind(i.kind, ['Foo.dll', bad], GAME_ID).supported))
  assert.throws(() => installKind('plugin', ['Foo.dll', bad]), /Unsafe/)
  passed++
}
assert.throws(() => installKind('plugin', ['Foo.dll', 'foo.dll']), /Conflicting/)
assert.throws(() => installKind('vbuild', ['one/Foo.vbuild', 'two/Foo.vbuild']), /Conflicting/)
assert.throws(() => installKind('unstripped', ['core_lib/mscorlib.dll', 'unstripped_corlib/mscorlib.dll']), /exactly one/)
assert.ok(installers.every(i => !testKind(i.kind, ['README.md', 'icon.png'], GAME_ID).supported))
assert.throws(() => installKind('bepinex', ['BepInEx/core/BepInEx.dll']), /Incomplete/)
const mutable = installKind('bepinex-root', ['config/Foo.cfg']).instructions[0]
assert.equal(mutable.verification, 'exists')
passed += 6

const ini = '[UnityDoorstop]\nenabled=true\ntargetAssembly=BepInEx\\core\\BepInEx.Preloader.dll\ndllSearchPathOverride=unstripped_corlib\n'
function contextFor(files: string[], config = ini): any {
  const existing = new Set(files.map(f => path.join('C:/Valheim', f).toLowerCase()))
  return { api: { util: { path, fs: {
    stat: async (p: string) => ({ isFile: existing.has(p.toLowerCase()) }),
    readFile: async () => config,
  }, GameStoreHelper: { findByAppId: async () => ({ gamePath: 'C:/Valheim' }) } } } }
}
const allFiles = [...PAYLOAD_FILES, ...ASSEMBLY_FILES.map(f => `unstripped_corlib/${f}`)]
async function run() {
  const missing = await getExtensionRequiredMods(contextFor([]))
  assert.equal(missing.requirements.length, 1)
  assert.equal((missing as any).code, 'EXTENSION_REQUIRED_MODS_MISSING')
  assert.deepEqual((missing as any).requirement.requirements, missing.requirements)
  assert.ok(missing.requirements.every(r => r.mod_id === r.modId && r.requirement === 'enabled'))
  assert.equal(missing.requirements[0].modId, '82254')
  assert.equal(missing.requirements[0].openModDetailDialog, false)
  assert.equal(missing.requirements[0].modType, typeId('bepinex'))
  const ready = await getExtensionRequiredMods(contextFor(PAYLOAD_FILES))
  assert.ok(ready.installed)
  assert.deepEqual(ready.requirements, [])
  assert.ok(!('code' in ready))
  assert.ok((await getExtensionRequiredMods(contextFor(allFiles))).installed)
  assert.ok((await getExtensionRequiredMods(contextFor(allFiles, ''))).installed)
  assert.equal((await getExtensionRequiredMods(contextFor(allFiles.filter(f => f !== 'winhttp.dll')))).requirements[0].modType, typeId('bepinex'))
  const registrations: any[] = []
  const types: any[] = []
  let game: any; let action: any
  const context = { ...contextFor([]), registerGame: (v: any) => { game = v }, registerModType: (...v: any[]) => types.push(v),
    registerInstaller: (...v: any[]) => registrations.push(v), registerExtensionAction: (...v: any[]) => { action = v } }
  assert.ok(await main(context))
  assert.equal(registrations.length, 14)
  assert.equal(types.length, 14)
  assert.deepEqual(registrations.sort((a, b) => b[1] - a[1]).slice(0, 2).map(r => r[0]), [typeId('bepinex'), typeId('unstripped')])
  assert.ok(types.every(t => t[3]({}) === '{gamePath}'))
  assert.equal(game.id, GAME_ID)
  assert.deepEqual(await game.setup({ path: 'C:/Valheim' }), await action[2]())
  // setup must inspect the selected discovery, rather than a different Steam installation.
  const setupContext = { ...contextFor(PAYLOAD_FILES), registerGame: (v: any) => { game = v },
    registerModType: () => {}, registerInstaller: () => {}, registerExtensionAction: () => {} }
  await main(setupContext)
  assert.ok((await game.setup({ path: 'C:/Valheim' })).installed)
  const otherPath = await game.setup({ path: 'D:/OtherValheim' })
  assert.equal(otherPath.gamePath, 'D:/OtherValheim')
  assert.equal(otherPath.requirements[0].mod_id, '82254')
  passed += 10
  console.log(`Valheim: ${passed} checks passed (14 installers, registration, prerequisites).`)
}
run().catch(e => { console.error(e); process.exitCode = 1 })
