import { first, text } from './xml-helpers.js'

export interface FomodInfoMetadata {
  name?: string
  author?: string
  version?: string
  website?: string
}

export function parseInfoXml(parsed: Record<string, unknown>): FomodInfoMetadata {
  const root = first((parsed as any).fomod || (parsed as any).Fomod || (parsed as any).fomodInfo || Object.values(parsed)[0])
  if (!root || typeof root !== 'object') return {}
  return {
    name: text(first(root.Name || root.name)) || undefined,
    author: text(first(root.Author || root.author)) || undefined,
    version: text(first(root.Version || root.version)) || undefined,
    website: text(first(root.Website || root.website)) || undefined,
  }
}
