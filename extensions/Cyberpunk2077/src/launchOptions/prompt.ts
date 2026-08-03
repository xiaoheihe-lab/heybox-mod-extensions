import { REDMOD_STEAM_ARGUMENT } from './arguments'

export function buildRedmodLaunchOptionPrompt(missingUserCount: number): string {
  const userText = missingUserCount === 1 ? '1 个本地 Steam 用户' : `${missingUserCount} 个本地 Steam 用户`
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    `<strong>检测到 ${userText}尚未配置 REDmod 启动参数。</strong>`,
    `<code style="word-break:break-all;white-space:pre-wrap;">${REDMOD_STEAM_ARGUMENT}</code>`,
    '<span>确认后会先关闭 Steam，再只为缺少该参数的用户追加启动项；已有的其他启动参数会保持不变。</span>',
    '<small>Heybox 以后不会自动删除这个参数。若暂不添加，后续 REDmod 成功部署时仍会再次提醒。</small>',
    '</div>',
  ].join('')
}
