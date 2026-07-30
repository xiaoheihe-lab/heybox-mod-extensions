import type { IExtensionContext } from 'heybox-mod-api'

export type LoadOrderReason =
  | 'open'
  | 'refresh'
  | 'user-save'
  | 'manual-deploy'
  | 'after-enable'
  | 'after-disable'
  | 'after-uninstall'
  | 'after-reconfigure'

export interface LoadOrderModSnapshot {
  modKey: string
  modId?: number
  fileId?: number
  versionId?: number
  modType?: string
  enabled: boolean
  metaInfo: Record<string, unknown>
}

export interface LoadOrderContext {
  appid: number
  gameId: number
  gamePath: string
  revision: number
  reason: LoadOrderReason
  savedOrder: string[]
  mods: LoadOrderModSnapshot[]
}

export interface LoadOrderEntry {
  id: string
  ownerModKey: string
  name: string
  enabled: boolean
  data?: Record<string, unknown>
}

export interface LoadOrderRegistration {
  id: string
  gameId: number | string
  title: string
  usageInstructions?: string | string[]
  modTypes: string[]
  isModRelevant?(mod: LoadOrderModSnapshot): boolean | Promise<boolean>
  deserializeLoadOrder(context: LoadOrderContext): LoadOrderEntry[] | Promise<LoadOrderEntry[]>
  validate?(previous: LoadOrderEntry[], current: LoadOrderEntry[], context: LoadOrderContext): void | Promise<void>
  serializeLoadOrder(entries: LoadOrderEntry[], context: LoadOrderContext): void | Promise<void>
  onDidDeploy?(entries: LoadOrderEntry[], context: LoadOrderContext): void | Promise<void>
}

export interface LoadOrderCapableContext extends IExtensionContext {
  registerLoadOrder(options: LoadOrderRegistration): void
  api: IExtensionContext['api'] & {
    loadOrder: {
      deploy(providerId: string): Promise<unknown>
    }
  }
}
