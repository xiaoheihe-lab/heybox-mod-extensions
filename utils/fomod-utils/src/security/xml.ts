export const MAX_XML_BYTES = 2 * 1024 * 1024
export const MAX_OPTIONS = 2000

export function assertSafeXml(xml: string): void {
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) throw new Error('FOMOD ModuleConfig.xml exceeds 2 MiB')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('FOMOD DTD and ENTITY declarations are not supported')
}

export function assertSupportedXmlFeatures(xml: string): void {
  const unsupported: Array<[RegExp, string]> = [
    [/<\s*gameDependency\b/i, 'gameDependency'],
    [/<\s*fommDependency\b/i, 'fommDependency'],
    [/<\s*fileDependency\b[^>]*\bstate\s*=\s*["']Inactive["']/i, 'fileDependency Inactive state'],
    [/<\s*enableplugin\b/i, 'enableplugin'],
    [/<\s*enableallplugins\b/i, 'enableallplugins'],
    [/<\s*iniedit\b/i, 'iniedit'],
    [/<\s*generatefile\b/i, 'generatefile'],
  ]
  const match = unsupported.find(([pattern]) => pattern.test(xml))
  if (!match) return
  const error = new Error(`Unsupported FOMOD feature: ${match[1]}`) as Error & { code?: string }
  error.code = 'FOMOD_UNSUPPORTED_FEATURE'
  throw error
}
