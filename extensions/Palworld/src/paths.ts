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

export function removeLeadingSegments(filePath: string, count: number): string {
  return splitArchivePath(filePath).slice(count).join('/')
}

export function getStagingSourcePath(file: string, stagingPath?: string, sourcePathByFile?: Record<string, string>): string {
  const direct = sourcePathByFile?.[file]
  if (direct) return direct
  return path.join(String(stagingPath || ''), file)
}

export function stripKnownTopWrapper(files: string[], predicate: (file: string) => boolean): number {
  const matched = files.filter(predicate).map(splitArchivePath).filter((parts) => parts.length > 0)
  if (matched.length === 0) return 0

  const first = matched[0]
  let common = 0
  while (common < first.length - 1) {
    const segment = first[common]
    if (!matched.every((parts) => parts[common] === segment)) break
    common += 1
  }
  return common
}
