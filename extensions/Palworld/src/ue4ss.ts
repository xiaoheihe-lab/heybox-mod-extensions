import type { IExtensionContext } from 'heybox-mod-api'
import { PAL_WIN64_PATH, UE4SS_DLL, UE4SS_RUNTIME_PATH, UE4SS_SETTINGS } from './constants'
import { archiveJoin } from './paths'
import { findGamePath } from './requirements'

declare const require: any

const fs = require('fs')
const path = require('path')

function getOverridesModsFolderPath(settings: string): string | undefined {
  let inOverrides = false

  for (const line of String(settings || '').split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)]\s*$/)
    if (section) {
      inOverrides = section[1].trim().toLowerCase() === 'overrides'
      continue
    }

    if (!inOverrides) continue
    const match = line.match(/^\s*ModsFolderPath\s*=\s*(.*?)\s*$/i)
    if (match) return match[1].trim()
  }

  return undefined
}

async function findUe4ssDllDirectory(directory: string): Promise<string | undefined> {
  const preferredDirectory = path.join(directory, 'ue4ss')
  try {
    const preferredEntries = await fs.promises.readdir(preferredDirectory, { withFileTypes: true })
    if (preferredEntries.some((entry: any) => entry.isFile() && entry.name.toLowerCase() === UE4SS_DLL.toLowerCase())) {
      return preferredDirectory
    }
  } catch {
    // Fall back to the regular recursive search below.
  }

  let entries: any[]
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true })
  } catch {
    return undefined
  }

  const dll = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === UE4SS_DLL.toLowerCase())
  if (dll) return directory

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const found = await findUe4ssDllDirectory(path.join(directory, entry.name))
    if (found) return found
  }

  return undefined
}

export async function getUe4ssModsPath(context: IExtensionContext, gamePath?: string): Promise<string> {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  if (!resolvedGamePath) return archiveJoin(UE4SS_RUNTIME_PATH, 'Mods')

  const win64Path = path.join(resolvedGamePath, PAL_WIN64_PATH)
  const dllDirectory = await findUe4ssDllDirectory(win64Path)
  if (!dllDirectory) return archiveJoin(UE4SS_RUNTIME_PATH, 'Mods')

  const settingsPath = path.join(dllDirectory, UE4SS_SETTINGS)
  try {
    const settings = await fs.promises.readFile(settingsPath, 'utf8') as string
    const configuredPath = getOverridesModsFolderPath(settings)
    return archiveJoin(path.relative(resolvedGamePath, dllDirectory), configuredPath || 'Mods')
  } catch {
    return archiveJoin(UE4SS_RUNTIME_PATH, 'Mods')
  }
}

export { findUe4ssDllDirectory, getOverridesModsFolderPath }
