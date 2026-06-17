import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createReEnginePakName,
  extractPatchNumber,
  installReEngineNatives,
  installReEnginePak,
  installReEngineReframeworkLoader,
  normalizeArchivePath,
  testReEngineAutorun,
  testReEngineNatives,
  testReEnginePak,
  testReEnginePlugins,
  testReEngineReframework,
  testReEngineReframeworkLoader,
} from '../dist/re-engine/index.js'

const pathApi = {
  join: (...segments) => segments.filter(Boolean).join('/'),
}

test('normalizes safe archive paths and rejects unsafe paths', () => {
  assert.equal(normalizeArchivePath('./Mod\\natives//foo.mesh'), 'Mod/natives/foo.mesh')
  assert.equal(normalizeArchivePath('../evil.txt'), null)
  assert.equal(normalizeArchivePath('C:/evil.txt'), null)
  assert.equal(normalizeArchivePath('file://evil.txt'), null)
})

test('each tester preserves Gloss priority without a shared detection entrypoint', () => {
  assert.equal(testReEngineReframework(['pack/reframework/plugins/foo.dll'], 2050650, 2050650).supported, true)
  assert.equal(testReEnginePlugins(['pack/reframework/plugins/foo.dll'], 2050650, 2050650).supported, false)

  assert.equal(testReEngineReframeworkLoader(['pack/reframework/autorun/foo.lua', 'dinput8.dll'], 2050650, 2050650).supported, true)
  assert.equal(testReEngineReframework(['pack/reframework/autorun/foo.lua', 'dinput8.dll'], 2050650, 2050650).supported, false)

  assert.equal(testReEngineAutorun(['pack/autorun/foo.lua'], 2050650, 2050650).supported, true)
  assert.equal(testReEnginePlugins(['pack/plugins/foo.dll'], 2050650, 2050650).supported, true)
  assert.equal(testReEngineNatives(['pack/natives/stm/foo.mesh'], 2050650, 2050650).supported, true)
  assert.equal(testReEnginePak(['foo.pak'], 2050650, 2050650).supported, true)
  assert.equal(testReEnginePak(['readme.txt'], 2050650, 2050650).supported, false)
  assert.equal(testReEnginePak(['foo.pak'], 1, 2050650).supported, false)
})

test('natives installer builds marker-folder install destinations', () => {
  assert.deepEqual(
    installReEngineNatives(pathApi, ['SomeMod/natives/stm/weapon/foo.mesh']),
    {
      instructions: [
        { type: 'copy', source: 'SomeMod/natives/stm/weapon/foo.mesh', destination: 'natives/stm/weapon/foo.mesh' },
      ],
    },
  )
})

test('REFramework loader installer builds sibling instructions relative to dinput8 folder', () => {
  assert.deepEqual(
    installReEngineReframeworkLoader(pathApi, [
      'Wrapper/dinput8.dll',
      'Wrapper/reframework/autorun/foo.lua',
      'Other/readme.txt',
    ]),
    {
      instructions: [
        { type: 'copy', source: 'Wrapper/dinput8.dll', destination: 'dinput8.dll' },
        { type: 'copy', source: 'Wrapper/reframework/autorun/foo.lua', destination: 'reframework/autorun/foo.lua' },
      ],
    },
  )
})

test('assigns pak files after the current max game-root patch number', async () => {
  const fsApi = {
    async readdir() {
      return ['re_chunk_000.pak', 're_chunk_000.pak.patch_003.pak', 'notes.txt']
    },
    async stat(filePath) {
      return { isFile: !filePath.endsWith('/folder') }
    },
  }

  assert.equal(extractPatchNumber('re_chunk_000.pak.patch_012.pak'), 12)
  assert.equal(createReEnginePakName(4), 're_chunk_000.pak.patch_004.pak')
  assert.deepEqual(
    await installReEnginePak(pathApi, fsApi, ['foo.pak', 'nested/bar.pak'], '/game'),
    {
      instructions: [
        { type: 'copy', source: 'foo.pak', destination: 're_chunk_000.pak.patch_004.pak' },
        { type: 'copy', source: 'nested/bar.pak', destination: 're_chunk_000.pak.patch_005.pak' },
      ],
    },
  )
})
