import type { IExtensionContext } from 'heybox-mod-api'
import { GAME_ID, typeId } from './constants'
import { installers, installKind, testKind } from './installers'
import { findGamePath, getExtensionRequiredMods } from './requirements'

export default async function main(context: IExtensionContext): Promise<boolean> {
  context.registerGame({
    id: GAME_ID, name: '英灵神殿', shortName: 'Valheim', executable: 'valheim.exe',
    requiredFiles: ['valheim.exe'], queryPath: () => findGamePath(context),
    modPath: '.', modPathIsRelative: true, queryModPath: () => '.',
    mergeMods: true, requiresCleanup: true,
    setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || '')),
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: 'valheim', customOpenModsPath: 'BepInEx/plugins' },
  })
  for (const { kind, priority, name } of installers) {
    const test = (files: string[], id: number | string) => testKind(kind, files, id)
    context.registerModType(typeId(kind), 200 - priority, id => Number(id) === GAME_ID,
      () => '{gamePath}', (input: any) => test(Array.isArray(input) ? input : input?.files ?? [], GAME_ID).supported, { name })
    context.registerInstaller(typeId(kind), 200 - priority, test, files => installKind(kind, files))
  }
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))
  return true
}
