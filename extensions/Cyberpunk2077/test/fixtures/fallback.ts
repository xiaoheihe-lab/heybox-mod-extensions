import { MOD_TYPE } from '../../src/constants'
import type { InstallerCancellationFixture, InstallerFixture } from '../helpers/installer-fixture'

const FALLBACK_TITLE = '未识别的 Cyberpunk 2077 Mod 结构'
const fallback = (
  name: string,
  files: string[],
  destinations = files,
  fileContents?: Record<string, string>,
): InstallerFixture => ({
  name,
  files,
  fileContents,
  expectedModType: MOD_TYPE.fallback,
  expectedCopies: files.map((source, index) => ({ source, destination: destinations[index] })),
  expectedPromptTitles: [FALLBACK_TITLE],
})

export const FALLBACK_INSTALL_FIXTURES: InstallerFixture[] = [
  fallback('installs a completely unknown package only after confirmation', [
    'Categorized AIO Command List.xlsx',
    'readme.md',
  ]),
  fallback('preserves a deep unknown relative path', ['tools/private/deep/program.exe']),
  fallback('falls back for an ambiguous top-level options.json', ['options.json']),
  fallback('falls back for a random top-level XML file', ['myfancy.xml']),
  fallback('falls back for an unknown JSON inside a protected config tree', [
    'r6/config/custom/feature.json',
  ]),
  fallback('falls back with known and unknown JSON config files together', [
    'r6/config/settings/options.json',
    'r6/config/settings/unknown.json',
  ]),
  fallback('falls back with the whole CET package when one file is unknown', [
    'bin/x64/plugins/cyber_engine_tweaks/mods/Example/init.lua',
    'payload.bin',
  ]),
  fallback('falls back with the whole ASI package when one file is unknown', [
    'bin/x64/plugins/example.asi',
    'payload.bin',
  ]),
  fallback('falls back with the whole redscript package when one file is unknown', [
    'r6/scripts/Example/main.reds',
    'payload.bin',
  ]),
  fallback('falls back with the whole RED4ext package when one file is unknown', [
    'red4ext/plugins/Example/Example.dll',
    'payload.bin',
  ]),
  fallback('falls back with the whole TweakXL package when one file is unknown', [
    'r6/tweaks/example.yaml',
    'payload.bin',
  ]),
  fallback('falls back with the whole Audioware package when one file is unknown', [
    'r6/audioware/example.yaml',
    'payload.bin',
  ]),
  fallback('falls back with the whole AMM content package when one file is unknown', [
    'User/Decor/example.json',
    'payload.bin',
  ]),
  fallback(
    'falls back with the whole character preset package when one file is unknown',
    ['V.preset', 'payload.bin'],
    ['V.preset', 'payload.bin'],
    { 'V.preset': 'LocKey#14444638123505366956:123' },
  ),
  fallback(
    'falls back with the whole REDmod package when one file is unknown',
    ['NamedRedmod/info.json', 'NamedRedmod/archives/content.archive', 'payload.bin'],
    ['NamedRedmod/info.json', 'NamedRedmod/archives/content.archive', 'payload.bin'],
    { 'NamedRedmod/info.json': '{"name":"Named Redmod","version":"1.0.0"}' },
  ),
  fallback('falls back with the whole Archive package when one file is unknown', [
    'archive/pc/mod/example.archive',
    'payload.bin',
  ]),
  fallback('uses only the fallback confirmation for protected XML mixed with an unknown file', [
    'r6/config/inputContexts.xml',
    'payload.bin',
  ]),
  fallback('uses only the fallback confirmation for protected JSON mixed with an unknown file', [
    'engine/config/giweights.json',
    'payload.bin',
  ]),
  fallback('falls back once for a multi-type package containing an unknown file', [
    'archive/pc/mod/example.archive',
    'r6/config/inputContexts.xml',
    'payload.bin',
  ]),
  fallback(
    'removes one gift-wrapper from destinations while preserving it in archive sources',
    [
      'WrappedMod/r6/scripts/Example/main.reds',
      'WrappedMod/payload.bin',
    ],
    [
      'r6/scripts/Example/main.reds',
      'payload.bin',
    ],
  ),
]

export const FALLBACK_CANCELLATION_FIXTURES: InstallerCancellationFixture[] = [
  {
    name: 'cancels an unknown package without producing install instructions',
    files: ['unknown/program.exe'],
    expectedError: /Cyberpunk 2077 mod installation cancelled by user/,
    expectedPromptTitle: FALLBACK_TITLE,
  },
]
