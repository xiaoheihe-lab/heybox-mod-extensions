import fs from 'fs'
import path from 'path'

const CONFIG_FILE = 'config.json'
const MODS_REL_PATH = 'Mods'
const SMAPI_INTERNAL_DIRECTORY = 'smapi-internal'
const CONFIG_MOD_ID = 413150240
const CONFIG_FILE_ID = 1
const BUNDLED_SMAPI_MODS = new Set(['errorhandler', 'consolecommands', 'savebackup'])

function normalizeRel(input: string): string {
  const raw = String(input ?? '').replace(/\\/g, '/').replace(/^\/+/g, '')
  const parts = raw.split('/').filter(Boolean)
  if (parts.some((part) => part === '.' || part === '..')) return ''
  return parts.join('/')
}

function walkFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      const full = path.join(dir, name)
      let stat: fs.Stats
      try {
        stat = fs.statSync(full)
      } catch {
        continue
      }
      if (stat.isDirectory()) walk(full)
      else out.push(full)
    }
  }
  walk(root)
  return out
}

function isSmapiInternal(rel: string): boolean {
  const parts = normalizeRel(rel).split('/').map((part) => part.toLowerCase().replace(/[-_]/g, ''))
  return parts.includes(SMAPI_INTERNAL_DIRECTORY.replace(/[-_]/g, ''))
}

function isBundledSmapiConfig(rel: string): boolean {
  const parts = normalizeRel(rel).split('/').map((part) => part.toLowerCase())
  return parts.length >= 2 && BUNDLED_SMAPI_MODS.has(parts[0])
}

export function createConfigModActions(getGamePath: () => string) {
  const collectConfigFiles = () => {
    const gamePath = getGamePath()
    const modsPath = path.join(gamePath, MODS_REL_PATH)
    const files = walkFiles(modsPath)
      .filter((file) => path.basename(file).toLowerCase() === CONFIG_FILE)
      .map((file) => {
        const relUnderMods = normalizeRel(path.relative(modsPath, file))
        const destination = normalizeRel(path.posix.join(MODS_REL_PATH, relUnderMods))
        return { sourcePath: file, source: destination, destination, relUnderMods }
      })
      .filter((item) => item.relUnderMods && !isSmapiInternal(item.relUnderMods) && !isBundledSmapiConfig(item.relUnderMods))

    return {
      type: 'generated-files',
      modInfo: {
        modId: CONFIG_MOD_ID,
        fileId: CONFIG_FILE_ID,
        versionId: Date.now(),
        name: 'Stardew Valley Configuration',
        mod_identifier: 'stardew-valley-configuration',
        metaInfo: {
          synthetic: true,
          type: 'stardew-config-mod',
          trackedConfigFiles: files.map((item) => item.destination),
        },
      },
      files: files.map(({ source, sourcePath, destination }) => ({ source, sourcePath, destination })),
    }
  }

  return {
    collectConfigFiles,
    getConfigModStatus: () => {
      const result = collectConfigFiles()
      return {
        available: true,
        count: result.files.length,
        files: result.files.map((file: any) => file.destination),
      }
    },
  }
}
