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

// index.ts
var index_exports = {};
__export(index_exports, {
  GAME_ID: () => GAME_ID,
  MOD_TYPE_ID: () => MOD_TYPE_ID,
  STEAM_APP_ID: () => STEAM_APP_ID,
  archiveBaseName: () => archiveBaseName,
  archiveDirName: () => archiveDirName,
  default: () => index_default,
  getKenshiModFile: () => getKenshiModFile,
  installKenshiMod: () => installKenshiMod,
  normalizeArchivePath: () => normalizeArchivePath,
  testKenshiMod: () => testKenshiMod
});
module.exports = __toCommonJS(index_exports);
var import_path = __toESM(require("path"));
var GAME_ID = 233860;
var STEAM_APP_ID = "233860";
var GAME_NAME = "Kenshi";
var GAME_SHORT_NAME = "Kenshi";
var EXECUTABLE = "kenshi_x64.exe";
var MOD_PATH = "mods";
var MOD_TYPE_ID = "kenshi-local-mod";
function normalizeArchivePath(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/g, "").replace(/\/+/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return null;
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return segments.join("/");
}
function archiveBaseName(filePath) {
  const normalized = normalizeArchivePath(filePath);
  return normalized ? import_path.default.posix.basename(normalized) : "";
}
function archiveDirName(filePath) {
  const normalized = normalizeArchivePath(filePath);
  if (!normalized) return "";
  const dir = import_path.default.posix.dirname(normalized);
  return dir === "." ? "" : dir;
}
function hasModFile(filePath) {
  return archiveBaseName(filePath).toLowerCase().endsWith(".mod");
}
function sanitizeModName(name) {
  const value = String(name || "Kenshi Mod").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/[. ]+$/g, "").trim();
  return value || "Kenshi Mod";
}
function isUnderRoot(filePath, root) {
  const rel = normalizeArchivePath(filePath);
  if (!rel) return false;
  if (!root) return true;
  return rel === root || rel.startsWith(`${root}/`);
}
function getKenshiModFile(files) {
  const modFiles = files.filter(hasModFile);
  if (modFiles.length > 1) {
    throw new Error("Kenshi installer does not support archives with multiple .mod files");
  }
  return modFiles[0];
}
function installKenshiMod(files) {
  const modFile = getKenshiModFile(files);
  const instructions = [];
  if (!modFile) return { instructions };
  const modName = sanitizeModName(import_path.default.posix.basename(archiveBaseName(modFile), ".mod"));
  const root = archiveDirName(modFile);
  const prefix = root ? `${root}/` : "";
  for (const source of files) {
    const relSource = normalizeArchivePath(source);
    if (!relSource || !isUnderRoot(relSource, root)) continue;
    const relativeInsideMod = prefix ? relSource.slice(prefix.length) : relSource;
    if (!relativeInsideMod) continue;
    instructions.push({
      type: "copy",
      source,
      destination: import_path.default.posix.join(modName, relativeInsideMod)
    });
  }
  return { instructions };
}
function testKenshiMod(files, gameId) {
  let supported = false;
  try {
    supported = Number(gameId) === GAME_ID && !!getKenshiModFile(files);
  } catch {
    supported = false;
  }
  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    modPath: MOD_PATH,
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
      return game?.gamePath;
    },
    queryModPath: () => MOD_PATH,
    mergeMods: true,
    requiresCleanup: true,
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      supportsSymlinks: true
    }
  });
  context.registerModType(
    MOD_TYPE_ID,
    25,
    (gameId) => Number(gameId) === GAME_ID,
    () => import_path.default.join("{gamePath}", MOD_PATH),
    () => Promise.resolve(false),
    { name: "Kenshi Mod" }
  );
  context.registerInstaller(MOD_TYPE_ID, 25, testKenshiMod, installKenshiMod);
  return true;
}
var index_default = main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GAME_ID,
  MOD_TYPE_ID,
  STEAM_APP_ID,
  archiveBaseName,
  archiveDirName,
  getKenshiModFile,
  installKenshiMod,
  normalizeArchivePath,
  testKenshiMod
});
