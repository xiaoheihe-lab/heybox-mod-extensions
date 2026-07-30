import test from 'node:test'
import { INI_RESHADE_FIXTURES } from '../fixtures/ini-reshade'
import { assertInstallerFixture } from '../helpers/installer-fixture'

for (const fixture of INI_RESHADE_FIXTURES) {
  test(`INI/ReShade fixture: ${fixture.name}`, async () => {
    await assertInstallerFixture(fixture)
  })
}
