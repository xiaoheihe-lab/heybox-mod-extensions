import fs from 'fs'
import path from 'path'

const MOD_MANIFEST = 'manifest.json'

export type StardewManifest = {
  Name?: string
  UniqueID?: string
  Version?: string
  MinimumApiVersion?: string
  [key: string]: unknown
}

function normalizeRel(input: string): string {
  return String(input ?? '').replace(/\\/g, '/')
}

export function isManifest(file: string): boolean {
  const rel = normalizeRel(file)
  if (path.posix.basename(rel).toLowerCase() !== MOD_MANIFEST) return false
  const parts = rel.split('/').map((part) => part.toLowerCase())
  return !parts.includes('i18n') && !parts.includes('locale') && !parts.includes('locales')
}

export function parseManifestFile(filePath: string): StardewManifest {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error(`Invalid Stardew manifest: ${filePath}`)
  return parsed
}

export function collectManifestFiles(root: string): string[] {
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
      else if (isManifest(path.relative(root, full))) out.push(full)
    }
  }
  walk(root)
  return out
}

function versionParts(version: string): number[] {
  return String(version)
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number(part || 0))
}

function compareVersionDesc(left: string, right: string): number {
  const a = versionParts(left)
  const b = versionParts(right)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function createManifestAttributeExtractor() {
  return async (modInfo: any, modPath: string): Promise<Record<string, unknown>> => {
    const manifestFiles = collectManifestFiles(modPath)
    const manifests = manifestFiles
      .map((file) => {
        try {
          return parseManifestFile(file)
        } catch {
          return null
        }
      })
      .filter(Boolean) as StardewManifest[]

    if (manifests.length === 0) return {}
    const ref = manifests[0]
    const additionalLogicalFileNames = manifests
      .map((manifest) => String(manifest.UniqueID || '').trim().toLowerCase())
      .filter(Boolean)
    const minSMAPIVersion = manifests
      .map((manifest) => String(manifest.MinimumApiVersion || '').trim())
      .filter(Boolean)
      .sort((lhs, rhs) => compareVersionDesc(rhs, lhs))[0]

    return {
      additionalLogicalFileNames,
      ...(minSMAPIVersion ? { minSMAPIVersion } : null),
      ...(Number(modInfo?.modId) !== 592 && ref?.Name ? { customFileName: ref.Name, name: ref.Name } : null),
      ...(typeof ref?.Version === 'string' ? { manifestVersion: ref.Version, version: ref.Version } : null),
      ...(ref?.UniqueID ? { mod_identifier: String(ref.UniqueID).toLowerCase() } : null),
      stardewManifests: manifests,
    }
  }
}
