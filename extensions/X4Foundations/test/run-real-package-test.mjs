import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const argument = process.argv.indexOf('--archive')
if (argument < 0 || !process.argv[argument + 1]) throw new Error('请使用 test:real --archive <ZIP路径>')
if (process.platform !== 'win32') throw new Error('真实 ZIP 回放使用 Windows PowerShell 和 .NET，请在 Windows 上运行。')
const archive = path.resolve(process.argv[argument + 1])
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'x4-real-'))
const stage = path.join(temporary, 'stage')
const game = path.join(temporary, 'game')
const target = path.join(game, 'extensions')
const quote = (value) => "'" + value.replaceAll("'", "''") + "'"
function powershell(script) {
  const encoded = Buffer.from("$ErrorActionPreference = 'Stop'\n" + script, 'utf16le').toString('base64')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  if (result.status !== 0) throw new Error('压缩包处理失败：' + result.stderr)
  return JSON.parse(result.stdout.replace(/^\uFEFF/, '').trim())
}
const hash = (filename) => createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
const write = (filename, text) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, text)
}

try {
  const outfile = path.join(temporary, 'adapter.cjs')
  await build({
    entryPoints: [fileURLToPath(new URL('../index.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', outfile, external: ['heybox-mod-api'],
  })
  const { installX4Mod, normalizeArchivePath } = require(outfile)
  const files = powershell(
    "[Console]::OutputEncoding = [Text.Encoding]::UTF8\n" +
    "Add-Type -AssemblyName System.IO.Compression.FileSystem\n" +
    "$zip = [IO.Compression.ZipFile]::OpenRead(" + quote(archive) + ")\n" +
    "try { ConvertTo-Json -InputObject @($zip.Entries | ForEach-Object { $_.FullName }) -Compress } finally { $zip.Dispose() }")
  // 解压前先调用正式路径校验，防止恶意 ZIP 写出临时目录。
  files.forEach(normalizeArchivePath)
  const metadata = powershell(
    "[Console]::OutputEncoding = [Text.Encoding]::UTF8\n" +
    "Add-Type -AssemblyName System.IO.Compression.FileSystem\n" +
    "[IO.Compression.ZipFile]::ExtractToDirectory(" + quote(archive) + ", " + quote(stage) + ")\n" +
    "$rows = @(Get-ChildItem -LiteralPath " + quote(stage) + " -Recurse -File -Filter content.xml | ForEach-Object {\n" +
    "  $text = [IO.File]::ReadAllText($_.FullName)\n" +
    "  $settings = [Xml.XmlReaderSettings]::new(); $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit; $settings.XmlResolver = $null\n" +
    "  $reader = [Xml.XmlReader]::Create([IO.StringReader]::new($text), $settings)\n" +
    "  try { $doc = [Xml.XmlDocument]::new(); $doc.XmlResolver = $null; $doc.Load($reader)\n" +
    "    $id = if ($doc.DocumentElement.get_Name() -eq 'content') { $doc.DocumentElement.GetAttribute('id') } else { '' }\n" +
    "    @{ text = $text; id = $id }\n" +
    "  } finally { $reader.Dispose() }\n" +
    "})\nConvertTo-Json -InputObject $rows -Compress")
  const xml = new Map(metadata.map(({ text, id }) => [text, { content: { $: { id } } }]))
  const sentinels = [
    path.join(target, 'manual_neighbor/content.xml'),
    path.join(target, 'ego_dlc_split/content.xml'),
    path.join(temporary, 'Documents/Egosoft/X4/content.xml'),
  ]
  write(path.join(game, 'X4.exe'), '')
  write(sentinels[0], '<content id="manual_neighbor"/>')
  write(sentinels[1], '<content id="ego_dlc_split"/>')
  write(sentinels[2], '<content><extension id="noelle_mod" enabled="false"/></content>')
  xml.set(fs.readFileSync(sentinels[0], 'utf8'), { content: { $: { id: 'manual_neighbor' } } })
  xml.set(fs.readFileSync(sentinels[1], 'utf8'), { content: { $: { id: 'ego_dlc_split' } } })
  const before = sentinels.map(hash)
  const managed = []
  const context = { api: {
    util: {
      GameStoreHelper: { findByAppId: async () => ({ gamePath: game }) },
      fileParseApi: { parseXmlToObject: async (text) => {
        if (!xml.has(text)) throw new Error('没有匹配的 .NET XML 解析结果')
        return xml.get(text)
      } },
    },
    vfs: { runManagedDeploymentMutation: async (_options, callback) => callback({ entries: managed }) },
  } }
  const result = await installX4Mod(context, files, stage)
  const copies = result.instructions.filter((item) => item.type === 'copy')
  assert.ok(copies.length > 0)
  // 样本包全部资源均应部署；文件数从 ZIP 动态取得，不硬编码测试包名称。
  const sourceFiles = files.filter((file) => !/[\\/]$/.test(file))
  assert.equal(copies.length, sourceFiles.length, '真实样本存在未部署文件')
  for (const copy of copies) {
    assert.ok(!copy.destination.toLowerCase().startsWith('extensions/'), '部署目录重复')
    const source = path.join(stage, normalizeArchivePath(copy.source))
    const destination = path.join(target, copy.destination)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination)
    assert.equal(fs.statSync(source).size, fs.statSync(destination).size)
    assert.equal(hash(source), hash(destination))
    managed.push({ absolutePath: destination, exists: true })
  }
  const attributes = result.instructions.find((item) => item.type === 'attribute').value
  for (const extension of attributes) {
    const manifestCopy = copies.find((item) => item.destination.toLowerCase() === (extension.folder + '/content.xml').toLowerCase())
    assert.ok(manifestCopy, '缺少目标清单')
    const parsed = xml.get(fs.readFileSync(path.join(target, manifestCopy.destination), 'utf8'))
    assert.equal(parsed.content.$.id, extension.id)
  }
  const laterFile = path.join(target, attributes[0].folder, 'user-added.txt')
  write(laterFile, '用户在安装后添加的文件')
  const updated = await installX4Mod(context, files, stage)
  assert.deepEqual(updated, result, '托管升级不应改变部署结果')
  // 仅模拟撤回记录中的文件，不冒充小黑盒客户端的禁用/卸载实现。
  for (const item of managed) fs.unlinkSync(item.absolutePath)
  assert.equal(fs.readFileSync(laterFile, 'utf8'), '用户在安装后添加的文件')
  assert.deepEqual(sentinels.map(hash), before)
  console.log(JSON.stringify({
    archive: path.basename(archive), files: copies.length,
    catDat: copies.filter((item) => /\.(cat|dat)$/i.test(item.source)).length,
    extensions: attributes, sha256: '全部一致',
    managedUpdate: '通过', simulatedWithdrawal: '通过；手动文件和 DLC 保留',
    limitation: 'XML API 为 .NET 解析结果替身；尚未验证真实 SDK、客户端撤回与游戏内识别',
  }, null, 2))
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
