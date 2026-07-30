import { MOD_TYPE } from '../../src/constants'
import type { InstallerFixture } from '../helpers/installer-fixture'

const NORMAL_INI = '[Secret setting]\nFrogs=Purple'
const SECOND_INI = '[Super serious]\nWings=false'
const RESHADE_INI = 'KeyPCGI_One@RadiantGI.fx=46,0,0,0\nPreprocessorDefinitions=SMOOTHNORMALS=1'
const NEXUS_INI_DIRECTORY = 'engine/config/platform/pc'
const NEXUS_RESHADE_DIRECTORY = 'bin/x64'
const NEXUS_RESHADE_SHADER_DIRECTORY = 'bin/x64/reshade-shaders'

export const INI_RESHADE_FIXTURES: InstallerFixture[] = [
  {
    name: 'installs one root INI under the game config directory',
    files: ['myawesomeconfig.ini'],
    fileContents: { 'myawesomeconfig.ini': NORMAL_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'myawesomeconfig.ini', destination: `${NEXUS_INI_DIRECTORY}/myawesomeconfig.ini` },
    ],
  },
  {
    name: 'installs multiple root INIs under the game config directory',
    files: ['myawesomeconfig.ini', 'serious.ini'],
    fileContents: { 'myawesomeconfig.ini': NORMAL_INI, 'serious.ini': SECOND_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'myawesomeconfig.ini', destination: `${NEXUS_INI_DIRECTORY}/myawesomeconfig.ini` },
      { source: 'serious.ini', destination: `${NEXUS_INI_DIRECTORY}/serious.ini` },
    ],
  },
  {
    name: 'flattens a nested ordinary INI to the game config directory',
    files: ['fold1/myawesomeconfig.ini'],
    fileContents: { 'fold1/myawesomeconfig.ini': NORMAL_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'fold1/myawesomeconfig.ini', destination: `${NEXUS_INI_DIRECTORY}/myawesomeconfig.ini` },
    ],
  },
  {
    name: 'normalizes Windows archive separators while preserving relative source segments',
    files: ['fold2\\myawesomeconfig.ini'],
    fileContents: { 'fold2\\myawesomeconfig.ini': NORMAL_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'fold2/myawesomeconfig.ini', destination: `${NEXUS_INI_DIRECTORY}/myawesomeconfig.ini` },
    ],
  },
  {
    name: 'installs a root ReShade preset beside the game executable',
    files: ['superreshade.ini'],
    fileContents: { 'superreshade.ini': RESHADE_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'superreshade.ini', destination: `${NEXUS_RESHADE_DIRECTORY}/superreshade.ini` },
    ],
  },
  {
    name: 'installs a root ReShade preset with shaders and textures',
    files: [
      'superreshade.ini',
      'reshade-shaders/Shaders/fancy.fx',
      'reshade-shaders/Textures/lut.png',
    ],
    fileContents: { 'superreshade.ini': RESHADE_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'superreshade.ini', destination: `${NEXUS_RESHADE_DIRECTORY}/superreshade.ini` },
      {
        source: 'reshade-shaders/Shaders/fancy.fx',
        destination: `${NEXUS_RESHADE_SHADER_DIRECTORY}/Shaders/fancy.fx`,
      },
      {
        source: 'reshade-shaders/Textures/lut.png',
        destination: `${NEXUS_RESHADE_SHADER_DIRECTORY}/Textures/lut.png`,
      },
    ],
  },
  {
    name: 'preserves nested archive sources while flattening ReShade destinations',
    files: [
      'fold1/superreshade.ini',
      'fold1/reshade-shaders/Shaders/fancy.fx',
      'fold1/reshade-shaders/Textures/lut.png',
    ],
    fileContents: { 'fold1/superreshade.ini': RESHADE_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      { source: 'fold1/superreshade.ini', destination: `${NEXUS_RESHADE_DIRECTORY}/superreshade.ini` },
      {
        source: 'fold1/reshade-shaders/Shaders/fancy.fx',
        destination: `${NEXUS_RESHADE_SHADER_DIRECTORY}/Shaders/fancy.fx`,
      },
      {
        source: 'fold1/reshade-shaders/Textures/lut.png',
        destination: `${NEXUS_RESHADE_SHADER_DIRECTORY}/Textures/lut.png`,
      },
    ],
  },
  {
    name: 'keeps a removed gift-wrapper directory in copy sources',
    files: [
      'FancyMod/engine/config/platform/pc/wrapped.ini',
      'FancyMod/README.md',
    ],
    fileContents: { 'FancyMod/engine/config/platform/pc/wrapped.ini': NORMAL_INI },
    expectedModType: MOD_TYPE.ini,
    expectedCopies: [
      {
        source: 'FancyMod/engine/config/platform/pc/wrapped.ini',
        destination: `${NEXUS_INI_DIRECTORY}/wrapped.ini`,
      },
      {
        source: 'FancyMod/README.md',
        destination: 'V2077/mod-extra-files/FancyMod/README.md',
      },
    ],
  },
  {
    name: 'does not let an INI preempt a CET package',
    files: [
      'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/init.lua',
      'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/settings.ini',
    ],
    expectedModType: MOD_TYPE.cet,
    expectedCopies: [
      {
        source: 'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/init.lua',
        destination: 'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/init.lua',
      },
      {
        source: 'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/settings.ini',
        destination: 'bin/x64/plugins/cyber_engine_tweaks/mods/ConfigMod/settings.ini',
      },
    ],
  },
  {
    name: 'does not let an INI preempt a redscript package',
    files: [
      'r6/scripts/ConfigMod/main.reds',
      'r6/scripts/ConfigMod/settings.ini',
    ],
    expectedModType: MOD_TYPE.redscript,
    expectedCopies: [
      { source: 'r6/scripts/ConfigMod/main.reds', destination: 'r6/scripts/ConfigMod/main.reds' },
      { source: 'r6/scripts/ConfigMod/settings.ini', destination: 'r6/scripts/ConfigMod/settings.ini' },
    ],
  },
  {
    name: 'does not treat the CET global INI as a generic INI package',
    files: ['bin/x64/global.ini'],
    expectedModType: MOD_TYPE.fallback,
    expectedCopies: [
      { source: 'bin/x64/global.ini', destination: 'bin/x64/global.ini' },
    ],
    expectedPromptCount: 1,
  },
  {
    name: 'falls back with the full archive when an INI package has an unknown asset',
    files: ['config.ini', 'payload.bin'],
    fileContents: { 'config.ini': NORMAL_INI },
    expectedModType: MOD_TYPE.fallback,
    expectedCopies: [
      { source: 'config.ini', destination: 'config.ini' },
      { source: 'payload.bin', destination: 'payload.bin' },
    ],
    expectedPromptCount: 1,
  },
]
