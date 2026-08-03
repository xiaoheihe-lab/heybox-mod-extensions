import fs from 'fs'
import path from 'path'
import { preparePackage } from '../package'
import { findRedmodRoots, metadataFromRoots, validateRedmodRoot } from './metadata'

async function listFiles(root: string, current = ''): Promise<string[]> {
  const directory = path.join(root, current)
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const relative = current ? `${current}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await listFiles(root, relative))
    else if (entry.isFile()) files.push(relative.replace(/\\/g, '/'))
  }
  return files
}

export async function extractRedmodAttributes(_modInfo: unknown, stagingPath: string): Promise<Record<string, unknown>> {
  try {
    const pkg = preparePackage(await listFiles(stagingPath))
    // A FOMOD archive can contain multiple optional REDmods. The install-time
    // extractor cannot see the user's selected copy instructions, so treating
    // every embedded root as installed would create phantom load-order entries.
    if (pkg.files.some((file) => /(^|\/)fomod\/moduleconfig\.xml$/i.test(file.path))) return {}
    const roots = await findRedmodRoots(
      pkg,
      async (file) => fs.promises.readFile(path.join(stagingPath, file.source), 'utf8'),
    )
    if (roots.length === 0) return {}
    for (const root of roots) validateRedmodRoot(pkg, root)
    return {
      cyberpunkRedmodInfo: metadataFromRoots(roots),
      cyberpunkRedmodRequiresDeploy: true,
    }
  } catch {
    return {}
  }
}
