export function list(value: unknown): any[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

export function first(value: unknown): any {
  return list(value)[0]
}

export function attr(node: any, name: string, fallback = ''): string {
  return String(node?.$?.[name] ?? fallback)
}

export function text(node: any, fallback = ''): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return String(node?._ ?? fallback).trim()
}

export function boolAttr(node: any, name: string): boolean {
  return attr(node, name, 'false').toLowerCase() === 'true'
}
