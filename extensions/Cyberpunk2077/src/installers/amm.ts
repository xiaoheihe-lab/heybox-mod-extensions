import { MOD_TYPE, PATHS } from '../constants'
import { basename, extname, isUnder } from '../package'
import type { Candidate, InstallInstruction, InstallerInput, PackageFile } from '../types'
import { finalizeMappedInstall, mapInstruction, mapSame, readText } from './shared'

const AMM_COLLAB_DIRS = [
  'Custom Appearances', 'Custom Entities', 'Custom Poses', 'Custom Props',
]
const AMM_USER_DIRS = ['Decor', 'Locations', 'Scripts', 'Themes']

function isCanonicalAmm(file: PackageFile): boolean {
  return isUnder(file, `${PATHS.amm}/Collabs`) || isUnder(file, `${PATHS.amm}/User`)
}

function isTopLevelAmmTree(file: PackageFile): boolean {
  return isUnder(file, 'Collabs') || isUnder(file, 'User')
}

async function looseAmmDestination(input: InstallerInput, file: PackageFile): Promise<string | null> {
  if (file.path.includes('/')) return null
  const extension = extname(file.path)
  if (!['.lua', '.json'].includes(extension)) return null

  let text: string
  try {
    text = await readText(input, file)
  } catch {
    return null
  }

  if (extension === '.lua') {
    const matchers: Array<[RegExp[], string]> = [
      [[/modder\s*=/i, /unique_identifier\s*=/i, /entity_id\s*=/i, /appearances\s*=/i], AMM_COLLAB_DIRS[0]],
      [[/modder\s*=/i, /unique_identifier\s*=/i, /entity_info\s*=/i], AMM_COLLAB_DIRS[1]],
      [[/modder\s*=/i, /category\s*=/i, /entity_path\s*=/i, /anims\s*=/i], AMM_COLLAB_DIRS[2]],
      [[/modder\s*=/i, /unique_identifier\s*=/i, /props\s*=/i], AMM_COLLAB_DIRS[3]],
    ]
    const found = matchers.find(([patterns]) => patterns.every((pattern) => pattern.test(text)))
    return found ? `${PATHS.amm}/Collabs/${found[1]}/${basename(file.path)}` : null
  }

  try {
    const value = JSON.parse(text) as Record<string, unknown>
    const keys = new Set(Object.keys(value))
    const matchers: Array<[string[], string]> = [
      [['name', 'props', 'lights'], AMM_USER_DIRS[0]],
      [['x', 'y', 'z'], AMM_USER_DIRS[1]],
      [['title', 'actors'], AMM_USER_DIRS[2]],
      [['Text', 'Border'], AMM_USER_DIRS[3]],
    ]
    const found = matchers.find(([required]) => required.every((key) => keys.has(key)))
    return found ? `${PATHS.amm}/User/${found[1]}/${basename(file.path)}` : null
  } catch {
    return null
  }
}

async function hasAmm(input: InstallerInput): Promise<boolean> {
  if (input.pkg.files.some((file) => isCanonicalAmm(file) || isTopLevelAmmTree(file))) return true
  for (const file of input.pkg.files) {
    if (await looseAmmDestination(input, file)) return true
  }
  return false
}

export const ammCandidate: Candidate = {
  id: 'Appearance Menu Mod Content',
  modTypeId: MOD_TYPE.amm,
  matches: hasAmm,
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    mapSame(mapped, input.pkg.files.filter(isCanonicalAmm))
    for (const file of input.pkg.files.filter(isTopLevelAmmTree)) {
      mapInstruction(mapped, file, `${PATHS.amm}/${file.path}`)
    }
    for (const file of input.pkg.files) {
      if (mapped.has(file.source)) continue
      const destination = await looseAmmDestination(input, file)
      if (destination) mapInstruction(mapped, file, destination)
    }
    return finalizeMappedInstall(input, MOD_TYPE.amm, mapped)
  },
}
