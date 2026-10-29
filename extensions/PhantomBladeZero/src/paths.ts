declare const require: any

const path = require('path')

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

/** Directory entries are meaningless for mods; only files with a base name are deployable. */
export function isFileLike(file: string): boolean {
  const base = archiveBaseName(file)
  return base.includes('.')
}

/**
 * A path is a directory when the archive explicitly marks it as one or when
 * another entry lives below it. Extension-based sniffing is not enough here:
 * UE4SS ships extensionless files such as `LICENSE` that must still deploy.
 */
export function isDirectoryEntry(file: string, files: string[]): boolean {
  const raw = String(file || '')
  if (/[\\/]$/.test(raw)) return true
  const normalized = normalizeArchivePath(raw).replace(/\/+$/, '')
  if (!normalized) return true
  const prefix = `${normalized.toLowerCase()}/`
  return files.some((candidate) => normalizeArchivePath(candidate).toLowerCase().startsWith(prefix))
}

/** True for a deployable file entry, including extensionless ones. */
export function isArchiveFile(file: string, files: string[]): boolean {
  return Boolean(archiveBaseName(file)) && !isDirectoryEntry(file, files)
}

/**
 * Validates an archive-relative path and returns it with forward slashes.
 * Returns undefined for absolute paths, traversal, drive letters and other unsafe entries.
 */
export function safeArchivePath(source: string): string | undefined {
  const file = String(source ?? '').replace(/\\/g, '/').replace(/^(\.\/)+/, '')
  if (!file || file.endsWith('/')) return undefined
  if (file.startsWith('/') || /^[a-z]:/i.test(file) || file.includes('://') || file.includes('\0')) return undefined
  const parts = file.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part))) return undefined
  return file
}

export function fallbackFolderId(stagingPath?: string, fallback = 'PhantomBladeZeroMod'): string {
  const clean = String(stagingPath || '').replace(/[\\/]+$/, '')
  const leaf = clean.split(/[\\/]/).pop() || fallback
  return leaf.replace(/\.installing$/i, '').replace(/\.(zip|rar|7z)$/i, '') || fallback
}

export function getStagingSourcePath(
  file: string,
  stagingPath?: string,
  sourcePathByFile?: Record<string, string>,
): string {
  const direct = sourcePathByFile?.[file]
  if (direct) return direct
  return path.join(String(stagingPath || ''), file)
}

