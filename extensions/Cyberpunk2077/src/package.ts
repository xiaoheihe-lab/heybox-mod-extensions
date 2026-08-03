import { KNOWN_TOP_LEVEL_DIRS } from './constants'
import type { PackageFile, PreparedPackage } from './types'

export function normalizeRelativePath(value: unknown): string {
  const normalized = String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '')

  if (!normalized) return ''
  const segments = normalized.split('/')
  if (segments.includes('..') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe archive path: ${value}`)
  }
  return normalized
}

export function sanitizePackageName(value: unknown): string {
  const cleaned = String(value ?? '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return cleaned || 'Cyberpunk2077Mod'
}

function commonWrapper(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined
  const first = paths[0].split('/')[0]
  if (!first || paths.some((file) => file.split('/')[0].toLowerCase() !== first.toLowerCase())) return undefined
  if (KNOWN_TOP_LEVEL_DIRS.has(first.toLowerCase())) return undefined

  const unwrapped = paths.map((file) => file.slice(first.length + 1)).filter(Boolean)
  if (unwrapped.length !== paths.length) return undefined
  const revealsKnownRoot = unwrapped.some((file) => KNOWN_TOP_LEVEL_DIRS.has(file.split('/')[0].toLowerCase()))
  return revealsKnownRoot ? first : undefined
}

export function preparePackage(inputFiles: string[]): PreparedPackage {
  const normalized = inputFiles.map(normalizeRelativePath).filter(Boolean)
  const wrapper = commonWrapper(normalized)
  const files: PackageFile[] = normalized.map((source) => {
    const path = wrapper ? source.slice(wrapper.length + 1) : source
    return { source, path, lower: path.toLowerCase() }
  })

  const fallbackName = files.find((file) => file.path.includes('/'))?.path.split('/')[0]
    || files[0]?.path.replace(/\.[^.]+$/, '')
    || 'Cyberpunk2077Mod'

  return {
    files,
    wrapper,
    packageName: sanitizePackageName(wrapper || fallbackName),
  }
}

export function extname(filePath: string): string {
  const name = filePath.split('/').pop() || ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}

export function basename(filePath: string): string {
  return filePath.split('/').pop() || ''
}

export function dirname(filePath: string): string {
  const index = filePath.lastIndexOf('/')
  return index < 0 ? '' : filePath.slice(0, index)
}

export function isUnder(file: PackageFile, prefix: string): boolean {
  const normalized = normalizeRelativePath(prefix).toLowerCase()
  return file.lower === normalized || file.lower.startsWith(`${normalized}/`)
}

export function relativeTo(file: PackageFile, prefix: string): string {
  const normalized = normalizeRelativePath(prefix)
  return file.path.slice(normalized.length).replace(/^\//, '')
}

export function hasPath(files: PackageFile[], expected: string): boolean {
  const lower = normalizeRelativePath(expected).toLowerCase()
  return files.some((file) => file.lower === lower)
}

export function hasAllPaths(files: PackageFile[], expected: string[]): boolean {
  return expected.every((path) => hasPath(files, path))
}
