import { MOD_TYPE } from '../constants'
import { confirmInstall } from '../ui'
import type { Candidate, InstallInstruction, InstallerInput } from '../types'
import { hasJsonConfig, hasXmlConfig, mapJsonConfig, mapXmlConfig } from './config'
import {
  hasArchive,
  hasAudioware,
  hasCet,
  hasRed4ext,
  hasRedscript,
  hasTweakXL,
  mapArchiveFiles,
  mapAudiowareFiles,
  mapCetFiles,
  mapRed4extFiles,
  mapRedscriptFiles,
  mapTweakXLFiles,
} from './gameplay'
import { hasRedmod, mapRedmods } from './redmod'
import { finalizeMappedInstall, findUnsafeUnmappedFiles } from './shared'

function detectedKinds(input: InstallerInput): string[] {
  const files = input.pkg.files
  return [
    hasArchive(files, true) && 'archive',
    hasAudioware(files) && 'audioware',
    hasJsonConfig(files, true) && 'json',
    hasXmlConfig(files, true) && 'xml',
    hasCet(files) && 'cet',
    hasRedmod(files, true) && 'redmod',
    hasRedscript(files, true) && 'redscript',
    hasRed4ext(files, true) && 'red4ext',
    hasTweakXL(files) && 'tweak-xl',
  ].filter((value): value is string => Boolean(value))
}

export const multiTypeCandidate: Candidate = {
  id: 'Multi-type Mod',
  modTypeId: MOD_TYPE.multiType,
  matches: (input) => detectedKinds(input).length >= 2,
  install: async (input) => {
    const kinds = detectedKinds(input)
    const mapped = new Map<string, InstallInstruction>()
    const attributes: InstallInstruction[] = [
      { type: 'attribute', key: 'cyberpunkModKinds', value: kinds },
    ]

    if (kinds.includes('archive')) mapArchiveFiles(input.pkg.files, mapped)
    if (kinds.includes('audioware')) mapAudiowareFiles(input.pkg.files, mapped)
    if (kinds.includes('cet')) mapCetFiles(input.pkg.files, mapped)
    if (kinds.includes('redscript')) mapRedscriptFiles(input, mapped, true)
    if (kinds.includes('red4ext')) mapRed4extFiles(input, mapped, true)
    if (kinds.includes('tweak-xl')) mapTweakXLFiles(input.pkg.files, mapped)

    let protectedConfig = false
    let unresolvedConfig = false
    if (kinds.includes('json')) {
      const state = mapJsonConfig(input.pkg.files, mapped)
      unresolvedConfig ||= state.unresolved
      protectedConfig ||= state.protected
    }
    if (kinds.includes('xml')) {
      protectedConfig ||= mapXmlConfig(input.pkg.files, mapped).protected
    }
    if (kinds.includes('redmod')) {
      attributes.push(...await mapRedmods(input, mapped, true))
    }

    if (unresolvedConfig || findUnsafeUnmappedFiles(input, mapped).length > 0) {
      return finalizeMappedInstall(
        input,
        kinds.includes('redmod') ? MOD_TYPE.multiTypeRedmod : MOD_TYPE.multiType,
        mapped,
        attributes,
      )
    }

    if (protectedConfig) {
      await confirmInstall(input.context, '安装受保护的游戏配置', '该 Multi-type Mod 会覆盖 Cyberpunk 2077 的 JSON/XML 核心配置。')
    }

    return finalizeMappedInstall(
      input,
      kinds.includes('redmod') ? MOD_TYPE.multiTypeRedmod : MOD_TYPE.multiType,
      mapped,
      attributes,
    )
  },
}
