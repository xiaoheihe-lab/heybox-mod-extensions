import { MOD_TYPE } from '../../src/constants'
import type { InstallerFailureFixture, InstallerFixture } from '../helpers/installer-fixture'

const RED4EXT_PLUGINS = 'red4ext/plugins'

export const RED4EXT_INSTALL_FIXTURES: InstallerFixture[] = [
  {
    name: 'keeps a canonical plugin in its existing directory',
    files: [
      'red4ext/plugins/ExamplePlugin/ExamplePlugin.dll',
      'red4ext/plugins/ExamplePlugin/config.json',
    ],
    expectedModType: MOD_TYPE.red4ext,
    expectedCopies: [
      {
        source: 'red4ext/plugins/ExamplePlugin/ExamplePlugin.dll',
        destination: 'red4ext/plugins/ExamplePlugin/ExamplePlugin.dll',
      },
      {
        source: 'red4ext/plugins/ExamplePlugin/config.json',
        destination: 'red4ext/plugins/ExamplePlugin/config.json',
      },
    ],
  },
  {
    name: 'moves a DLL directly under the plugins directory into a package directory',
    files: [
      'SamplePackage/red4ext/plugins/Sample.dll',
      'SamplePackage/red4ext/plugins/settings.json',
    ],
    expectedModType: MOD_TYPE.red4ext,
    expectedCopies: [
      {
        source: 'SamplePackage/red4ext/plugins/Sample.dll',
        destination: `${RED4EXT_PLUGINS}/SamplePackage/Sample.dll`,
      },
      {
        source: 'SamplePackage/red4ext/plugins/settings.json',
        destination: `${RED4EXT_PLUGINS}/SamplePackage/settings.json`,
      },
    ],
  },
  {
    name: 'moves a root DLL package and all of its files into a package directory',
    files: ['Sample.dll', 'settings.json', 'README.md'],
    expectedModType: MOD_TYPE.red4ext,
    expectedCopies: [
      { source: 'Sample.dll', destination: `${RED4EXT_PLUGINS}/Sample/Sample.dll` },
      { source: 'settings.json', destination: `${RED4EXT_PLUGINS}/Sample/settings.json` },
      { source: 'README.md', destination: `${RED4EXT_PLUGINS}/Sample/README.md` },
    ],
  },
  {
    name: 'preserves gift-wrapper segments in copy sources',
    files: [
      'WrappedPlugin/red4ext/plugins/Sample/Sample.dll',
      'WrappedPlugin/red4ext/plugins/Sample/settings.json',
    ],
    expectedModType: MOD_TYPE.red4ext,
    expectedCopies: [
      {
        source: 'WrappedPlugin/red4ext/plugins/Sample/Sample.dll',
        destination: 'red4ext/plugins/Sample/Sample.dll',
      },
      {
        source: 'WrappedPlugin/red4ext/plugins/Sample/settings.json',
        destination: 'red4ext/plugins/Sample/settings.json',
      },
    ],
  },
  {
    name: 'allows a reserved runtime filename inside a canonical plugin directory',
    files: [
      'red4ext/plugins/EmbeddedRuntime/EmbeddedRuntime.dll',
      'red4ext/plugins/EmbeddedRuntime/coreclr.dll',
    ],
    expectedModType: MOD_TYPE.red4ext,
    expectedCopies: [
      {
        source: 'red4ext/plugins/EmbeddedRuntime/EmbeddedRuntime.dll',
        destination: 'red4ext/plugins/EmbeddedRuntime/EmbeddedRuntime.dll',
      },
      {
        source: 'red4ext/plugins/EmbeddedRuntime/coreclr.dll',
        destination: 'red4ext/plugins/EmbeddedRuntime/coreclr.dll',
      },
    ],
  },
  {
    name: 'leaves a complete CyberCAT package to its dedicated core installer',
    files: [
      'CP2077SaveEditor.exe',
      'D3DCompiler_47_cor3.dll',
      'e_sqlite3.dll',
      'kraken.dll',
      'PenImc_cor3.dll',
      'PresentationNative_cor3.dll',
      'vcruntime140_cor3.dll',
      'wpfgfx_cor3.dll',
    ],
    expectedModType: MOD_TYPE.coreCyberCat,
    expectedCopies: [
      { source: 'CP2077SaveEditor.exe', destination: 'CyberCAT/CP2077SaveEditor.exe' },
      { source: 'D3DCompiler_47_cor3.dll', destination: 'CyberCAT/D3DCompiler_47_cor3.dll' },
      { source: 'e_sqlite3.dll', destination: 'CyberCAT/e_sqlite3.dll' },
      { source: 'kraken.dll', destination: 'CyberCAT/kraken.dll' },
      { source: 'PenImc_cor3.dll', destination: 'CyberCAT/PenImc_cor3.dll' },
      { source: 'PresentationNative_cor3.dll', destination: 'CyberCAT/PresentationNative_cor3.dll' },
      { source: 'vcruntime140_cor3.dll', destination: 'CyberCAT/vcruntime140_cor3.dll' },
      { source: 'wpfgfx_cor3.dll', destination: 'CyberCAT/wpfgfx_cor3.dll' },
    ],
  },
]

const RESERVED_TOP_LEVEL_DLLS = [
  'clrcompression.dll',
  'clrjit.dll',
  'coreclr.dll',
  'D3DCompiler_47_cor3.dll',
  'mscordaccore.dll',
  'PenImc_cor3.dll',
  'PresentationNative_cor3.dll',
  'vcruntime140_cor3.dll',
  'wpfgfx_cor3.dll',
]

const blocked = (name: string, files: string[]): InstallerFailureFixture => ({
  name,
  files,
  expectedError: /RED4ext Mod 包含禁止覆盖的运行库 DLL/,
  expectedNotificationTitle: '已阻止危险的 RED4ext DLL',
})

export const RED4EXT_BLOCKED_FIXTURES: InstallerFailureFixture[] = [
  ...RESERVED_TOP_LEVEL_DLLS.map((dll) => blocked(`rejects reserved top-level DLL ${dll}`, [dll])),
  blocked('matches protected DLL names case-insensitively', ['CORECLR.DLL']),
  blocked('normalizes separators and case before rejecting a DLL directly under bin/x64', [
    'BIN\\X64\\ordinary-plugin.dll',
  ]),
  blocked('rejects a dangerous bin/x64 DLL after removing one gift-wrapper directory', [
    'WrappedPlugin/bin/x64/ordinary-plugin.dll',
    'WrappedPlugin/README.md',
  ]),
  blocked('rejects the whole package when safe files accompany a dangerous DLL', [
    'Sample.dll',
    'settings.json',
    'coreclr.dll',
  ]),
  blocked('checks a wrapped top-level reserved name using its logical package path', [
    'WrappedPlugin/coreclr.dll',
    'WrappedPlugin/red4ext/plugins/Sample/Sample.dll',
  ]),
]
