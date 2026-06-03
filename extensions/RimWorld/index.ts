import fs from 'fs'
import path from 'path'
import type { IExtensionContext } from 'heybox-mod-api'

const GAME_ID = 294100
const MOD_TYPE_ID = 'rimworld-steam-mod'
const ABOUT_XML_FILE = 'about.xml'
const GIT_FILES = new Set(['.gitignore', '.gitattributes'])
const ROOT_FOLDER_FILES = new Set(['readme.md', 'license', 'contributing.md'])

function getArchiveSegments(filePath: string): string[] {
  if (filePath.includes('\0')) {
    throw new Error('Archive path contains invalid null byte')
  }
  const segments = filePath.replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Archive path is not safe: ${filePath}`)
  }
  return segments
}

function archiveBaseName(filePath: string): string {
  const segments = getArchiveSegments(filePath)
  return segments[segments.length - 1] || ''
}

function hasFileExtension(filePath: string): boolean {
  return path.extname(archiveBaseName(filePath)) !== ''
}

function sanitizeFileName(context: IExtensionContext, name: string): string {
  return context.api.util.sanitizeFilename(name, 'rimworld_mod').replace(/\./g, '_')
}

function toDestinationPath(context: IExtensionContext, segments: string[]): string {
  const safeSegments = segments.map((segment) => context.api.util.sanitizeFilename(segment, '_'))
  if (safeSegments.length === 0) {
    throw new Error('Archive destination path is empty')
  }
  return path.join(...safeSegments)
}

async function findGame(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID)
  return game?.gamePath
}

function isAboutFile(filePath: string): boolean {
  return archiveBaseName(filePath).toLowerCase() === ABOUT_XML_FILE
}

function getRootSegment(files: string[], aboutFile: string): string {
  const rootCandidate = files.find((file) => ROOT_FOLDER_FILES.has(archiveBaseName(file).toLowerCase()))
  return getArchiveSegments(rootCandidate || aboutFile)[0] || ''
}

function isLooseRootArchive(files: string[]): boolean {
  const topSegments = new Set<string>()
  for (const file of files) {
    const first = getArchiveSegments(file)[0]
    if (first) topSegments.add(first)
    if (topSegments.size > 1) return true
  }
  return false
}

function readPackageId(parsedXml: Record<string, unknown>): string | undefined {
  const metadata = (parsedXml as any)?.ModMetaData
  const packageId = metadata?.packageId
  if (Array.isArray(packageId)) return typeof packageId[0] === 'string' ? packageId[0] : undefined
  return typeof packageId === 'string' ? packageId : undefined
}

async function getModNameFromAboutXml(
  context: IExtensionContext,
  aboutFile: string,
  stagingPath?: string,
  options?: { sourcePathByFile?: Record<string, string> }
): Promise<string | undefined> {
  const sourcePath = options?.sourcePathByFile?.[aboutFile]
    || (stagingPath ? path.join(stagingPath, ...getArchiveSegments(aboutFile)) : undefined)
  if (!sourcePath) return undefined

  try {
    const fileData = await fs.promises.readFile(sourcePath, { encoding: 'utf8' })
    const parsed = await context.api.util.fileParseApi.parseXmlToObject(fileData)
    return readPackageId(parsed)
  } catch {
    return undefined
  }
}

async function testSupportedSteamMod(
  _context: IExtensionContext,
  files: string[],
  gameId: number
): Promise<{ supported: boolean; requiredFiles: string[] }> {
  if (Number(gameId) !== GAME_ID) {
    return { supported: false, requiredFiles: [] }
  }

  const aboutFiles = files.filter(isAboutFile)
  if (aboutFiles.length === 0) {
    return { supported: false, requiredFiles: [] }
  }

  if (aboutFiles.length > 1) {
    console.warn('RimWorld installer skipped archive with multiple About.xml files.')
    return { supported: false, requiredFiles: [] }
  }

  return { supported: true, requiredFiles: [] }
}

async function installSteamMod(context: IExtensionContext, files: string[], stagingPath?: string, options?: { sourcePathByFile?: Record<string, string> }): Promise<{
  instructions: Array<{ type: 'copy'; source: string; destination: string }>
}> {
  const aboutFile = files.find(isAboutFile)
  if (!aboutFile) {
    return { instructions: [] }
  }
  const rootSegment = getRootSegment(files, aboutFile)
  const looseRootArchive = isLooseRootArchive(files)
  const modNameFromAbout = await getModNameFromAboutXml(context, aboutFile, stagingPath, options)
  const modName = sanitizeFileName(context, modNameFromAbout || rootSegment || 'rimworld_mod')
  const filtered = files.filter((filePath) => {
    const baseName = archiveBaseName(filePath).toLowerCase()
    return !/[\\/]$/.test(filePath) && hasFileExtension(filePath) && !GIT_FILES.has(baseName)
  })

  const instructions = filtered.map((file) => {
    const fileSegments = getArchiveSegments(file)
    if (looseRootArchive) {
      return {
        type: 'copy' as const,
        source: file,
        destination: toDestinationPath(context, [modName, ...fileSegments]),
      }
    }

    if (rootSegment && fileSegments.length > 1 && fileSegments[0] === rootSegment) {
      return {
        type: 'copy' as const,
        source: file,
        destination: toDestinationPath(context, [modName, ...fileSegments.slice(1)]),
      }
    }

    return {
      type: 'copy' as const,
      source: file,
      destination: toDestinationPath(context, [modName, ...fileSegments]),
    }
  })

  return { instructions }
}

async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID,
    name: 'RimWorld',
    mergeMods: true,
    queryPath: () => findGame(context),
    logo: 'gameart.jpg',
    executable: 'RimWorldWin64.exe',
    requiredFiles: ['RimWorldWin64.exe'],
    environment: {
      SteamAPPId: String(GAME_ID),
    },
    details: {
      steamAppId: GAME_ID,
    },
  })

  context.registerModType(
    MOD_TYPE_ID,
    25,
    () => true,
    () => '{gamePath}/Mods',
    () => Promise.resolve(false),
    { name: 'RimWorld Steam Mod' },
  )

  context.registerInstaller(
    MOD_TYPE_ID,
    25,
    (files, gameId) => testSupportedSteamMod(context, files, gameId),
    (files, stagingPathOrOptions, maybeOptions) => {
      const stagingPath = typeof stagingPathOrOptions === 'string' ? stagingPathOrOptions : undefined
      const options = typeof stagingPathOrOptions === 'string' ? maybeOptions : stagingPathOrOptions
      return installSteamMod(context, files, stagingPath, options)
    }
  )

  return true
}

export default main
