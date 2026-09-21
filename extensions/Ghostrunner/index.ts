import type { IExtensionContext } from 'heybox-mod-api'

const GAME_ID = 1139900
const MOD_TYPE = `${GAME_ID}-pak`
const LOOSE_MOD_TYPE = `${GAME_ID}-loose-pak`
const MOD_PATH = 'Ghostrunner/Content/Paks'
const WRAPPED_PRIORITY = 30
const LOOSE_PRIORITY = 25

/** Archive-relative files only; keep the original source for SDK lookup. */
function archivePath(file: string): string | undefined {
  const value = file.replace(/\\/g, '/').replace(/^(\.\/)+/, '')
  if (!value || value.endsWith('/') || value.startsWith('/') || value.includes(':') || value.includes('\0')) return undefined
  if (value.split('/').some(part => !part || part === '.' || part === '..')) return undefined
  return value
}

function destinationPath(file: string): string | undefined {
  const parts = file.split('/')
  if (parts.length === 1) return `LogicMods/${file}`
  const anchor = parts.findIndex(part => part.toLowerCase() === 'paks')
  if (anchor < 0) return undefined
  const relative = parts.slice(anchor + 1)
  if (relative.length === 1) return relative[0]
  if (relative.length !== 2) return undefined
  const folder = relative[0].toLowerCase()
  if (folder === 'logicmods') return `LogicMods/${relative[1]}`
  if (folder === '~mods') return `~mods/${relative[1]}`
  return undefined
}

function supportedFiles(files: string[], wrapped: boolean) {
  if (!wrapped) {
    const entries = files.flatMap(source => {
      const file = archivePath(source)
      return file ? [{ source, file }] : []
    })
    const firstPak = entries.find(entry => entry.file.toLowerCase().endsWith('.pak'))
    if (!firstPak) return []
    const directory = (file: string) => file.slice(0, file.lastIndexOf('/') + 1).toLowerCase()
    const root = directory(firstPak.file)
    return entries
      .filter(entry => directory(entry.file) === root && /\.(pak|sig)$/i.test(entry.file))
      .map(entry => ({ ...entry, destination: `LogicMods/${entry.file.slice(entry.file.lastIndexOf('/') + 1)}` }))
  }
  return files.flatMap(source => {
    const file = archivePath(source)
    if (!file?.toLowerCase().endsWith('.pak')) return []
    if (file.includes('/') !== wrapped) return []
    const destination = destinationPath(file)
    return destination ? [{ source, file, destination }] : []
  })
}

export function testWrappedPak(files: string[], gameId: string | number) {
  return { supported: String(gameId) === String(GAME_ID) && supportedFiles(files, true).length > 0, requiredFiles: [] }
}

export function testLoosePak(files: string[], gameId: string | number) {
  return { supported: String(gameId) === String(GAME_ID) && supportedFiles(files, false).length > 0 && supportedFiles(files, true).length === 0, requiredFiles: [] }
}

export function installWrappedPak(files: string[]) {
  return installPaks(files, true)
}

export function installLoosePak(files: string[]) {
  return installPaks(files, false)
}

function installPaks(files: string[], wrapped: boolean) {
  const paks = supportedFiles(files, wrapped)
  if (!paks.length) throw new Error('Ghostrunner: archive contains no supported .pak layout')
  const signatures = new Map<string, Array<{ source: string; file: string }>>()
  for (const source of files) {
    const file = archivePath(source)
    if (!file?.toLowerCase().endsWith('.sig')) continue
    const key = file.slice(0, -4).toLowerCase()
    signatures.set(key, [...(signatures.get(key) ?? []), { source, file }])
  }
  const instructions: Array<{ type: 'copy'; source: string; destination: string }> = []
  const destinations = new Map<string, string>()
  const copy = (source: string, destination: string) => {
    const key = destination.toLowerCase()
    const previous = destinations.get(key)
    if (previous === source) return
    if (previous !== undefined) throw new Error(`Ghostrunner: multiple archive files target ${destination}`)
    destinations.set(key, source)
    instructions.push({ type: 'copy', source, destination })
  }
  for (const pak of paks) {
    copy(pak.source, pak.destination)
    if (!wrapped) continue
    for (const sig of signatures.get(pak.file.slice(0, -4).toLowerCase()) ?? []) {
      copy(sig.source, `${pak.destination.slice(0, -4)}${sig.file.slice(-4)}`)
    }
  }
  return { instructions, modType: wrapped ? MOD_TYPE : LOOSE_MOD_TYPE }
}

export default function main(context: IExtensionContext): boolean {
  context.registerGame({
    id: GAME_ID,
    name: 'Ghostrunner',
    executable: 'Ghostrunner.exe',
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(String(GAME_ID)))?.gamePath,
    requiredFiles: ['Ghostrunner.exe'],
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: 'ghostrunner',
      customOpenModsPath: MOD_PATH,
    },
  })
  const registrations = [
    { id: MOD_TYPE, priority: WRAPPED_PRIORITY, test: testWrappedPak, install: installWrappedPak, name: 'Ghostrunner Wrapped Pak Mod' },
    { id: LOOSE_MOD_TYPE, priority: LOOSE_PRIORITY, test: testLoosePak, install: installLoosePak, name: 'Ghostrunner Loose Pak Mod' },
  ]
  for (const registration of registrations) {
    context.registerModType(
      registration.id,
      registration.priority,
      gameId => String(gameId) === String(GAME_ID),
      () => `{gamePath}/${MOD_PATH}`,
      (input: unknown) => {
        const files = Array.isArray(input) ? input : (input as { files?: unknown } | null)?.files
        return Array.isArray(files) && registration.test(files.map(String), GAME_ID).supported
      },
      { name: registration.name },
    )
    context.registerInstaller(registration.id, registration.priority, registration.test, registration.install)
  }
  return true
}
