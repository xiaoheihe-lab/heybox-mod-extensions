import { GAME_ID, typeId } from './constants'

type Entry = { source: string; path: string; lower: string }
export type Kind = 'bepinex' | 'unstripped' | 'inslim-loader' | 'core-remover' | 'config-manager'
  | 'bepinex-root' | 'inslim' | 'better-continents' | 'world' | 'vbuild' | 'meshes' | 'textures' | 'engine' | 'plugin'
const metadata = /^(manifest\.json|icon\.png|readme(?:\..*)?|changelog(?:\..*)?|license(?:\..*)?)$/i
const base = (p: string) => p.split('/').at(-1)!
const dir = (p: string) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''
const join = (...parts: string[]) => parts.filter(Boolean).join('/')

function entries(files: string[]): Entry[] {
  return files.flatMap(source => {
    const p = source.replace(/\\/g, '/').replace(/^(\.\/)+/, '')
    if (!p || p.endsWith('/')) return []
    if (p.startsWith('/') || p.split('/').some(s => !s || s === '..' || s === '.'
      || /[<>:"|?*\x00-\x1f]/.test(s) || /[. ]$/.test(s)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s))) {
      throw new Error(`Unsafe archive path: ${source}`)
    }
    return [{ source, path: p, lower: p.toLowerCase() }]
  })
}
function payloadRoot(es: Entry[]): string | undefined {
  const roots = es.filter(e => base(e.lower) === 'winhttp.dll').map(e => dir(e.path))
  if (roots.length > 1) throw new Error('Multiple BepInEx payloads; select a single variant')
  return roots[0]
}
function assemblyRoots(es: Entry[]): string[] {
  return [...new Set(es.flatMap(e => {
    const segments = e.lower.split('/')
    const i = segments.findIndex(s => ['unstripped_corlib', 'core_lib', 'unstripped_managed'].includes(s))
    return i < 0 ? [] : [e.path.split('/').slice(0, i + 1).join('/')]
  }))].filter(root => es.some(e => ['mscorlib.dll', 'mono.posix.dll', 'mono.security.dll']
    .some(name => e.lower === join(root, name).toLowerCase())))
}
const hasSegment = (e: Entry, names: string[]) => e.lower.split('/').some(s => names.includes(s))
function classify(es: Entry[]): Kind | undefined {
  if (payloadRoot(es) !== undefined) return 'bepinex'
  if (assemblyRoots(es).length) return 'unstripped'
  if (es.some(e => base(e.lower) === 'inslimvml.ini')) return 'inslim-loader'
  if (es.some(e => /(^|\/)core\/(bepinex|0harmony)/.test(e.lower))) return 'core-remover'
  // Explicit layouts win over loose-file heuristics and preserve mixed packs.
  if (es.some(e => hasSegment(e, ['bepinex', 'plugins', 'patchers', 'config', 'custommeshes', 'customtextures']))) return 'bepinex-root'
  if (es.some(e => hasSegment(e, ['valheim_data']) || ['winhttp.dll', 'doorstop_config.ini', 'version.dll', 'dxgi.dll', 'd3d11.dll'].includes(base(e.lower)))) return 'engine'
  if (es.some(e => base(e.lower) === 'configurationmanager.dll')) return 'config-manager'
  if (es.some(e => hasSegment(e, ['inslimvml']) || e.lower.endsWith('_vml.dll'))) return 'inslim'
  if (es.some(e => e.lower.endsWith('.bettercontinents'))) return 'better-continents'
  if (es.some(e => e.lower.endsWith('.fwl') && es.some(other => other.lower === e.lower.slice(0, -4) + '.db'))) return 'world'
  if (es.some(e => e.lower.endsWith('.vbuild'))) return 'vbuild'
  if (es.some(e => /\.(fbx|obj)$/.test(e.lower))) return 'meshes'
  if (es.some(e => /tex\.png$/.test(e.lower))) return 'textures'
  if (es.some(e => /\.(assets|ress|resource)$/i.test(e.path))) return 'engine'
  if (es.some(e => e.lower.endsWith('.dll'))) return 'plugin'
  return undefined
}
export function testKind(kind: Kind, files: string[], gameId: number | string) {
  let supported = false
  try { supported = Number(gameId) === GAME_ID && classify(entries(files)) === kind } catch { /* reject unsafe/ambiguous archives */ }
  return { supported, requiredFiles: [] }
}
function commonRoot(es: Entry[]): string {
  const parts = es.map(e => dir(e.path).split('/').filter(Boolean))
  const root = parts[0]?.slice() ?? []
  while (root.length && !parts.every(p => root.every((s, i) => s.toLowerCase() === p[i]?.toLowerCase()))) root.pop()
  return root.join('/')
}
function relative(e: Entry, root: string): string | undefined {
  return !root ? e.path : e.lower.startsWith(root.toLowerCase() + '/') ? e.path.slice(root.length + 1) : undefined
}
function mapped(e: Entry): string | undefined {
  const parts = e.path.split('/')
  const lower = e.lower.split('/')
  const i = lower.findIndex(s => ['bepinex', 'plugins', 'patchers', 'config', 'custommeshes', 'customtextures', 'inslimvml', 'valheim_data', 'advancedbuilder', 'vortex-worlds'].includes(s))
  if (i < 0) return undefined
  const tail = parts.slice(i + 1).join('/')
  const key = lower[i]
  if (key === 'bepinex') return join('BepInEx', tail)
  if (['plugins', 'patchers', 'config'].includes(key)) return join('BepInEx', key, tail)
  if (key === 'custommeshes' || key === 'customtextures') return join('BepInEx/plugins', key === 'custommeshes' ? 'CustomMeshes' : 'CustomTextures', tail)
  return join(({ inslimvml: 'InSlimVML', valheim_data: 'valheim_Data', advancedbuilder: 'AdvancedBuilder', 'vortex-worlds': 'vortex-worlds' } as Record<string, string>)[key], tail)
}
const bundledCore = (e: Entry) => hasSegment(e, ['core', 'valheim_data'])
  || /^(winhttp\.dll|doorstop_config\.ini|bepinex\.cfg|0harmony.*|bepinex\..*|monomod\..*|mono\.cecil.*|harmonyxinterop\.dll)$/i.test(base(e.lower))

export function installKind(kind: Kind, files: string[]) {
  const es = entries(files)
  const instructions: Array<{ type: 'copy'; source: string; destination: string; verification?: 'exists'; conflictPolicy?: 'overwrite' }> = []
  const used = new Set<string>()
  function copy(e: Entry, destination: string) {
    if (!destination) return
    const key = destination.toLowerCase()
    if (used.has(key)) throw new Error(`Conflicting archive destinations: ${destination}`)
    used.add(key)
    const mutable = /(^|\/)config\/.*\.(cfg|yml|yaml|json)$/i.test(destination) || key === 'doorstop_config.ini'
    instructions.push({ type: 'copy', source: e.source, destination,
      ...(mutable ? { verification: 'exists' as const, conflictPolicy: 'overwrite' as const } : {}) })
  }
  if (kind === 'bepinex') {
    const root = payloadRoot(es)
    if (root === undefined) throw new Error('Incomplete Valheim BepInEx payload')
    for (const e of es) {
      const p = relative(e, root)
      if (p) copy(e, p)
    }
  } else if (kind === 'unstripped') {
    const roots = assemblyRoots(es)
    if (roots.length !== 1) throw new Error('Select exactly one unstripped assembly variant')
    for (const e of es) {
      const p = relative(e, roots[0])
      if (p && !metadata.test(base(p))) copy(e, join('unstripped_corlib', p))
    }
  } else {
    const payload = es.filter(e => !metadata.test(base(e.path)) && (kind !== 'core-remover' || !bundledCore(e)))
    let root = commonRoot(payload)
    if (kind === 'inslim-loader') root = dir(es.find(e => base(e.lower) === 'inslimvml.ini')?.path ?? '')
    if (kind === 'better-continents') {
      const roots = [...new Set(es.filter(e => e.lower.endsWith('.bettercontinents')).map(e => dir(e.path)))]
      if (roots.length !== 1) throw new Error('Select a single Better Continents world package')
      root = roots[0]
    }
    const defaults: Partial<Record<Kind, string>> = {
      'config-manager': 'BepInEx/plugins/ConfigurationManager', inslim: 'InSlimVML/Mods',
      'better-continents': 'vortex-worlds', world: 'vortex-worlds', vbuild: 'AdvancedBuilder/Builds',
      meshes: 'BepInEx/plugins/CustomMeshes', textures: 'BepInEx/plugins/CustomTextures',
      plugin: 'BepInEx/plugins', 'bepinex-root': 'BepInEx/plugins', 'core-remover': 'BepInEx/plugins',
    }
    for (const e of payload) {
      const p = relative(e, root)
      if (!p) continue
      if (kind === 'vbuild') { if (e.lower.endsWith('.vbuild')) copy(e, join(defaults.vbuild!, base(e.path))); continue }
      if (kind === 'inslim-loader') {
        // Preserve the selected BepInEx injector; legacy compatibility plugins are separate dependencies.
        if (['winhttp.dll', 'doorstop_config.ini', 'slimvml.loader.dll', '0harmony.dll'].includes(base(e.lower))) continue
        copy(e, p); continue
      }
      if (kind === 'engine') {
        copy(e, mapped(e) ?? (/\.(assets|ress|resource)$/i.test(e.path) ? join('valheim_Data', p) : p)); continue
      }
      copy(e, mapped(e) ?? join(defaults[kind] ?? '', p))
    }
  }
  if (!instructions.length) throw new Error('No supported Valheim files in archive')
  return { instructions, modType: typeId(kind) }
}

export const installers: Array<{ kind: Kind; priority: number; name: string }> = [
  { kind: 'bepinex', priority: 1, name: 'BepInExPack Valheim' },
  { kind: 'unstripped', priority: 2, name: 'Denikson Unstripped Assemblies' },
  { kind: 'inslim-loader', priority: 10, name: 'InSlimVML Mod Loader' },
  { kind: 'core-remover', priority: 11, name: 'Mod with bundled BepInEx Core' },
  { kind: 'bepinex-root', priority: 20, name: 'BepInEx Root Mod' },
  { kind: 'engine', priority: 21, name: 'Engine Injector / Asset Replacer' },
  { kind: 'config-manager', priority: 22, name: 'Configuration Manager' },
  { kind: 'inslim', priority: 23, name: 'InSlimVML Mod' },
  { kind: 'better-continents', priority: 24, name: 'Better Continents World' },
  { kind: 'world', priority: 25, name: 'Vortex Worlds' },
  { kind: 'vbuild', priority: 26, name: 'BuildShare / AdvancedBuilder' },
  { kind: 'meshes', priority: 27, name: 'CustomMeshes Mod' },
  { kind: 'textures', priority: 28, name: 'CustomTextures Mod' },
  { kind: 'plugin', priority: 50, name: 'BepInEx Plugin' },
]
