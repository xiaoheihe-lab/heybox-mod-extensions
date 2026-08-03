import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultSelections,
  evaluateDependency,
  expandFileItems,
  findFomodRoot,
  loadImageDataUrl,
  normalizeArchivePath,
  parseModuleConfig,
  parseInfoXml,
  runFomod,
  assertSafeXml,
  assertSupportedXmlFeatures,
  validateStepSelections,
} from '../dist/index.js'

test('finds a case-insensitive wrapped ModuleConfig', () => {
  assert.deepEqual(findFomodRoot(['Wrapper/FOMOD/ModuleConfig.xml', 'Wrapper/files/a.bin']), {
    configPath: 'Wrapper/FOMOD/ModuleConfig.xml',
    root: 'Wrapper',
  })
  assert.equal(findFomodRoot(['Too/Deep/FOMOD/ModuleConfig.xml']), null)
})

test('rejects path traversal', () => {
  assert.throws(() => normalizeArchivePath('../outside.bin'), /traversal/)
  assert.throws(() => normalizeArchivePath('C:/outside.bin'), /Unsafe/)
  assert.throws(() => findFomodRoot(['C:/fomod/ModuleConfig.xml']), /Unsafe/)
})

test('parses steps, groups, flags and file mappings from xml2js-shaped data', () => {
  const model = parseModuleConfig({
    config: [{
      moduleName: ['Example'],
      requiredInstallFiles: [{ file: [{ $: { source: 'base.txt', destination: 'base.txt', priority: '1' } }] }],
      installSteps: [{ $: { order: 'Explicit' }, installStep: [{
        $: { name: 'Features' },
        optionalFileGroups: [{ group: [{
          $: { name: 'Choose one', type: 'SelectExactlyOne' },
          plugins: [{ plugin: [{
            $: { name: 'A' },
            files: [{ folder: [{ $: { source: 'a', destination: 'mods' } }] }],
            conditionFlags: [{ flag: [{ $: { name: 'picked' }, _: 'a' }] }],
            typeDescriptor: [{ type: [{ $: { name: 'Recommended' } }] }],
          }, {
            $: { name: 'B' },
            typeDescriptor: [{ type: [{ $: { name: 'Optional' } }] }],
          }] }],
        }] }],
      }] }],
    }],
  })
  assert.equal(model.moduleName, 'Example')
  assert.equal(model.steps[0].groups[0].type, 'SelectExactlyOne')
  assert.deepEqual(model.steps[0].groups[0].options[0].flags, { picked: 'a' })
  assert.equal(model.requiredFiles[0].priority, 1)
})

test('parses optional info.xml display metadata', () => {
  assert.deepEqual(parseInfoXml({ fomod: [{ Name: ['Example'], Author: ['Author'], Version: ['1.2.3'], Website: ['https://example.invalid'] }] }), {
    name: 'Example', author: 'Author', version: '1.2.3', website: 'https://example.invalid',
  })
})

test('applies group defaults and validation', () => {
  const group = {
    id: 'g', name: 'g', type: 'SelectExactlyOne', options: [
      { id: 'a', name: 'A' }, { id: 'b', name: 'B' },
    ],
  }
  const types = { a: 'Recommended', b: 'Optional' }
  assert.deepEqual(defaultSelections(group, types), ['a'])
  assert.deepEqual(validateStepSelections({ id: 's', name: 's', groups: [group] }, ['b'], types), { g: ['b'] })
  assert.throws(() => validateStepSelections({ id: 's', name: 's', groups: [group] }, [], types), /exactly one/)

  const options = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
  const optionalTypes = { a: 'Optional', b: 'Optional' }
  assert.deepEqual(validateStepSelections({ id: 's', name: 's', groups: [{ id: 'any', name: 'any', type: 'SelectAny', options }] }, [], optionalTypes), { any: [] })
  assert.deepEqual(validateStepSelections({ id: 's', name: 's', groups: [{ id: 'all', name: 'all', type: 'SelectAll', options }] }, ['a', 'b'], optionalTypes), { all: ['a', 'b'] })
  assert.deepEqual(validateStepSelections({ id: 's', name: 's', groups: [{ id: 'most', name: 'most', type: 'SelectAtMostOne', options }] }, ['a'], optionalTypes), { most: ['a'] })
  assert.deepEqual(validateStepSelections({ id: 's', name: 's', groups: [{ id: 'least', name: 'least', type: 'SelectAtLeastOne', options }] }, ['b'], optionalTypes), { least: ['b'] })
})

test('evaluates nested flags and file dependencies and rejects unsupported dependencies', () => {
  const state = { flags: { mode: 'full' }, files: { 'bin/x.dll': 'Active' } }
  assert.equal(evaluateDependency({ kind: 'all', children: [
    { kind: 'flag', flag: 'mode', value: 'full' },
    { kind: 'file', path: 'bin/x.dll', state: 'Active' },
  ] }, state), true)
  assert.throws(() => evaluateDependency({ kind: 'unsupported', feature: 'gameDependency 2.0' }, state), /Unsupported/)
  assert.throws(() => evaluateDependency({ kind: 'file', path: 'plugin.esp', state: 'Inactive' }, state), /Inactive/)
})

test('expands folders and applies stable priority last-wins semantics', () => {
  const instructions = expandFileItems([
    { kind: 'file', source: 'low.txt', destination: 'same.txt', priority: 0, order: 0 },
    { kind: 'folder', source: 'folder', destination: 'mods', priority: 1, order: 1 },
    { kind: 'file', source: 'high.txt', destination: 'same.txt', priority: 2, order: 2 },
  ], ['low.txt', 'high.txt', 'folder/a.txt', 'folder/sub/b.txt'], '')
  assert.deepEqual(instructions.map(item => [item.source, item.destination]), [
    ['folder/a.txt', 'mods/a.txt'],
    ['folder/sub/b.txt', 'mods/sub/b.txt'],
    ['high.txt', 'same.txt'],
  ])
})

test('back rolls choices forward again and final instructions persist the new selection', async () => {
  const option = (id, file, flags = {}) => ({
    id, name: id, files: [{ kind: 'file', source: file, destination: file, priority: 0, order: 0 }], flags,
    type: { defaultType: 'Optional', patterns: [] },
  })
  const model = {
    moduleName: 'Flow', requiredFiles: [], conditionalFiles: [], allFileDependencyPaths: [],
    steps: [
      { id: 's0', name: 'First', groups: [{ id: 'g0', name: 'Pick', type: 'SelectExactlyOne', options: [option('a', 'a.txt', { branch: 'a' }), option('b', 'b.txt', { branch: 'b' })] }] },
      { id: 's1', name: 'Second', groups: [{ id: 'g1', name: 'Finish', type: 'SelectExactlyOne', options: [option('c', 'c.txt')] }] },
    ],
  }
  const responses = [
    { action: 'next', selectedOptionIds: ['a'] },
    { action: 'back', selectedOptionIds: [] },
    { action: 'next', selectedOptionIds: ['b'] },
    { action: 'install', selectedOptionIds: ['c'] },
  ]
  const closed = []
  const result = await runFomod({
    model, configHash: 'hash', archiveFiles: ['a.txt', 'b.txt', 'c.txt'], packageRoot: '', stagingPath: 'stage', forceInteractive: true,
    api: {
      requestStep: async () => responses.shift(),
      closeSession: async payload => closed.push(payload),
      resolveFileDependencies: async () => ({ states: {} }),
    },
    pathApi: { join: (...parts) => parts.join('/') },
    fsApi: { readFileAsync: async () => Buffer.alloc(0) },
  })
  assert.deepEqual(result.instructions.filter(item => item.type === 'copy').map(item => item.source), ['b.txt', 'c.txt'])
  assert.deepEqual(result.state.selections, { s0: ['b'], s1: ['c'] })
  assert.equal(closed.at(-1).status, 'completed')
})

test('reuses a valid saved state silently and rejects unsafe XML declarations', async () => {
  let requested = 0
  const model = {
    moduleName: 'Reuse', requiredFiles: [], conditionalFiles: [], allFileDependencyPaths: [],
    steps: [{ id: 's0', name: 'Only', groups: [{ id: 'g0', name: 'Pick', type: 'SelectExactlyOne', options: [{ id: 'a', name: 'A', files: [], flags: {}, type: { defaultType: 'Optional', patterns: [] } }] }] }],
  }
  await runFomod({
    model, configHash: 'same', archiveFiles: [], packageRoot: '', stagingPath: 'stage', forceInteractive: false,
    storedState: { schemaVersion: 1, protocolVersion: '1.0', configHash: 'same', selections: { s0: ['a'] }, groupSelections: { g0: ['a'] } },
    api: { requestStep: async () => { requested += 1 }, closeSession: async () => {}, resolveFileDependencies: async () => ({ states: {} }) },
    pathApi: { join: (...parts) => parts.join('/') }, fsApi: { readFileAsync: async () => Buffer.alloc(0) },
  })
  assert.equal(requested, 0)
  assert.throws(() => assertSafeXml('<!DOCTYPE x [<!ENTITY y "z">]><config/>'), /DTD and ENTITY/)
  assert.throws(() => assertSupportedXmlFeatures('<config><moduleDependencies><gameDependency version="2.0" /></moduleDependencies></config>'), (error) => error.code === 'FOMOD_UNSUPPORTED_FEATURE')
})

test('loads supported images as bounded data URLs and degrades invalid images', async () => {
  const pathApi = { join: (...parts) => parts.join('/') }
  assert.equal(await loadImageDataUrl('image.png', '', 'stage', pathApi, {
    readFileAsync: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  }), 'data:image/png;base64,iVBORw==')
  assert.equal(await loadImageDataUrl('image.bmp', '', 'stage', pathApi, {
    readFileAsync: async () => Buffer.alloc(1),
  }), undefined)
  assert.equal(await loadImageDataUrl('large.jpg', '', 'stage', pathApi, {
    readFileAsync: async () => Buffer.alloc(5 * 1024 * 1024 + 1),
  }), undefined)
  assert.equal(await loadImageDataUrl('/absolute.png', '', 'stage', pathApi, {
    readFileAsync: async () => Buffer.alloc(1),
  }), undefined)
})
