import type { IExtensionContext } from 'heybox-mod-api'
import { registerGame } from './game'
import { registerPakLoadOrder } from './loadOrder'
import { registerClairObscurExpedition33ModTypes } from './modTypes'

async function main(context: IExtensionContext): Promise<boolean> {
  registerGame(context)
  registerClairObscurExpedition33ModTypes(context)
  registerPakLoadOrder(context)
  return true
}

export default main
