import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { deserializeArchiveLoadOrder, orderArchives, serializeArchiveLoadOrder } from '../../src/loadOrder/archive'

test('new archives use ASCII neighbour slots and stale/case-mismatched modlist names reconcile', () => {
  assert.deepEqual(orderArchives(['a.archive', 'b.archive', 'c.archive'], ['C.ARCHIVE', 'missing.archive', 'a.archive', 'a.archive']),
    ['c.archive', 'a.archive', 'b.archive'])
  assert.deepEqual(orderArchives(['z.archive', 'B.archive', 'a.archive'], []), ['B.archive', 'a.archive', 'z.archive'])
})

test('Archive provider reads only direct archives, includes external files and removes alphabetical modlist', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cp2077-archives-'))
  const dir = path.join(root, 'archive/pc/mod')
  const context = { gamePath: root, gameId: 1091500, appid: 1091500, revision: 1,
    savedOrder: [], reason: 'open' as const, mods: [{ modKey: '1_2', enabled: true, metaInfo: {}, deployedPaths: ['archive/pc/mod/a.archive'] }] }
  try {
    await fs.mkdir(path.join(dir, 'nested'), { recursive: true })
    await Promise.all(['a.archive', 'z.archive', 'side.archive.xl', 'nested/ignored.archive'].map((name) => fs.writeFile(path.join(dir, name), 'fixture')))
    await fs.writeFile(path.join(dir, 'modlist.txt'), 'Z.ARCHIVE\r\na.archive\r\nstale.archive')
    const entries = await deserializeArchiveLoadOrder(context)
    assert.deepEqual(entries.map((entry) => entry.name), ['z.archive', 'a.archive'])
    assert.equal((entries[0] as any).external, true)
    assert.equal(entries[1].ownerModKey, '1_2')
    const pendingOrder = ['archive:a.archive', 'archive:z.archive']
    const retry = await deserializeArchiveLoadOrder({ ...context, savedOrder: pendingOrder, deploymentStatus: 'failed' })
    assert.deepEqual(retry.map((entry) => entry.id), pendingOrder)
    await serializeArchiveLoadOrder(entries, context)
    assert.equal(await fs.readFile(path.join(dir, 'modlist.txt'), 'utf8'), 'z.archive\r\na.archive')
    await serializeArchiveLoadOrder([...entries].reverse(), context)
    await assert.rejects(fs.stat(path.join(dir, 'modlist.txt')), { code: 'ENOENT' })
    const externallyReset = await deserializeArchiveLoadOrder({ ...context, savedOrder: entries.map((entry) => entry.id), deploymentStatus: 'clean' })
    assert.deepEqual(externallyReset.map((entry) => entry.name), ['a.archive', 'z.archive'])
    await fs.unlink(path.join(dir, 'a.archive'))
    await assert.rejects(serializeArchiveLoadOrder(entries, context), /文件已变化/)
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
