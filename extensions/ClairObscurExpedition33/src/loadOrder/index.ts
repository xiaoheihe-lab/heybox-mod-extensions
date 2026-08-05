import type { IExtensionContext } from 'heybox-mod-api'
import { GAME_ID, MOD_TYPE_FOMOD, MOD_TYPE_PAK, PAK_LOAD_ORDER_PROVIDER_ID } from '../constants'
import { serializePakLoadOrder } from './deployer'
import { deserializePakLoadOrder, isPakLoadOrderModRelevant } from './provider'
import type { LoadOrderCapableContext } from './protocol'

export function registerPakLoadOrder(contextValue: IExtensionContext): void {
  const context = contextValue as LoadOrderCapableContext
  context.registerLoadOrder({
    id: PAK_LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: 'Expedition 33 Pak Load Order',
    usageInstructions: [
      'Entries later in the list have higher load priority.',
      'Disabled entries keep their relative position and retain it when enabled again.',
    ],
    modTypes: [MOD_TYPE_PAK, MOD_TYPE_FOMOD],
    isModRelevant: isPakLoadOrderModRelevant,
    deserializeLoadOrder: deserializePakLoadOrder,
    serializeLoadOrder: (entries, loadOrderContext) => serializePakLoadOrder(contextValue, entries, loadOrderContext),
  })
  context.registerExtensionAction(GAME_ID, 'deployPakLoadOrder', () => (
    context.api.loadOrder.deploy(PAK_LOAD_ORDER_PROVIDER_ID)
  ))
}
