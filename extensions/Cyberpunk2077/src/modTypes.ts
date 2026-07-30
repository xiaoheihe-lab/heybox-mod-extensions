import type { IExtensionContext } from 'heybox-mod-api'
import { registerFomodInstaller } from '@heybox-mod-extensions/fomod-utils'
import { GAME_ID, MOD_TYPE, MOD_TYPE_NAMES, type CyberpunkModType } from './constants'
import { installCyberpunkPackage, testCyberpunkPackage } from './installers/pipeline'

function isCyberpunk(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID
}

function registerType(context: IExtensionContext, typeId: CyberpunkModType, priority: number): void {
  context.registerModType(
    typeId,
    priority,
    isCyberpunk,
    () => '{gamePath}',
    () => false,
    { name: MOD_TYPE_NAMES[typeId] },
  )
}

export function registerCyberpunkModTypes(context: IExtensionContext): void {
  const orderedTypes = (Object.values(MOD_TYPE) as CyberpunkModType[]).filter((typeId) => typeId !== MOD_TYPE.fomod)
  orderedTypes.forEach((typeId, index) => registerType(context, typeId, 200 - index))

  registerFomodInstaller(context, {
    gameId: GAME_ID,
    typeId: MOD_TYPE.fomod,
    priority: 100,
    name: MOD_TYPE_NAMES[MOD_TYPE.fomod],
  })

  // Like the Vortex extension, one outer installer owns the ordered internal pipeline.
  // A dynamic modTypeId in its result records the actual selected layout.
  context.registerInstaller(
    MOD_TYPE.pipeline,
    30,
    testCyberpunkPackage,
    (files, stagingPath) => installCyberpunkPackage(context, files, stagingPath),
  )
}
