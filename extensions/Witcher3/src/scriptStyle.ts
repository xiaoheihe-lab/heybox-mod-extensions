import path from 'node:path'
import type { DeploymentOptions } from 'heybox-mod-api'
import { readText } from './files'

export async function scriptStyle(files: string[], staging?: string, options?: DeploymentOptions): Promise<'none' | 'annotation' | 'override'> {
  const scripts = files.filter(file => /\.ws$/i.test(file))
  if (!scripts.length) return 'none'
  for (const file of scripts) {
    const mapped = options?.sourcePathByFile as Record<string, string> | undefined
    let text: string | undefined
    try { text = await readText(mapped?.[file] || (staging ? path.join(staging, file) : undefined)) }
    catch { return 'override' }
    if (text === undefined || !/@(?:wrapMethod|replaceMethod|addMethod|addField)\b/.test(text)) return 'override'
  }
  return 'annotation'
}
