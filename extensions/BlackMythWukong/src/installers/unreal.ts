import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_FOLDER,
  LOGIC_MODS_PATH,
  MOD_TYPE_LOGIC,
  MOD_TYPE_PAK,
  MOD_TYPE_UE4SS_COMBO,
  PAK_ATTRIBUTE,
  PAK_EXTENSION,
  PAK_MODS_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveExtName,
  archiveJoin,
  findExplicitDirectory,
  isArchiveFile,
  isUnderSegments,
  normalizeArchivePath,
  removeLeadingSegments,
} from '../utils/archivePaths'
import { type Instruction, isFomodPackage, isTargetGame, testResult } from './common'

export const INSTALL_CANCELLED = 'Black Myth: Wukong mod installation cancelled by user'

function findComboAnchor(files: string[]): string[] | null {
  const gameRoot = findExplicitDirectory(files, GAME_FOLDER)
  if (!gameRoot) return null
  const hasPak = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION && isUnderSegments(file, gameRoot))
  const hasLua = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === '.lua' && isUnderSegments(file, gameRoot))
  const binaries = findExplicitDirectory(files, 'Binaries', gameRoot)
  return hasPak && (hasLua || binaries !== null) ? gameRoot : null
}

function findLogicAnchor(files: string[]): string[] | null {
  const logic = findExplicitDirectory(files, 'LogicMods')
  if (!logic) return null
  const hasPak = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION && isUnderSegments(file, logic))
  return hasPak ? logic : null
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
    && files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION))
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
  const single = value.choiceId ?? value.value ?? value.selected
  return single ? [String(single)] : []
}

function getSelectedPakFiles(
  payload: unknown,
  choices: Array<{ id: string, payload: { file: string } }>,
): string[] {
  if (!payload || typeof payload !== 'object') return []
  const value = payload as Record<string, unknown>
  const selectedChoices = value.choices ?? value.selectedChoices
  const byId = new Map(choices.map((choice) => [choice.id, choice.payload.file]))
  const allowedFiles = new Map(choices.map((choice) => [normalizeArchivePath(choice.payload.file), choice.payload.file]))

  if (Array.isArray(selectedChoices)) {
    const selected = selectedChoices.map((choice): string | undefined => {
      if (typeof choice === 'string') return byId.get(choice) ?? allowedFiles.get(normalizeArchivePath(choice))
      if (!choice || typeof choice !== 'object') return undefined
      const item = choice as Record<string, unknown>
      const id = typeof item.id === 'string' ? item.id : undefined
      if (id && byId.has(id)) return byId.get(id)
      const itemPayload = item.payload && typeof item.payload === 'object'
        ? item.payload as Record<string, unknown>
        : undefined
      const file = typeof itemPayload?.file === 'string'
        ? itemPayload.file
        : typeof item.file === 'string' ? item.file : undefined
      return file ? allowedFiles.get(normalizeArchivePath(file)) : undefined
    }).filter((file): file is string => Boolean(file))
    return [...new Set(selected)]
  }

  return getSelectedChoiceIds(payload)
    .map((id) => byId.get(id))
    .filter((file): file is string => Boolean(file))
}

export async function choosePakFiles(context: IExtensionContext, pakFiles: string[]): Promise<string[]> {
  if (pakFiles.length <= 1) return [...pakFiles]

  const baseNameCounts = new Map<string, number>()
  for (const file of pakFiles) {
    const key = archiveBaseName(file).toLowerCase()
    baseNameCounts.set(key, (baseNameCounts.get(key) || 0) + 1)
  }
  const choices = pakFiles.map((file, index) => {
    const id = `pak-${index}`
    const baseName = archiveBaseName(file)
    return {
      id,
      text: baseNameCounts.get(baseName.toLowerCase()) === 1 ? baseName : normalizeArchivePath(file),
      description: normalizeArchivePath(file),
      value: true,
      payload: { file },
    }
  })

  const response = await context.api.util.ui.request({
    type: 'black_myth_wukong_pak_selection',
    title: '选择要安装的 Pak 文件',
    content: `压缩包包含 ${pakFiles.length} 个 Pak 文件。默认全部安装，可取消不需要的文件。`,
    choiceMode: 'multiple',
    selectedChoiceIds: choices.map((choice) => choice.id),
    choices,
    confirm: { text: '安装选中的 Pak', type: 'primary', visible: true },
    cancel: { text: '取消', type: 'cancel', visible: true },
  }, { timeoutMs: 10 * 60 * 1000 })

  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED)
  const selected = getSelectedPakFiles(response.payload, choices)
  if (selected.length === 0) throw new Error(INSTALL_CANCELLED)
  return selected
}

function assertUniquePakDestinations(files: string[]): void {
  const seen = new Map<string, string>()
  for (const file of files) {
    const baseName = archiveBaseName(file)
    const key = baseName.toLowerCase()
    const existing = seen.get(key)
    if (existing) {
      throw new Error(`Pak 文件扁平化后重名，无法安全安装：${existing}；${normalizeArchivePath(file)}`)
    }
    seen.set(key, normalizeArchivePath(file))
  }
}

export async function installPak(context: IExtensionContext, files: string[]) {
  const pakFiles = files.filter((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION)
  const selected = await choosePakFiles(context, pakFiles)
  assertUniquePakDestinations(selected)
  const instructions: Instruction[] = [
    {
      type: 'attribute',
      key: PAK_ATTRIBUTE,
      value: selected.map((file) => archiveBaseName(file)),
    },
    ...selected.map((file) => ({
      type: 'copy',
      source: file,
      destination: archiveJoin(PAK_MODS_PATH, archiveBaseName(file)),
    })),
  ]
  return { instructions, modType: MOD_TYPE_PAK }
}
