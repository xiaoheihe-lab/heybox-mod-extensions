export interface Entry { source: string; path: string; directory: boolean }

export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').split('/').filter(part => part && part !== '.').join('/')
}
export const base = (p: string) => p.split('/').pop() || ''
export const parent = (p: string) => p.split('/').slice(0, -1).join('/')
export const under = (p: string, root: string) => !root || p.toLowerCase().startsWith(`${root.toLowerCase()}/`)
export const relative = (p: string, root: string) => root ? p.slice(root.length + 1) : p
export const join = (...parts: string[]) => parts.filter(Boolean).join('/')

export function entries(files: string[]): Entry[] {
  const rows = [...new Set(files)].map(source => ({ source, path: normalizePath(source), directory: /[\\/]$/.test(source) }))
    .filter(row => row.path.length > 0)
  for (const row of rows) row.directory ||= rows.some(other => under(other.path, row.path))
  return rows
}
export const payload = (rows: Entry[]) => rows.filter(e => !e.directory)
export const named = (rows: Entry[], name: string) => rows.find(e => !e.directory && base(e.path).toLowerCase() === name.toLowerCase())
export const directory = (rows: Entry[], name: string) => rows.find(e => e.directory && base(e.path).toLowerCase() === name.toLowerCase())
export const hasExt = (rows: Entry[], ext: string) => payload(rows).some(e => e.path.toLowerCase().endsWith(ext))
export const isFomod = (rows: Entry[]) => payload(rows).some(e => /(^|\/)fomod\/moduleconfig\.xml$/i.test(e.path))

export interface Instruction {
  type: 'copy' | 'generatefile' | 'attribute'
  source?: string
  destination?: string
  data?: string
  key?: string
  value?: unknown
  verification?: 'exists'
  conflictPolicy?: 'overwrite'
}
export function validateInstructions(instructions: Instruction[]): Instruction[] {
  const seen = new Map<string, string | undefined>()
  return instructions.filter(i => {
    if (!i.destination) return true
    i.destination = normalizePath(i.destination)
    const key = i.destination.toLowerCase()
    if (seen.has(key)) {
      if (seen.get(key) === i.source && i.type === 'copy') return false
      throw new Error(`Multiple files target ${i.destination}`)
    }
    seen.set(key, i.source)
    if (/\/binaries\/(win64|wingdk)\/(?:ue4ss\/)?ue4ss-settings\.ini$/i.test(key)
      || /\/binaries\/(win64|wingdk)\/ue4ss\/mods\/mods\.(txt|json)$/i.test(key)) {
      i.verification = 'exists'
      i.conflictPolicy = 'overwrite'
    }
    return true
  })
}
export function copyTree(rows: Entry[], root: string, target: string): Instruction[] {
  return payload(rows).filter(e => under(e.path, root)).map(e => ({
    type: 'copy', source: e.source, destination: join(target, relative(e.path, root)),
  }))
}
