import type { IExtensionContext } from 'heybox-mod-api'

import {
  GAME_ID,
  REDMOD_DEPLOY_EXE,
  REDMOD_METADATA,
  REDMOD_PRELAUNCHER,
  REDMOD_STEAM_APP_ID,
  REDMOD_STEAM_HEADER_IMAGE,
} from '../constants'
import type { SteamPrerequisiteRegistrationCompat } from './protocol'

async function fileExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    return Boolean((await context.api.util.fs.stat(filePath))?.isFile)
  } catch {
    return false
  }
}

async function resolveGamePath(context: IExtensionContext): Promise<string> {
  return String((await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath || '')
}

export async function getRedmodStatus(context: IExtensionContext, gamePath?: string) {
  const resolvedGamePath = String(gamePath || await resolveGamePath(context))
  const join = context.api.util.path.join
  const checks = resolvedGamePath
    ? await Promise.all([
        fileExists(context, join(resolvedGamePath, REDMOD_PRELAUNCHER)),
        fileExists(context, join(resolvedGamePath, REDMOD_DEPLOY_EXE)),
        fileExists(context, join(resolvedGamePath, REDMOD_METADATA)),
      ])
    : [false, false, false]
  return {
    installed: checks[1] && checks[2],
    gamePath: resolvedGamePath,
    files: {
      prelauncher: checks[0],
      deployExecutable: checks[1],
      metadata: checks[2],
    },
  }
}

export function createRedmodSteamPrerequisite(
  context: IExtensionContext,
): SteamPrerequisiteRegistrationCompat {
  return {
    id: 'cyberpunk-redmod',
    steamAppId: REDMOD_STEAM_APP_ID,
    presentation: {
      title: '安装 REDmod',
      content: 'REDmod 是 Cyberpunk 2077 的免费官方 Mod 工具 DLC。请先在 Steam 中完成安装，然后返回此处重新检查。普通非 REDmod 模组仍可继续管理。',
      imageUrl: REDMOD_STEAM_HEADER_IMAGE,
      installButtonText: '前往 Steam 安装',
      openingText: '正在打开 Steam…',
      openFailedText: '无法打开 Steam 商店页面，请稍后重试。',
      recheckButtonText: '重新检查',
      checkingText: '正在检查 REDmod…',
      notFoundText: '暂未检测到 REDmod。请确认 Steam 已完成下载和安装，然后重新检查。',
      checkFailedText: '检查 REDmod 时发生错误，请稍后重试。',
    },
    check: async ({ gamePath }) => (await getRedmodStatus(context, gamePath)).installed,
  }
}
