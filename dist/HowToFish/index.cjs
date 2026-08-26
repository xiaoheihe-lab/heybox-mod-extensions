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
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_path = __toESM(require("path"));
var GAME_ID = 4001890;
var GAME_NAME = "How to Fish";
var STEAM_APP_ID = String(GAME_ID);
var EXECUTABLE = "How to Fish.exe";
var GAME_SUBDIRECTORY = "How To Fish";
var GAME_ROOT_TARGET = `{gamePath}/${GAME_SUBDIRECTORY}`;
var MOD_TYPE_BEPINEX = `${GAME_ID}-bepinex-plugin`;
var MOD_TYPE_MELONLOADER = `${GAME_ID}-melonloader-mod`;
var MOD_TYPE_MELON_BEPINEX_BRIDGE = `${GAME_ID}-melon-bepinex-bridge`;
var MOD_TYPE_BEPINEX_RUNTIME = `${GAME_ID}-bepinex-runtime`;
var MOD_TYPE_MELONLOADER_RUNTIME = `${GAME_ID}-melonloader-runtime`;
var MOD_TYPE_ROOT = `${GAME_ID}-root-loader`;
var MELON_BEPINEX_BRIDGE_MOD_ID = "41287";
function normalizeArchivePath(value) {
  const normalized = String(value ?? "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/, "");
  if (!normalized || /^[a-z]:\//i.test(normalized) || normalized.includes("://")) return "";
  const parts2 = normalized.split("/").filter(Boolean);
  if (parts2.some((part) => part === "." || part === "..")) return "";
  return parts2.join("/");
}
function lower(value) {
  return normalizeArchivePath(value).toLowerCase();
}
function parts(value) {
  const normalized = normalizeArchivePath(value);
  return normalized ? normalized.split("/") : [];
}
function hasPathSegment(file, segment) {
  return parts(file).some((part) => part.toLowerCase() === segment.toLowerCase());
}
function isDll(file) {
  return lower(file).endsWith(".dll");
}
function hasBepInExPluginPath(files) {
  return files.some((file) => {
    const value = lower(file);
    return value.includes("/bepinex/plugins/") || value.startsWith("bepinex/plugins/");
  });
}
function hasMelonLoaderModPath(files) {
  return files.some((file) => {
    const value = lower(file);
    return value.includes("/mods/") || value.startsWith("mods/") || value.includes("/mlloader/mods/") || value.startsWith("mlloader/mods/");
  });
}
function hasLoaderRootFiles(files) {
  return files.some((file) => {
    const value = lower(file);
    return value === "winhttp.dll" || value === "doorstop_config.ini" || value.startsWith("bepinex/core/") || value.startsWith("melonloader/");
  });
}
function hasBepInExRuntimeFiles(files) {
  return files.some((file) => {
    const value = lower(file);
    return value === "winhttp.dll" || value === "doorstop_config.ini" || value.startsWith("bepinex/core/");
  });
}
function findMelonLoaderRuntimeRoot(files) {
  const normalized = files.map((file) => normalizeArchivePath(file)).filter(Boolean);
  const versionFiles = normalized.filter((file) => import_path.default.posix.basename(file).toLowerCase() === "version.dll");
  for (const versionFile of versionFiles) {
    const versionParts = versionFile.split("/");
    const versionRoot = versionParts.slice(0, -1);
    const hasSiblingMelonLoader = normalized.some((file) => {
      const fileParts = file.split("/");
      const melonIndex = fileParts.findIndex((part) => part.toLowerCase() === "melonloader");
      return melonIndex >= 0 && melonIndex === versionRoot.length && fileParts.slice(0, melonIndex).every((part, index) => part.toLowerCase() === versionRoot[index]?.toLowerCase()) && fileParts.length > melonIndex + 1;
    });
    if (hasSiblingMelonLoader) return versionRoot;
  }
  return null;
}
function findMelonBepInExBridgeRoot(files) {
  const normalized = files.map((file) => normalizeArchivePath(file)).filter(Boolean);
  for (const winhttpFile of normalized) {
    if (import_path.default.posix.basename(winhttpFile).toLowerCase() !== "winhttp.dll") continue;
    const root = winhttpFile.split("/").slice(0, -1);
    const hasSiblingDirectory = (name) => normalized.some((file) => {
      const fileParts = file.split("/");
      return fileParts.length > root.length && fileParts.slice(0, root.length).every((part, index) => part.toLowerCase() === root[index]?.toLowerCase()) && fileParts[root.length]?.toLowerCase() === name.toLowerCase();
    });
    if (hasSiblingDirectory("MLLoader") && hasSiblingDirectory("BepInEx")) return root;
  }
  return null;
}
function isGameArchive(gameId) {
  return String(gameId) === String(GAME_ID) || Number(gameId) === GAME_ID;
}
function findAnchor(file, anchor) {
  return parts(file).findIndex((part) => part.toLowerCase() === anchor.toLowerCase());
}
function installUnderFolder(files, folder, modType) {
  const instructions = [];
  for (const source of files) {
    const rel = normalizeArchivePath(source);
    if (!rel) continue;
    const sourceParts = rel.split("/");
    let anchorDepth = 1;
    const anchorIndex = folder === "MLLoader/Mods" ? (() => {
      const fileParts = sourceParts.map((part) => part.toLowerCase());
      const mlloaderIndex = fileParts.indexOf("mlloader");
      if (mlloaderIndex >= 0 && fileParts[mlloaderIndex + 1] === "mods") {
        anchorDepth = 2;
        return mlloaderIndex;
      }
      return fileParts.indexOf("mods");
    })() : findAnchor(rel, folder);
    if (anchorIndex < 0) {
      if (isDll(rel) && !hasPathSegment(rel, "BepInEx") && !hasPathSegment(rel, "Mods") && !hasPathSegment(rel, "MLLoader")) {
        if (folder === "BepInEx") {
          instructions.push({ type: "copy", source, destination: import_path.default.posix.join("BepInEx/plugins", import_path.default.posix.basename(rel)) });
          instructions.push({ type: "copy", source, destination: import_path.default.posix.join("MLLoader/Mods", import_path.default.posix.basename(rel)) });
        } else {
          instructions.push({ type: "copy", source, destination: import_path.default.posix.join("MLLoader/Mods", import_path.default.posix.basename(rel)) });
        }
      }
      continue;
    }
    const relative = sourceParts.slice(anchorIndex + anchorDepth).join("/");
    if (!relative) continue;
    instructions.push({ type: "copy", source, destination: import_path.default.posix.join(folder, relative) });
  }
  return { instructions, modType };
}
function installMelonBepInExBridge(files) {
  const root = findMelonBepInExBridgeRoot(files);
  if (!root) return { instructions: [], modType: MOD_TYPE_MELON_BEPINEX_BRIDGE };
  const instructions = [];
  for (const source of files) {
    const rel = normalizeArchivePath(source);
    if (!rel) continue;
    const sourceParts = rel.split("/");
    const matchesRoot = root.every((part, index) => sourceParts[index]?.toLowerCase() === part.toLowerCase());
    if (!matchesRoot || sourceParts.length <= root.length) continue;
    instructions.push({ type: "copy", source, destination: sourceParts.slice(root.length).join("/") });
  }
  return { instructions, modType: MOD_TYPE_MELON_BEPINEX_BRIDGE };
}
function installRoot(files) {
  const instructions = [];
  for (const source of files) {
    const rel = normalizeArchivePath(source);
    if (!rel) continue;
    const sourceParts = rel.split("/");
    const bepinexIndex = findAnchor(rel, "BepInEx");
    const melonIndex = findAnchor(rel, "MelonLoader");
    if (bepinexIndex >= 0) instructions.push({ type: "copy", source, destination: sourceParts.slice(bepinexIndex).join("/") });
    else if (melonIndex >= 0) instructions.push({ type: "copy", source, destination: sourceParts.slice(melonIndex).join("/") });
    else if (["winhttp.dll", "doorstop_config.ini"].includes(import_path.default.posix.basename(rel).toLowerCase())) instructions.push({ type: "copy", source, destination: import_path.default.posix.basename(rel) });
  }
  return { instructions, modType: MOD_TYPE_ROOT };
}
function installMelonLoaderRuntime(files) {
  const root = findMelonLoaderRuntimeRoot(files);
  if (!root) return { instructions: [], modType: MOD_TYPE_MELONLOADER_RUNTIME };
  const instructions = [];
  for (const source of files) {
    const rel = normalizeArchivePath(source);
    if (!rel) continue;
    const sourceParts = rel.split("/");
    const isUnderRuntimeRoot = root.every((part, index) => sourceParts[index]?.toLowerCase() === part.toLowerCase());
    if (!isUnderRuntimeRoot || sourceParts.length <= root.length) continue;
    instructions.push({
      type: "copy",
      source,
      destination: sourceParts.slice(root.length).join("/")
    });
  }
  return { instructions, modType: MOD_TYPE_MELONLOADER_RUNTIME };
}
function testBepInEx(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && (hasBepInExPluginPath(files) || files.some(isDll) && !hasMelonLoaderModPath(files) && !hasLoaderRootFiles(files)), requiredFiles: [] });
}
function testMelonLoader(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && hasMelonLoaderModPath(files), requiredFiles: [] });
}
function testMelonBepInExBridge(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && findMelonBepInExBridgeRoot(files) !== null, requiredFiles: [] });
}
function testRoot(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && hasLoaderRootFiles(files), requiredFiles: [] });
}
function testBepInExRuntime(files, gameId) {
  return Promise.resolve({
    supported: isGameArchive(gameId) && hasBepInExRuntimeFiles(files) && findMelonLoaderRuntimeRoot(files) === null,
    requiredFiles: []
  });
}
function testMelonLoaderRuntime(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && findMelonLoaderRuntimeRoot(files) !== null, requiredFiles: [] });
}
async function fileExists(context, filePath) {
  if (!filePath) return false;
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return Boolean(stat?.isFile);
  } catch {
    return false;
  }
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
  return game?.gamePath;
}
function getMelonBepInExBridgeRequirement() {
  return {
    key: "howtofish-melon-bepinex-bridge",
    name: "MelonLoader + BepInEx Bridge",
    modId: MELON_BEPINEX_BRIDGE_MOD_ID,
    mod_id: MELON_BEPINEX_BRIDGE_MOD_ID,
    modType: MOD_TYPE_MELON_BEPINEX_BRIDGE,
    openModDetailDialog: false,
    requirement: "enabled"
  };
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const winhttpPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, GAME_SUBDIRECTORY, "winhttp.dll") : "";
  const mlLoaderPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, GAME_SUBDIRECTORY, "MLLoader") : "";
  const hasWinhttp = !!resolvedGamePath && await fileExists(context, winhttpPath);
  let hasMLLoader = false;
  try {
    const stat = await context.api.util.fs.stat(mlLoaderPath);
    hasMLLoader = Boolean(stat?.isDirectory);
  } catch {
    hasMLLoader = false;
  }
  const requirements = [];
  if (!hasWinhttp || !hasMLLoader) requirements.push(getMelonBepInExBridgeRequirement());
  return {
    installed: requirements.length === 0,
    gamePath: resolvedGamePath,
    requirements
  };
}
async function getExtensionRequiredMods(context, gamePath) {
  const status = await getRequirementStatus(context, gamePath);
  if (status.installed) return status;
  return {
    ...status,
    code: "EXTENSION_REQUIRED_MODS_MISSING",
    requirement: {
      code: "EXTENSION_REQUIRED_MODS_MISSING",
      requirements: status.requirements
    }
  };
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [`${GAME_SUBDIRECTORY}/${EXECUTABLE}`],
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || discovery?.gamePath || "")),
    environment: { SteamAPPId: STEAM_APP_ID },
    details: { steamAppId: GAME_ID }
  });
  context.registerModType(MOD_TYPE_BEPINEX, 25, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "BepInEx Plugin" });
  context.registerModType(MOD_TYPE_MELONLOADER, 25, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "MelonLoader Mod" });
  context.registerModType(MOD_TYPE_MELON_BEPINEX_BRIDGE, 1, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "MelonLoader + BepInEx Bridge" });
  context.registerModType(MOD_TYPE_BEPINEX_RUNTIME, 25, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "BepInEx 5 (x64)" });
  context.registerModType(MOD_TYPE_MELONLOADER_RUNTIME, 25, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "MelonLoader" });
  context.registerModType(MOD_TYPE_ROOT, 25, (gameId) => isGameArchive(gameId), () => GAME_ROOT_TARGET, () => Promise.resolve(false), { name: "Runtime Loader" });
  context.registerInstaller(MOD_TYPE_MELON_BEPINEX_BRIDGE, 1, testMelonBepInExBridge, (files) => installMelonBepInExBridge(files));
  context.registerInstaller(MOD_TYPE_BEPINEX_RUNTIME, 10, testBepInExRuntime, (files) => ({ ...installRoot(files), modType: MOD_TYPE_BEPINEX_RUNTIME }));
  context.registerInstaller(MOD_TYPE_MELONLOADER_RUNTIME, 11, testMelonLoaderRuntime, (files) => installMelonLoaderRuntime(files));
  context.registerInstaller(MOD_TYPE_ROOT, 20, testRoot, (files) => installRoot(files));
  context.registerInstaller(MOD_TYPE_BEPINEX, 20, testBepInEx, (files) => installUnderFolder(files, "BepInEx", MOD_TYPE_BEPINEX));
  context.registerInstaller(MOD_TYPE_MELONLOADER, 20, testMelonLoader, (files) => installUnderFolder(files, "MLLoader/Mods", MOD_TYPE_MELONLOADER));
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var index_default = main;
