import type { IExtensionContext } from 'heybox-mod-api'

export interface LoadOrderModSnapshot {
  modKey: string
  modType?: string
  enabled: boolean
  metaInfo: Record<string, unknown>
}

export interface LoadOrderContext {
  appid: number
  gameId: number
  gamePath: string
  revision: number
  reason: string
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
}

export interface LoadOrderCapableContext extends IExtensionContext {
  registerLoadOrder(options: LoadOrderRegistration): void
  api: IExtensionContext['api'] & {
    loadOrder: {
      deploy(providerId: string): Promise<unknown>
    }
  }
}

export interface ManagedDeploymentEntry {
  modKey: string
  modType?: string
  targetPath: string
  expectedHash: string
  exists?: boolean
}

export interface ManagedDeploymentMutation {
  entries?: ManagedDeploymentEntry[]
  moveDeployment(input: { modKey: string, from: string, to: string, expectedHash?: string }): void
  warn(message: string, details?: Record<string, unknown>): void
}
