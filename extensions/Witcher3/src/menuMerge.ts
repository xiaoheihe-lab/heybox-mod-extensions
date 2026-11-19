import path from 'node:path'
import type { MergeContext, MergeResult, WitcherRuntime } from './runtime'
import { readText } from './files'
import { iniValues, patchIni, iniKey, type IniValue } from './ini'
import { resolveModsSettingsPath } from './loadOrder'
import { isRemastered } from './edition'

export const MATRIX_PATH = 'bin/config/r4game/user_config_matrix/pc'
const nativeXml = ['audio', 'display', 'gameplay', 'gamma', 'graphics', 'graphicsdx11', 'hdr', 'hidden', 'hud', 'input', 'localization']
export const documentSettings = ['input.settings', 'user.settings', 'dx12user.settings']

export function isNativeMenuXml(target: string): boolean {
  const normalized = target.replace(/\\/g, '/').toLowerCase()
  return normalized.includes(`${MATRIX_PATH}/`) && nativeXml.includes(path.posix.basename(normalized, '.xml')) && normalized.endsWith('.xml')
}

async function orderedSources(context: MergeContext) {
  const settings = iniValues(await readText(await resolveModsSettingsPath()) || '')
  const priority = (source: MergeContext['files'][number]) => {
    const names = source.metaInfo.witcher3ModNames
    if (!Array.isArray(names)) return Number.MAX_SAFE_INTEGER
    return Math.min(...names.map(name => Number(settings.get(iniKey(String(name), 'Priority'))?.value || Number.MAX_SAFE_INTEGER)))
  }
  // Smaller priority wins: apply it last. Unlisted contributions keep deployment order.
  return context.files.map((source, index) => ({ source, index }))
    .sort((a, b) => priority(b.source) - priority(a.source) || a.index - b.index).map(item => item.source)
}

export async function mergeMenuXml(context: MergeContext, api: WitcherRuntime): Promise<MergeResult> {
  const parser = api.api.util.fileParseApi
  let base = await readText(context.baseFile)
  const sources = await orderedSources(context)
  if (base === undefined && sources.length > 0) {
    const response = await api.api.util.ui.request({
      type: 'generic', title: '缺少巫师3原始菜单配置',
      content: `游戏中不存在 ${path.basename(context.targetPath)}。是否使用 Mod 提供的配置？`,
      confirm: { text: '使用 Mod 配置' }, cancel: { text: '取消安装' },
    })
    if (!response.confirmed) throw new Error('未使用缺少原始文件的菜单配置')
    base = await readText(sources[0].path)
  }
  if (base === undefined) return { data: '' }
  const output: any = await parser.parseXmlToObject(base)
  if (!Array.isArray(output.UserConfig?.Group)) throw new Error(`无效菜单 XML：${path.basename(context.targetPath)}`)
  for (const source of sources) {
    const mod: any = await parser.parseXmlToObject(await readText(source.path) || '')
    if (!Array.isArray(mod.UserConfig?.Group)) throw new Error('Mod 菜单 XML 缺少 UserConfig/Group')
    for (const group of mod.UserConfig.Group) {
      const existing = output.UserConfig.Group.find((item: any) => item.$?.id === group.$?.id)
      if (!existing) { output.UserConfig.Group.push(group); continue }
      const vars = group.VisibleVars?.[0]?.Var || []
      existing.VisibleVars ||= [{}]
      existing.VisibleVars[0].Var ||= []
      const current = existing.VisibleVars[0].Var
      for (const variable of vars) {
        const index = current.findIndex((item: any) => item.$?.id === variable.$?.id)
        if (index < 0) current.push(variable)
        else Object.assign(current[index], variable)
      }
    }
  }
  return { data: await parser.buildXmlFromObject(output) }
}

export async function mergeMenuSettings(context: MergeContext): Promise<MergeResult> {
  const original = await readText(context.baseFile)
  if (original === undefined && context.files.length > 0) {
    throw new Error(`缺少 ${path.basename(context.targetPath)}，请先运行一次游戏生成设置，再启用菜单 Mod。`)
  }
  const base = original || ''
  const previous = await readText(context.previousFile)
  const live = await readText(context.liveFile)
  const overrides = new Map<string, IniValue>((Array.isArray(context.state?.overrides) ? context.state.overrides as IniValue[] : [])
    .map(value => [iniKey(value.section, value.key), value]))
  if (previous !== undefined && live !== undefined) {
    const oldValues = iniValues(previous), newValues = iniValues(live)
    for (const id of new Set([...oldValues.keys(), ...newValues.keys()])) {
      const before = oldValues.get(id), after = newValues.get(id)
      if (before?.value !== after?.value) overrides.set(id, after || { ...before!, value: null })
    }
  }
  const baseData = patchIni(base, overrides.values())
  let data = baseData
  for (const source of await orderedSources(context)) data = patchIni(data, iniValues(await readText(source.path) || '').values())
  data = patchIni(data, overrides.values())
  // The game's master switches always remain controlled by the player, including on 5.0.
  const switches = [...iniValues(live || base).values()].filter(value => value.section.toLowerCase() === 'contentmanager/mods')
  data = patchIni(data, switches)
  return { data, baseData, state: { overrides: [...overrides.values()] } }
}

export function registerMenuMergers(context: WitcherRuntime): void {
  context.registerFileMerge({
    id: 'witcher3-menu-xml',
    test: (target, gamePath) => isNativeMenuXml(target) && !(isRemastered(gamePath) && path.basename(target).toLowerCase() === 'graphicsdx11.xml'),
    merge: input => mergeMenuXml(input, context),
  })
  context.registerFileMerge({
    id: 'witcher3-menu-settings',
    test: async target => {
      const root = path.dirname(await resolveModsSettingsPath())
      return path.dirname(path.resolve(target)).toLowerCase() === root.toLowerCase() && documentSettings.includes(path.basename(target).toLowerCase())
    },
    merge: mergeMenuSettings,
  })
}
