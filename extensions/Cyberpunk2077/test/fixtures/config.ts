import { MOD_TYPE } from '../../src/constants'
import type { InstallerCancellationFixture, InstallerFixture } from '../helpers/installer-fixture'

const JSON_CONFIRM_TITLE = '安装受保护的 JSON 配置'
const XML_CONFIRM_TITLE = '安装受保护的 XML 配置'
const MULTI_CONFIRM_TITLE = '安装受保护的游戏配置'
const CANCELLED = /Cyberpunk 2077 mod installation cancelled by user/
const JSON_CONTENT = '{"enabled":true}'

const protectedJson = (source: string): InstallerFixture => ({
  name: `confirms before installing protected JSON ${source}`,
  files: [source],
  fileContents: { [source]: JSON_CONTENT },
  expectedModType: MOD_TYPE.jsonConfig,
  expectedCopies: [{ source, destination: source }],
  expectedPromptTitles: [JSON_CONFIRM_TITLE],
})

const protectedXml = (source: string): InstallerFixture => ({
  name: `confirms before installing protected XML ${source}`,
  files: [source],
  expectedModType: MOD_TYPE.xmlConfig,
  expectedCopies: [{ source, destination: source }],
  expectedPromptTitles: [XML_CONFIRM_TITLE],
})

export const CONFIG_INSTALL_FIXTURES: InstallerFixture[] = [
  ...[
    'engine/config/giweights.json',
    'r6/config/bumpersSettings.json',
    'r6/config/settings/options.json',
    'r6/config/settings/platform/pc/options.json',
  ].map(protectedJson),
  ...[
    ['giweights.json', 'engine/config/giweights.json'],
    ['bumpersSettings.json', 'r6/config/bumpersSettings.json'],
  ].map(([source, destination]): InstallerFixture => ({
    name: `moves fixable top-level JSON ${source} to its canonical protected path`,
    files: [source],
    fileContents: { [source]: JSON_CONTENT },
    expectedModType: MOD_TYPE.jsonConfig,
    expectedCopies: [{ source, destination }],
    expectedPromptTitles: [JSON_CONFIRM_TITLE],
  })),
  ...[
    'r6/config/inputContexts.xml',
    'r6/config/inputDeadzones.xml',
    'r6/config/inputUserMappings.xml',
    'r6/config/uiInputActions.xml',
  ].map(protectedXml),
  {
    name: 'moves a protected top-level XML filename to r6/config',
    files: ['inputUserMappings.xml'],
    expectedModType: MOD_TYPE.xmlConfig,
    expectedCopies: [
      { source: 'inputUserMappings.xml', destination: 'r6/config/inputUserMappings.xml' },
    ],
    expectedPromptTitles: [XML_CONFIRM_TITLE],
  },
  {
    name: 'installs a non-protected canonical XML without prompting',
    files: ['r6/config/custom.xml'],
    expectedModType: MOD_TYPE.xmlConfig,
    expectedCopies: [{ source: 'r6/config/custom.xml', destination: 'r6/config/custom.xml' }],
  },
  {
    name: 'installs an Input Loader mergeable XML without prompting',
    files: ['r6/input/custom.xml'],
    expectedModType: MOD_TYPE.xmlConfig,
    expectedCopies: [{ source: 'r6/input/custom.xml', destination: 'r6/input/custom.xml' }],
  },
  {
    name: 'prompts once for mixed protected and ordinary canonical XML files',
    files: ['r6/config/inputContexts.xml', 'r6/config/custom.xml'],
    expectedModType: MOD_TYPE.xmlConfig,
    expectedCopies: [
      { source: 'r6/config/inputContexts.xml', destination: 'r6/config/inputContexts.xml' },
      { source: 'r6/config/custom.xml', destination: 'r6/config/custom.xml' },
    ],
    expectedPromptTitles: [XML_CONFIRM_TITLE],
  },
  {
    name: 'prompts once when a multi-type package includes protected configuration',
    files: ['archive/pc/mod/example.archive', 'r6/config/inputContexts.xml'],
    expectedModType: MOD_TYPE.multiType,
    expectedCopies: [
      { source: 'archive/pc/mod/example.archive', destination: 'archive/pc/mod/example.archive' },
      { source: 'r6/config/inputContexts.xml', destination: 'r6/config/inputContexts.xml' },
    ],
    expectedPromptTitles: [MULTI_CONFIRM_TITLE],
  },
]

export const CONFIG_CANCELLATION_FIXTURES: InstallerCancellationFixture[] = [
  {
    name: 'cancels a protected JSON installation without producing instructions',
    files: ['engine/config/giweights.json'],
    fileContents: { 'engine/config/giweights.json': JSON_CONTENT },
    expectedError: CANCELLED,
    expectedPromptTitle: JSON_CONFIRM_TITLE,
  },
  {
    name: 'cancels a protected XML installation without producing instructions',
    files: ['r6/config/inputContexts.xml'],
    expectedError: CANCELLED,
    expectedPromptTitle: XML_CONFIRM_TITLE,
  },
  {
    name: 'cancels a protected multi-type installation as one package',
    files: ['archive/pc/mod/example.archive', 'r6/config/inputContexts.xml'],
    expectedError: CANCELLED,
    expectedPromptTitle: MULTI_CONFIRM_TITLE,
  },
]
