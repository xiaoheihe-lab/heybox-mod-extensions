import assert from 'node:assert/strict'
import test from 'node:test'
import { hasLaunchOptionArgument } from '../../src/launchOptions/arguments'
import { RedmodSteamLaunchOptionCoordinator } from '../../src/launchOptions/coordinator'

const enabledEntries = [{ id: 'one', ownerModKey: '1_1', name: 'One', enabled: true }]

function fixture(options: {
  launchOptions?: string[][]
  confirmed?: boolean
  ensureFailures?: number
} = {}) {
  const launchOptions = options.launchOptions || [['-skipStartScreen'], ['-MODDED']]
  let readIndex = 0
  let ensureCalls = 0
  let launchCalls = 0
  const requests: any[] = []
  const notifications: any[] = []
  const context = {
    api: {
      util: {
        steam: {
          getLaunchOptions: async () => {
            const values = launchOptions[Math.min(readIndex, launchOptions.length - 1)] || []
            readIndex += 1
            return values.map((value, index) => ({ userId: String(index + 1), localConfigPath: `user-${index + 1}`, launchOptions: value }))
          },
          ensureLaunchOptionArgument: async () => {
            ensureCalls += 1
            const values = launchOptions[Math.min(readIndex, launchOptions.length - 1)] || []
            return {
              entries: values.map((value, index) => ({ userId: String(index + 1), localConfigPath: `user-${index + 1}`, launchOptions: value })),
              updatedUserIds: ['1'],
              failures: Array.from({ length: options.ensureFailures || 0 }, (_, index) => ({
                userId: `failed-${index}`,
                localConfigPath: `failed-${index}`,
                message: 'failed',
              })),
            }
          },
          launchClient: async () => {
            launchCalls += 1
            return { confirmed: true, payload: { success: true } }
          },
        },
        ui: {
          request: async (payload: any) => {
            requests.push(payload)
            return {
              confirmed: options.confirmed !== false,
              payload: { steamClosed: true, relaunchSteam: true },
            }
          },
          notify: (payload: any) => notifications.push(payload),
        },
      },
    },
  } as any
  return {
    coordinator: new RedmodSteamLaunchOptionCoordinator(context),
    requests,
    notifications,
    get ensureCalls() { return ensureCalls },
    get launchCalls() { return launchCalls },
  }
}

test('launch argument matching is token based and case insensitive', () => {
  assert.equal(hasLaunchOptionArgument('-MODDED'), true)
  assert.equal(hasLaunchOptionArgument('"-modded" -skipStartScreen'), true)
  assert.equal(hasLaunchOptionArgument('-modded-extra'), false)
  assert.equal(hasLaunchOptionArgument('prefix-modded'), false)
})

test('empty REDmod deployment and fully configured users remain silent', async () => {
  const empty = fixture()
  await empty.coordinator.afterDeploy([])
  assert.equal(empty.requests.length, 0)

  const configured = fixture({ launchOptions: [['-skipStartScreen -modded', '-MODDED']] })
  await configured.coordinator.afterDeploy(enabledEntries)
  assert.equal(configured.requests.length, 0)
  assert.equal(configured.ensureCalls, 0)
})

test('cancel leaves launch options untouched and the next deployment asks again', async () => {
  const value = fixture({ launchOptions: [['-skipStartScreen']], confirmed: false })
  await value.coordinator.afterDeploy(enabledEntries)
  await value.coordinator.afterDeploy(enabledEntries)
  assert.equal(value.requests.length, 2)
  assert.equal(value.ensureCalls, 0)
  assert.equal(value.launchCalls, 0)
})

test('confirmed prompt ensures every missing user, verifies, and relaunches Steam', async () => {
  const value = fixture({
    launchOptions: [
      ['-skipStartScreen', '-MODDED'],
      ['-skipStartScreen -modded', '-MODDED'],
      ['-skipStartScreen -modded', '-MODDED'],
    ],
  })
  await value.coordinator.afterDeploy(enabledEntries)
  assert.equal(value.requests.length, 1)
  assert.equal(value.requests[0].requiresSteamClosed, true)
  assert.equal(value.ensureCalls, 1)
  assert.equal(value.launchCalls, 1)
  assert.ok(value.notifications.some((item) => item.variant === 'success'))
})

test('partial Steam writes report an error and never relaunch Steam', async () => {
  const value = fixture({
    launchOptions: [[''], ['-modded']],
    ensureFailures: 1,
  })
  await value.coordinator.afterDeploy(enabledEntries)
  assert.equal(value.ensureCalls, 1)
  assert.equal(value.launchCalls, 0)
  assert.ok(value.notifications.some((item) => item.variant === 'error'))
})

test('a Steam user disappearing during the write is treated as incomplete verification', async () => {
  const value = fixture({
    launchOptions: [
      ['', '-foo'],
      ['-modded'],
    ],
  })
  await value.coordinator.afterDeploy(enabledEntries)
  assert.equal(value.launchCalls, 0)
  assert.ok(value.notifications.some((item) => item.variant === 'error'))
})
