import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { GAME_ID, MOD_TYPE, REDMOD_STEAM_APP_ID, REDMOD_STEAM_HEADER_IMAGE } from '../src/constants'
import { getRedmodStatus, registerCyberpunkGame } from '../src/game'
import { installCyberpunkPackage, testCyberpunkPackage } from '../src/installers/pipeline'
import { registerCyberpunkModTypes } from '../src/modTypes'
import { preparePackage } from '../src/package'
import { registerRedmodDeployment } from '../src/redmodDeployment'
import { fakeContext } from './helpers/context'

test('Cyberpunk 2077 general installer and registration regressions', async () => {
  assert.deepEqual(testCyberpunkPackage([], GAME_ID), { supported: true })
  assert.deepEqual(testCyberpunkPackage([], 42), { supported: false })

  const wrapped = preparePackage([
    'FancyMod/archive/pc/mod/fancy.archive',
    'FancyMod/README.md',
  ])
  assert.equal(wrapped.wrapper, 'FancyMod')
  assert.equal(wrapped.files[0].source, 'FancyMod/archive/pc/mod/fancy.archive')
  assert.equal(wrapped.files[0].path, 'archive/pc/mod/fancy.archive')

  const registrations: any = { games: [], types: [], installers: [], actions: [] }
  const registrationContext = {
    ...fakeContext().context,
    registerGame: (game: any) => registrations.games.push(game),
    registerModType: (id: string, priority: number) => registrations.types.push({ id, priority }),
    registerInstaller: (id: string, priority: number) => registrations.installers.push({ id, priority }),
    registerExtensionAction: (gameId: number, action: string) => registrations.actions.push({ gameId, action }),
  } as any
  registerCyberpunkGame(registrationContext)
  registerCyberpunkModTypes(registrationContext)
  assert.equal(registrations.games[0].id, GAME_ID)
  assert.equal(registrations.games[0].executable, 'bin/x64/Cyberpunk2077.exe')
  assert.equal(registrations.games[0].details.supportsSymlinks, false)
  assert.equal(registrations.games[0].steamPrerequisites.length, 1)
  const redmodPrerequisite = registrations.games[0].steamPrerequisites[0]
  assert.equal(redmodPrerequisite.id, 'cyberpunk-redmod')
  assert.equal(redmodPrerequisite.steamAppId, REDMOD_STEAM_APP_ID)
  assert.equal(redmodPrerequisite.presentation.imageUrl, REDMOD_STEAM_HEADER_IMAGE)
  assert.equal(redmodPrerequisite.presentation.installButtonText, '前往 Steam 安装')
  assert.equal(redmodPrerequisite.presentation.recheckButtonText, '安装完成，重新检查')
  assert.equal(registrations.installers.length, 2)
  assert.deepEqual(registrations.installers[0], { id: MOD_TYPE.fomod, priority: 100 })
  assert.deepEqual(registrations.installers[1], { id: MOD_TYPE.pipeline, priority: 30 })
  assert.ok(registrations.types.some((item: any) => item.id === MOD_TYPE.fomod))
  assert.ok(registrations.types.some((item: any) => item.id === MOD_TYPE.redmod))
  assert.deepEqual(registrations.actions, [{ gameId: GAME_ID, action: 'getRedmodStatus' }])

  const loadOrderRegistrations: any[] = []
  const extractors: any[] = []
  const postInstallerExtractors: any[] = []
  const deploymentActions: any[] = []
  registerRedmodDeployment({
    api: { loadOrder: { deploy: async () => ({}) } },
    registerAttributeExtractor: (priority: number, extractor: any) => extractors.push({ priority, extractor }),
    registerPostInstallerAttributeExtractor: (priority: number, extractor: any) => postInstallerExtractors.push({ priority, extractor }),
    registerLoadOrder: (options: any) => loadOrderRegistrations.push(options),
    registerExtensionAction: (gameId: number, action: string) => deploymentActions.push({ gameId, action }),
  } as any)
  assert.equal(loadOrderRegistrations.length, 1)
  assert.deepEqual(loadOrderRegistrations[0].modTypes, [MOD_TYPE.redmod, MOD_TYPE.multiTypeRedmod, MOD_TYPE.fomod])
  assert.equal(typeof loadOrderRegistrations[0].onDidDeploy, 'function')
  assert.equal(extractors[0].priority, 100)
  assert.equal(postInstallerExtractors[0].priority, 100)
  assert.deepEqual(deploymentActions, [{ gameId: GAME_ID, action: 'deployRedmods' }])

  const cetCore = await installCyberpunkPackage(fakeContext().context, [
    'CET/bin/x64/plugins/cyber_engine_tweaks.asi',
    'CET/bin/x64/plugins/cyber_engine_tweaks.asi.config.json',
  ], 'stage')
  assert.equal(cetCore.modTypeId, MOD_TYPE.coreCet)
  assert.deepEqual(cetCore.instructions[0], {
    type: 'copy',
    source: 'CET/bin/x64/plugins/cyber_engine_tweaks.asi',
    destination: 'bin/x64/plugins/cyber_engine_tweaks.asi',
  })

  const multi = await installCyberpunkPackage(fakeContext().context, [
    'Combo/bin/x64/plugins/cyber_engine_tweaks/mods/CoolMod/init.lua',
    'Combo/bin/x64/plugins/cyber_engine_tweaks/mods/CoolMod/main.lua',
    'Combo/archive/pc/patch/cool.archive',
    'Combo/README.md',
  ], 'stage')
  assert.equal(multi.modTypeId, MOD_TYPE.multiType)
  assert.ok(multi.instructions.some((item: any) => item.destination === 'archive/pc/mod/cool.archive'))
  assert.ok(multi.instructions.some((item: any) => item.destination === 'bin/x64/plugins/cyber_engine_tweaks/mods/CoolMod/init.lua'))
  assert.ok(multi.instructions.some((item: any) => item.destination === 'H2077/mod-extra-files/Combo/README.md'))

  const red4ext = await installCyberpunkPackage(fakeContext().context, [
    'CoolPlugin.dll',
    'config.json',
    'README.md',
  ], 'stage')
  assert.equal(red4ext.modTypeId, MOD_TYPE.red4ext)
  assert.deepEqual(red4ext.instructions.filter((item: any) => item.type === 'copy').map((item: any) => item.destination), [
    'red4ext/plugins/CoolPlugin/CoolPlugin.dll',
    'red4ext/plugins/CoolPlugin/config.json',
    'red4ext/plugins/CoolPlugin/README.md',
  ])

  const legacyArchive = await installCyberpunkPackage(fakeContext().context, [
    'archive/pc/patch/legacy.archive',
  ], 'stage')
  assert.equal(legacyArchive.modTypeId, MOD_TYPE.archive)
  assert.deepEqual(legacyArchive.instructions[0], {
    type: 'copy',
    source: 'archive/pc/patch/legacy.archive',
    destination: 'archive/pc/mod/legacy.archive',
  })

  const protectedUi = fakeContext()
  const xml = await installCyberpunkPackage(protectedUi.context, ['inputUserMappings.xml'], 'stage')
  assert.equal(xml.modTypeId, MOD_TYPE.xmlConfig)
  assert.equal(protectedUi.requests.length, 1)
  assert.deepEqual(xml.instructions[0], {
    type: 'copy',
    source: 'inputUserMappings.xml',
    destination: 'r6/config/inputUserMappings.xml',
  })

  const redmodUi = fakeContext({
    'stage/NamedRedmod/info.json': JSON.stringify({ name: 'Named Redmod', version: '1.2.3' }),
  })
  const redmod = await installCyberpunkPackage(redmodUi.context, [
    'NamedRedmod/info.json',
    'NamedRedmod/archives/content.archive',
  ], 'stage')
  assert.equal(redmod.modTypeId, MOD_TYPE.redmod)
  assert.equal(redmodUi.requests.length, 0)
  assert.ok(redmod.instructions.some((item: any) => item.destination === 'mods/NamedRedmod/info.json'))
  assert.ok(redmod.instructions.some((item: any) => item.key === 'cyberpunkRedmodRequiresDeploy' && item.value === true))

  const presetContext = fakeContext({
    'stage/V.preset': 'LocKey#14444638123505366956:123',
  })
  const preset = await installCyberpunkPackage(presetContext.context, ['V.preset'], 'stage')
  assert.equal(preset.modTypeId, MOD_TYPE.preset)
  assert.deepEqual(preset.instructions[0], {
    type: 'copy',
    source: 'V.preset',
    destination: 'bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceChangeUnlocker/character-presets/female/V.preset',
  })

  const fallbackUi = fakeContext()
  const fallback = await installCyberpunkPackage(fallbackUi.context, ['some/random/file.bin'], 'stage')
  assert.equal(fallback.modTypeId, MOD_TYPE.fallback)
  assert.equal(fallbackUi.requests.length, 1)

  const gamePath = 'D:/Games/Cyberpunk 2077'
  const redmodFiles = [
    path.join(gamePath, 'REDprelauncher.exe'),
    path.join(gamePath, 'tools/redmod/bin/redMod.exe'),
    path.join(gamePath, 'tools/redmod/metadata.json'),
  ]
  assert.equal((await getRedmodStatus(fakeContext({}, redmodFiles).context, gamePath)).installed, true)
  assert.equal((await getRedmodStatus(fakeContext({}, redmodFiles.slice(1)).context, gamePath)).installed, true)
  assert.equal((await getRedmodStatus(fakeContext({}, redmodFiles.slice(0, 2)).context, gamePath)).installed, false)
  assert.equal(await redmodPrerequisite.check({
    appid: GAME_ID,
    gameId: GAME_ID,
    gamePath,
    reason: 'manual-recheck',
  }), false)
})
