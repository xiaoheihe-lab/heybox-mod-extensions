import { archivePath } from './pak-installer'

const GAME_ID = 2138710
export const ROOT_MOD_TYPE = `${GAME_ID}-root`

function rootFiles(files: string[]) {
  return files.flatMap(source => {
    const file = archivePath(source)
    if (!file) return []
    const parts = file.split('/')
    const anchor = parts.findIndex(part => part.toLowerCase() === 'sifu')
    if (anchor < 0 || parts.length < anchor + 3) return []
    if (!['content', 'binaries', 'config'].includes(parts[anchor + 1].toLowerCase())) return []
    return [{ source, prefix: parts.slice(0, anchor).join('/'), destination: ['Sifu', ...parts.slice(anchor + 1)].join('/') }]
  })
}

export function hasRootLayout(files: string[]) {
  return rootFiles(files).length > 0
}

export function testRoot(files: string[], gameId: string | number) {
  const fomod = files.some(source => {
    const file = archivePath(source)
    return file !== undefined && /(^|\/)fomod\/moduleconfig\.xml$/i.test(file)
  })
  return { supported: String(gameId) === String(GAME_ID) && !fomod && hasRootLayout(files), requiredFiles: [] }
}

export function installRoot(files: string[]) {
  if (!testRoot(files, GAME_ID).supported) throw new Error('Sifu: no supported root layout (FOMOD requires a separate installer)')
  const entries = rootFiles(files)
  // Multiple wrappers may represent mutually exclusive variants. Do not merge them.
  if (new Set(entries.map(entry => entry.prefix.toLowerCase())).size !== 1) {
    throw new Error('Sifu: multiple game roots; select one mod variant before installing')
  }
  const destinations = new Map<string, string>()
  const instructions: Array<{ type: 'copy'; source: string; destination: string }> = []
  for (const { source, destination } of entries) {
    const key = destination.toLowerCase()
    const previous = destinations.get(key)
    if (previous === source) continue
    if (previous !== undefined) throw new Error(`Sifu: multiple archive files target ${destination}`)
    destinations.set(key, source)
    instructions.push({ type: 'copy', source, destination })
  }
  return { instructions, modType: ROOT_MOD_TYPE }
}
