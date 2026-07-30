import type { IExtensionContext } from 'heybox-mod-api'
import {
  EXECUTABLE,
  GAME_ID,
  GAME_NAME,
  NEXUS_DOMAIN,
  PATHS,
  REDMOD_DEPLOY_EXE,
  REDMOD_METADATA,
  REDMOD_PRELAUNCHER,
} from './constants'
import { notify } from './ui'
import { prepareRedmodDirectories } from './redmodDeployment'

async function fileExists(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    return Boolean((await context.api.util.fs.stat(filePath))?.isFile)
  } catch {
    return false
  }
}

export async function findGamePath(context: IExtensionContext): Promise<string | undefined> {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath
}

export async function getRedmodStatus(context: IExtensionContext, gamePath?: string) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || '')
  const join = context.api.util.path.join
  const checks = resolvedGamePath
    ? await Promise.all([
        fileExists(context, join(resolvedGamePath, REDMOD_PRELAUNCHER)),
        fileExists(context, join(resolvedGamePath, REDMOD_DEPLOY_EXE)),
        fileExists(context, join(resolvedGamePath, REDMOD_METADATA)),
      ])
    : [false, false, false]
  return {
    installed: checks.every(Boolean),
    gamePath: resolvedGamePath,
    files: {
      prelauncher: checks[0],
      deployExecutable: checks[1],
      metadata: checks[2],
    },
  }
}

async function setup(context: IExtensionContext, gamePath: string): Promise<void> {
  await prepareRedmodDirectories(gamePath)
  const status = await getRedmodStatus(context, gamePath)
  if (status.installed) return
  notify(
    context,
    'REDmod DLC 未安装或不完整',
    '普通 Mod 仍可正常管理；安装 REDmod 类型内容前，请先在 Steam 中安装免费的 REDmod DLC。',
  )
}

export function registerCyberpunkGame(context: IExtensionContext): void {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery: any) => setup(context, String(discovery?.path || discovery?.gamePath || '')),
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: NEXUS_DOMAIN,
      customOpenModsPath: PATHS.archive,
      supportsSymlinks: false,
      mergeMods: true,
    },
  })

  context.registerExtensionAction(GAME_ID, 'getRedmodStatus', (gamePath) => getRedmodStatus(context, String(gamePath || '')))
}
