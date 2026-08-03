import test from 'node:test'
import { CONFIG_CANCELLATION_FIXTURES, CONFIG_INSTALL_FIXTURES } from '../fixtures/config'
import { assertInstallerCancellationFixture, assertInstallerFixture } from '../helpers/installer-fixture'

for (const fixture of CONFIG_INSTALL_FIXTURES) {
  test(`configuration fixture: ${fixture.name}`, async () => {
    await assertInstallerFixture(fixture)
  })
}

for (const fixture of CONFIG_CANCELLATION_FIXTURES) {
  test(`configuration cancellation fixture: ${fixture.name}`, async () => {
    await assertInstallerCancellationFixture(fixture)
  })
}
