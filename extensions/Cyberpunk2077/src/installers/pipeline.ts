import type { IExtensionContext } from 'heybox-mod-api'
import { GAME_ID, MOD_TYPE } from '../constants'
import { preparePackage } from '../package'
import type { Candidate, CyberpunkInstallResult, InstallerInput } from '../types'
import { ammCandidate } from './amm'
import { CONFIG_CANDIDATES } from './config'
import { CORE_CANDIDATES } from './core'
import { GAMEPLAY_CANDIDATES } from './gameplay'
import { multiTypeCandidate } from './multitype'
import { presetCandidate } from './preset'
import { redmodCandidate } from './redmod'
import { installFallback } from './shared'

const PIPELINE: Candidate[] = [
  ...CORE_CANDIDATES,
  GAMEPLAY_CANDIDATES.asi,
  multiTypeCandidate,
  GAMEPLAY_CANDIDATES.red4ext,
  redmodCandidate,
  ammCandidate,
  GAMEPLAY_CANDIDATES.cet,
  GAMEPLAY_CANDIDATES.redscript,
  GAMEPLAY_CANDIDATES.audioware,
  GAMEPLAY_CANDIDATES.tweakXL,
  CONFIG_CANDIDATES.ini,
  CONFIG_CANDIDATES.jsonConfig,
  CONFIG_CANDIDATES.xmlConfig,
  presetCandidate,
  GAMEPLAY_CANDIDATES.archive,
]

export function testCyberpunkPackage(_files: string[], gameId: number | string) {
  return { supported: Number(gameId) === GAME_ID }
}

export async function installCyberpunkPackage(
  context: IExtensionContext,
  files: string[],
  stagingPath = '',
): Promise<CyberpunkInstallResult> {
  const input: InstallerInput = { context, pkg: preparePackage(files), stagingPath }
  if (input.pkg.files.length === 0) throw new Error('Mod archive does not contain installable files.')

  for (const candidate of PIPELINE) {
    if (await candidate.matches(input)) return candidate.install(input)
  }
  return installFallback(input)
}

export function pipelineModTypeId(): string {
  return MOD_TYPE.pipeline
}
