import type { IExtensionContext, InstallerInstall, InstallerTest } from 'heybox-mod-api'
import { registerFomodInstaller } from '../../../utils/fomod-utils/src/index'
import { join, validateInstructions, type Instruction } from './archive'
import { EXECUTABLE, GAME_FOLDER, GAME_ID, GAME_NAME, PAK_PATH, typeId } from './constants'
import { detectLayout, findGamePath, getExtensionRequiredMods } from './environment'
import { GROUPS, installGroup, testGroup } from './installers'
import { registerLoadOrder } from './loadOrder'

export default async function main(context: IExtensionContext) {
  let setupPath = ''
  const resolvePath = async () => setupPath || await findGamePath(context) || ''
  context.registerGame({
    id: GAME_ID, name: GAME_NAME, shortName: 'WUCHANG', executable: EXECUTABLE,
    queryPath: () => findGamePath(context), requiredFiles: [GAME_FOLDER],
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: 'wuchangfallenfeathers', customOpenModsPath: PAK_PATH, supportsSymlinks: false },
    setup: async (discovery: { path?: string; gamePath?: string }) => {
      setupPath = discovery?.path || discovery?.gamePath || await findGamePath(context) || ''
      return getExtensionRequiredMods(context, setupPath)
    },
  })
  for (const [index, group] of GROUPS.entries()) {
    const test = (files: string[], gameId: number | string) => testGroup(group.kind, files, gameId)
    context.registerModType(typeId(group.kind), 1200 - index * 10, id => Number(id) === GAME_ID,
      () => '{gamePath}', input => {
        const files = Array.isArray(input) ? input : (input as { files?: string[] })?.files || []
        return test(files, GAME_ID).supported
      }, { name: group.name })
    context.registerInstaller(typeId(group.kind), group.priority, test, async (files, stagingPath) => (
      installGroup(context, group.kind, files, await detectLayout(context, await resolvePath()), stagingPath)
    ))
  }
  // Vortex exposes this as a manually selected target, not an automatic installer.
  context.registerModType(typeId('pakalt'), 100, id => Number(id) === GAME_ID,
    () => `{gamePath}/${GAME_FOLDER}/Content/Paks`, () => false, { name: 'UE5 Paks (no "~mods")' })

  // Adapt the shared FOMOD installer: its selected destinations are relative to the game's normal mod folder.
  const fomodContext = Object.create(context) as IExtensionContext
  fomodContext.registerInstaller = (id: string, priority: number, test: InstallerTest, install: InstallerInstall) => {
    context.registerInstaller(id, priority, test, async (...args) => {
      const result = await install(...args)
      const instructions = (result.instructions as Instruction[]).map(i => i.destination
        ? { ...i, destination: join(PAK_PATH, i.destination) } : i)
      return { ...result, instructions: validateInstructions(instructions) }
    })
  }
  registerFomodInstaller(fomodContext, { gameId: GAME_ID, typeId: typeId('fomod'), priority: 100, name: 'FOMOD Installer' })
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', async () => getExtensionRequiredMods(context, await resolvePath()))
  registerLoadOrder(context)
  return true
}
