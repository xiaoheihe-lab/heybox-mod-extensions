import type { IExtensionContext } from 'heybox-mod-api'
import { GAME_ID, MOD_TYPE } from '../constants'
import { extractRedmodAttributes } from '../redmod/attributes'
import { serializeAndDeployRedmods } from './deployer'
import { deserializeRedmodLoadOrder, isRedmodLoadOrderModRelevant, REDMOD_LOAD_ORDER_PROVIDER_ID } from './provider'
import type { LoadOrderCapableContext } from './protocol'
import { registerFomodRedmodAttributeExtractor } from '../redmod/fomodAttributes'
import { RedmodSteamLaunchOptionCoordinator } from '../launchOptions'
import type { SteamLaunchOptionCapableContext } from '../launchOptions'

export function registerRedmodLoadOrder(contextValue: IExtensionContext): void {
  const context = contextValue as LoadOrderCapableContext
  const launchOptions = new RedmodSteamLaunchOptionCoordinator(contextValue as SteamLaunchOptionCapableContext)
  context.registerAttributeExtractor(100, extractRedmodAttributes)
  registerFomodRedmodAttributeExtractor(contextValue)
  context.registerLoadOrder({
    id: REDMOD_LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: 'REDmod 加载顺序',
    usageInstructions: [
      '越靠前的 REDmod 优先级越高。',
      '禁用项目仍会保留位置，但不会写入本次 REDmod 部署。',
    ],
    modTypes: [MOD_TYPE.redmod, MOD_TYPE.multiTypeRedmod, MOD_TYPE.fomod],
    isModRelevant: isRedmodLoadOrderModRelevant,
    deserializeLoadOrder: deserializeRedmodLoadOrder,
    serializeLoadOrder: serializeAndDeployRedmods,
    onDidDeploy: (entries) => launchOptions.afterDeploy(entries),
  })
  context.registerExtensionAction(GAME_ID, 'deployRedmods', () => context.api.loadOrder.deploy(REDMOD_LOAD_ORDER_PROVIDER_ID))
}
