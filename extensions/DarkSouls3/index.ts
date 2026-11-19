import type { IExtensionContext } from 'heybox-mod-api'
import { createInstallers, getRequiredMods, registerSoulsGame, type SoulsGame } from './src/adapter'

export const game: SoulsGame = {
  appid: 374320, name: 'Dark Souls III', executable: 'Game/DarkSoulsIII.exe', directory: 'Game',
  nexusDomain: 'darksouls3', loader: 'me2',
  resourceDirectories: ['chr', 'parts', 'map', 'param', 'menu', 'msg', 'event', 'script', 'sfx', 'sound', 'obj', 'font', 'mtd', 'material'],
  resourceFiles: ['regulation.bin'],
}
export const { testRoot, installRoot, testResources, installResources } = createInstallers(game)
export { ME2_CONFIG, SOTFS_CONFIG } from './src/loader-config'
export const getExtensionRequiredMods = (context: IExtensionContext, gamePath?: string) => getRequiredMods(context, game, gamePath)
export default (context: IExtensionContext) => registerSoulsGame(context, game)
