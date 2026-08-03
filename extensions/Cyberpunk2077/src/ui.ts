import type { IExtensionContext } from 'heybox-mod-api'

export const INSTALL_CANCELLED = 'Cyberpunk 2077 mod installation cancelled by user'

export async function confirmInstall(
  context: IExtensionContext,
  title: string,
  content: string,
  confirmText = '继续安装',
): Promise<void> {
  const response = await context.api.util.ui.request({
    type: 'mod_install_confirmation',
    title,
    content,
    confirm: { text: confirmText, type: 'primary', visible: true },
    cancel: { text: '取消', type: 'cancel', visible: true },
  }, { timeoutMs: 10 * 60 * 1000 })

  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED)
}

export function notify(context: IExtensionContext, title: string, content: string, variant = 'warning'): void {
  context.api.util.ui.notify({
    type: 'cyberpunk2077_extension_notice',
    display: 'toast',
    variant,
    title,
    content,
  })
}
