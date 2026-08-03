import { MOD_TYPE } from '../constants'
import { basename } from '../package'
import type {
  AttributeInstruction,
  Candidate,
  InstallInstruction,
  InstallerInput,
  PackageFile,
} from '../types'
import { finalizeMappedInstall, mapInstruction, readText } from './shared'
import {
  findRedmodRoots,
  hasRedmodInfo,
  metadataFromRoots,
  relativeFromRedmodRoot,
  validateRedmodRoot,
} from '../redmod/metadata'

export function hasRedmod(files: PackageFile[], canonicalOnly = false): boolean {
  return hasRedmodInfo(files, canonicalOnly)
}

export async function mapRedmods(
  input: InstallerInput,
  mapped: Map<string, InstallInstruction>,
  canonicalOnly = false,
): Promise<AttributeInstruction[]> {
  const roots = await findRedmodRoots(input.pkg, (file) => readText(input, file), canonicalOnly)
  if (roots.length === 0) return []

  for (const root of roots) {
    const rootFiles = validateRedmodRoot(input.pkg, root)

    for (const file of rootFiles) {
      const relative = relativeFromRedmodRoot(file, root.sourceRoot) || basename(file.path)
      mapInstruction(mapped, file, `${root.destinationRoot}/${relative}`)
    }
  }

  console.log('[Cyberpunk2077][REDmod] REDmod install instructions created', {
    packageName: input.pkg.packageName,
    redmods: metadataFromRoots(roots),
  })

  return [
    { type: 'attribute', key: 'cyberpunkRedmodInfo', value: metadataFromRoots(roots) },
    { type: 'attribute', key: 'cyberpunkRedmodRequiresDeploy', value: true },
  ]
}

export const redmodCandidate: Candidate = {
  id: 'REDmod',
  modTypeId: MOD_TYPE.redmod,
  matches: ({ pkg }) => hasRedmod(pkg.files),
  install: async (input) => {
    const mapped = new Map<string, InstallInstruction>()
    const attributes = await mapRedmods(input, mapped)
    return finalizeMappedInstall(input, MOD_TYPE.redmod, mapped, attributes)
  },
}
