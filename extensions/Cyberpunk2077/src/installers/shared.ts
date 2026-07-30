import { EXTRA_FILE_EXTENSIONS, MOD_TYPE, PATHS, type CyberpunkModType } from '../constants'
import { basename, extname, isUnder } from '../package'
import { confirmInstall } from '../ui'
import type { CyberpunkInstallResult, InstallInstruction, InstallerInput, PackageFile } from '../types'

export function copy(file: PackageFile, destination = file.path): InstallInstruction {
  return { type: 'copy', source: file.source, destination }
}

export function copySame(files: PackageFile[]): InstallInstruction[] {
  return files.map((file) => copy(file))
}

export function filesUnder(files: PackageFile[], prefix: string): PackageFile[] {
  return files.filter((file) => isUnder(file, prefix))
}

export function firstSegment(filePath: string): string {
  return filePath.split('/')[0] || ''
}

export function extraDestination(input: InstallerInput, file: PackageFile): string {
  return `${PATHS.extras}/${input.pkg.packageName}/${file.path}`
}

export async function finalizeMappedInstall(
  input: InstallerInput,
  modTypeId: CyberpunkModType,
  mapped: Map<string, InstallInstruction>,
  attributes: InstallInstruction[] = [],
): Promise<CyberpunkInstallResult> {
  const remaining = input.pkg.files.filter((file) => !mapped.has(file.source))
  const unsafeRemaining = remaining.filter((file) => !EXTRA_FILE_EXTENSIONS.has(extname(file.path)))

  if (unsafeRemaining.length > 0) {
    return installFallback(
      input,
      `识别出的安装规则未覆盖 ${unsafeRemaining.length} 个文件（例如 ${basename(unsafeRemaining[0].path)}）。为避免静默丢文件，将按压缩包原始结构安装。`,
    )
  }

  const instructions = input.pkg.files
    .map((file) => mapped.get(file.source) || copy(file, extraDestination(input, file)))
  return { modTypeId, instructions: [...attributes, ...instructions] }
}

export async function installFallback(input: InstallerInput, reason?: string): Promise<CyberpunkInstallResult> {
  await confirmInstall(
    input.context,
    '未识别的 Cyberpunk 2077 Mod 结构',
    `${reason ? `${reason}\n\n` : ''}此 Mod 将按压缩包中的相对路径部署到游戏根目录。请确认压缩包本身已经使用正确的游戏目录结构。`,
  )
  return { modTypeId: MOD_TYPE.fallback, instructions: copySame(input.pkg.files) }
}

export async function readText(input: InstallerInput, file: PackageFile): Promise<string> {
  const fullPath = input.context.api.util.path.join(input.stagingPath, file.source)
  const result = await input.context.api.util.fs.readFile(fullPath, 'utf8')
  return typeof result === 'string' ? result : result.toString('utf8')
}

export function mapInstruction(mapped: Map<string, InstallInstruction>, file: PackageFile, destination = file.path): void {
  mapped.set(file.source, copy(file, destination))
}

export function mapSame(mapped: Map<string, InstallInstruction>, files: PackageFile[]): void {
  for (const file of files) mapInstruction(mapped, file)
}
