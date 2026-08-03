import { MOD_TYPE, PATHS } from '../constants'
import { basename, extname, isUnder } from '../package'
import type { Candidate, InstallInstruction, InstallerInput, PackageFile } from '../types'
import { finalizeMappedInstall, mapInstruction, readText } from './shared'

const CYBERCAT_KEYS = [
  'DataExists', 'Unknown1', 'UnknownFirstBytes', 'FirstSection', 'SecondSection', 'ThirdSection', 'StringTriples',
]

async function presetDestination(input: InstallerInput, file: PackageFile): Promise<string | null> {
  if (isUnder(file, PATHS.cyberCatPresets) || isUnder(file, PATHS.appearancePresets)) return file.path

  let text: string
  try {
    text = await readText(input, file)
  } catch {
    return null
  }

  try {
    const value = JSON.parse(text) as Record<string, unknown>
    if (CYBERCAT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
      return `${PATHS.cyberCatPresets}/${basename(file.path)}`
    }
  } catch {
    // Appearance Change Unlocker presets are not JSON.
  }

  if (/LocKey#14444638123505366956:\d+/.test(text)) {
    return `${PATHS.appearancePresets}/female/${basename(file.path)}`
  }
  if (/LocKey#\d+:\d+/.test(text)) {
    return `${PATHS.appearancePresets}/male/${basename(file.path)}`
  }
  return null
}

function presetFiles(files: PackageFile[]): PackageFile[] {
  return files.filter((file) => extname(file.path) === '.preset')
}

export const presetCandidate: Candidate = {
  id: 'Character Preset',
  modTypeId: MOD_TYPE.preset,
  matches: ({ pkg }) => presetFiles(pkg.files).length > 0,
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    for (const file of presetFiles(input.pkg.files)) {
      const destination = await presetDestination(input, file)
      if (destination) mapInstruction(mapped, file, destination)
    }
    return finalizeMappedInstall(input, MOD_TYPE.preset, mapped)
  },
}
