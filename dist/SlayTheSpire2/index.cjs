"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// extensions/SlayTheSpire2/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_path = __toESM(require("path"));
var GAME_ID = 2868840;
var STEAMAPP_ID = "2868840";
var EPICAPP_ID = null;
var GOGAPP_ID = null;
var XBOXAPP_ID = null;
var DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID];
var GAME_NAME = "Slay the Spire 2";
var GAME_NAME_SHORT = "Slay the Spire 2";
var EXEC_NAME = "SlayTheSpire2.exe";
var EXEC = EXEC_NAME;
var allowSymlinks = true;
var CONFIGMOD_LOCATION = "";
var SAVEMOD_LOCATION = "";
var APPDATA_FOLDER = import_path.default.join("SlayTheSpire2", "steam");
var CONFIG_FOLDERNAME = "";
var SAVE_FOLDERNAME = "";
var MOD_ID = `${GAME_ID}-mod`;
var MOD_NAME = "Mod";
var MOD_PATH = "mods";
var MOD_EXTS = [".dll", ".pck"];
var DATA_FOLDER = "data_sts2_windows_x86_64";
var ROOT_FOLDERS = [DATA_FOLDER, MOD_PATH];
var LOADER_ID = `${GAME_ID}-loader`;
var LOADER_FILE = "XXX.dll";
var ROOT_ID = `${GAME_ID}-root`;
var ROOT_NAME = "Root Folder";
var BINARIES_ID = `${GAME_ID}-binaries`;
var CONFIG_ID = `${GAME_ID}-config`;
var CONFIG_PATH = import_path.default.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
var SAVE_ID = `${GAME_ID}-save`;
var SAVE_FOLDER = import_path.default.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
var USERID_FOLDER = "";
var SAVE_PATH_MODDED = import_path.default.join(SAVE_FOLDER, USERID_FOLDER, "modded", "profile1", "saves");
var SAVE_PATH_VANILLA = import_path.default.join(SAVE_FOLDER, USERID_FOLDER, "profile1", "saves");
var MOD_PATH_DEFAULT = MOD_PATH;
var REQ_FILE = EXEC;
var IGNORE_CONFLICTS = [import_path.default.join("**", "changelog*"), import_path.default.join("**", "readme*")];
var IGNORE_DEPLOY = [import_path.default.join("**", "changelog*"), import_path.default.join("**", "readme*")];
var spec = {
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
      enb: false
    },
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
      EpicAPPId: EPICAPP_ID,
      XboxAPPId: XBOXAPP_ID
    }
  },
  modTypes: [
    {
      id: MOD_ID,
      name: MOD_NAME,
      priority: "high",
      targetPath: import_path.default.join("{gamePath}", MOD_PATH)
    },
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: "high",
      targetPath: `{gamePath}`
    }
  ],
  discovery: {
    ids: DISCOVERY_IDS_ACTIVE,
    names: []
  }
};
async function makeFindGame(api, gameSpec) {
  const result = await api.util.GameStoreHelper.findByAppId(gameSpec.game.id);
  return result?.gamePath;
}
async function applyGame(context, gameSpec) {
  console.log("apply game and doing something here", context);
  const game = {
    ...gameSpec.game,
    gamePath: await makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable
  };
  context.registerGame(game);
  ;
  (gameSpec.modTypes || []).forEach((type, idx) => {
    const priority = 100 + idx;
    context.registerModType(
      String(type.id),
      priority,
      (gameId) => gameId === gameSpec.game.id && !!game.gamePath,
      (_g) => String(type.targetPath ?? ""),
      () => Promise.resolve(false),
      { name: type.name }
    );
  });
  function testLoader(files, gameId) {
    console.log("\u6267\u884CtestLoader", files, gameId);
    const isMod = files.some((file) => import_path.default.basename(file) === LOADER_FILE);
    console.log("\u6267\u884CisMod", isMod);
    let supported = gameId === spec.game.id && isMod;
    console.log("\u6267\u884Csupported", supported);
    if (supported && files.find((file) => import_path.default.basename(file).toLowerCase() === "moduleconfig.xml" && import_path.default.basename(import_path.default.dirname(file)).toLowerCase() === "fomod")) {
      supported = false;
    }
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  }
  function installLoader(files) {
    const MOD_TYPE = LOADER_ID;
    const modFile = files.find((file) => import_path.default.basename(file) === LOADER_FILE);
    const idx = modFile.indexOf(import_path.default.basename(modFile));
    const rootPath = import_path.default.dirname(modFile);
    const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };
    const filtered = files.filter(
      (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(import_path.default.sep)
    );
    const instructions = filtered.map((file) => {
      return {
        type: "copy",
        source: file,
        destination: import_path.default.join(file.substr(idx))
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  function testMod(files, gameId) {
    const isMod = files.some((file) => MOD_EXTS.includes(import_path.default.extname(file).toLowerCase()));
    let supported = gameId === spec.game.id && isMod;
    if (supported && files.find((file) => import_path.default.basename(file).toLowerCase() === "moduleconfig.xml" && import_path.default.basename(import_path.default.dirname(file)).toLowerCase() === "fomod")) {
      supported = false;
    }
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  }
  function installMod(files) {
    const MOD_TYPE = MOD_ID;
    const modFile = files.find((file) => MOD_EXTS.includes(import_path.default.extname(file).toLowerCase()));
    const idx = modFile.indexOf(import_path.default.basename(modFile));
    const rootPath = import_path.default.dirname(modFile);
    const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };
    let folder = import_path.default.basename(modFile, ".dll");
    const filtered = files.filter(
      (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(import_path.default.sep)
    );
    const instructions = filtered.map((file) => {
      return {
        type: "copy",
        source: file,
        destination: import_path.default.join(folder, file.substr(idx))
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  function testRoot(files, gameId) {
    const isMod = files.some((file) => ROOT_FOLDERS.includes(import_path.default.basename(file)));
    let supported = gameId === spec.game.id && isMod;
    if (supported && files.find((file) => import_path.default.basename(file).toLowerCase() === "moduleconfig.xml" && import_path.default.basename(import_path.default.dirname(file)).toLowerCase() === "fomod")) {
      supported = false;
    }
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  }
  function installRoot(files) {
    const modFile = files.find((file) => ROOT_FOLDERS.includes(import_path.default.basename(file)));
    const ROOT_IDX = `${import_path.default.basename(modFile)}${import_path.default.sep}`;
    const idx = modFile.indexOf(ROOT_IDX);
    const rootPath = import_path.default.dirname(modFile);
    const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };
    const filtered = files.filter(
      (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(import_path.default.sep)
    );
    const instructions = filtered.map((file) => {
      return {
        type: "copy",
        source: file,
        destination: import_path.default.join(file.substr(idx))
      };
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  context.registerInstaller(MOD_ID, 29, testMod, installMod);
}
async function main(context) {
  await applyGame(context, spec);
  return true;
}
var index_default = main;
