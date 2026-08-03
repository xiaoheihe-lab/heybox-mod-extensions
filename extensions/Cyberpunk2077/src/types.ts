import type { IExtensionContext } from 'heybox-mod-api'
import type { CyberpunkModType } from './constants'

export interface PackageFile {
  /** Original relative archive path used as the copy source. */
  source: string
  /** Logical path after removing one redundant wrapper directory. */
  path: string
  lower: string
}

export interface PreparedPackage {
  files: PackageFile[]
  packageName: string
  wrapper?: string
}

export interface CopyInstruction {
  type: 'copy'
  source: string
  destination: string
  verification?: 'exists'
  conflictPolicy?: 'overwrite'
}

export interface GenerateFileInstruction {
  type: 'generatefile'
  data: string
  destination: string
  verification?: 'exists'
  conflictPolicy?: 'overwrite'
}

export interface AttributeInstruction {
  type: 'attribute'
  key: string
  value: unknown
}

export type InstallInstruction = CopyInstruction | GenerateFileInstruction | AttributeInstruction

export interface CyberpunkInstallResult {
  instructions: InstallInstruction[]
  modTypeId: CyberpunkModType
}

export interface InstallerInput {
  context: IExtensionContext
  pkg: PreparedPackage
  stagingPath: string
}

export interface Candidate {
  id: string
  modTypeId: CyberpunkModType
  matches(input: InstallerInput): boolean | Promise<boolean>
  install(input: InstallerInput): CyberpunkInstallResult | Promise<CyberpunkInstallResult>
}
