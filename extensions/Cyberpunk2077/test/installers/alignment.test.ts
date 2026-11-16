import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { MOD_TYPE, PATHS } from '../../src/constants'
import { installCyberpunkPackage } from '../../src/installers/pipeline'
import { prepareDeploymentDirectories } from '../../src/deploymentDirectories'
import { createRedmodSteamPrerequisite } from '../../src/requirements/redmod'
import { fakeContext } from '../helpers/context'

for (const [type, marker] of [
  [MOD_TYPE.coreAudioware, 'red4ext/plugins/audioware/audioware.dll'],
  [MOD_TYPE.coreTweakXL, 'red4ext/plugins/tweakxl/tweakxl.dll'],
  [MOD_TYPE.coreArchiveXL, 'red4ext/plugins/archivexl/archivexl.dll'],
  [MOD_TYPE.coreInputLoader, 'red4ext/plugins/input_loader/input_loader.dll'],
  [MOD_TYPE.coreModSettings, 'red4ext/plugins/mod_settings/mod_settings.dll'],
  [MOD_TYPE.coreAmm, `${PATHS.amm}/init.lua`],
] as const) {
  test(`${type} accepts a different release inventory and preserves staging source paths`, async () => {
    const fixture = fakeContext()
    const result = await installCyberpunkPackage(fixture.context, [`Release/${marker}`, 'Release/r6/new-layout/new.dat'], 'D:/unrelated/staging')
    assert.equal(result.modTypeId, type)
    assert.deepEqual(result.instructions, [
      { type: 'copy', source: `Release/${marker}`, destination: marker },
      { type: 'copy', source: 'Release/r6/new-layout/new.dat', destination: 'r6/new-layout/new.dat' },
    ])
    assert.equal(fixture.requests.length, 0)
  })
}

test('redscript sidefiles retain game paths in loose, canonical and sidefiles-only packages', async () => {
  for (const scripts of [[], ['feature.reds'], ['r6/scripts/feature.reds']]) {
    const result = await installCyberpunkPackage(fakeContext().context,
      [...scripts, 'r6/storages/cache.bin', 'r6/config/redsUserHints/feature.toml'], 'D:/random-staging',
      { mod: { modKey: '123_456', name: 'Stable Feature', version: '1.2' } })
    assert.equal(result.modTypeId, MOD_TYPE.redscript)
    assert.ok(result.instructions.some((inst: any) => inst.destination === 'r6/storages/cache.bin'))
    assert.ok(result.instructions.some((inst: any) => inst.destination === 'r6/config/redsUserHints/feature.toml'))
    if (scripts.length) assert.ok(result.instructions.some((inst: any) => inst.destination === 'r6/scripts/Stable Feature/feature.reds'))
  }
})

test('empty REDmod version accepts package version; sounds declarations must match shipped sounds', async () => {
  const fixture = (info: unknown) => fakeContext({ 'stage/mods/Example/info.json': JSON.stringify(info) })
  const base = ['mods/Example/info.json', 'mods/Example/archives/example.archive']
  const result = await installCyberpunkPackage(fixture({ name: 'Example', version: '' }).context, base, 'stage',
    { mod: { modKey: '1_2', name: 'Example package', version: '3.2' } })
  const attr = result.instructions.find((inst) => inst.type === 'attribute' && inst.key === 'cyberpunkRedmodInfo') as any
  assert.equal(attr.value[0].version, '3.2')
  for (const info of [
    { name: 'Example', version: '1', customSounds: [{ name: 'audio', type: 'mod_sfx_2d' }] },
    { name: 'Example', version: '1', customSounds: [{ type: 'mod_skip' }] },
    { name: 'Example', version: '1', customSounds: [{ name: 'audio', type: 'unknown' }] },
  ]) await assert.rejects(installCyberpunkPackage(fixture(info).context, base, 'stage'), /customSounds/)
  await assert.rejects(installCyberpunkPackage(fixture({ name: 'Example', version: '1' }).context,
    [...base, 'mods/Example/customSounds/audio.wav'], 'stage'), /customSounds/)
})

test('pure mod_skip and framework activation create real directories without placeholder files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cp2077-dirs-'))
  try {
    const result = await installCyberpunkPackage(fakeContext({
      'stage/mods/Muted/info.json': JSON.stringify({ name: 'Muted', version: '1', customSounds: [{ name: 'sound', type: 'mod_skip' }] }),
    }).context, ['mods/Muted/info.json'], 'stage')
    const attrs = Object.fromEntries(result.instructions.filter((inst) => inst.type === 'attribute').map((inst: any) => [inst.key, inst.value]))
    await prepareDeploymentDirectories({ gamePath: root, modType: MOD_TYPE.redmod, mod: { metaInfo: attrs } })
    assert.deepEqual(await fs.readdir(path.join(root, 'mods/Muted/customSounds')), [])
    await prepareDeploymentDirectories({ gamePath: root, modType: MOD_TYPE.coreInputLoader })
    assert.deepEqual(await fs.readdir(path.join(root, 'r6/input')), [])
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

test('REDmod Steam prerequisite applies to installed REDmods including disabled ones', () => {
  const requirement = createRedmodSteamPrerequisite(fakeContext().context)
  assert.equal(requirement.isRequired({ mods: [] }), false)
  assert.equal(requirement.isRequired({ mods: [{ modKey: '1_2', enabled: true, metaInfo: {} }] }), false)
  assert.equal(requirement.isRequired({ mods: [{ modKey: '1_2', enabled: false, metaInfo: {
    cyberpunkRedmodInfo: [{ name: 'Example', version: '', relativePath: 'mods/Example' }],
  } }] }), true)
})
