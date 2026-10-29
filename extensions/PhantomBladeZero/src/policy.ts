import { BINARIES_PATH, MODS_FILE_BACKUP, UE4SS_SETTINGS } from './constants'

/**
 * Rewritten runtime config. The live `mods.txt` is deliberately absent: this
 * game activates mods through `enabled.txt`, so the player's own load-order
 * entries must stay untouched by a UE4SS (re)install.
 */
export const MUTABLE_UE4SS_FILES = new Set([
  `${BINARIES_PATH}/ue4ss/${UE4SS_SETTINGS}`.toLowerCase(),
  `${BINARIES_PATH}/ue4ss/Mods/${MODS_FILE_BACKUP}`.toLowerCase(),
])

function normalizeDestination(value: unknown): string {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
}

export function applyMutableFilePolicies(result: any): any {
  if (!result || !Array.isArray(result.instructions)) return result
  return {
    ...result,
    instructions: result.instructions.map((instruction: any) => {
      if (!instruction || !MUTABLE_UE4SS_FILES.has(normalizeDestination(instruction.destination))) return instruction
      return { ...instruction, verification: 'exists', conflictPolicy: 'overwrite' }
    }),
  }
}
