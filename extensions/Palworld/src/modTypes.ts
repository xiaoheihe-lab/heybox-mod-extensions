import type { IExtensionContext } from 'heybox-mod-api'
import {
  GAME_ID,
  MOD_TYPE_BLUEPRINT_PAK,
  MOD_TYPE_LUA,
  MOD_TYPE_LUA_V2,
  MOD_TYPE_PAK,
  MOD_TYPE_PRIORITY,
  MOD_TYPE_ROOT,
  MOD_TYPE_UE4SS,
  MOD_TYPE_UNREAL_PAK_TOOL,
} from './constants'
import {
  hasLuaFile,
  hasPakFile,
  installLua,
  installPak,
  installRoot,
  installUe4ss,
  installUnrealPakTool,
  testLua,
  testPak,
  testRoot,
  testUe4ss,
  testUnrealPakTool,
} from './installers'

function isPalworld(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function filesFromLocalInfo(input: any): string[] {
  if (Array.isArray(input)) return input
  return Array.isArray(input?.files) ? input.files : []
}

function gameRootTarget() {
  return '{gamePath}'
}

export function registerPalworldModTypes(context: IExtensionContext): void {
  context.registerModType(MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, isPalworld, gameRootTarget, (input) => {
    const files = filesFromLocalInfo(input)
    return files.some((file) => /(^|[\\/])UE4SS\.dll$/i.test(file)) && files.some((file) => /(^|[\\/])dwmapi\.dll$/i.test(file))
  }, { name: 'UE4SS' })
  context.registerInstaller(MOD_TYPE_UE4SS, 10, testUe4ss, (files, stagingPath, options) => installUe4ss(context, files, stagingPath, options))

  context.registerModType(MOD_TYPE_UNREAL_PAK_TOOL, MOD_TYPE_PRIORITY.unrealPakTool, isPalworld, gameRootTarget, (input) => {
    const files = filesFromLocalInfo(input)
    return files.some((file) => /(^|[\\/])UnrealPak\.exe$/i.test(file))
  }, { name: 'Unreal Pak Tool' })
  context.registerInstaller(MOD_TYPE_UNREAL_PAK_TOOL, 11, testUnrealPakTool, (files) => installUnrealPakTool(files))

  context.registerModType(MOD_TYPE_BLUEPRINT_PAK, MOD_TYPE_PRIORITY.blueprintPak, isPalworld, gameRootTarget, (input) => hasPakFile(filesFromLocalInfo(input)), { name: 'Blueprint Mod' })
  context.registerInstaller(MOD_TYPE_BLUEPRINT_PAK, 40, testPak, (files, stagingPath, options) => installPak(context, files, stagingPath, options))

  context.registerModType(MOD_TYPE_LUA_V2, MOD_TYPE_PRIORITY.luaV2, isPalworld, gameRootTarget, (input) => hasLuaFile(filesFromLocalInfo(input)), { name: 'LUA Mod V2' })
  context.registerInstaller(MOD_TYPE_LUA_V2, 30, testLua, (files, stagingPath) => installLua(files, stagingPath, MOD_TYPE_LUA_V2))

  context.registerModType(MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, isPalworld, gameRootTarget, (input) => hasPakFile(filesFromLocalInfo(input)), { name: 'Pak Mod' })
  context.registerInstaller(MOD_TYPE_PAK, 40, testPak, (files, stagingPath, options) => installPak(context, files, stagingPath, options))

  context.registerModType(MOD_TYPE_LUA, MOD_TYPE_PRIORITY.lua, isPalworld, gameRootTarget, (input) => hasLuaFile(filesFromLocalInfo(input)), { name: 'LUA Mod' })
  context.registerInstaller(MOD_TYPE_LUA, 31, testLua, (files, stagingPath) => installLua(files, stagingPath, MOD_TYPE_LUA))

  context.registerModType(MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, isPalworld, gameRootTarget, (input) => testRoot(filesFromLocalInfo(input), GAME_ID).supported, { name: 'Root Mod' })
  context.registerInstaller(MOD_TYPE_ROOT, 15, testRoot, (files) => installRoot(files))
}
