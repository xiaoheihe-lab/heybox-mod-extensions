import fs from 'node:fs'
import path from 'node:path'
import { readText } from './files'
import { iniValues, iniKey } from './ini'
import { resolveModsSettingsPath } from './loadOrder'

export function isRemastered(gamePath: string): boolean {
  const exists = (relative: string) => fs.existsSync(path.join(gamePath, relative))
  return !exists('bin/x64/witcher3.exe') && (exists('bin/x64_DX12/witcher3.exe') || exists('dlc-tombstones') || exists('bin/config/base/freecamera.ini'))
}

export async function gameWarnings(gamePath: string, modNames: string[]): Promise<string[]> {
  if (!isRemastered(gamePath)) return []
  const warnings: string[] = []
  const text = await readText(path.join(path.dirname(await resolveModsSettingsPath()), 'dx12user.settings'))
  if (text === undefined) warnings.push('请先运行一次游戏以生成设置文件')
  else {
    const values = iniValues(text)
    if (['Enabled', 'EnabledLocal'].some(key => /^(false|0)$/i.test(values.get(iniKey('ContentManager/Mods', key))?.value || ''))) {
      warnings.push('游戏内已关闭 Mod 或本地 Mod，请在游戏设置中开启')
    }
  }
  const longNames = modNames.filter(name => name.length > 63)
  if (longNames.length) warnings.push(`Mod 文件夹名称超过 63 个字符，游戏可能忽略：${longNames.join('、')}`)
  return warnings
}
