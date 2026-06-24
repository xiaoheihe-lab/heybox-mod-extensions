import type { IExtensionContext } from 'heybox-mod-api'
import { MOD_TYPE_BLUEPRINT_PAK, MOD_TYPE_PAK, UNREAL_PAK_EXE, UNREAL_PAK_TOOL_PATH } from './constants'

declare const require: any

const path = require('path')

const BLUEPRINT_SEGMENT = 'mods'
const MAX_BUFFER = 10 * 1024 * 1024

export interface PakListResult {
  mountPoint: string
  files: string[]
  modType: string
}

function normalizePakPath(filePath: string): string {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/')
}

function hasBlueprintSegment(filePath: string): boolean {
  return normalizePakPath(filePath).split('/').some((segment) => segment.toLowerCase() === BLUEPRINT_SEGMENT)
}

export function parsePakListOutput(logText: string): PakListResult | null {
  const result: PakListResult = {
    mountPoint: '',
    files: [],
    modType: MOD_TYPE_PAK,
  }

  let mountPointHasMods = false
  for (const line of String(logText || '').split(/\r?\n/)) {
    if (line.startsWith('LogPakFile: Display: Mount point')) {
      const mountPoint = normalizePakPath(line.split('Mount point')[1] || '')
      result.mountPoint = mountPoint
      mountPointHasMods = hasBlueprintSegment(mountPoint)
      if (mountPointHasMods) result.modType = MOD_TYPE_BLUEPRINT_PAK
      continue
    }

    if (!line.startsWith('LogPakFile: Display: "')) continue
    const match = line.match(/"([^"]+)"/)
    if (!match?.[1]) continue
    const fileName = normalizePakPath(match[1])
    result.files.push(fileName)
    if (mountPointHasMods || hasBlueprintSegment(fileName)) {
      result.modType = MOD_TYPE_BLUEPRINT_PAK
    }
  }

  return result.files.length > 0 ? result : null
}

export async function listPak(context: IExtensionContext, gamePath: string, pakPath: string): Promise<PakListResult | null> {
  const childProcess = require('child_process')
  const unrealPakExe = path.join(gamePath, UNREAL_PAK_TOOL_PATH, UNREAL_PAK_EXE)

  return await new Promise<PakListResult | null>((resolve, reject) => {
    childProcess.execFile(
      unrealPakExe,
      [pakPath, '-list'],
      { maxBuffer: MAX_BUFFER },
      (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(error)
          return
        }
        if (stderr) {
          reject(new Error(stderr))
          return
        }
        resolve(parsePakListOutput(stdout))
      },
    )
  })
}
