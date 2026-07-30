import path from 'node:path'

export interface FakeContextOptions {
  requestResponse?: unknown
}

export function fakeContext(
  fileContents: Record<string, string> = {},
  existingFiles: string[] = [],
  options: FakeContextOptions = {},
) {
  const normalizedContents = new Map(
    Object.entries(fileContents).map(([key, value]) => [key.replace(/\\/g, '/').toLowerCase(), value]),
  )
  const existing = new Set(existingFiles.map((file) => file.replace(/\\/g, '/').toLowerCase()))
  const requests: any[] = []
  const notifications: any[] = []

  const readFile = async (file: string) => {
    const key = file.replace(/\\/g, '/').toLowerCase()
    if (!normalizedContents.has(key)) throw new Error(`ENOENT: ${key}`)
    return normalizedContents.get(key)
  }

  const context = {
    api: {
      loadOrder: { deploy: async () => ({}) },
      util: {
        path,
        GameStoreHelper: { findByAppId: async () => ({ gamePath: 'D:/Games/Cyberpunk 2077' }) },
        fs: {
          stat: async (file: string) => {
            const key = file.replace(/\\/g, '/').toLowerCase()
            if (!existing.has(key)) throw new Error('ENOENT')
            return { isFile: true }
          },
          readFile,
          readFileAsync: readFile,
        },
        ui: {
          request: async (payload: any) => {
            requests.push(payload)
            return options.requestResponse ?? { confirmed: true, requestId: 'test', action: 'confirm' }
          },
          notify: (payload: any) => notifications.push(payload),
        },
      },
    },
    registerGame: () => undefined,
    registerModType: () => undefined,
    registerInstaller: () => undefined,
    registerAttributeExtractor: () => undefined,
    registerPostInstallerAttributeExtractor: () => undefined,
    registerLoadOrder: () => undefined,
    registerExtensionAction: () => undefined,
  } as any

  return { context, requests, notifications }
}
