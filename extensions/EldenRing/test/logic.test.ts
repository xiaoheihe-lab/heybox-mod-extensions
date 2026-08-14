import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  GAME_ID,
  MOD_ENGINE_CONFIG,
  MOD_ENGINE_CONFIG_ATTRIBUTE,
  MOD_ENGINE_DIR,
  MOD_ENGINE_DLL,
  MOD_ENGINE_LAUNCHER,
  MOD_ENGINE_MOD_DIR,
  MOD_ENGINE_STARTER,
  MOD_TYPE_MOD_ENGINE_DLL,
  MOD_TYPE_MOD_ENGINE,
  MOD_TYPE_MOD_ENGINE_MOD,
  MOD_TYPE_SEAMLESS_COOP,
  buildDefaultConfig,
  buildStarterScript,
  buildSteamLaunchOptions,
  discoverExternalDlls,
  discoverModLoaderEntries,
  installModEngineDll,
  installModEngine,
  installModEngineMod,
  installSeamlessCoop,
  refreshModEngineConfig,
  shouldRefreshModEngineConfigForModType,
  testModEngineDll,
  testModEngine,
  testModEngineMod,
  testSeamlessCoop,
} from '../index'

async function main() {
  assert.equal(shouldRefreshModEngineConfigForModType(MOD_TYPE_SEAMLESS_COOP), true)
  assert.equal(shouldRefreshModEngineConfigForModType(MOD_TYPE_MOD_ENGINE_DLL), true)
  assert.equal(shouldRefreshModEngineConfigForModType(MOD_TYPE_MOD_ENGINE_MOD), true)
  assert.equal(shouldRefreshModEngineConfigForModType(MOD_TYPE_MOD_ENGINE), false)

  assert.equal(testModEngine([
    'ModEngine-2/modengine2_launcher.exe',
    'ModEngine-2/modengine2/bin/modengine2.dll',
    'ModEngine-2/config_eldenring.toml',
  ], GAME_ID).supported, true)
  assert.equal(testModEngine(['modengine2_launcher.exe'], GAME_ID).supported, false)
  assert.equal(testModEngine(['modengine2_launcher.exe', 'modengine2/bin/modengine2.dll'], 294100).supported, false)

  const loader = installModEngine([
    'ModEngine-2/modengine2_launcher.exe',
    'ModEngine-2/modengine2/bin/modengine2.dll',
    'ModEngine-2/config_eldenring.toml',
    'readme.txt',
  ])
  assert.equal(loader.modType, MOD_TYPE_MOD_ENGINE)
  assert.deepEqual(loader.instructions, [
    { type: 'copy', source: 'ModEngine-2/modengine2_launcher.exe', destination: `${MOD_ENGINE_DIR}/modengine2_launcher.exe` },
    { type: 'copy', source: 'ModEngine-2/modengine2/bin/modengine2.dll', destination: `${MOD_ENGINE_DIR}/modengine2/bin/modengine2.dll` },
  ])

  assert.equal(buildDefaultConfig().includes('[extension.mod_loader]'), true)

  assert.equal(testModEngineMod(['CoolMod/parts/wp_a_0100.partsbnd.dcx'], GAME_ID).supported, true)
  assert.equal(testModEngineMod(['CoolMod/readme.txt'], GAME_ID).supported, false)
  assert.equal(testModEngineMod(['Seamless/ersc.dll'], GAME_ID).supported, false)
  assert.equal(testModEngineMod([MOD_ENGINE_LAUNCHER, `modengine2/bin/${MOD_ENGINE_DLL}`], GAME_ID).supported, false)

  const mod = installModEngineMod([
    'CoolMod/parts/wp_a_0100.partsbnd.dcx',
    'CoolMod/msg/engus/menu.msgbnd.dcx',
    'CoolMod/readme.txt',
  ], 'CoolMod.installing')
  assert.equal(mod.modType, MOD_TYPE_MOD_ENGINE_MOD)
  assert.deepEqual(mod.instructions, [
    { type: 'copy', source: 'CoolMod/parts/wp_a_0100.partsbnd.dcx', destination: `${MOD_ENGINE_MOD_DIR}/CoolMod/parts/wp_a_0100.partsbnd.dcx` },
    { type: 'copy', source: 'CoolMod/msg/engus/menu.msgbnd.dcx', destination: `${MOD_ENGINE_MOD_DIR}/CoolMod/msg/engus/menu.msgbnd.dcx` },
    { type: 'attribute', key: MOD_ENGINE_CONFIG_ATTRIBUTE, value: { modEntries: [{ enabled: true, name: 'CoolMod', path: 'mod\\CoolMod' }] } },
  ])

  assert.equal(testModEngineDll(['Seamless/ersc.dll'], GAME_ID).supported, true)
  assert.equal(testModEngineDll(['Seamless/ersc.dll', 'Seamless/helper.dll'], GAME_ID).supported, false)

  const dllMod = installModEngineDll(['Seamless/ersc.dll', 'Seamless/Seamless.Coop.ini'], 'Seamless.installing')
  assert.equal(dllMod.modType, MOD_TYPE_MOD_ENGINE_DLL)
  assert.deepEqual(dllMod.instructions, [
    { type: 'copy', source: 'Seamless/ersc.dll', destination: `${MOD_ENGINE_MOD_DIR}/Seamless/ersc.dll` },
    { type: 'copy', source: 'Seamless/Seamless.Coop.ini', destination: `${MOD_ENGINE_MOD_DIR}/Seamless/Seamless.Coop.ini` },
    { type: 'attribute', key: MOD_ENGINE_CONFIG_ATTRIBUTE, value: { externalDlls: ['mod\\Seamless\\ersc.dll'] } },
  ])

  assert.equal(testSeamlessCoop(['Seamless/elden_ring_seamless_coop.dll'], GAME_ID).supported, true)
  const seamless = installSeamlessCoop([
    'Seamless/elden_ring_seamless_coop.dll',
    'Seamless/seamlesscoop.ini',
    'Seamless/README.txt',
  ], 'Seamless.installing')
  assert.equal(seamless.modType, MOD_TYPE_SEAMLESS_COOP)
  assert.deepEqual(seamless.instructions, [
    { type: 'copy', source: 'Seamless/elden_ring_seamless_coop.dll', destination: `${MOD_ENGINE_MOD_DIR}/Seamless/elden_ring_seamless_coop.dll` },
    { type: 'copy', source: 'Seamless/seamlesscoop.ini', destination: `${MOD_ENGINE_MOD_DIR}/Seamless/seamlesscoop.ini` },
    { type: 'attribute', key: MOD_ENGINE_CONFIG_ATTRIBUTE, value: { externalDlls: ['mod\\Seamless\\elden_ring_seamless_coop.dll'] } },
  ])

  const tmpGamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'elden-ring-config-'))
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'SeamlessCoop'), { recursive: true })
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'SkipTheIntro'), { recursive: true })
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'DependencyPack'), { recursive: true })
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'LongerWeapons', 'parts'), { recursive: true })
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'ParamMod', 'param'), { recursive: true })
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'SeamlessCoop', 'ersc.dll'), '')
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'SkipTheIntro', 'SkipTheIntro.dll'), '')
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'DependencyPack', 'a.dll'), '')
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'DependencyPack', 'b.dll'), '')
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'LongerWeapons', 'parts', 'wp_a_0125.partsbnd.dcx'), '')
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'ParamMod', 'param', 'NpcParam.param'), '')
  fs.mkdirSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'ManualMod', 'parts'), { recursive: true })
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, 'mod', 'ManualMod', 'parts', 'manual.dcx'), '')
  const managedPaths = [
    `${MOD_ENGINE_DIR}/mod/SeamlessCoop/ersc.dll`,
    `${MOD_ENGINE_DIR}/mod/SkipTheIntro/SkipTheIntro.dll`,
    `${MOD_ENGINE_DIR}/mod/DependencyPack/a.dll`,
    `${MOD_ENGINE_DIR}/mod/DependencyPack/b.dll`,
    `${MOD_ENGINE_DIR}/mod/LongerWeapons/parts/wp_a_0125.partsbnd.dcx`,
    `${MOD_ENGINE_DIR}/mod/ParamMod/param/NpcParam.param`,
  ]
  assert.deepEqual(discoverExternalDlls(managedPaths), [
    'mod\\SeamlessCoop\\ersc.dll',
    'mod\\SkipTheIntro\\SkipTheIntro.dll',
  ])
  assert.deepEqual(discoverModLoaderEntries(managedPaths), [
    { enabled: true, name: 'LongerWeapons', path: 'mod\\LongerWeapons' },
    { enabled: true, name: 'ParamMod', path: 'mod\\ParamMod' },
  ])
  fs.writeFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG), buildDefaultConfig([
    'mod\\SkipTheIntro\\SkipTheIntro.dll',
  ], [
    { enabled: false, name: 'LongerWeapons', path: 'mod\\LongerWeapons' },
  ], {
    debug: true,
    looseParams: true,
      scyllaHide: true,
  }), 'utf8')
  fs.appendFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG), '\n# Keep this user comment\n[extension.custom]\nuser_value = "preserved"\n', 'utf8')
  const refreshed = refreshModEngineConfig(tmpGamePath, managedPaths)
  assert.deepEqual(refreshed, [
    'mod\\SkipTheIntro\\SkipTheIntro.dll',
    'mod\\SeamlessCoop\\ersc.dll',
  ])
  const refreshedConfig = fs.readFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG), 'utf8')
  assert.equal(refreshedConfig.includes('debug = true'), true)
  assert.equal(refreshedConfig.includes('loose_params = true'), true)
  assert.equal(refreshedConfig.includes('[extension.scylla_hide]\nenabled = true'), true)
  assert.equal(refreshedConfig.includes('mod\\\\SeamlessCoop\\\\ersc.dll'), true)
  assert.equal(refreshedConfig.includes('mod\\\\SkipTheIntro\\\\SkipTheIntro.dll'), true)
  assert.equal(refreshedConfig.includes('enabled = false, name = "LongerWeapons", path = "mod\\\\LongerWeapons"'), true)
  assert.equal(refreshedConfig.includes('enabled = true, name = "ParamMod", path = "mod\\\\ParamMod"'), true)
  assert.equal(refreshedConfig.includes('# Keep this user comment'), true)
  assert.equal(refreshedConfig.includes('[extension.custom]\nuser_value = "preserved"'), true)
  assert.equal(refreshedConfig.includes('ManualMod'), false)

  const remainingManagedPaths = managedPaths.filter((file) => !file.includes('SkipTheIntro') && !file.includes('LongerWeapons'))
  refreshModEngineConfig(tmpGamePath, remainingManagedPaths, {
    externalDlls: ['mod\\SkipTheIntro\\SkipTheIntro.dll'],
    modEntries: [{ enabled: true, name: 'LongerWeapons', path: 'mod\\LongerWeapons' }],
  }, 'uninstall')
  const cleanedConfig = fs.readFileSync(path.join(tmpGamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG), 'utf8')
  assert.equal(cleanedConfig.includes('SkipTheIntro'), false)
  assert.equal(cleanedConfig.includes('LongerWeapons'), false)
  assert.equal(cleanedConfig.includes('SeamlessCoop'), true)
  assert.equal(cleanedConfig.includes('[extension.custom]\nuser_value = "preserved"'), true)

  const gamePath = path.join('D:', 'SteamLibrary', 'steamapps', 'common', 'ELDEN RING')
  const launchOptions = buildSteamLaunchOptions(gamePath)
  assert.equal(launchOptions, `"${path.join(gamePath, MOD_ENGINE_STARTER)}" %command%`)

  const starter = buildStarterScript(gamePath)
  assert.equal(starter.includes(MOD_ENGINE_LAUNCHER), true)
  assert.equal(starter.includes('-t er'), true)
  assert.equal(starter.includes(`-c "${path.join(gamePath, MOD_ENGINE_DIR, MOD_ENGINE_CONFIG)}"`), true)
  assert.equal(starter.includes(`-p "${path.join(gamePath, 'Game', 'eldenring.exe')}"`), true)
}

void main()
