import fs from 'node:fs/promises'
import path from 'node:path'
import { readText } from './files'
import { SCRIPT_MERGER_DIRECTORY } from './constants'
import type { WitcherRuntime } from './runtime'

export interface MergedOutput { name: string; sources: string[]; missing: boolean }
const textOf = (value: any): string => String(typeof value === 'object' ? value?._ || '' : value || '').trim()
export const validModFolder = (name: string) => Boolean(name) && !/[\\/:\[\]\u0000-\u001f]/.test(name) && name !== '.' && name !== '..'

export async function readMergeInventory(context: WitcherRuntime, gamePath: string): Promise<MergedOutput[]> {
  const text = await readText(path.join(gamePath, SCRIPT_MERGER_DIRECTORY, 'MergeInventory.xml'))
  if (!text) return []
  const inventory: any = await context.api.util.fileParseApi.parseXmlToObject(text)
  if (!Object.prototype.hasOwnProperty.call(inventory, 'MergeInventory')) throw new Error('Script Merger 的 MergeInventory.xml 格式无效')
  const outputs = new Map<string, MergedOutput>()
  for (const item of inventory.MergeInventory.Merge || []) {
    const name = textOf(item.MergedModName?.[0])
    if (!validModFolder(name)) throw new Error('Script Merger 合并清单包含无效目录名')
    const existing = outputs.get(name.toLowerCase())
    const sources = (item.IncludedMod || []).map(textOf).filter(validModFolder)
    if (existing) existing.sources = [...new Set([...existing.sources, ...sources])]
    else {
      let present = false
      try { present = (await fs.stat(path.join(gamePath, 'Mods', name))).isDirectory() }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      outputs.set(name.toLowerCase(), { name, sources: [...new Set<string>(sources)], missing: !present })
    }
  }
  return [...outputs.values()]
}
