import type { IExtensionContext } from 'heybox-mod-api'

export interface SteamLaunchOptionsEntry {
  userId: string
  localConfigPath: string
  launchOptions: string
}

export interface SteamEnsureLaunchOptionResult {
  entries: SteamLaunchOptionsEntry[]
  updatedUserIds: string[]
  failures: Array<{
    userId: string
    localConfigPath: string
    message: string
  }>
}

export interface SteamLaunchOptionCapableContext extends IExtensionContext {
  api: IExtensionContext['api'] & {
    util: IExtensionContext['api']['util'] & {
      steam: {
        getLaunchOptions(appId: string | number): Promise<SteamLaunchOptionsEntry[]>
        ensureLaunchOptionArgument(appId: string | number, argument: string): Promise<SteamEnsureLaunchOptionResult>
        launchClient(): Promise<any>
      }
    }
  }
}
