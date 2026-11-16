import type { IExtensionContext, PostInstallerAttributeContext } from 'heybox-mod-api'
import { MOD_TYPE } from '../constants'
import { normalizeRelativePath, sanitizePackageName } from '../package'
import type { PackageFile, PreparedPackage } from '../types'
import { findRedmodRoots, metadataFromRoots, validateRedmodRoot, emptySoundDirectories } from './metadata'

type InstallerContext = PostInstallerAttributeContext & {
  gamePath?: string
  mod?: { version?: string }
}

function invalidFomodRedmod(message: string, cause?: unknown): Error {
  const error = new Error(message) as Error & { code?: string; cause?: unknown }
  error.code = 'FOMOD_INVALID_CONFIG'
  if (cause !== undefined) error.cause = cause
  return error
}

function normalizeDeploymentPath(value: unknown, gamePath?: string): string {
  let raw = String(value ?? '').replace(/\\/g, '/')
  const gameRoot = String(gamePath || '').replace(/\\/g, '/').replace(/\/+$/, '')
  if (gameRoot && raw.toLowerCase().startsWith(`${gameRoot.toLowerCase()}/`)) raw = raw.slice(gameRoot.length + 1)
  if (!raw || raw.startsWith('/') || /^[A-Za-z]:/.test(raw)) {
    throw invalidFomodRedmod(`FOMOD REDmod target path must be relative to the game directory: ${raw}`)
  }
  try {
    return normalizeRelativePath(raw)
  } catch (error) {
    throw invalidFomodRedmod(`FOMOD REDmod target path is unsafe: ${raw}`, error)
  }
}

function projectSelectedCopies(context: InstallerContext): PreparedPackage {
  const copiesByDestination = new Map<string, PackageFile>()
  for (const instruction of context.instructions) {
    if (instruction.type !== 'copy') continue
    const destination = normalizeDeploymentPath(instruction.destination, context.gamePath)
    const source = normalizeRelativePath(instruction.source)
    const key = destination.toLowerCase()
    // Map iteration order is not important to REDmod validation, but delete/set
    // makes the retained entry visibly match VFS's last-copy-wins contract.
    copiesByDestination.delete(key)
    copiesByDestination.set(key, { source, path: destination, lower: key })
  }
  const files = Array.from(copiesByDestination.values())
  const firstRoot = files.find((file) => /^mods\/[^/]+\//i.test(file.path))?.path.split('/')[1]
  return {
    files,
    packageName: sanitizePackageName(firstRoot || 'FomodRedmod'),
    packageVersion: context.mod?.version,
  }
}

export async function extractFomodRedmodAttributes(
  contextValue: IExtensionContext,
  context: InstallerContext,
): Promise<Record<string, unknown>> {
  if (context.modTypeId !== MOD_TYPE.fomod && context.installerTypeId !== MOD_TYPE.fomod) return {}

  const pkg = projectSelectedCopies(context)
  const hasCanonicalInfo = pkg.files.some((file) => /^mods\/[^/]+\/info\.json$/i.test(file.path))
  if (!hasCanonicalInfo) {
    return {
      cyberpunkRedmodInfo: [],
      cyberpunkRedmodRequiresDeploy: false,
      cyberpunkRedmodEmptySoundDirs: [],
    }
  }

  try {
    const roots = await findRedmodRoots(
      pkg,
      async (file) => String(await contextValue.api.util.fs.readFileAsync(
        contextValue.api.util.path.join(context.stagingPath, file.source),
        'utf8',
      )),
      true,
    )
    for (const root of roots) validateRedmodRoot(pkg, root)
    console.log('[Cyberpunk2077][REDmod] FOMOD selected REDmod content', {
      redmods: metadataFromRoots(roots),
    })
    return {
      cyberpunkRedmodInfo: metadataFromRoots(roots),
      cyberpunkRedmodRequiresDeploy: roots.length > 0,
      cyberpunkRedmodEmptySoundDirs: emptySoundDirectories(roots),
    }
  } catch (error) {
    if ((error as any)?.code === 'FOMOD_INVALID_CONFIG') throw error
    throw invalidFomodRedmod(`The selected FOMOD REDmod content is invalid: ${String((error as any)?.message || error)}`, error)
  }
}

export function registerFomodRedmodAttributeExtractor(context: IExtensionContext): void {
  context.registerPostInstallerAttributeExtractor(100, (payload) => extractFomodRedmodAttributes(context, payload))
}
