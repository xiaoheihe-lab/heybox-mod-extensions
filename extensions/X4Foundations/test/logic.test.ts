import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import main, { installX4Mod, normalizeArchivePath, testX4Mod } from '../index'

// XML API 使用客户端对象结构的替身；真实包测试另外通过 .NET 解析 XML。
async function fixture(run: (f: any) => Promise<void>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x4-unit-'))
  const game = path.join(root, 'game')
  const stage = path.join(root, 'stage')
  const xml = new Map<string, unknown>()
  const managed: any[] = []
  const registered: any = {}
  const context: any = {
    api: {
      util: {
        GameStoreHelper: { findByAppId: async () => ({ gamePath: game }) },
        fileParseApi: { parseXmlToObject: async (text: string) => {
          if (!xml.has(text)) throw new Error('XML 格式错误')
          return xml.get(text)
        } },
      },
      vfs: { runManagedDeploymentMutation: async (_options: unknown, callback: any) => callback({ entries: managed }) },
    },
    registerGame: (spec: any) => { registered.game = spec },
    registerModType: (...args: any[]) => { registered.type = args },
    registerInstaller: (...args: any[]) => { registered.installer = args },
  }
  function write(base: string, name: string, data: string | Buffer) {
    const filename = path.join(base, ...name.split('/'))
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.writeFileSync(filename, data)
    return filename
  }
  function content(name: string, id = 'test', base = stage) {
    const text = 'fixture:' + xml.size
    xml.set(text, { content: { $: { id } } })
    return write(base, name, text)
  }
  fs.mkdirSync(stage, { recursive: true })
  write(game, 'X4.exe', '')
  try {
    await run({ root, game, stage, xml, managed, context, registered, write, content,
      install: (files: string[], options?: any) => installX4Mod(context, files, stage, options) })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

for (const [manifest, folder] of [
  ['extensions/content.xml', 'extensions'],
  ['author/content.xml', 'author'], ['extensions/author/content.xml', 'author'],
  ['download/v2/author/content.xml', 'author'], ['content.xml', 'test'],
]) {
  test('部署布局：' + manifest, () => fixture(async (f) => {
    f.content(manifest)
    const prefix = manifest.slice(0, -'content.xml'.length)
    const files = [manifest, ...['ext_01.cat', 'ext_01.dat', 'script.lua', 'assets/data', 't/text.xml'].map((name) => prefix + name)]
    for (const file of files.slice(1)) f.write(f.stage, file, Buffer.from([0, 255, 3]))
    const result = await f.install(files)
    const copies = result.instructions.filter((item: any) => item.type === 'copy')
    assert.equal(copies.length, 6)
    assert.equal(copies[0].destination, folder + '/content.xml')
    assert.equal(copies[1].destination, folder + '/ext_01.cat')
    assert.equal(result.modType, 'x4-extension')
    assert.deepEqual(result.instructions.at(-1).value, [{ id: 'test', folder }])
    assert.ok(copies.every((item: any) => item.destination.startsWith(folder + '/')))
  }))
}

test('并列扩展整体部署并忽略包装外文件和系统垃圾', () => fixture(async (f) => {
  f.content('a/content.xml', 'one')
  f.content('b/content.xml', 'two')
  const r = await f.install(['a/content.xml', 'b/content.xml', 'readme.txt', 'a/Thumbs.db', 'a/', '__MACOSX/._file'])
  assert.equal(r.instructions.filter((i: any) => i.type === 'copy').length, 2)
  assert.equal(r.instructions.at(-1).value.length, 2)
}))

for (const [paths, ids, error] of [
  [['a/content.xml', 'b/content.xml'], ['same', 'SAME'], /重复/],
  [['a/content.xml', 'wrapper/A/content.xml'], ['one', 'two'], /重复/],
  [['a/content.xml', 'a/b/content.xml'], ['one', 'two'], /嵌套/],
  [['content.xml', 'b/content.xml'], ['one', 'two'], /嵌套/],
  [['options/a/content.xml'], ['one'], /可选/],
  [['optional/a/content.xml'], ['one'], /可选/],
  [['ego_dlc_fake/content.xml'], ['test'], /官方 DLC/],
  [['a/content.xml'], ['ego_dlc_fake'], /官方 DLC/],
  [['content.xml'], ['../evil'], /不安全/],
  [['content.xml'], ['a/b'], /不安全/],
  [['a/content.xml'], [''], /非空/],
] as const) {
  test('拒绝问题扩展：' + paths.join(',') + ' ' + ids.join(','), () => fixture(async (f) => {
    paths.forEach((p, i) => f.content(p, ids[i]))
    await assert.rejects(f.install([...paths]), error)
  }))
}

for (const unsafe of ['../a', '/a', 'C:/a', 'C:a', '\\\\server\\a', 'a/../b', 'a//b',
  'a/con.xml', 'a/NUL', 'a/COM1.dat', 'a/LPT².txt', 'a/name.', 'a/name ', 'a/a:b', 'a/a?b', 'a/\0b']) {
  test('拒绝危险路径：' + JSON.stringify(unsafe), () => {
    assert.throws(() => normalizeArchivePath(unsafe), /不安全|绝对路径/)
  })
}
test('接受普通名称及反斜杠，不能把 console 误判为 CON', () => {
  assert.equal(normalizeArchivePath('./console\\models/file'), 'console/models/file')
})

test('大小写一致性及重复文件保护', () => fixture(async (f) => {
  f.content('Author/content.xml')
  const r = await f.install(['Author/content.xml', 'author/data'])
  assert.equal(r.instructions[1].destination, 'Author/data')
  await assert.rejects(f.install(['Author/content.xml', 'author/CONTENT.XML']), /重复/)
  await assert.rejects(f.install(['Author/content.xml', 'fomod/info.xml']), /FOMOD/)
}))

test('损坏、用户状态、无法读取的清单与缺少清单', () => fixture(async (f) => {
  f.write(f.stage, 'a/content.xml', '<broken')
  await assert.rejects(f.install(['a/content.xml']), /无法读取/)
  f.xml.set('<content><extension /></content>', { content: { extension: [{ $: { id: 'test' } }] } })
  f.write(f.stage, 'a/content.xml', '<content><extension /></content>')
  await assert.rejects(f.install(['a/content.xml']), /非空/)
  await assert.rejects(f.install(['missing/content.xml']), /无法读取/)
  await assert.rejects(f.install(['readme.txt']), /没有找到/)
}))

test('手动同目录与不同目录同 ID 均不能覆盖', () => fixture(async (f) => {
  f.content('a/content.xml')
  f.content('extensions/a/content.xml', 'other', f.game)
  await assert.rejects(f.install(['a/content.xml']), /未托管/)
  fs.rmSync(path.join(f.game, 'extensions/a'), { recursive: true })
  f.content('extensions/other/content.xml', 'test', f.game)
  await assert.rejects(f.install(['a/content.xml']), /相同 ID/)
}))

test('托管升级允许，但手动新增的碰撞文件仍保护', () => fixture(async (f) => {
  f.content('a/content.xml')
  const manifest = f.content('extensions/a/content.xml', 'test', f.game)
  f.managed.push({ absolutePath: manifest, exists: true })
  await f.install(['a/content.xml'])
  f.write(f.game, 'extensions/a/added', 'manual')
  await assert.rejects(f.install(['a/content.xml', 'a/added']), /未托管文件/)
  f.managed.push({ absolutePath: path.join(f.game, 'extensions/a/added'), exists: true })
  await f.install(['a/content.xml', 'a/added'])
  delete f.context.api.vfs.runManagedDeploymentMutation
  await assert.rejects(f.install(['a/content.xml']), /未托管/)
}))

test('托管查询失败保守拒绝，官方 DLC 和邻近扩展不受影响', () => fixture(async (f) => {
  f.content('a/content.xml')
  f.content('extensions/a/content.xml', 'test', f.game)
  f.content('extensions/ego_dlc_split/content.xml', 'ego_dlc_split', f.game)
  f.context.api.vfs.runManagedDeploymentMutation = async () => { throw new Error('unavailable') }
  await assert.rejects(f.install(['a/content.xml']), /未托管/)
  fs.rmSync(path.join(f.game, 'extensions/a'), { recursive: true })
  await f.install(['a/content.xml'])
  assert.ok(fs.existsSync(path.join(f.game, 'extensions/ego_dlc_split/content.xml')))
}))

test('目标目录联接不可写入', () => fixture(async (f) => {
  f.content('a/content.xml')
  fs.mkdirSync(path.join(f.game, 'extensions'))
  fs.symlinkSync(f.stage, path.join(f.game, 'extensions/a'), 'junction')
  await assert.rejects(f.install(['a/content.xml']), /链接|联接/)
}))

test('文件和文件夹同名、DTD 声明整包拒绝', () => fixture(async (f) => {
  f.content('a/content.xml')
  await assert.rejects(f.install(['a/content.xml', 'a/assets', 'a/assets/model']), /同名冲突/)
  f.write(f.stage, 'a/content.xml', '<!DOCTYPE content><content id="test"/>')
  await assert.rejects(f.install(['a/content.xml']), /DTD/)
}))

test('组合包任一清单失败不返回部分结果，也不写入游戏', () => fixture(async (f) => {
  f.content('a/content.xml', 'one')
  f.write(f.stage, 'b/content.xml', '<invalid')
  await assert.rejects(f.install(['a/content.xml', 'b/content.xml']), /无法读取/)
  assert.equal(fs.existsSync(path.join(f.game, 'extensions')), false)
}))

test('注册、游戏发现和两种源参数形式', () => fixture(async (f) => {
  await main(f.context)
  assert.equal(f.registered.game.id, 392160)
  assert.equal(await f.registered.game.queryPath(), f.game)
  assert.equal(f.registered.type[3](), path.join('{gamePath}', 'extensions'))
  const filename = f.content('a/content.xml')
  const install = f.registered.installer[3]
  assert.equal((await install(['a/content.xml'], f.stage)).modType, 'x4-extension')
  assert.equal((await install(['a/content.xml'], { sourcePathByFile: { 'a/content.xml': filename } })).modType, 'x4-extension')
  assert.equal((await install(['a/content.xml'], undefined, { sourcePathByFile: { 'a/content.xml': filename } })).modType, 'x4-extension')
  assert.equal((await testX4Mod(['a/content.xml'], 392160)).supported, true)
  assert.equal((await testX4Mod(['a/content.xml'], 1)).supported, false)
  fs.unlinkSync(path.join(f.game, 'X4.exe'))
  assert.equal(await f.registered.game.queryPath(), undefined)
  await assert.rejects(f.install(['a/content.xml']), /未找到/)
}))
