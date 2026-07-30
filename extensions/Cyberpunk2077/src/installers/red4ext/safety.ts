import { RED4EXT_RESERVED_DLLS } from '../../constants'
import { basename, dirname, extname } from '../../package'
import type { PackageFile } from '../../types'

const RED4EXT_RESERVED_DLL_DIRECTORY = 'bin/x64'

export function isDangerousRed4extDll(file: PackageFile): boolean {
  if (extname(file.path) !== '.dll') return false

  const directory = dirname(file.lower)
  const isReservedDirectory = directory === RED4EXT_RESERVED_DLL_DIRECTORY
  const isReservedTopLevelName = directory === '' && RED4EXT_RESERVED_DLLS.has(basename(file.lower))
  return isReservedDirectory || isReservedTopLevelName
}

export function findDangerousRed4extDlls(files: readonly PackageFile[]): PackageFile[] {
  return files.filter(isDangerousRed4extDll)
}

export function assertSafeRed4ext(files: readonly PackageFile[]): void {
  const dangerous = findDangerousRed4extDlls(files)
  if (dangerous.length === 0) return

  throw new Error(`RED4ext Mod 包含禁止覆盖的运行库 DLL：${dangerous.map((file) => file.path).join(', ')}`)
}
