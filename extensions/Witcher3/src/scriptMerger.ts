import type { IExtensionContext, InstallerInstall, LocalModFeature } from 'heybox-mod-api'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { atomicWrite, readText } from './files'
import { readMergeInventory } from './mergeInventory'
import { resolveModsSettingsPath, LOAD_ORDER_PROVIDER_ID } from './loadOrder'
import type { WitcherRuntime, ToolContext } from './runtime'
import { gameWarnings } from './edition'
import {
  GAME_ID,
  SCRIPT_MERGER_DIRECTORY,
  SCRIPT_MERGER_FILENAME,
  SCRIPT_MERGER_MOD_TYPE,
  SCRIPT_MERGER_REQUIREMENT_MOD_ID,
} from './constants'

const REQUIRED_MODS_CODE = 'EXTENSION_REQUIRED_MODS_MISSING'

type FileInstruction = { type: string; destination?: string }

/** Layout types can contain textures as well as scripts; inspect the actual deployment plan. */
export function needsScriptMerger(instructions: readonly FileInstruction[]): boolean {
  return instructions.some(instruction => {
    if (instruction.type !== 'copy' && instruction.type !== 'generatefile') return false
    const destination = String(instruction.destination || '').replace(/\\/g, '/')
    return /^Mods\/[^/]+\/content\/scripts\/.+\.ws$/i.test(destination)
  })
}

export function createScriptMergerSupport(
  context: IExtensionContext,
  resolveGamePath: () => Promise<string | undefined>,
  modId: string | undefined = SCRIPT_MERGER_REQUIREMENT_MOD_ID,
) {
  const requirementConfigured = !!modId && /^[1-9]\d*$/.test(modId) && Number.isSafeInteger(Number(modId))
  const getRequirementItems = () => requirementConfigured ? [{
    key: 'witcher3-script-merger',
    name: 'Witcher 3 Script Merger',
    modId: modId!,
    mod_id: modId!,
    modType: SCRIPT_MERGER_MOD_TYPE,
    openModDetailDialog: false,
    requirement: 'enabled' as const,
  }] : []

  const getStatus = async (gamePath?: string) => {
    const resolvedGamePath = String(gamePath || await resolveGamePath() || '')
    const executablePath = resolvedGamePath
      ? context.api.util.path.join(resolvedGamePath, SCRIPT_MERGER_DIRECTORY, SCRIPT_MERGER_FILENAME)
      : ''
    let installed = false
    if (executablePath) {
      try { installed = Boolean((await context.api.util.fs.stat(executablePath))?.isFile) } catch { /* missing */ }
    }
    return {
      installed,
      gamePath: resolvedGamePath,
      executablePath,
      requirementConfigured,
      requirements: installed ? [] : getRequirementItems(),
    }
  }

  const getRequiredMods = async (gamePath?: string) => {
    const status = await getStatus(gamePath)
    // An unpublished prerequisite must not produce a bogus mod_id or an unusable dialog.
    if (status.installed || !requirementConfigured) return status
    return {
      ...status,
      code: REQUIRED_MODS_CODE,
      requirement: { code: REQUIRED_MODS_CODE, gameId: GAME_ID, gamePath: status.gamePath, requirements: status.requirements },
    }
  }

  const guardInstaller = (install: InstallerInstall): InstallerInstall => async (files, destination, options) => {
    const result = await install(files, destination, options)
    if (result.instructions.some((instruction: any) => instruction.type === 'attribute' && instruction.key === 'witcher3ScriptStyle' && instruction.value === 'annotation')) return result
    if (!requirementConfigured || !needsScriptMerger(result.instructions)) return result
    const status = await getStatus()
    if (status.installed) return result
    // Installer planning precedes VFS execution. The SDK preserves this payload across the Worker
    // boundary and the existing enable flow opens the shared prerequisite dialog outside its lock.
    throw Object.assign(new Error('请先安装并启用 Script Merger，再启用包含脚本的巫师 3 Mod。'), {
      code: REQUIRED_MODS_CODE,
      result: { code: REQUIRED_MODS_CODE, gameId: GAME_ID, gamePath: status.gamePath, requirements: status.requirements },
    })
  }

  const getLocalModFeatures = (): LocalModFeature[] => getRequirementItems().map(item => ({
    modId: Number(item.modId),
    marked: true,
    mark: { type: 'prerequisite', label: '前置模组' },
  }))

  const registerTool = (api: WitcherRuntime) => {
    const stateFile = (gamePath: string) => path.join(gamePath, SCRIPT_MERGER_DIRECTORY, '.heybox-merge-state.json')
    const fingerprint = async (input: ToolContext) => createHash('sha256').update(JSON.stringify({
      mods: input.mods.filter(mod => mod.enabled && mod.modType !== SCRIPT_MERGER_MOD_TYPE)
        .map(mod => [mod.modKey, mod.versionId, mod.metaInfo.witcher3ModNames, mod.metaInfo.witcher3ScriptStyle]).sort(),
      order: await readText(await resolveModsSettingsPath()) || '',
    })).digest('hex')
    const configure = async (gamePath: string) => {
      const file = path.join(gamePath, SCRIPT_MERGER_DIRECTORY, `${SCRIPT_MERGER_FILENAME}.config`)
      const text = await readText(file)
      const config: any = text ? await api.api.util.fileParseApi.parseXmlToObject(text) : { configuration: {} }
      config.configuration ||= {}
      config.configuration.appSettings ||= [{}]
      config.configuration.appSettings[0].add ||= []
      const items = config.configuration.appSettings[0].add
      for (const [key, value] of Object.entries({
        GameDirectory: gamePath, VanillaScriptsDirectory: path.join(gamePath, 'content', 'content0', 'scripts'),
        ModsDirectory: path.join(gamePath, 'Mods'),
      })) {
        const item = items.find((item: any) => item.$?.key === key)
        if (item) item.$.value = value
        else items.push({ $: { key, value } })
      }
      await atomicWrite(file, await api.api.util.fileParseApi.buildXmlFromObject(config))
    }
    api.registerModTool({
      id: 'witcher3-script-merger', title: 'Script Merger',
      executable: async input => {
        const status = await getStatus(input.gamePath)
        if (!status.installed) throw new Error('请先安装并启用 Script Merger 前置模组。')
        return { path: status.executablePath, cwd: path.dirname(status.executablePath) }
      },
      beforeRun: async input => {
        if (!(await getStatus(input.gamePath)).installed) throw new Error('请先安装并启用 Script Merger 前置模组。')
        await api.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID)
        await configure(input.gamePath)
      },
      afterRun: async input => {
        await api.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID)
        if (input.exitCode === 0) {
          await atomicWrite(stateFile(input.gamePath), JSON.stringify({ fingerprint: await fingerprint(input), lastRunAt: new Date().toISOString() }))
        }
      },
      status: async input => {
        const status = await getStatus(input.gamePath)
        let outputs: Awaited<ReturnType<typeof readMergeInventory>> = []
        let inventoryError = ''
        try { outputs = await readMergeInventory(api, input.gamePath) }
        catch (error) { inventoryError = String((error as Error).message) }
        const overrideCount = input.mods.filter(mod => mod.enabled && Array.isArray(mod.metaInfo.witcher3ModNames) && mod.metaInfo.witcher3ModNames.length > 0
          && mod.metaInfo.witcher3ScriptStyle !== 'none' && mod.metaInfo.witcher3ScriptStyle !== 'annotation').length
        let lastRun: { fingerprint?: string; lastRunAt?: string } = {}
        try { lastRun = JSON.parse(await readText(stateFile(input.gamePath)) || '{}') } catch { /* stale/invalid record */ }
        const changed = lastRun.fingerprint !== await fingerprint(input)
        const needsMerge = Boolean(inventoryError || outputs.some(item => item.missing) || (changed && (outputs.length > 0 || overrideCount > 1)))
        const warnings = await gameWarnings(input.gamePath, input.mods.filter(mod => mod.enabled).flatMap(mod =>
          Array.isArray(mod.metaInfo.witcher3ModNames) ? mod.metaInfo.witcher3ModNames.map(String) : []))
        return {
          installed: status.installed, needsMerge, attention: needsMerge || !status.installed || warnings.length > 0,
          message: [inventoryError || (!status.installed ? '尚未安装 Script Merger' : needsMerge ? 'Mod 或顺序已变化，建议重新检查脚本合并' : '可打开工具检查脚本冲突'), ...warnings].join('；'),
          outputs, lastRunAt: lastRun.lastRunAt,
        }
      },
    })
    // Tool-owned state is kept separately from packaged defaults and survives disabling the tool.
    const savedRoot = (gamePath: string) => path.join(gamePath, '.heybox-witcher3', 'script-merger')
    const stateNames = [`${SCRIPT_MERGER_FILENAME}.config`, 'MergeInventory.xml', '.heybox-merge-state.json']
    const saveState = async (input: Record<string, unknown>) => {
      const gamePath = String(input.gamePath || '')
      for (const name of stateNames) {
        const text = await readText(path.join(gamePath, SCRIPT_MERGER_DIRECTORY, name))
        if (text !== undefined) await atomicWrite(path.join(savedRoot(gamePath), name), text)
      }
    }
    const restoreState = async (input: Record<string, unknown>) => {
      const gamePath = String(input.gamePath || '')
      for (const name of stateNames) {
        const text = await readText(path.join(savedRoot(gamePath), name))
        if (text !== undefined) await atomicWrite(path.join(gamePath, SCRIPT_MERGER_DIRECTORY, name), text)
      }
    }
    for (const phase of ['beforeEnable', 'beforeDisable', 'beforeUninstall']) {
      (api.registerManagedDeploymentHook as Function)(phase, { modType: SCRIPT_MERGER_MOD_TYPE }, saveState)
    }
    for (const phase of ['afterEnable', 'afterDisable', 'afterUninstall'] as const) {
      api.registerManagedDeploymentHook(phase, { modType: SCRIPT_MERGER_MOD_TYPE }, async input => {
        await restoreState(input)
        if (phase === 'afterEnable') await configure(String(input.gamePath || ''))
      })
    }
  }

  return { getStatus, getRequiredMods, guardInstaller, getLocalModFeatures, registerTool }
}
