/** Pure archive routing for ordinary UE Pak mods. */
export interface PakOptions {
  gameId: number
  gameName: string
  modType: string
  requirePatchSuffix?: boolean
}

export function archivePath(source: string): string | undefined {
  const file = source.replace(/\\/g, '/').replace(/^(\.\/)+/, '')
  if (!file || file.endsWith('/') || file.startsWith('/') || /[:\0]/.test(file)) return undefined
  if (file.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) return undefined
  return file
}

function entriesFor(files: string[]) {
  return files.flatMap(source => {
    const file = archivePath(source)
    return file ? [{ source, file }] : []
  })
}

function selectPaks(files: string[]) {
  const entries = entriesFor(files)
  // These archives need a separate installer or a user selection, not partial Pak installation.
  if (entries.some(({ file }) => /(^|\/)fomod\/moduleconfig\.xml$/i.test(file)
    || /(^|\/)logicmods\//i.test(file) || /\.(dll|asi|lua)$/i.test(file))) return []
  const first = entries.find(({ file }) => /\.pak$/i.test(file))
  if (!first) return []
  const root = first.file.slice(0, first.file.lastIndexOf('/') + 1)
  // Like Code Vein's Vortex installer, unwrap the first Pak's directory.
  // Use a directory boundary rather than a substring match (Mod != ModExtra).
  return entries.filter(({ file }) => file.toLowerCase().startsWith(root.toLowerCase()) && /\.pak$/i.test(file))
    .map(entry => ({ ...entry, destination: entry.file.slice(root.length) }))
}

export function testPakArchive(files: string[], gameId: number | string, options: PakOptions) {
  return { supported: String(gameId) === String(options.gameId) && selectPaks(files).length > 0, requiredFiles: [] }
}

export function installPakArchive(files: string[], options: PakOptions) {
  const paks = selectPaks(files)
  if (!paks.length) throw new Error(`${options.gameName}: no supported Pak layout (FOMOD, LogicMods and loader/script bundles are not supported)`)
  const entries = entriesFor(files)
  const instructions: Array<{ type: 'copy'; source: string; destination: string }> = []
  const destinations = new Map<string, string>()
  const copy = (source: string, destination: string) => {
    const key = destination.toLowerCase()
    const previous = destinations.get(key)
    if (previous === source) return
    if (previous !== undefined) throw new Error(`${options.gameName}: multiple archive files target ${destination}`)
    destinations.set(key, source)
    instructions.push({ type: 'copy', source, destination })
  }
  for (const pak of paks) {
    const stem = pak.file.slice(0, -4).toLowerCase()
    let targetStem = pak.destination.slice(0, -4)
    if (options.requirePatchSuffix) targetStem = targetStem.replace(/_p$/i, '') + '_P'
    const companions = entries.filter(({ file }) => /\.(sig|ucas|utoc)$/i.test(file) && file.slice(0, file.lastIndexOf('.')).toLowerCase() === stem)
    const has = (extension: string) => companions.some(({ file }) => file.toLowerCase().endsWith(extension))
    if (has('.ucas') !== has('.utoc')) throw new Error(`${options.gameName}: incomplete IO Store pair for ${pak.file}`)
    copy(pak.source, `${targetStem}.pak`)
    for (const companion of companions) copy(companion.source, targetStem + companion.file.slice(companion.file.lastIndexOf('.')).toLowerCase())
  }
  return { instructions, modType: options.modType }
}
