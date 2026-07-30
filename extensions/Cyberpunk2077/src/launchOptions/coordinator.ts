import { GAME_ID } from '../constants'
import type { LoadOrderEntry } from '../loadOrder/protocol'
import { notify } from '../ui'
import { hasLaunchOptionArgument, REDMOD_STEAM_ARGUMENT } from './arguments'
import { buildRedmodLaunchOptionPrompt } from './prompt'
import type { SteamLaunchOptionCapableContext } from './protocol'

function responsePayload(response: any): Record<string, unknown> {
  return response?.payload && typeof response.payload === 'object' ? response.payload : {}
}

export class RedmodSteamLaunchOptionCoordinator {
  constructor(private readonly context: SteamLaunchOptionCapableContext) {}

  public async afterDeploy(entries: LoadOrderEntry[]): Promise<void> {
    if (!entries.some((entry) => entry.enabled)) return

    try {
      const current = await this.context.api.util.steam.getLaunchOptions(GAME_ID)
      if (current.length === 0) {
        notify(
          this.context,
          '无法配置 Steam 启动项',
          '没有找到可写入的本地 Steam 用户配置；REDmod 已完成部署，请确认 Steam 已在本机登录后重试部署。',
          'error',
        )
        return
      }

      const missing = current.filter((entry) => !hasLaunchOptionArgument(entry.launchOptions))
      if (missing.length === 0) return

      const response = await this.context.api.util.ui.request({
        type: 'steam_launch_options_confirm',
        title: '为 Cyberpunk 2077 添加 REDmod 启动项',
        content: buildRedmodLaunchOptionPrompt(missing.length),
        confirm: { text: '添加并重启 Steam', type: 'primary', visible: true },
        cancel: { text: '暂不添加', type: 'cancel', visible: true },
        requiresSteamClosed: true,
        relaunchSteamAfterWrite: true,
      })
      if (!response?.confirmed) return

      const payload = responsePayload(response)
      if (payload.steamClosed === false) {
        notify(this.context, 'Steam 未关闭', '请完全退出 Steam 后，在下一次 REDmod 部署时重试。', 'error')
        return
      }

      const ensured = await this.context.api.util.steam.ensureLaunchOptionArgument(GAME_ID, REDMOD_STEAM_ARGUMENT)
      const verified = await this.context.api.util.steam.getLaunchOptions(GAME_ID)
      const verifiedUserIds = new Set(verified.map((entry) => entry.userId))
      const success = ensured.failures.length === 0
        && ensured.entries.length > 0
        && verified.length === ensured.entries.length
        && current.every((entry) => verifiedUserIds.has(entry.userId))
        && verified.every((entry) => hasLaunchOptionArgument(entry.launchOptions))
      if (!success) {
        notify(
          this.context,
          'Steam 启动项写入不完整',
          '部分本地 Steam 用户未能添加 -modded；已成功写入的用户会保持不变，下次 REDmod 部署时将继续补充缺失用户。',
          'error',
        )
        return
      }

      notify(
        this.context,
        'Steam 启动项已设置',
        `已为缺少参数的 Steam 用户添加 ${REDMOD_STEAM_ARGUMENT}，正在重新打开 Steam。`,
        'success',
      )
      if (payload.relaunchSteam === false) return

      const launchResponse = await this.context.api.util.steam.launchClient()
      const launchPayload = responsePayload(launchResponse)
      if (launchResponse?.confirmed && launchPayload.success !== false) return
      notify(
        this.context,
        'Steam 启动失败',
        String(launchPayload.error || '启动项已写入，但 Steam 未能自动启动，请手动打开 Steam。'),
        'error',
      )
    } catch (error) {
      notify(
        this.context,
        'Steam 启动项配置失败',
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }
  }
}
