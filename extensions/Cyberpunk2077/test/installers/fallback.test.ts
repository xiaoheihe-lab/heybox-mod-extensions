import test from 'node:test'
import { FALLBACK_CANCELLATION_FIXTURES, FALLBACK_INSTALL_FIXTURES } from '../fixtures/fallback'
import { assertInstallerCancellationFixture, assertInstallerFixture } from '../helpers/installer-fixture'

for (const fixture of FALLBACK_INSTALL_FIXTURES) {
  test(`fallback fixture: ${fixture.name}`, async () => {
    await assertInstallerFixture(fixture)
  })
}

for (const fixture of FALLBACK_CANCELLATION_FIXTURES) {
  test(`fallback cancellation fixture: ${fixture.name}`, async () => {
    await assertInstallerCancellationFixture(fixture)
  })
}
