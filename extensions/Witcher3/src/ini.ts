export type IniValue = { section: string; key: string; value: string | null }
export const iniKey = (section: string, key: string) => `${section.toLowerCase()}\0${key.toLowerCase()}`

export function iniValues(text: string): Map<string, IniValue> {
  const values = new Map<string, IniValue>()
  let section = ''
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line)
    if (header) { section = header[1].trim(); continue }
    const pair = /^\s*([^;#=\s][^=]*)=(.*)$/.exec(line)
    if (pair) {
      const key = pair[1].trim()
      values.set(iniKey(section, key), { section, key, value: pair[2].trim() })
    }
  }
  return values
}

/** Patch known values while retaining unrelated lines, sections and comments. */
export function patchIni(text: string, changes: Iterable<IniValue>): string {
  const pending = new Map([...changes].map(value => [iniKey(value.section, value.key), value]))
  const output: string[] = []
  const written = new Set<string>()
  let section = ''
  const flush = () => {
    for (const [id, value] of pending) if (value.section.toLowerCase() === section.toLowerCase()) {
      if (value.value !== null && !written.has(id)) output.push(`${value.key}=${value.value}`)
      pending.delete(id)
    }
  }
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line)
    if (header) { flush(); section = header[1].trim() }
    const pair = /^\s*([^;#=\s][^=]*)=(.*)$/.exec(line)
    const id = pair && iniKey(section, pair[1].trim())
    const value = id ? pending.get(id) : undefined
    if (!value) output.push(line)
    else {
      if (value.value !== null) output.push(`${pair![1]}=${value.value}`)
      written.add(id!)
    }
  }
  flush()
  for (const value of pending.values()) {
    if (value.value === null) continue
    if (section.toLowerCase() !== value.section.toLowerCase()) {
      output.push('', `[${value.section}]`); section = value.section
    }
    output.push(`${value.key}=${value.value}`)
  }
  return output.join('\r\n').replace(/(?:\r\n)+$/, '') + '\r\n'
}
