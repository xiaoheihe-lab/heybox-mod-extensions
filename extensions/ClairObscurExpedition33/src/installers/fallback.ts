import type { IExtensionContext } from 'heybox-mod-api'
import {
  MOD_TYPE_BINARIES,
  PAK_EXTENSIONS,
  WIN64_PATH,
} from '../constants'
import {
  archiveExtName,
  archiveJoin,
  isArchiveFile,
} from '../utils/archivePaths'
import { isFomodPackage, isTargetGame, testResult } from './common'

export const FALLBACK_INSTALL_CANCELLED = 'Clair Obscur: Expedition 33 Binaries fallback installation cancelled by user'

export function testBinaries(files: string[], gameId: number | string) {
  const hasIostoreFile = files.some((file) => (
    isArchiveFile(file, files) && (PAK_EXTENSIONS as readonly string[]).includes(archiveExtName(file))
  ))
  return testResult(isTargetGame(gameId) && !isFomodPackage(files) && !hasIostoreFile)
}

export async function installBinaries(context: IExtensionContext, files: string[]) {
  const response = await context.api.util.ui.request({
    type: 'clair_obscur_expedition_33_binaries_fallback',
    title: '按 Binaries 回退规则安装',
    content: '此压缩包未匹配到专用安装器。将按其原有相对路径部署到 Sandfall/Binaries/Win64；请确认压缩包是面向该目录打包的。',
    confirm: { text: '继续安装', type: 'warning', visible: true },
    cancel: { text: '取消', type: 'cancel', visible: true },
  })
  if (!response?.confirmed) throw new Error(FALLBACK_INSTALL_CANCELLED)
  return {
    instructions: files
      .filter((file) => isArchiveFile(file, files))
      .map((file) => ({
        type: 'copy',
        source: file,
        destination: archiveJoin(WIN64_PATH, file),
      })),
    modType: MOD_TYPE_BINARIES,
  }
}
