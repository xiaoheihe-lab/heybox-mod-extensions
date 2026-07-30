import type { IExtensionContext } from 'heybox-mod-api'

export interface FinalFileInstruction {
  readonly type: 'copy' | 'generatefile'
  readonly source?: string
  readonly destination: string
  readonly data?: string
  readonly verification?: 'exists'
  readonly conflictPolicy?: 'overwrite'
}

export interface PostInstallerAttributeContext {
  appid: number
  gameId: number
  modKey: string
  installerTypeId: string
  modTypeId: string
  stagingPath: string
  archiveFiles: readonly string[]
  instructions: readonly FinalFileInstruction[]
}

export interface PostInstallerCapableContext extends IExtensionContext {
  registerPostInstallerAttributeExtractor(
    priority: number,
    extractor: (context: PostInstallerAttributeContext) => Record<string, unknown> | Promise<Record<string, unknown>>,
  ): void
}
