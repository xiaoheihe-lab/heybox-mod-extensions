import path from 'node:path'

export function fakeContext(fileContents: Record<string, string> = {}, existingFiles: string[] = []) {
  const normalizedContents = new Map(
    Object.entries(fileContents).map(([key, value]) => [key.replace(/\\/g, '/').toLowerCase(), value]),
  )
  const existing = new Set(existingFiles.map((file) => file.replace(/\\/g, '/').toLowerCase()))
  const requests: any[] = []
  const notifications: any[] = []

  const context = {
    api: {
      util: {
        path,
        GameStoreHelper: { findByAppId: async () => ({ gamePath: 'D:/Games/Cyberpunk 2077' }) },
        fs: {
          stat: async (file: string) => {
            const key = file.replace(/\\/g, '/').toLowerCase()
            if (!existing.has(key)) throw new Error('ENOENT')
            return { isFile: true }
          },
          readFile: async (file: string) => {
            const key = file.replace(/\\/g, '/').toLowerCase()
            if (!normalizedContents.has(key)) throw new Error(`ENOENT: ${key}`)
            return normalizedContents.get(key)
          },
        },
        ui: {
          request: async (payload: any) => {
            requests.push(payload)
            return { confirmed: true, requestId: 'test', action: 'confirm' }
          },
          notify: (payload: any) => notifications.push(payload),
        },
      },
    },
    registerGame: () => undefined,
    registerModType: () => undefined,
    registerInstaller: () => undefined,
    registerExtensionAction: () => undefined,
  } as any

  return { context, requests, notifications }
}
