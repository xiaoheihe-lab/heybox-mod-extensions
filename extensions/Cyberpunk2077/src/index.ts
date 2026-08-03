import type { IExtensionContext } from 'heybox-mod-api'
import { registerCyberpunkGame } from './game'
import { registerCyberpunkModTypes } from './modTypes'
import { registerRedmodDeployment } from './redmodDeployment'

async function main(context: IExtensionContext): Promise<boolean> {
  registerCyberpunkGame(context)
  registerCyberpunkModTypes(context)
  registerRedmodDeployment(context)
  return true
}

export default main
