"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// ../../utils/engine-utils/dist/re-engine/index.js
function isUnsafeSegment(segment) {
  return segment === "." || segment === ".." || segment.includes("\0");
}
function normalizeArchivePath(filePath) {
  const raw = String(filePath || "");
  if (raw.includes("\0") || raw.includes("://"))
    return null;
  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/g, "").replace(/\/+/g, "/").trim();
  if (!normalized || normalized.endsWith("/"))
    return null;
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized))
    return null;
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some(isUnsafeSegment))
    return null;
  return segments.join("/");
}
function normalizeEntries(files) {
  return files.map((file) => {
    const source = normalizeArchivePath(file);
    if (!source)
      return null;
    return {
      source,
      segments: source.split("/")
    };
  }).filter(Boolean);
}
function archiveBaseName(filePath) {
  const normalized = normalizeArchivePath(filePath);
  if (!normalized)
    return "";
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}
function archiveExtName(filePath) {
  const base = archiveBaseName(filePath);
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot).toLowerCase() : "";
}
function hasSegment(entry, marker) {
  const expected = marker.toLowerCase();
  return entry.segments.some((segment) => segment.toLowerCase() === expected);
}
function findSegmentIndex(entry, marker) {
  const expected = marker.toLowerCase();
  return entry.segments.findIndex((segment) => segment.toLowerCase() === expected);
}
function joinPath(pathApi, ...segments) {
  return pathApi.join(...segments.filter(Boolean));
}
function getFileFlags(files) {
  const flags = {
    hasDinput: false,
    hasReframework: false,
    hasAutorun: false,
    hasPlugins: false,
    hasNatives: false,
    hasPak: false
  };
  for (const entry of normalizeEntries(files)) {
    const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || "";
    if (base === "dinput8.dll")
      flags.hasDinput = true;
    if (hasSegment(entry, "reframework"))
      flags.hasReframework = true;
    if (hasSegment(entry, "autorun"))
      flags.hasAutorun = true;
    if (hasSegment(entry, "plugins"))
      flags.hasPlugins = true;
    if (hasSegment(entry, "natives"))
      flags.hasNatives = true;
    if (archiveExtName(entry.source) === ".pak")
      flags.hasPak = true;
  }
  return flags;
}
function toTesterResult(gameId, expectedGameId, supported) {
  return {
    supported: Number(gameId) === expectedGameId && supported,
    requiredFiles: []
  };
}
function testReEngineReframeworkLoader(files, gameId, expectedGameId) {
  return toTesterResult(gameId, expectedGameId, getFileFlags(files).hasDinput);
}
function testReEngineReframework(files, gameId, expectedGameId) {
  const flags = getFileFlags(files);
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && flags.hasReframework);
}
function testReEngineAutorun(files, gameId, expectedGameId) {
  const flags = getFileFlags(files);
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && flags.hasAutorun);
}
function testReEnginePlugins(files, gameId, expectedGameId) {
  const flags = getFileFlags(files);
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && flags.hasPlugins);
}
function testReEngineNatives(files, gameId, expectedGameId) {
  const flags = getFileFlags(files);
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && !flags.hasPlugins && flags.hasNatives);
}
function testReEnginePak(files, gameId, expectedGameId) {
  const flags = getFileFlags(files);
  return toTesterResult(gameId, expectedGameId, !flags.hasDinput && !flags.hasReframework && !flags.hasAutorun && !flags.hasPlugins && !flags.hasNatives && flags.hasPak);
}
function buildMarkerFolderInstructions(pathApi, files, markerFolder, targetPrefix) {
  const instructions = [];
  for (const entry of normalizeEntries(files)) {
    const markerIndex = findSegmentIndex(entry, markerFolder);
    if (markerIndex < 0)
      continue;
    const suffix = entry.segments.slice(markerIndex + 1);
    if (suffix.length === 0)
      continue;
    instructions.push({
      type: "copy",
      source: entry.source,
      destination: joinPath(pathApi, ...targetPrefix, ...suffix)
    });
  }
  return instructions;
}
function buildReframeworkSiblingInstructions(pathApi, files) {
  const entries = normalizeEntries(files);
  const roots = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const base = entry.segments[entry.segments.length - 1]?.toLowerCase() || "";
    if (base === "dinput8.dll") {
      roots.add(entry.segments.slice(0, -1).join("/"));
    }
  }
  const instructions = [];
  const seen = /* @__PURE__ */ new Set();
  for (const root of roots) {
    const rootSegments = root ? root.split("/") : [];
    for (const entry of entries) {
      if (entry.segments.length <= rootSegments.length)
        continue;
      const underRoot = rootSegments.every((segment, index) => entry.segments[index] === segment);
      if (!underRoot)
        continue;
      const relativeSegments = entry.segments.slice(rootSegments.length);
      const key = `${entry.source}\0${relativeSegments.join("/")}`;
      if (seen.has(key))
        continue;
      seen.add(key);
      instructions.push({
        type: "copy",
        source: entry.source,
        destination: joinPath(pathApi, ...relativeSegments)
      });
    }
  }
  return instructions;
}
function installReEngineReframeworkLoader(pathApi, files) {
  return { instructions: buildReframeworkSiblingInstructions(pathApi, files) };
}
function installReEngineReframework(pathApi, files) {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, "reframework", ["reframework"]) };
}
function installReEngineAutorun(pathApi, files) {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, "autorun", ["reframework", "autorun"]) };
}
function installReEnginePlugins(pathApi, files) {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, "plugins", ["reframework", "plugins"]) };
}
function installReEngineNatives(pathApi, files) {
  return { instructions: buildMarkerFolderInstructions(pathApi, files, "natives", ["natives"]) };
}

// index.ts
var GAME_ID = 2246340;
var GAME_NAME = "Monster Hunter Wilds";
var EXECUTABLE = "MonsterHunterWilds.exe";
var REFRAMEWORK_DLL = "dinput8.dll";
var REFRAMEWORK_MOD_ID = 972;
var MOD_TYPE_PRIORITY = 25;
var MOD_TYPE_REFRAMEWORK_LOADER = `${GAME_ID}-reframework-loader`;
var MOD_TYPE_REFRAMEWORK = `${GAME_ID}-reframework`;
var MOD_TYPE_AUTORUN = `${GAME_ID}-autorun`;
var MOD_TYPE_PLUGINS = `${GAME_ID}-plugins`;
var MOD_TYPE_NATIVES = `${GAME_ID}-natives`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_REFRAMEWORK_D2D = `${GAME_ID}-reframework-d2d`;
var ROOT_METADATA_IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);
function getRootArchiveFileName(filePath) {
  const normalized = normalizeArchivePath(filePath);
  if (!normalized || normalized.includes("/")) return "";
  return normalized.toLowerCase();
}
function isRootMetadataImage(filePath) {
  return !!getRootArchiveFileName(filePath) && ROOT_METADATA_IMAGE_EXTENSIONS.has(archiveExtName(filePath));
}
function filterMonsterHunterArchiveFiles(files) {
  const hasRootModInfo = files.some((file) => getRootArchiveFileName(file) === "modinfo.ini");
  if (!hasRootModInfo) return files;
  return files.filter((file) => {
    const rootFileName = getRootArchiveFileName(file);
    return rootFileName !== "modinfo.ini" && !isRootMetadataImage(file);
  });
}
async function findGame(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
async function fileExists(context, filePath) {
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return !!stat.isFile;
  } catch {
    return false;
  }
}
function installMonsterHunterPak(context, files) {
  const instructions = [];
  for (const file of files) {
    const source = normalizeArchivePath(file);
    if (!source || archiveExtName(source) !== ".pak") continue;
    instructions.push({
      type: "copy",
      source,
      destination: context.api.util.path.join("pak_mods", archiveBaseName(source))
    });
  }
  return { instructions, modType: MOD_TYPE_PAK };
}
function getReframeworkRequirements() {
  return [
    {
      key: "monster-hunter-wilds-reframework",
      name: "REFramework",
      modId: REFRAMEWORK_MOD_ID,
      mod_id: REFRAMEWORK_MOD_ID,
      openModDetailDialog: false,
      requirement: "enabled"
    }
  ];
}
async function getReframeworkStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGame(context) || "");
  const dllPath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, REFRAMEWORK_DLL) : "";
  return {
    installed: !!dllPath && await fileExists(context, dllPath),
    gamePath: resolvedGamePath,
    executable: REFRAMEWORK_DLL,
    requirements: getReframeworkRequirements()
  };
}
function registerReframeworkLoader(context) {
  context.registerModType(
    MOD_TYPE_REFRAMEWORK_LOADER,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "REFramework" }
  );
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK_LOADER,
    10,
    (files, gameId) => testReEngineReframeworkLoader(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({
      ...installReEngineReframeworkLoader(context.api.util.path, filterMonsterHunterArchiveFiles(files)),
      modType: MOD_TYPE_REFRAMEWORK_LOADER
    })
  );
}
function registerReframework(context) {
  context.registerModType(
    MOD_TYPE_REFRAMEWORK,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "REFramework Folder" }
  );
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK,
    11,
    (files, gameId) => testReEngineReframework(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({
      ...installReEngineReframework(context.api.util.path, filterMonsterHunterArchiveFiles(files)),
      modType: MOD_TYPE_REFRAMEWORK
    })
  );
}
function registerAutorun(context) {
  context.registerModType(
    MOD_TYPE_AUTORUN,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "REFramework Autorun" }
  );
  context.registerInstaller(
    MOD_TYPE_AUTORUN,
    12,
    (files, gameId) => testReEngineAutorun(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({
      ...installReEngineAutorun(context.api.util.path, filterMonsterHunterArchiveFiles(files)),
      modType: MOD_TYPE_AUTORUN
    })
  );
}
function registerPlugins(context) {
  context.registerModType(
    MOD_TYPE_PLUGINS,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "REFramework Plugins" }
  );
  context.registerInstaller(
    MOD_TYPE_PLUGINS,
    13,
    (files, gameId) => testReEnginePlugins(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({
      ...installReEnginePlugins(context.api.util.path, filterMonsterHunterArchiveFiles(files)),
      modType: MOD_TYPE_PLUGINS
    })
  );
}
function registerNatives(context) {
  context.registerModType(
    MOD_TYPE_NATIVES,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "RE Engine Natives" }
  );
  context.registerInstaller(
    MOD_TYPE_NATIVES,
    14,
    (files, gameId) => testReEngineNatives(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => ({
      ...installReEngineNatives(context.api.util.path, filterMonsterHunterArchiveFiles(files)),
      modType: MOD_TYPE_NATIVES
    })
  );
}
function registerPak(context) {
  context.registerModType(
    MOD_TYPE_PAK,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "RE Engine Pak" }
  );
  context.registerInstaller(
    MOD_TYPE_PAK,
    15,
    (files, gameId) => testReEnginePak(filterMonsterHunterArchiveFiles(files), gameId, GAME_ID),
    (files) => installMonsterHunterPak(context, filterMonsterHunterArchiveFiles(files))
  );
}
function isReframeworkD2dFile(filePath) {
  return archiveBaseName(filePath).toLowerCase().includes("reframework-d2d");
}
function testReframeworkD2d(files, gameId) {
  return {
    supported: Number(gameId) === GAME_ID && files.some(isReframeworkD2dFile),
    requiredFiles: []
  };
}
function installReframeworkD2d(context, files) {
  const instructions = [];
  for (const file of files) {
    const source = normalizeArchivePath(file);
    if (!source) continue;
    const baseName = archiveBaseName(file).toLowerCase();
    if (baseName.includes("reframework-d2d") && baseName.endsWith(".dll")) {
      instructions.push({
        type: "copy",
        source,
        destination: context.api.util.path.join("reframework", "plugins", "reframework-d2d.dll")
      });
    }
    if (baseName.includes("reframework-d2d") && baseName.endsWith(".lua")) {
      instructions.push({
        type: "copy",
        source,
        destination: context.api.util.path.join("reframework", "autorun", "reframework-d2d.lua")
      });
    }
  }
  return { instructions, modType: MOD_TYPE_REFRAMEWORK_D2D };
}
function registerReframeworkD2d(context) {
  context.registerModType(
    MOD_TYPE_REFRAMEWORK_D2D,
    0,
    (gameId) => Number(gameId) === GAME_ID,
    () => "{gamePath}",
    () => Promise.resolve(false),
    { name: "REFramework D2D" }
  );
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK_D2D,
    99,
    (files, gameId) => testReframeworkD2d(files, gameId),
    (files) => installReframeworkD2d(context, files)
  );
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: "MHWs",
    executable: EXECUTABLE,
    queryPath: () => findGame(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery) => getReframeworkStatus(context, String(discovery?.path || "")),
    environment: {
      SteamAPPId: String(GAME_ID)
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "monsterhunterwilds"
    }
  });
  registerReframeworkLoader(context);
  registerReframework(context);
  registerAutorun(context);
  registerPlugins(context);
  registerNatives(context);
  registerPak(context);
  registerReframeworkD2d(context);
  context.registerExtensionAction(GAME_ID, "getReframeworkStatus", () => getReframeworkStatus(context));
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getReframeworkStatus(context));
  return true;
}
var index_default = main;
