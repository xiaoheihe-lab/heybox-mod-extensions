import type { IExtensionContext } from 'heybox-mod-api'
import {
  MOD_TYPE_FOMOD,
  PAK_ATTRIBUTE,
  PAK_EXTENSIONS,
  PAK_MODS_PATH,
} from '../constants'
import {
  archiveBaseName,
  archiveExtName,
  normalizeDeploymentPath,
} from '../utils/archivePaths'

interface FinalFileInstruction {
  readonly type: 'copy' | 'generatefile'
  readonly source?: string
  readonly destination: string
}

interface PostInstallerAttributeContext {
  installerTypeId: string
  modTypeId: string
  instructions: readonly FinalFileInstruction[]
}

interface PostInstallerCapableContext extends IExtensionContext {
  registerPostInstallerAttributeExtractor(
    priority: number,
    extractor: (context: PostInstallerAttributeContext) => Record<string, unknown> | Promise<Record<string, unknown>>,
  ): void
}

function isPakModsDestination(destination: string): boolean {
  const normalized = normalizeDeploymentPath(destination)
  const root = normalizeDeploymentPath(PAK_MODS_PATH)
  const isUnderRoot = normalized.startsWith(`${root}/`) || normalized.includes(`/${root}/`)
  return isUnderRoot && (PAK_EXTENSIONS as readonly string[]).includes(archiveExtName(normalized))
}

export function extractFomodPakAttributes(context: PostInstallerAttributeContext): Record<string, unknown> {
  if (context.modTypeId !== MOD_TYPE_FOMOD && context.installerTypeId !== MOD_TYPE_FOMOD) return {}
  const pakFiles = context.instructions
    .filter((instruction) => instruction.type === 'copy' && isPakModsDestination(instruction.destination))
    .map((instruction) => archiveBaseName(instruction.destination))
  return { [PAK_ATTRIBUTE]: [...new Set(pakFiles)] }
}

export function registerFomodPakAttributeExtractor(contextValue: IExtensionContext): void {
  const context = contextValue as PostInstallerCapableContext
  context.registerPostInstallerAttributeExtractor(100, extractFomodPakAttributes)
}
