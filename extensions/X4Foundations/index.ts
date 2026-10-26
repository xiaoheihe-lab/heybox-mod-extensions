import fs from 'fs'
import path from 'path'
import type { IExtensionContext } from 'heybox-mod-api'

export const GAME_ID = 392160
export const MOD_TYPE_ID = 'x4-extension'
export const MOD_PATH = 'extensions'
export const EXTENSION_ATTRIBUTE = 'x4Extensions'
const EXECUTABLE = 'X4.exe'
const CONTENT_FILE = 'content.xml'

type ArchiveFile = { source: string; relative: string }
export type ExtensionInfo = { id: string; folder: string; root: string }
export type InstallOptions = { sourcePathByFile?: Record<string, string> }
type CopyInstruction = { type: 'copy'; source: string; destination: string }
type AttributeInstruction = { type: 'attribute'; key: string; value: Array<{ id: string; folder: string }> }

function validateSegment(segment: string): void {
  if (!segment || segment === '.' || segment === '..'
    || /[<>:"/\\|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment)
    || /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(segment)) {
    throw new Error(`安装包包含不安全的路径名称：${segment}`)
  }
}

// 校验原始路径，不通过改名或截断修复危险路径。
export function normalizeArchivePath(source: string): string {
  let value = String(source).replace(/\\/g, '/')
  if (value.startsWith('/') || /^[a-z]:/i.test(value)) {
    throw new Error(`安装包不允许使用绝对路径：${source}`)
  }
  value = value.replace(/^(\.\/)+/, '').replace(/\/+$/, '')
  for (const segment of value.split('/')) validateSegment(segment)
  return value
}

function isIgnored(relative: string): boolean {
  return relative.split('/').some((part) => ['.git', '.svn', '.hg', '__macosx'].includes(part.toLowerCase()))
    || ['.ds_store', 'thumbs.db', 'desktop.ini', '.gitignore', '.gitattributes'].includes(path.posix.basename(relative).toLowerCase())
    || path.posix.basename(relative).startsWith('._')
}

function normalizeFiles(files: string[]): ArchiveFile[] {
  const result: ArchiveFile[] = []
  const seen = new Set<string>()
  for (const source of files) {
    const relative = normalizeArchivePath(source)
    if (/[\/]$/.test(source) || isIgnored(relative)) continue
    const key = relative.toLowerCase()
    if (seen.has(key)) throw new Error(`安装包存在重复或大小写冲突的文件：${source}`)
    seen.add(key)
    result.push({ source, relative })
  }
  return result
}

function isContentFile(relative: string): boolean {
  return path.posix.basename(relative).toLowerCase() === CONTENT_FILE
}

function isUnderRoot(relative: string, root: string): boolean {
  return !root || relative.toLowerCase().startsWith(`${root.toLowerCase()}/`)
}

function sourcePath(file: ArchiveFile, stagingPath?: string, options?: InstallOptions): string {
  const mapped = options?.sourcePathByFile?.[file.source]
  if (mapped) return mapped
  if (!stagingPath) throw new Error('无法读取扩展清单：客户端未提供安装暂存目录或源文件映射。')
  return path.join(stagingPath, ...file.relative.split('/'))
}

// 使用客户端的 XML 解析器，仅读取元数据，原始清单仍原样部署。
async function readContent(context: IExtensionContext, filename: string): Promise<string> {
  try {
    const text = await fs.promises.readFile(filename, 'utf8')
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('不支持包含 DTD 或实体声明的扩展清单')
    const parsed = await context.api.util.fileParseApi.parseXmlToObject(text) as { content?: { $?: { id?: unknown } } }
    const id = parsed?.content?.$?.id
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('content.xml 必须包含非空的 content id，用户启用状态文件不能作为扩展安装')
    }
    if (/^ego_dlc_/i.test(id.trim())) throw new Error('不允许安装或覆盖官方 DLC')
    return id.trim()
  } catch (error) {
    throw new Error(`无法读取扩展清单 ${filename}：${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function testX4Mod(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && files.some((file) => !/[\/]$/.test(file) && /(^|[\/])content.xml$/i.test(file)),
    requiredFiles: [],
  }
}

// 每个 content.xml 定位一个扩展；并列扩展整体安装，嵌套或选项包拒绝自动选择。
async function discoverExtensions(context: IExtensionContext, files: ArchiveFile[], stagingPath?: string, options?: InstallOptions): Promise<ExtensionInfo[]> {
  if (files.some((file) => file.relative.split('/').some((part) => part.toLowerCase() === 'fomod'))) {
    throw new Error('首版不支持 FOMOD 选择安装，请下载已选好组件的普通扩展包。')
  }
  const manifests = files.filter((file) => isContentFile(file.relative))
  if (!manifests.length) throw new Error('安装包中没有找到 X4 扩展清单 content.xml。')
  const extensions: ExtensionInfo[] = []
  for (const manifest of manifests) {
    const dirname = path.posix.dirname(manifest.relative)
    const root = dirname === '.' ? '' : dirname
    if (root.split('/').some((part) => ['optional', 'options'].includes(part.toLowerCase()))) {
      throw new Error('安装包包含可选组件，请先选择需要的版本，不能同时自动安装所有选项。')
    }
    if (extensions.some((extension) => isUnderRoot(root.toLowerCase(), extension.root.toLowerCase())
      || isUnderRoot(extension.root.toLowerCase(), root.toLowerCase()))) {
      throw new Error('安装包中的扩展清单相互嵌套，请整理为并列的独立扩展目录。')
    }
    const id = await readContent(context, sourcePath(manifest, stagingPath, options))
    const folder = root ? path.posix.basename(root) : id
    validateSegment(folder)
    if (/^ego_dlc_/i.test(folder)) throw new Error('不允许以官方 DLC 目录作为安装目标。')
    if (extensions.some((extension) => extension.id.toLowerCase() === id.toLowerCase()
      || extension.folder.toLowerCase() === folder.toLowerCase())) {
      throw new Error(`安装包包含重复的扩展 ID 或目标目录：${id} / ${folder}`)
    }
    extensions.push({ id, folder, root })
  }
  return extensions
}

async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
  if (!game?.gamePath || !fs.existsSync(path.join(game.gamePath, EXECUTABLE))) return undefined
  return game.gamePath
}

export async function installX4Mod(context: IExtensionContext, files: string[], stagingPath?: string, options?: InstallOptions) {
  const entries = normalizeFiles(files)
  const extensions = await discoverExtensions(context, entries, stagingPath, options)
  const instructions: Array<CopyInstruction | AttributeInstruction> = []
  const destinations = new Set<string>()
  for (const extension of extensions) {
    for (const file of entries) {
      if (!isUnderRoot(file.relative, extension.root)) continue
      const inside = extension.root ? file.relative.slice(extension.root.length + 1) : file.relative
      const destination = path.posix.join(extension.folder, inside)
      const key = destination.toLowerCase()
      if (destinations.has(key)) throw new Error(`多个文件指向同一安装位置：${destination}`)
      destinations.add(key)
      instructions.push({ type: 'copy', source: file.source, destination })
    }
  }
  for (const destination of destinations) {
    const segments = destination.split('/')
    for (let end = 1; end < segments.length; end += 1) {
      if (destinations.has(segments.slice(0, end).join('/'))) {
        throw new Error('安装包存在文件与文件夹同名冲突，无法安全部署。')
      }
    }
  }
  const gamePath = await findGamePath(context)
  if (!gamePath) throw new Error('未找到 X4 游戏目录，请先在小黑盒中完成游戏发现。')
  await checkExistingExtensions(context, gamePath, extensions, instructions.filter((item): item is CopyInstruction => item.type === 'copy'))
  instructions.push({ type: 'attribute', key: EXTENSION_ATTRIBUTE, value: extensions.map(({ id, folder }) => ({ id, folder })) })
  return { instructions, modType: MOD_TYPE_ID }
}

type ManagedEntry = { absolutePath?: string; exists?: boolean }
type ManagedQuery = {
  runManagedDeploymentMutation?: (
    options: { modType: string },
    callback: (mutation: { entries?: ManagedEntry[] }) => void,
  ) => Promise<unknown>
}

async function statIfExists(filename: string) {
  try { return await fs.promises.lstat(filename) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new Error(`无法检查安装目标 ${filename}：${error instanceof Error ? error.message : String(error)}`)
  }
}

// 只读取托管记录，不移动、接管或删除现有文件。查询失败时按未托管处理。
async function managedFiles(context: IExtensionContext): Promise<Set<string>> {
  const result = new Set<string>()
  const vfs = context.api.vfs as unknown as ManagedQuery | undefined
  if (!vfs?.runManagedDeploymentMutation) return result
  try {
    await vfs.runManagedDeploymentMutation({ modType: MOD_TYPE_ID }, (mutation) => {
      for (const entry of mutation.entries || []) {
        if (entry.exists !== false && typeof entry.absolutePath === 'string' && path.isAbsolute(entry.absolutePath)) {
          result.add(path.resolve(entry.absolutePath).toLowerCase())
        }
      }
    })
    return result
  } catch { return new Set<string>() }
}

async function assertNoLinks(root: string, relative: string): Promise<void> {
  let current = root
  const parts = relative.split('/')
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index])
    const stat = await statIfExists(current)
    if (!stat) return
    if (stat.isSymbolicLink()) throw new Error(`安装目标包含符号链接或目录联接，不能安全部署：${current}`)
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`安装目标的上级路径不是文件夹：${current}`)
  }
}

// 未托管扩展禁止覆盖；已托管文件的升级和冲突由客户端处理。
async function checkExistingExtensions(context: IExtensionContext, gamePath: string, extensions: ExtensionInfo[], copies: CopyInstruction[]): Promise<void> {
  const root = path.join(gamePath, MOD_PATH)
  const stat = await statIfExists(root)
  if (!stat) return
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('游戏 extensions 路径不是普通目录，无法安全安装。')
  let owned: Set<string> | undefined
  const isOwned = async (filename: string) => {
    owned ??= await managedFiles(context)
    return owned.has(path.resolve(filename).toLowerCase())
  }
  for (const directory of await fs.promises.readdir(root, { withFileTypes: true })) {
    const sameFolder = extensions.some((extension) => extension.folder.toLowerCase() === directory.name.toLowerCase())
    if (directory.isSymbolicLink() && sameFolder) throw new Error(`目标扩展目录是链接，无法安全安装：${directory.name}`)
    if (!directory.isDirectory()) {
      if (sameFolder) throw new Error(`扩展目录与现有文件冲突：${directory.name}`)
      continue
    }
    const manifest = path.join(root, directory.name, CONTENT_FILE)
    const manifestStat = await statIfExists(manifest)
    let matchingId = false
    if (manifestStat?.isSymbolicLink()) {
      if (sameFolder) throw new Error(`现有扩展清单是链接：${manifest}`)
      continue
    }
    if (manifestStat?.isFile()) {
      try {
        const text = await fs.promises.readFile(manifest, 'utf8')
        if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('清单包含不支持的 XML 声明')
        const parsed = await context.api.util.fileParseApi.parseXmlToObject(text) as { content?: { $?: { id?: unknown } } }
        const id = parsed?.content?.$?.id
        matchingId = typeof id === 'string' && extensions.some((extension) => extension.id.toLowerCase() === id.trim().toLowerCase())
      } catch {
        throw new Error(`无法检查现有扩展清单，请先检查该文件：${manifest}`)
      }
    }
    if (matchingId && !sameFolder) throw new Error(`其他目录已安装相同 ID 的扩展，请先处理重复安装：${directory.name}`)
    if (sameFolder && !await isOwned(manifest)) throw new Error(`目标目录属于手动安装或未托管的扩展，不能覆盖：${directory.name}`)
  }
  for (const copy of copies) {
    await assertNoLinks(root, copy.destination)
    const filename = path.join(root, ...copy.destination.split('/'))
    const target = await statIfExists(filename)
    if (!target) continue
    if (!target.isFile() || !await isOwned(filename)) throw new Error(`目标存在未托管文件，不能覆盖：${copy.destination}`)
  }
}

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: 'X4: Foundations',
    shortName: 'X4',
    executable: EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    modPath: MOD_PATH,
    modPathIsRelative: true,
    queryPath: () => findGamePath(context),
    queryModPath: () => MOD_PATH,
    mergeMods: true,
    requiresCleanup: true,
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, customOpenModsPath: MOD_PATH, supportsSymlinks: false },
  })
  context.registerModType(MOD_TYPE_ID, 25, (gameId: number | string) => Number(gameId) === GAME_ID,
    () => path.join('{gamePath}', MOD_PATH), () => Promise.resolve(false), { name: 'X4 原生扩展' })
  context.registerInstaller(MOD_TYPE_ID, 25, testX4Mod, (files, stagingPathOrOptions, maybeOptions) => {
    const stagingPath = typeof stagingPathOrOptions === 'string' ? stagingPathOrOptions : undefined
    const options = typeof stagingPathOrOptions === 'string' ? maybeOptions : stagingPathOrOptions ?? maybeOptions
    return installX4Mod(context, files, stagingPath, options)
  })
  return true
}

export default main
