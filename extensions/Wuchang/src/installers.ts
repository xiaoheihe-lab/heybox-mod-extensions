import type { IExtensionContext } from 'heybox-mod-api'
import { base, copyTree, entries, hasExt, isFomod, join, named, parent, payload, under, validateInstructions, type Entry, type Instruction } from './archive'
import { binariesPath, GAME_FOLDER, GAME_ID, LOGIC_PATH, PAK_ATTRIBUTE, PAK_PATH, scriptsPath, typeId, type StoreLayout } from './constants'

function uniqueAnchor(rows: Entry[], name: string): Entry | undefined {
  const found = payload(rows).filter(e => base(e.path).toLowerCase() === name.toLowerCase())
  if (found.length > 1) throw new Error(`Ambiguous package: multiple ${name} files`)
  return found[0]
}
function rootDirectory(rows: Entry[], name: string): Entry | undefined {
  const found = rows.filter(e => e.directory && base(e.path).toLowerCase() === name.toLowerCase())
  if (found.length > 1) throw new Error(`Ambiguous package: multiple ${name} directories`)
  return found[0]
}
function loader(rows: Entry[]) {
  const dll = uniqueAnchor(rows, 'dwmapi.dll')
  if (!dll) return undefined
  const root = parent(dll.path)
  return payload(rows).some(e => e.path.toLowerCase() === join(root, 'ue4ss/UE4SS.dll').toLowerCase()) ? dll : undefined
}
function modAnchor(rows: Entry[], folder: string, ext: string) {
  const anchor = rootDirectory(rows, folder)
  return anchor && payload(rows).some(e => under(e.path, anchor.path) && e.path.toLowerCase().endsWith(ext)) ? anchor : undefined
}
function ue4ssModsRoots(rows: Entry[]): string[] {
  const roots = new Map<string, string>()
  for (const entry of payload(rows)) {
    const parts = entry.path.split('/')
    for (let i = 0; i < parts.length - 3; i++) {
      if (parts[i].toLowerCase() === 'ue4ss' && parts[i + 1].toLowerCase() === 'mods') {
        const root = parts.slice(0, i + 2).join('/')
        roots.set(root.toLowerCase(), root)
        break
      }
    }
  }
  return [...roots.values()]
}
function hasUe4ssMods(rows: Entry[]): boolean {
  const roots = ue4ssModsRoots(rows)
  // Leave mixed Pak packages to the existing combo/LogicMod/Pak routes.
  return roots.length > 0 && !payload(rows).some(e => /\.pak$/i.test(e.path) && !roots.some(root => under(e.path, root)))
}
function comboAnchor(rows: Entry[]) {
  const root = rootDirectory(rows, GAME_FOLDER)
  const children = root ? rows.filter(e => under(e.path, root.path)) : []
  return hasExt(children, '.pak') && hasExt(children, '.lua') ? root : undefined
}
function logicAnchor(rows: Entry[]) {
  const root = rootDirectory(rows, 'LogicMods')
  return root && hasExt(rows.filter(e => under(e.path, root.path)), '.pak') ? root : undefined
}
function enabler(rows: Entry[]) {
  const dll = uniqueAnchor(rows, 'dsound.dll')
  return dll && named(rows.filter(e => under(e.path, parent(dll.path))), 'sig.lua') ? dll : undefined
}
function isUnsupportedUserData(rows: Entry[]) {
  return payload(rows).some(e => /^(engine|scalability|input|game)\.ini$/i.test(base(e.path)) || /\.sav$/i.test(e.path))
}

export const GROUPS = [
  { kind: 'ue4ss', name: 'UE4SS for WUCHANG', priority: 1, match: (r: Entry[]) => Boolean(loader(r)) },
  { kind: 'mod-enabler', name: 'Mod Enabler', priority: 2, match: (r: Entry[]) => Boolean(enabler(r)) },
  { kind: 'ue4ss-mods', name: 'UE4SS Mods Folder', priority: 3, match: hasUe4ssMods },
  { kind: 'combo', name: 'UE4SS Script + LogicMod', priority: 25, match: (r: Entry[]) => Boolean(comboAnchor(r)) },
  { kind: 'logic', name: 'UE4SS LogicMod', priority: 27, match: (r: Entry[]) => Boolean(logicAnchor(r)) },
  { kind: 'pak', name: 'UE5 Sortable Pak Mod', priority: 29, match: (r: Entry[]) => hasExt(r, '.pak') },
  { kind: 'script', name: 'UE4SS Script Mod', priority: 33, match: (r: Entry[]) => Boolean(modAnchor(r, 'Scripts', '.lua')) },
  { kind: 'dll', name: 'UE4SS DLL Mod', priority: 35, match: (r: Entry[]) => Boolean(modAnchor(r, 'dlls', '.dll')) },
  { kind: 'root', name: 'Root Game Folder', priority: 37, match: (r: Entry[]) => Boolean(rootDirectory(r, GAME_FOLDER)) },
  { kind: 'content', name: 'Content Folder', priority: 39, match: (r: Entry[]) => Boolean(rootDirectory(r, 'Content')) },
  { kind: 'binaries', name: 'Binaries (Engine Injector)', priority: 45, match: (r: Entry[]) => payload(r).length > 0 && !hasExt(r, '.pak') && !isUnsupportedUserData(r) },
] as const
export type Kind = typeof GROUPS[number]['kind']

export function testGroup(kind: Kind, files: string[], gameId: number | string) {
  if (Number(gameId) !== GAME_ID) return { supported: false }
  const rows = entries(files)
  if (isFomod(rows)) return { supported: false }
  try { return { supported: Boolean(GROUPS.find(g => g.kind === kind)?.match(rows)) } } catch (error) {
    // Host evaluates every tester, including lower-priority candidates. Reserve ambiguous
    // packages for this installer to reject only if selected; never interrupt a valid loader.
    if (error instanceof Error && error.message.startsWith('Ambiguous package:')) return { supported: true }
    throw error
  }
}

async function choosePaks(context: IExtensionContext, rows: Entry[]): Promise<Entry[]> {
  if (rows.length <= 1) return rows
  const choices = rows.map((e, i) => ({ id: `pak-${i}`, text: e.path, value: true, payload: { file: e.source } }))
  const response = await context.api.util.ui.request({
    type: 'wuchang_pak_selection', title: '选择要安装的 Pak 文件',
    content: '包内含多个 Pak，默认全部选中；若为互斥版本，请仅选择需要的文件。',
    choiceMode: 'multiple', choices, selectedChoiceIds: choices.map(c => c.id),
    confirm: { text: '安装选中的 Pak', visible: true, type: 'primary' },
    cancel: { text: '取消', visible: true, type: 'cancel' },
  }, { timeoutMs: 600000 })
  if (!response?.confirmed) throw new Error('Wuchang mod installation cancelled')
  const data = response.payload as any
  const selected: unknown = data?.choices ?? data?.selectedChoices ?? data?.choiceIds ?? data?.selectedChoiceIds
  if (!Array.isArray(selected)) throw new Error('No Pak files selected')
  const ids = new Set(selected.map((c: any) => typeof c === 'string' ? c : c?.id))
  const result = rows.filter((_, i) => ids.has(choices[i].id))
  if (!result.length) throw new Error('No Pak files selected')
  return result
}

export async function installGroup(context: IExtensionContext, kind: Kind, files: string[], layout: StoreLayout, stagingPath = '') {
  const rows = entries(files)
  if (isFomod(rows) || !GROUPS.find(g => g.kind === kind)?.match(rows)) throw new Error(`Unsupported Wuchang ${kind} package`)
  let instructions: Instruction[]
  const bin = binariesPath(layout)
  switch (kind) {
    case 'ue4ss': instructions = copyTree(rows, parent(loader(rows)!.path), bin); break
    case 'mod-enabler': instructions = copyTree(rows, parent(enabler(rows)!.path), bin); break
    case 'ue4ss-mods': instructions = ue4ssModsRoots(rows).flatMap(root => copyTree(rows, root, scriptsPath(layout))); break
    case 'combo':
    case 'root': {
      const root = rootDirectory(rows, GAME_FOLDER)!
      instructions = copyTree(rows, root.path, GAME_FOLDER)
      break
    }
    case 'content': instructions = copyTree(rows, rootDirectory(rows, 'Content')!.path, `${GAME_FOLDER}/Content`); break
    case 'logic': instructions = copyTree(rows, logicAnchor(rows)!.path, LOGIC_PATH); break
    case 'script':
    case 'dll': {
      const marker = kind === 'script' ? 'Scripts' : 'dlls'
      const anchor = modAnchor(rows, marker, kind === 'script' ? '.lua' : '.dll')!
      const root = parent(anchor.path)
      const fallback = base(stagingPath.replace(/\\/g, '/').replace(/\/+$/, '')).replace(/\.installing$/i, '').replace(/\.(zip|7z|rar)$/i, '')
      const folder = base(root) || context.api.util.sanitizeFilename(fallback, 'WuchangMod')
      const target = join(scriptsPath(layout), folder)
      instructions = copyTree(rows, root, target)
      if (!payload(rows).some(e => e.path.toLowerCase() === join(root, 'enabled.txt').toLowerCase())) {
        instructions.push({ type: 'generatefile', destination: join(target, 'enabled.txt'), data: '' })
      }
      break
    }
    case 'pak': {
      const selected = await choosePaks(context, payload(rows).filter(e => /\.pak$/i.test(e.path)))
      instructions = selected.map(e => ({ type: 'copy', source: e.source, destination: join(PAK_PATH, base(e.path)) }))
      instructions.push({ type: 'attribute', key: PAK_ATTRIBUTE, value: selected.map(e => base(e.path)) })
      break
    }
    case 'binaries': instructions = copyTree(rows, '', bin); break
  }
  return { modType: typeId(kind), instructions: validateInstructions(instructions) }
}
