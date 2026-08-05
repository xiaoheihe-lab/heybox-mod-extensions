import type { IExtensionContext } from 'heybox-mod-api'
import { GAME_ID } from './constants'
import { registerGame } from './game'
import { registerPakLoadOrder } from './loadOrder'
import { registerClairObscurExpedition33ModTypes } from './modTypes'
import { getExtensionRequiredMods } from './requirements'

async function main(context: IExtensionContext): Promise<boolean> {
  registerGame(context, async (discovery) => getExtensionRequiredMods(context, String((discovery as any)?.path || '')))
  registerClairObscurExpedition33ModTypes(context)
  registerPakLoadOrder(context)
  context.registerExtensionAction(GAME_ID, 'getExtensionRequiredMods', () => getExtensionRequiredMods(context))
  return true
}

export default main
