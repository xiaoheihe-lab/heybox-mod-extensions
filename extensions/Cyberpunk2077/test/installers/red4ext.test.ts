import test from 'node:test'
import { RED4EXT_BLOCKED_FIXTURES, RED4EXT_INSTALL_FIXTURES } from '../fixtures/red4ext'
import { assertInstallerFailureFixture, assertInstallerFixture } from '../helpers/installer-fixture'

for (const fixture of RED4EXT_INSTALL_FIXTURES) {
  test(`RED4ext fixture: ${fixture.name}`, async () => {
    await assertInstallerFixture(fixture)
  })
}

for (const fixture of RED4EXT_BLOCKED_FIXTURES) {
  test(`RED4ext safety fixture: ${fixture.name}`, async () => {
    await assertInstallerFailureFixture(fixture)
  })
}
