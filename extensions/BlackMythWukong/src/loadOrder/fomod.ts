import type {
  IExtensionContext,
  PostInstallerAttributeContext,
} from 'heybox-mod-api'
import {
  MOD_TYPE_FOMOD,
  PAK_ATTRIBUTE,
  PAK_EXTENSION,
  PAK_MODS_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveExtName,
  normalizeDeploymentPath,
} from '../utils/archivePaths'

function isPakModsDestination(destination: string): boolean {
  const normalized = normalizeDeploymentPath(destination)
  const root = normalizeDeploymentPath(PAK_MODS_PATH)
  const isUnderRoot = normalized.startsWith(`${root}/`) || normalized.includes(`/${root}/`)
  return isUnderRoot && archiveExtName(normalized) === PAK_EXTENSION
}

export function extractFomodPakAttributes(context: PostInstallerAttributeContext): Record<string, unknown> {
  if (context.modTypeId !== MOD_TYPE_FOMOD && context.installerTypeId !== MOD_TYPE_FOMOD) return {}
  const pakFiles = context.instructions
    .filter((instruction) => instruction.type === 'copy' && isPakModsDestination(instruction.destination))
    .map((instruction) => archiveBaseName(instruction.destination))
  return { [PAK_ATTRIBUTE]: [...new Set(pakFiles)] }
}

export function registerFomodPakAttributeExtractor(context: IExtensionContext): void {
  context.registerPostInstallerAttributeExtractor(100, extractFomodPakAttributes)
}
