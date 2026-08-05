import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_FOLDER,
  LOGIC_MODS_PATH,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_UE4SS_COMBO,
  PAK_ATTRIBUTE,
  PAK_EXTENSION,
  PAK_EXTENSIONS,
  PAK_MODS_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveDirName,
  archiveExtName,
  archiveJoin,
  archiveStem,
  findExplicitDirectory,
  isArchiveFile,
  isUnderSegments,
  normalizeArchivePath,
  removeLeadingSegments,
} from '../utils/archivePaths'
import { type Instruction, isFomodPackage, isTargetGame, testResult } from './common'

export const INSTALL_CANCELLED = 'Clair Obscur: Expedition 33 mod installation cancelled by user'

interface IostoreBundle {
  id: string
  key: string
  files: string[]
}

function isPakFile(file: string, files: string[]): boolean {
  return isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION
}

function isIostoreFile(file: string, files: string[]): boolean {
  return isArchiveFile(file, files) && (PAK_EXTENSIONS as readonly string[]).includes(archiveExtName(file))
}

function findComboAnchor(files: string[]): string[] | null {
  const gameRoot = findExplicitDirectory(files, GAME_FOLDER)
  if (!gameRoot) return null
  const hasPak = files.some((file) => isPakFile(file, files) && isUnderSegments(file, gameRoot))
  const hasLua = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === '.lua' && isUnderSegments(file, gameRoot))
  return hasPak && hasLua ? gameRoot : null
}

function findLogicAnchor(files: string[]): string[] | null {
  const logic = findExplicitDirectory(files, 'LogicMods')
  if (!logic) return null
  return files.some((file) => isPakFile(file, files) && isUnderSegments(file, logic)) ? logic : null
}

export function testUe4ssCombo(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && findComboAnchor(files) !== null)
}

export function testLogic(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && findLogicAnchor(files) !== null)
}

export function testPak(files: string[], gameId: number | string) {
  return testResult(isTargetGame(gameId)
    && !isFomodPackage(files)
    && files.some((file) => isIostoreFile(file, files)))
}

export function installUe4ssCombo(files: string[]) {
  const anchor = findComboAnchor(files)
  const instructions = anchor ? files
    .filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: removeLeadingSegments(file, Math.max(0, anchor.length - 1)),
    })) : []
  return { instructions, modType: MOD_TYPE_UE4SS_COMBO }
}

export function installLogic(files: string[]) {
  const anchor = findLogicAnchor(files)
  const instructions = anchor ? files
    .filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(LOGIC_MODS_PATH, removeLeadingSegments(file, anchor.length)),
    })) : []
  return { instructions, modType: MOD_TYPE_LOGIC }
}

function getSelectedChoiceIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const value = payload as Record<string, unknown>
  const ids = value.choiceIds ?? value.selectedChoiceIds
  if (Array.isArray(ids)) return ids.map(String).filter(Boolean)
  return []
}

function selectedBundleIds(payload: unknown, bundles: IostoreBundle[]): string[] {
  const allowed = new Set(bundles.map((bundle) => bundle.id))
  const selectedById = getSelectedChoiceIds(payload).filter((id) => allowed.has(id))
  if (selectedById.length > 0) return [...new Set(selectedById)]

  if (!payload || typeof payload !== 'object') return []
  const choices = (payload as Record<string, unknown>).choices
  if (!Array.isArray(choices)) return []
  const byFile = new Map(bundles.flatMap((bundle) => bundle.files.map((file) => [normalizeArchivePath(file), bundle.id])))
  return [...new Set(choices.map((choice) => {
    if (typeof choice === 'string') return allowed.has(choice) ? choice : byFile.get(normalizeArchivePath(choice))
    if (!choice || typeof choice !== 'object') return undefined
    const value = choice as Record<string, unknown>
    if (typeof value.id === 'string' && allowed.has(value.id)) return value.id
    const payloadValue = value.payload && typeof value.payload === 'object' ? value.payload as Record<string, unknown> : undefined
    const file = typeof payloadValue?.file === 'string' ? payloadValue.file : typeof value.file === 'string' ? value.file : undefined
    return file ? byFile.get(normalizeArchivePath(file)) : undefined
  }).filter((id): id is string => Boolean(id)))]
}

function makeBundles(files: string[]): IostoreBundle[] {
  const grouped = new Map<string, string[]>()
  for (const file of files) {
    const key = `${archiveDirName(file).toLowerCase()}/${archiveStem(file).toLowerCase()}`
    const bundle = grouped.get(key) || []
    bundle.push(file)
    grouped.set(key, bundle)
  }
  return [...grouped.entries()].map(([key, bundle], index) => ({
    id: `iostore-${index}`,
    key,
    files: bundle,
  }))
}

export async function chooseIostoreFiles(context: IExtensionContext, files: string[]): Promise<string[]> {
  const bundles = makeBundles(files)
  if (bundles.length <= 1) return [...files]
  const response = await context.api.util.ui.request({
    type: 'clair_obscur_expedition_33_iostore_selection',
    title: '选择要安装的 IO Store Mod',
    content: `压缩包包含 ${bundles.length} 组 Pak/UCAS/UTOC 文件。每组会整体安装，避免缺少 IO Store 配套文件。`,
    choiceMode: 'multiple',
    selectedChoiceIds: bundles.map((bundle) => bundle.id),
    choices: bundles.map((bundle) => ({
      id: bundle.id,
      text: bundle.files.map(archiveBaseName).join(', '),
      description: bundle.files.map(normalizeArchivePath).join('\n'),
      value: true,
      payload: { file: bundle.files[0] },
    })),
    confirm: { text: '安装选中的文件组', type: 'primary', visible: true },
    cancel: { text: '取消', type: 'cancel', visible: true },
  }, { timeoutMs: 10 * 60 * 1000 })
  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED)
  const selectedIds = new Set(selectedBundleIds(response.payload, bundles))
  if (selectedIds.size === 0) throw new Error(INSTALL_CANCELLED)
  return bundles.filter((bundle) => selectedIds.has(bundle.id)).flatMap((bundle) => bundle.files)
}

function assertUniqueDestinations(files: string[]): void {
  const seen = new Map<string, string>()
  for (const file of files) {
    const baseName = archiveBaseName(file)
    const key = baseName.toLowerCase()
    const existing = seen.get(key)
    if (existing) {
      throw new Error(`Pak 文件扁平化后重名，无法安全安装：${existing} 与 ${normalizeArchivePath(file)}`)
    }
    seen.set(key, normalizeArchivePath(file))
  }
}

export async function installPak(context: IExtensionContext, files: string[]) {
  const iostoreFiles = files.filter((file) => isIostoreFile(file, files))
  const selected = await chooseIostoreFiles(context, iostoreFiles)
  assertUniqueDestinations(selected)
  const instructions: Instruction[] = [
    { type: 'attribute', key: PAK_ATTRIBUTE, value: selected.map(archiveBaseName) },
    ...selected.map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(PAK_MODS_PATH, archiveBaseName(file)),
    })),
  ]
  return { instructions, modType: MOD_TYPE_PAK }
}
