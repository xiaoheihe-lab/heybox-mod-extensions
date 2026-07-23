import {
  CNS_JSON_PATH,
  GAME_FOLDER,
  GAME_ID,
  LOGIC_MODS_PATH,
  MENU_PATH,
  MOD_TYPE_BINARIES,
  MOD_TYPE_CNS_JSON,
  MOD_TYPE_DLL,
  MOD_TYPE_LOGIC,
  MOD_TYPE_MENU,
  MOD_TYPE_MOVIE,
  MOD_TYPE_PAK,
  MOD_TYPE_ROOT,
  MOD_TYPE_SCRIPT,
  MOD_TYPE_SPLASH,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UE4SS_COMBO,
  MOVIES_PATH,
  PAK_EXTENSIONS,
  PAK_MODS_PATH,
  SPLASH_PATH,
  UE4SS_DWMAPI,
  UE4SS_MODS_PATH,
  VIDEO_EXTENSIONS,
  WIN64_PATH,
} from './constants'
import {
  archiveBaseName,
  archiveExtName,
  archiveJoin,
  fallbackFolderId,
  findSegment,
  hasSegment,
  isFileLike,
  removeLeadingSegments,
  splitArchivePath,
} from './paths'

type Instruction = Record<string, unknown>

function isGame(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function hasBaseName(files: string[], name: string): boolean {
  const lower = name.toLowerCase()
  return files.some((file) => archiveBaseName(file).toLowerCase() === lower)
}

function isFomod(files: string[]): boolean {
  return files.some((file) => {
    const parts = splitArchivePath(file)
    return archiveBaseName(file).toLowerCase() === 'moduleconfig.xml'
      && parts[parts.length - 2]?.toLowerCase() === 'fomod'
  })
}

function result(supported: boolean) {
  return { supported, requiredFiles: [] }
}

export function hasPakFile(files: string[]): boolean {
  return files.some((file) => archiveExtName(file) === '.pak')
}

export function testUe4ssCombo(files: string[], gameId: number | string) {
  return result(isGame(gameId)
    && !isFomod(files)
    && files.some((file) => archiveExtName(file) === '.lua')
    && hasPakFile(files)
    && files.some((file) => hasSegment(file, GAME_FOLDER)))
}

export function testLogic(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && hasBaseName(files, 'LogicMods'))
}

function findUe4ssAnchor(files: string[]) {
  for (const dwmapiFile of files) {
    if (archiveBaseName(dwmapiFile).toLowerCase() !== UE4SS_DWMAPI) continue
    const dwmapiParts = splitArchivePath(dwmapiFile)
    const rootParts = dwmapiParts.slice(0, -1)
    const hasNestedUe4ssDll = files.some((file) => {
      const parts = splitArchivePath(file)
      if (parts.length !== rootParts.length + 2) return false
      const rootMatches = rootParts.every((part, index) => parts[index]?.toLowerCase() === part.toLowerCase())
      return rootMatches
        && parts[rootParts.length]?.toLowerCase() === 'ue4ss'
        && parts[rootParts.length + 1]?.toLowerCase() === 'ue4ss.dll'
    })
    if (hasNestedUe4ssDll) return { dwmapiFile, rootParts }
  }
  return null
}

export function testUe4ss(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && findUe4ssAnchor(files) !== null)
}

export function testScript(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files)
    && files.some((file) => archiveExtName(file) === '.lua' && hasSegment(file, 'Scripts')))
}

export function testDll(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files)
    && files.some((file) => archiveExtName(file) === '.dll' && hasSegment(file, 'dlls')))
}

export function testCnsJson(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files)
    && !hasPakFile(files)
    && files.some((file) => archiveBaseName(file).toLowerCase().endsWith('.dekcns.json')))
}

export function testMenu(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files)
    && files.some((file) => VIDEO_EXTENSIONS.includes(archiveExtName(file)) && hasSegment(file, 'Menu')))
}

export function testMovie(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files)
    && files.some((file) => archiveExtName(file) === '.bk2'))
}

export function testSplash(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && hasBaseName(files, 'splash.bmp'))
}

export function testPak(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && hasPakFile(files))
}

export function testRoot(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => hasSegment(file, GAME_FOLDER)))
}

export function testBinaries(files: string[], gameId: number | string) {
  return result(isGame(gameId) && !isFomod(files) && !hasPakFile(files)
    && files.some((file) => hasSegment(file, 'Win64') && isFileLike(file)))
}

export function installUe4ssCombo(files: string[]) {
  const instructions = files
    .filter(isFileLike)
    .flatMap((file) => {
      const idx = findSegment(file, GAME_FOLDER)
      return idx >= 0 ? [{ type: 'copy', source: file, destination: removeLeadingSegments(file, idx) }] : []
    })
  return { instructions, modType: MOD_TYPE_UE4SS_COMBO }
}

export function installLogic(files: string[]) {
  const instructions = files
    .filter(isFileLike)
    .flatMap((file) => {
      const idx = findSegment(file, 'LogicMods')
      return idx >= 0
        ? [{ type: 'copy', source: file, destination: archiveJoin(LOGIC_MODS_PATH, removeLeadingSegments(file, idx + 1)) }]
        : []
    })
  return { instructions, modType: MOD_TYPE_LOGIC }
}

export function installUe4ss(files: string[]) {
  const anchor = findUe4ssAnchor(files)
  const instructions = anchor ? files
    .flatMap((file) => {
      if (/[\\/]$/.test(file)) return []
      if (file === anchor.dwmapiFile) {
        return [{ type: 'copy', source: file, destination: archiveJoin(WIN64_PATH, UE4SS_DWMAPI) }]
      }

      const parts = splitArchivePath(file)
      const rootMatches = anchor.rootParts.every((part, index) => parts[index]?.toLowerCase() === part.toLowerCase())
      const ue4ssIndex = anchor.rootParts.length
      if (!rootMatches || parts[ue4ssIndex]?.toLowerCase() !== 'ue4ss' || parts.length <= ue4ssIndex + 1) return []
      return [{
        type: 'copy',
        source: file,
        destination: archiveJoin(WIN64_PATH, parts.slice(ue4ssIndex).join('/')),
      }]
    }) : []
  return { instructions, modType: MOD_TYPE_UE4SS }
}

function findUe4ssModAnchor(files: string[], marker: string, extension: string) {
  return files.find((file) => archiveExtName(file) === extension && hasSegment(file, marker)) || ''
}

function installUe4ssMod(files: string[], stagingPath: string | undefined, marker: string, extension: string, modType: string) {
  const anchor = findUe4ssModAnchor(files, marker, extension)
  const anchorParts = splitArchivePath(anchor)
  const markerIndex = findSegment(anchor, marker)
  const hasFolder = markerIndex > 0
  const folderId = hasFolder ? anchorParts[markerIndex - 1] : fallbackFolderId(stagingPath)
  const rootIndex = hasFolder ? markerIndex - 1 : 0
  const sourceRoot = hasFolder
    ? anchorParts.slice(0, rootIndex + 1).map((part) => part.toLowerCase())
    : []

  const instructions: Instruction[] = []
  let hasEnabledFile = false
  for (const file of files) {
    if (!isFileLike(file)) continue
    const parts = splitArchivePath(file)
    const prefixMatches = sourceRoot.every((part, index) => parts[index]?.toLowerCase() === part)
    if (!prefixMatches) continue

    const relative = hasFolder
      ? parts.slice(rootIndex).join('/')
      : archiveJoin(folderId, parts.join('/'))
    if (archiveBaseName(relative).toLowerCase() === 'enabled.txt') hasEnabledFile = true
    instructions.push({
      type: 'copy',
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, relative),
    })
  }

  if (!hasEnabledFile) {
    instructions.push({
      type: 'generatefile',
      data: '',
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, 'enabled.txt'),
    })
  }
  instructions.unshift({ type: 'attribute', key: 'stellarBladeUe4ssFolderId', value: folderId })
  return { instructions, modType }
}

export function installScript(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, 'Scripts', '.lua', MOD_TYPE_SCRIPT)
}

export function installDll(files: string[], stagingPath?: string) {
  return installUe4ssMod(files, stagingPath, 'dlls', '.dll', MOD_TYPE_DLL)
}

function copyBaseNames(files: string[], target: string, extensions?: string[]) {
  return files
    .filter((file) => isFileLike(file) && (!extensions || extensions.includes(archiveExtName(file))))
    .map((file) => ({ type: 'copy', source: file, destination: archiveJoin(target, archiveBaseName(file)) }))
}

export function installCnsJson(files: string[]) {
  const selected = files.filter((file) => archiveBaseName(file).toLowerCase().endsWith('.dekcns.json'))
  return { instructions: copyBaseNames(selected, CNS_JSON_PATH), modType: MOD_TYPE_CNS_JSON }
}

export function installMenu(files: string[]) {
  return { instructions: copyBaseNames(files, MENU_PATH, VIDEO_EXTENSIONS), modType: MOD_TYPE_MENU }
}

export function installMovie(files: string[]) {
  return { instructions: copyBaseNames(files, MOVIES_PATH, ['.bk2']), modType: MOD_TYPE_MOVIE }
}

export function installSplash(files: string[]) {
  const selected = files.filter((file) => archiveBaseName(file).toLowerCase() === 'splash.bmp')
  return { instructions: copyBaseNames(selected, SPLASH_PATH), modType: MOD_TYPE_SPLASH }
}

export function installPak(files: string[]) {
  const selected = files.filter((file) => PAK_EXTENSIONS.includes(archiveExtName(file)))
  const instructions: Instruction[] = [
    {
      type: 'attribute',
      key: 'stellarBladePakFiles',
      value: selected.map((file) => archiveBaseName(file)),
    },
    ...copyBaseNames(selected, PAK_MODS_PATH),
  ]
  return { instructions, modType: MOD_TYPE_PAK }
}

export function installRoot(files: string[]) {
  const instructions = files
    .filter(isFileLike)
    .flatMap((file) => {
      const idx = findSegment(file, GAME_FOLDER)
      return idx >= 0 ? [{ type: 'copy', source: file, destination: removeLeadingSegments(file, idx) }] : []
    })
  return { instructions, modType: MOD_TYPE_ROOT }
}

export function installBinaries(files: string[]) {
  const instructions = files
    .filter(isFileLike)
    .flatMap((file) => {
      const idx = findSegment(file, 'Win64')
      return idx >= 0
        ? [{ type: 'copy', source: file, destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, idx + 1)) }]
        : []
    })
  return { instructions, modType: MOD_TYPE_BINARIES }
}
