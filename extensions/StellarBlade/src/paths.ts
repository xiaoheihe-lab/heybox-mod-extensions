export function normalizeArchivePath(filePath: string): string {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '')
}

export function splitArchivePath(filePath: string): string[] {
  return normalizeArchivePath(filePath).split('/').filter(Boolean)
}

export function archiveBaseName(filePath: string): string {
  const parts = splitArchivePath(filePath)
  return parts[parts.length - 1] || ''
}

export function archiveExtName(filePath: string): string {
  const base = archiveBaseName(filePath)
  const idx = base.lastIndexOf('.')
  return idx >= 0 ? base.slice(idx).toLowerCase() : ''
}

export function archiveJoin(...parts: string[]): string {
  return parts.flatMap((part) => splitArchivePath(part)).join('/')
}

export function findSegment(filePath: string, name: string): number {
  const lower = name.toLowerCase()
  return splitArchivePath(filePath).findIndex((segment) => segment.toLowerCase() === lower)
}

export function hasSegment(filePath: string, name: string): boolean {
  return findSegment(filePath, name) >= 0
}

export function removeLeadingSegments(filePath: string, count: number): string {
  return splitArchivePath(filePath).slice(count).join('/')
}

export function isFileLike(file: string): boolean {
  return archiveBaseName(file).includes('.')
}

export function fallbackFolderId(stagingPath?: string, fallback = 'StellarBladeMod'): string {
  const clean = String(stagingPath || '').replace(/[\\/]+$/, '')
  const leaf = clean.split(/[\\/]/).pop() || fallback
  return leaf.replace(/\.installing$/i, '').replace(/\.(zip|rar|7z)$/i, '') || fallback
}
