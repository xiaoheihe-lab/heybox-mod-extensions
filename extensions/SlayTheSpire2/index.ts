// @ts-nocheck
import type { IExtensionContext } from 'heybox-mod-api';
import path from 'path';

// 游戏信息
const GAME_ID = 2868840;
const STEAMAPP_ID = '2868840';
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const XBOX_PUB_ID = '';
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID];
const GAME_NAME = 'Slay the Spire 2';
const GAME_NAME_SHORT = 'Slay the Spire 2';
const BINARIES_PATH = '.';
const EXEC_NAME = 'SlayTheSpire2.exe';
const EXEC = EXEC_NAME;
const EXEC_EGS = EXEC;
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = 'https://www.pcgamingwiki.com/wiki/Slay_the_Spire_2';
const EXTENSION_URL = 'XXX';
const INSTALL_HIVE = 'HKEY_LOCAL_MACHINE';
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`;
const INSTALL_VALUE = 'XXX';

// feature toggles
const hasLoader = false;
const allowSymlinks = true;
const rootInstaller = true;
const fallbackInstaller = true;
const setupNotification = false;
const hasUserIdFolder = true;
const debug = false;
let binariesInstaller = false;

// info for modtypes, installers, tools, and actions
const CONFIGMOD_LOCATION = '';
const SAVEMOD_LOCATION = '';
const APPDATA_FOLDER = path.join('SlayTheSpire2', 'steam');
const CONFIG_FOLDERNAME = '';
const SAVE_FOLDERNAME = '';

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = 'Mod';
const MOD_PATH = 'mods';
const MOD_PATH_XBOX = MOD_PATH;
const MOD_EXTS = ['.dll', '.pck'];

const DATA_FOLDER = 'data_sts2_windows_x86_64';
const ROOT_FOLDERS = [DATA_FOLDER, MOD_PATH];
const DATA_FOLDER_FILES = ['sts2.dll'];

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = 'Mod Loader';
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = 'XXX.dll';
const LOADER_PAGE_NO = 0;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = 'Root Folder';

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = 'Binaries (Engine Injector)';

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = 'Config';
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXTS = ['.XXX'];
const CONFIG_FILES = ['XXX'];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = 'Save';
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = '';
const SAVE_PATH_MODDED = path.join(SAVE_FOLDER, USERID_FOLDER, 'modded', 'profile1', 'saves');
const SAVE_PATH_VANILLA = path.join(SAVE_FOLDER, USERID_FOLDER, 'profile1', 'saves');
const SAVE_EXTS = ['.XXX'];
const SAVE_FILES = ['XXX'];

const MOD_PATH_DEFAULT = MOD_PATH;
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [MOD_PATH, DATA_FOLDER];
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    executable: EXEC,
    //"parameters": PARAMETERS, //commented out by default to avoid passing empty string parameter
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiresCleanup: true,
    modPath: MOD_PATH_DEFAULT,
    modPathIsRelative: true,
    requiredFiles: [REQ_FILE],
    compatible: {
      dinput: false,
      enb: false,
    },
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
      EpicAPPId: EPICAPP_ID,
      XboxAPPId: XBOXAPP_ID,
    },
  },
  modTypes: [
    {
      id: MOD_ID,
      name: MOD_NAME,
      priority: 'high',
      targetPath: path.join('{gamePath}', MOD_PATH),
    },
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: 'high',
      targetPath: `{gamePath}`,
    },
  ],
  discovery: {
    ids: DISCOVERY_IDS_ACTIVE,
    names: [],
  },
};

async function makeFindGame(api: any, gameSpec: any): Promise<string | undefined> {
  const result = await api.util.GameStoreHelper.findByAppId(gameSpec.game.id);
  return result?.gamePath;
}

async function applyGame(context: IExtensionContext, gameSpec: any) {
  console.log('apply game and doing something here', context);
  const game = {
    ...gameSpec.game,
    gamePath: await makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
  };
  context.registerGame(game);

  // Vortex 风格：注册 mod types（以 typeId 关联 installer）
  ;(gameSpec.modTypes || []).forEach((type: any, idx: number) => {
    const priority = 100 + idx
    context.registerModType(
      String(type.id),
      priority,
      (gameId: number) => gameId === gameSpec.game.id && !!game.gamePath,
      (_g: any) => String(type.targetPath ?? ''),
      () => Promise.resolve(false),
      { name: type.name }
    )
  })

  // MOD INSTALLER FUNCTIONS（与 extensions/index.js 保持一致）

  //Test for mod loader files
  function testLoader(files: string[], gameId: number) {
    console.log('执行testLoader', files, gameId)
    const isMod = files.some(file => path.basename(file) === LOADER_FILE);
    console.log('执行isMod', isMod)
    let supported = (gameId === spec.game.id) && isMod;
    console.log('执行supported', supported)

    // Test for a mod installer
    if (supported && files.find(file =>
        (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
        (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
      supported = false;
    }

    return Promise.resolve({
      supported,
      requiredFiles: [],
    });
  }

  //Install mod loader files
  function installLoader(files: string[]) {
    const MOD_TYPE = LOADER_ID;
    const modFile = files.find(file => path.basename(file) === LOADER_FILE);
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);
    const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    );
    const instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }

  //Test for mod files
  function testMod(files: string[], gameId: number) {
    const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    let supported = (gameId === spec.game.id) && isMod;

    // Test for a mod installer
    if (supported && files.find(file =>
        (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
        (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
      supported = false;
    }

    return Promise.resolve({
      supported,
      requiredFiles: [],
    });
  }

  //Install mod files
  function installMod(files: string[]) {
    const MOD_TYPE = MOD_ID;
    const modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);
    const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

    let folder = path.basename(modFile, '.dll');
    /*if (path.basename(modFile).includes('.pck')) {
      folder = path.basename(modFile, '.pck');
    } //*/
    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    );
    const instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(folder, file.substr(idx)),
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }

  //Installer test for Root folder files
  function testRoot(files: string[], gameId: number) {
    const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
    let supported = (gameId === spec.game.id) && isMod;

    // Test for a mod installer.
    if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
      supported = false;
    }

    return Promise.resolve({
      supported,
      requiredFiles: [],
    });
  }

  //Installer install Root folder files
  function installRoot(files: string[]) {
    const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
    const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
    const idx = modFile.indexOf(ROOT_IDX);
    const rootPath = path.dirname(modFile);
    const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    );
    const instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }

  // 注册 installers：传入的 tester/installer 与 index.js 完全一致
  context.registerInstaller(ROOT_ID, 27, testRoot as any, installRoot as any);
  context.registerInstaller(MOD_ID, 29, testMod as any, installMod as any);
}

async function main(context: IExtensionContext) {
  await applyGame(context, spec);
  return true;
}

export default main;
