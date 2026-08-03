import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { atomicWrite, buildRedmodDeployArgs, serializeAndDeployRedmods } from '../../src/loadOrder/deployer'
import {
  createRedmodEntryId,
  deserializeRedmodLoadOrder,
  getEnabledRedmodNames,
  isRedmodLoadOrderModRelevant,
} from '../../src/loadOrder/provider'
import { extractRedmodAttributes } from '../../src/redmod/attributes'
import { extractFomodRedmodAttributes } from '../../src/redmod/fomodAttributes'
import { MOD_TYPE } from '../../src/constants'
import { fakeContext } from '../helpers/context'

function context(savedOrder: string[] = []) {
  return {
    appid: 1091500,
    gameId: 1091500,
    gamePath: 'D:/Games/Cyberpunk 2077',
    revision: 1,
    reason: 'open' as const,
    savedOrder,
    mods: [
      {
        modKey: '1_1',
        enabled: false,
        metaInfo: {
          name: 'First archive',
          cyberpunkRedmodInfo: [
            { name: 'Zulu', version: '1.0', relativePath: 'mods/Zulu' },
            { name: 'Alpha', version: '2.0', relativePath: 'mods/Alpha' },
          ],
        },
      },
      {
        modKey: '2_2',
        enabled: true,
        metaInfo: {
          name: 'Second archive',
          cyberpunkRedmodInfo: [{ name: 'Middle', version: '3.0', relativePath: 'mods/Middle' }],
        },
      },
    ],
  }
}

test('REDmod load order matches Vortex semantics for saved, disabled, and new entries', () => {
  const savedMiddle = createRedmodEntryId('2_2', 'mods/Middle')
  const entries = deserializeRedmodLoadOrder(context([savedMiddle]))
  assert.equal(entries[0].id, savedMiddle)
  assert.deepEqual(entries.slice(1).map((entry) => (entry.data as any).relativePath), ['mods/Alpha', 'mods/Zulu'])
  assert.equal(entries[1].enabled, false)
  assert.deepEqual(getEnabledRedmodNames(entries), ['Middle'])
})

test('REDmod load order removes uninstalled paths and appends renamed multi-type entries', () => {
  const oldAlpha = createRedmodEntryId('1_1', 'mods/Alpha')
  const savedMiddle = createRedmodEntryId('2_2', 'mods/Middle')
  const value = context([oldAlpha, savedMiddle])
  Object.assign(value.mods[0], { modType: 'cyberpunk2077-multi-type' })
  value.mods[0].metaInfo.cyberpunkRedmodInfo = [
    { name: 'Renamed', version: '2.1', relativePath: 'mods/Renamed' },
  ]
  const entries = deserializeRedmodLoadOrder(value)
  assert.deepEqual(entries.map((entry) => entry.id), [
    savedMiddle,
    createRedmodEntryId('1_1', 'mods/Renamed'),
  ])
  assert.ok(!entries.some((entry) => entry.id === oldAlpha))
})

test('REDmod modlist keeps UI order, filters disabled entries, and uses semantic execFile arguments', () => {
  const entries = deserializeRedmodLoadOrder(context())
  const ordered = [entries[2], entries[0], entries[1]]
  assert.deepEqual(getEnabledRedmodNames(ordered), ['Middle'])
  assert.deepEqual(buildRedmodDeployArgs('D:/Games/Cyberpunk 2077', 'D:/Games/Cyberpunk 2077/H2077/modlist.txt'), [
    'deploy',
    '-force',
    '-root=D:/Games/Cyberpunk 2077',
    `-rttiSchemaFile=${path.join('D:/Games/Cyberpunk 2077', 'tools/redmod/metadata.json')}`,
    '-modlist=D:/Games/Cyberpunk 2077/H2077/modlist.txt',
  ])
  assert.equal(getEnabledRedmodNames([]).join('\r\n'), '')
})

test('REDmod deployment writes enabled-only CRLF modlist and diagnostics before running the CLI', async () => {
  const entries = deserializeRedmodLoadOrder(context())
  const writes: Array<{ path: string, data: string }> = []
  const runs: Array<{ executable: string, gamePath: string, modlistPath: string }> = []
  await serializeAndDeployRedmods(entries, context(), {
    fileExists: async () => true,
    atomicWrite: async (filePath, data) => { writes.push({ path: filePath, data }) },
    runRedmod: async (executable, gamePath, modlistPath) => { runs.push({ executable, gamePath, modlistPath }) },
  })
  assert.equal(writes[0].data, 'Middle')
  assert.match(writes[1].path.replace(/\\/g, '/'), /H2077\/Load Order\/heybox-managed\.json$/)
  assert.deepEqual(JSON.parse(writes[1].data).entries.map((entry: any) => entry.id), entries.map((entry) => entry.id))
  assert.equal(runs.length, 1)
  assert.match(runs[0].executable.replace(/\\/g, '/'), /tools\/redmod\/bin\/redMod\.exe$/)
})

test('REDmod deployment still writes an empty modlist before reporting missing DLC', async () => {
  const writes: string[] = []
  await assert.rejects(
    serializeAndDeployRedmods([], context(), {
      fileExists: async () => false,
      atomicWrite: async (_filePath, data) => { writes.push(data) },
      runRedmod: async () => { throw new Error('must not run') },
    }),
    (error: any) => error.code === 'REDMOD_TOOL_MISSING',
  )
  assert.equal(writes[0], '')
  assert.equal(writes.length, 2)
})

test('REDmod atomic writer replaces an existing file without leaving temp files', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cyberpunk-redmod-write-'))
  try {
    const target = path.join(root, 'H2077', 'modlist.txt')
    await atomicWrite(target, 'First')
    await atomicWrite(target, 'Second')
    assert.equal(await fs.promises.readFile(target, 'utf8'), 'Second')
    assert.deepEqual(await fs.promises.readdir(path.dirname(target)), ['modlist.txt'])
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true })
  }
})

test('install-time extractor discovers the same wrapped REDmod metadata before first enable', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cyberpunk-redmod-'))
  try {
    const redmodRoot = path.join(root, 'Gift', 'mods', 'Example')
    await fs.promises.mkdir(path.join(redmodRoot, 'archives'), { recursive: true })
    await fs.promises.writeFile(path.join(redmodRoot, 'info.json'), JSON.stringify({ name: 'Example', version: '1.2.3' }))
    await fs.promises.writeFile(path.join(redmodRoot, 'archives', 'content.archive'), 'fixture')
    const attributes = await extractRedmodAttributes({}, root)
    assert.deepEqual(attributes.cyberpunkRedmodInfo, [
      { name: 'Example', version: '1.2.3', relativePath: 'mods/Example' },
    ])
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true })
  }
})

test('install-time extractor does not invent entries for optional REDmods inside FOMOD archives', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cyberpunk-fomod-redmod-'))
  try {
    await fs.promises.mkdir(path.join(root, 'fomod'), { recursive: true })
    await fs.promises.writeFile(path.join(root, 'fomod', 'ModuleConfig.xml'), '<config />')
    const redmodRoot = path.join(root, 'mods', 'OptionalRedmod')
    await fs.promises.mkdir(path.join(redmodRoot, 'archives'), { recursive: true })
    await fs.promises.writeFile(path.join(redmodRoot, 'info.json'), JSON.stringify({ name: 'Optional', version: '1.0' }))
    await fs.promises.writeFile(path.join(redmodRoot, 'archives', 'content.archive'), 'fixture')
    assert.deepEqual(await extractRedmodAttributes({}, root), {})
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true })
  }
})

function fomodSelection(instructions: Array<{ type: 'copy'; source: string; destination: string }>) {
  return {
    appid: 1091500,
    gameId: 1091500,
    modKey: '9_9',
    installerTypeId: MOD_TYPE.fomod,
    modTypeId: MOD_TYPE.fomod,
    stagingPath: 'D:/staging',
    archiveFiles: instructions.map((instruction) => instruction.source),
    instructions,
  }
}

test('FOMOD post-installer projection emits only selected REDmods and clears an empty selection', async () => {
  const empty = fakeContext()
  assert.deepEqual(await extractFomodRedmodAttributes(empty.context, fomodSelection([])), {
    cyberpunkRedmodInfo: [],
    cyberpunkRedmodRequiresDeploy: false,
  })

  const selected = fakeContext({
    'D:/staging/Wrapper/Choices/Alpha/info.json': JSON.stringify({ name: 'Alpha', version: '1.0' }),
    'D:/staging/Wrapper/Choices/Beta/info.json': JSON.stringify({ name: 'Beta', version: '2.0' }),
  })
  const attributes = await extractFomodRedmodAttributes(selected.context, fomodSelection([
    { type: 'copy', source: 'Wrapper/Choices/Alpha/info.json', destination: 'mods/Alpha/info.json' },
    { type: 'copy', source: 'Wrapper/Choices/Alpha/content.archive', destination: 'mods/Alpha/archives/content.archive' },
    { type: 'copy', source: 'Wrapper/Choices/Beta/info.json', destination: 'mods/Beta/info.json' },
    { type: 'copy', source: 'Wrapper/Choices/Beta/content.archive', destination: 'mods/Beta/archives/content.archive' },
  ]))
  assert.deepEqual(attributes.cyberpunkRedmodInfo, [
    { name: 'Alpha', version: '1.0', relativePath: 'mods/Alpha' },
    { name: 'Beta', version: '2.0', relativePath: 'mods/Beta' },
  ])
  assert.equal(attributes.cyberpunkRedmodRequiresDeploy, true)
})

test('FOMOD post-installer projection follows case-insensitive last-copy-wins semantics', async () => {
  const fixture = fakeContext({
    'D:/staging/old/info.json': JSON.stringify({ name: 'Old', version: '1.0' }),
    'D:/staging/new/info.json': JSON.stringify({ name: 'New', version: '2.0' }),
  })
  const attributes = await extractFomodRedmodAttributes(fixture.context, fomodSelection([
    { type: 'copy', source: 'old/info.json', destination: 'mods/Example/INFO.JSON' },
    { type: 'copy', source: 'new/info.json', destination: 'MODS/example/info.json' },
    { type: 'copy', source: 'new/content.archive', destination: 'mods/example/archives/content.archive' },
  ]))
  assert.deepEqual(attributes.cyberpunkRedmodInfo, [
    { name: 'New', version: '2.0', relativePath: 'mods/example' },
  ])
})

test('FOMOD post-installer projection rejects selected malformed REDmods', async () => {
  const fixture = fakeContext({
    'D:/staging/choice/info.json': JSON.stringify({ name: 'Broken', version: '1.0' }),
  })
  await assert.rejects(
    extractFomodRedmodAttributes(fixture.context, fomodSelection([
      { type: 'copy', source: 'choice/info.json', destination: 'mods/Broken/info.json' },
    ])),
    (error: any) => error.code === 'FOMOD_INVALID_CONFIG',
  )
})

test('REDmod load order relevance accepts selected FOMOD metadata and rejects empty metadata', () => {
  const base = { modKey: '9_9', modType: MOD_TYPE.fomod, enabled: false, metaInfo: {} }
  assert.equal(isRedmodLoadOrderModRelevant(base), false)
  assert.equal(isRedmodLoadOrderModRelevant({
    ...base,
    metaInfo: { cyberpunkRedmodInfo: [{ name: 'Example', version: '1.0', relativePath: 'mods/Example' }] },
  }), true)
})
