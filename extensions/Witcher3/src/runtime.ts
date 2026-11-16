import type { IExtensionContext, LoadOrderModSnapshot } from 'heybox-mod-api'

// Structural bridge to Mod Manager API additions. The published authoring package is
// deliberately unchanged; main checks the actual runtime capabilities as well.
export interface MergeContext {
  gamePath: string; targetPath: string; reason: 'enable' | 'disable' | 'reorder'
  baseFile?: string; previousFile?: string; liveFile: string
  state?: Record<string, unknown>
  files: Array<{ modKey: string; path: string; metaInfo: Record<string, unknown> }>
}
export interface MergeResult { data: string; baseData?: string; state?: Record<string, unknown> }
export interface ToolContext { gamePath: string; mods: LoadOrderModSnapshot[] }
export type WitcherRuntime = IExtensionContext & {
  registerFileMerge(registration: {
    id: string; test(target: string, gamePath: string): boolean | Promise<boolean>
    merge(context: MergeContext): Promise<MergeResult>
  }): void
  registerModTool(registration: {
    id: string; title: string
    executable(context: ToolContext): Promise<{ path: string; cwd?: string; args?: string[] }>
    status?(context: ToolContext): Promise<Record<string, unknown>>
    beforeRun?(context: ToolContext): Promise<void>
    afterRun?(context: ToolContext & { exitCode: number | null }): Promise<void>
  }): void
  api: IExtensionContext['api'] & { util: IExtensionContext['api']['util'] & {
    fileParseApi: {
      parseXmlToObject(text: string): Promise<Record<string, unknown>>
      buildXmlFromObject(value: Record<string, unknown>): Promise<string>
    }
  } }
}

export function runtime(context: IExtensionContext): WitcherRuntime {
  const result = context as WitcherRuntime
  if (typeof result.registerFileMerge !== 'function' || typeof result.registerModTool !== 'function') {
    throw new Error('巫师3适配器需要支持文件合并和 Mod 工具的新版本 Mod Manager。')
  }
  return result
}
