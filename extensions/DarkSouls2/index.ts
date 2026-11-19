import type { IExtensionContext } from 'heybox-mod-api'
import { createInstallers, getRequiredMods, registerSoulsGame, type SoulsGame } from './src/adapter'

export const game: SoulsGame = {
  appid: 335300, name: 'Dark Souls II: Scholar of the First Sin', executable: 'Game/DarkSoulsII.exe', directory: 'Game',
  nexusDomain: 'darksouls2', loader: 'me2',
  resourceDirectories: ['model', 'map', 'param', 'menu', 'msg', 'event', 'sound', 'font', 'material', 'chr', 'obj', 'sfx'],
  resourceFiles: ['enc_regulation.bnd.dcx'],
}
export const { testRoot, installRoot, testResources, installResources } = createInstallers(game)
export { ME2_CONFIG, SOTFS_CONFIG } from './src/loader-config'
export const getExtensionRequiredMods = (context: IExtensionContext, gamePath?: string) => getRequiredMods(context, game, gamePath)
export default (context: IExtensionContext) => registerSoulsGame(context, game)
