export function normalizeArchivePath(filePath: string): string {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
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
  const index = base.lastIndexOf('.')
  return index >= 0 ? base.slice(index).toLowerCase() : ''
}

export function archiveJoin(...parts: string[]): string {
  return parts.flatMap((part) => splitArchivePath(part)).join('/')
}

export function removeLeadingSegments(filePath: string, count: number): string {
  return splitArchivePath(filePath).slice(count).join('/')
}

export function segmentsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length
    && left.every((segment, index) => segment.toLowerCase() === right[index]?.toLowerCase())
}

export function isUnderSegments(filePath: string, parent: string[]): boolean {
  const parts = splitArchivePath(filePath)
  return parent.every((segment, index) => parts[index]?.toLowerCase() === segment.toLowerCase())
}

export function isDirectoryEntry(file: string, files: string[]): boolean {
  const raw = String(file || '')
  if (/[\\/]$/.test(raw)) return true
  const normalized = normalizeArchivePath(file).replace(/\/+$/, '')
  if (!normalized) return true
  const prefix = `${normalized.toLowerCase()}/`
  return files.some((candidate) => normalizeArchivePath(candidate).toLowerCase().startsWith(prefix))
}

export function isArchiveFile(file: string, files: string[]): boolean {
  return Boolean(archiveBaseName(file)) && !isDirectoryEntry(file, files)
}

export function findExplicitDirectory(files: string[], name: string, under?: string[]): string[] | null {
  const lower = name.toLowerCase()
  for (const file of files) {
    const parts = splitArchivePath(file)
    if (parts[parts.length - 1]?.toLowerCase() !== lower) continue
    if (under && !under.every((segment, index) => parts[index]?.toLowerCase() === segment.toLowerCase())) continue
    if (isDirectoryEntry(file, files)) return parts
  }
  return null
}

export function findSegment(filePath: string, name: string): number {
  const lower = name.toLowerCase()
  return splitArchivePath(filePath).findIndex((segment) => segment.toLowerCase() === lower)
}

export function fallbackFolderId(stagingPath?: string, fallback = 'BlackMythWukongMod'): string {
  const clean = String(stagingPath || '').replace(/[\\/]+$/, '')
  const leaf = clean.split(/[\\/]/).pop() || fallback
  return leaf.replace(/\.installing$/i, '').replace(/\.(zip|rar|7z)$/i, '') || fallback
}

export function normalizeDeploymentPath(value: unknown): string {
  return normalizeArchivePath(String(value ?? '')).replace(/^\.\//, '').toLowerCase()
}
