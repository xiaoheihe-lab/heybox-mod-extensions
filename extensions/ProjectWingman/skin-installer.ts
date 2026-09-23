import { archivePath } from './pak-installer'

const GAME_ID = 895870
export const SKIN_MOD_TYPE = `${GAME_ID}-skin`

function entries(files: string[]) {
  return files.flatMap(source => {
    const file = archivePath(source)
    return file ? [{ source, file, parts: file.split('/') }] : []
  })
}

function isSkinArchive(files: string[]) {
  const list = entries(files)
  if (!list.length) return false
  const allPng = list.every(entry => /\.png$/i.test(entry.file))
  const allUnderSkins = list.every(entry => entry.parts.some(part => part.toLowerCase() === 'skins'))
  return allPng || allUnderSkins
}

export function testSkin(files: string[], gameId: string | number) {
  return { supported: String(gameId) === String(GAME_ID) && isSkinArchive(files), requiredFiles: [] }
}

function destinationParts(list: ReturnType<typeof entries>) {
  const skinsAnchors = list.map(entry => entry.parts.findIndex(part => part.toLowerCase() === 'skins'))
  if (skinsAnchors.every(anchor => anchor >= 0)) {
    return list.map((entry, index) => entry.parts.slice(skinsAnchors[index] + 1))
  }
  const common = list[0].parts.slice(0, -1)
  while (common.length && !list.every(entry => common.every((part, index) => entry.parts[index]?.toLowerCase() === part.toLowerCase()))) common.pop()
  return list.map(entry => entry.parts.slice(common.length))
}

export function installSkin(files: string[]) {
  if (!testSkin(files, GAME_ID).supported) throw new Error('Project Wingman: no supported skin archive')
  const list = entries(files)
  const relative = destinationParts(list)
  const destinations = new Map<string, string>()
  const instructions: Array<{ type: 'copy'; source: string; destination: string }> = []
  for (const [index, entry] of list.entries()) {
    const tail = relative[index]
    if (!tail.length || tail.some(part => part.toLowerCase() === 'skins')) throw new Error('Project Wingman: invalid skin path')
    // The registered mod type already targets ProjectWingman/Mods/Skins.
    // Instructions must therefore be relative to that target directory.
    const destination = tail.join('/')
    const key = destination.toLowerCase()
    const previous = destinations.get(key)
    if (previous === entry.source) continue
    if (previous !== undefined) throw new Error(`Project Wingman: multiple archive files target ${destination}`)
    destinations.set(key, entry.source)
    instructions.push({ type: 'copy', source: entry.source, destination })
  }
  return { instructions, modType: SKIN_MOD_TYPE }
}
