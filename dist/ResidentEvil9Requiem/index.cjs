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
function extractPatchNumber(fileName) {
  const match = /patch_(\d+)\.pak$/iu.exec(fileName);
  return match ? Number(match[1]) || 0 : 0;
}
async function isFile(fsApi, filePath) {
  try {
    const stat = await fsApi.stat(filePath);
    return !!stat.isFile;
  } catch {
    return false;
  }
}
async function getNextReEnginePakIndex(pathApi, fsApi, gameRoot) {
  let entries = [];
  try {
    entries = await fsApi.readdir(gameRoot);
  } catch {
    return 1;
  }
  let maxPatch = 0;
  for (const entry of entries) {
    const fullPath = pathApi.join(gameRoot, entry);
    if (!await isFile(fsApi, fullPath))
      continue;
    if (!entry.toLowerCase().endsWith(".pak"))
      continue;
    maxPatch = Math.max(maxPatch, extractPatchNumber(entry));
  }
  return maxPatch + 1;
}
function createReEnginePakName(index) {
  return `re_chunk_000.pak.patch_${String(index).padStart(3, "0")}.pak`;
}
async function buildPakInstructions(pathApi, fsApi, files, gameRoot) {
  let nextIndex = await getNextReEnginePakIndex(pathApi, fsApi, gameRoot);
  const instructions = [];
  for (const entry of normalizeEntries(files)) {
    if (archiveExtName(entry.source) !== ".pak")
      continue;
    instructions.push({
      type: "copy",
      source: entry.source,
      destination: createReEnginePakName(nextIndex)
    });
    nextIndex += 1;
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
async function installReEnginePak(pathApi, fsApi, files, gameRoot) {
  return { instructions: await buildPakInstructions(pathApi, fsApi, files, gameRoot) };
}

// index.ts
var GAME_ID = 3764200;
var GAME_NAME = "Resident Evil Requiem";
var EXECUTABLE = "re9.exe";
var REFRAMEWORK_DLL = "dinput8.dll";
var REFRAMEWORK_MOD_ID = 1566;
var MOD_TYPE_PRIORITY = 25;
var MOD_TYPE_REFRAMEWORK_LOADER = `${GAME_ID}-reframework-loader`;
var MOD_TYPE_REFRAMEWORK = `${GAME_ID}-reframework`;
var MOD_TYPE_AUTORUN = `${GAME_ID}-autorun`;
var MOD_TYPE_PLUGINS = `${GAME_ID}-plugins`;
var MOD_TYPE_NATIVES = `${GAME_ID}-natives`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
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
async function getGameRoot(context) {
  const gamePath = await findGame(context);
  if (!gamePath) {
    throw new Error(`${GAME_NAME} game path is unavailable: appid=${GAME_ID}`);
  }
  return gamePath;
}
function getReframeworkRequirements() {
  return [
    {
      key: "resident-evil-9-requiem-reframework",
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
  context.registerModType(MOD_TYPE_REFRAMEWORK_LOADER, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "REFramework" });
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK_LOADER,
    10,
    (files, gameId) => testReEngineReframeworkLoader(files, gameId, GAME_ID),
    (files) => ({ ...installReEngineReframeworkLoader(context.api.util.path, files), modType: MOD_TYPE_REFRAMEWORK_LOADER })
  );
}
function registerReframework(context) {
  context.registerModType(MOD_TYPE_REFRAMEWORK, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "REFramework Folder" });
  context.registerInstaller(
    MOD_TYPE_REFRAMEWORK,
    11,
    (files, gameId) => testReEngineReframework(files, gameId, GAME_ID),
    (files) => ({ ...installReEngineReframework(context.api.util.path, files), modType: MOD_TYPE_REFRAMEWORK })
  );
}
function registerAutorun(context) {
  context.registerModType(MOD_TYPE_AUTORUN, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "REFramework Autorun" });
  context.registerInstaller(
    MOD_TYPE_AUTORUN,
    12,
    (files, gameId) => testReEngineAutorun(files, gameId, GAME_ID),
    (files) => ({ ...installReEngineAutorun(context.api.util.path, files), modType: MOD_TYPE_AUTORUN })
  );
}
function registerPlugins(context) {
  context.registerModType(MOD_TYPE_PLUGINS, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "REFramework Plugins" });
  context.registerInstaller(
    MOD_TYPE_PLUGINS,
    13,
    (files, gameId) => testReEnginePlugins(files, gameId, GAME_ID),
    (files) => ({ ...installReEnginePlugins(context.api.util.path, files), modType: MOD_TYPE_PLUGINS })
  );
}
function registerNatives(context) {
  context.registerModType(MOD_TYPE_NATIVES, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "RE Engine Natives" });
  context.registerInstaller(
    MOD_TYPE_NATIVES,
    14,
    (files, gameId) => testReEngineNatives(files, gameId, GAME_ID),
    (files) => ({ ...installReEngineNatives(context.api.util.path, files), modType: MOD_TYPE_NATIVES })
  );
}
function registerPak(context) {
  context.registerModType(MOD_TYPE_PAK, MOD_TYPE_PRIORITY, (gameId) => Number(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "RE Engine Pak" });
  context.registerInstaller(
    MOD_TYPE_PAK,
    15,
    (files, gameId) => testReEnginePak(files, gameId, GAME_ID),
    async (files) => {
      const gameRoot = await getGameRoot(context);
      return { ...await installReEnginePak(context.api.util.path, context.api.util.fs, files, gameRoot), modType: MOD_TYPE_PAK };
    }
  );
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: "RE9 Requiem",
    executable: EXECUTABLE,
    queryPath: () => findGame(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery) => getReframeworkStatus(context, String(discovery?.path || "")),
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID }
  });
  registerReframeworkLoader(context);
  registerReframework(context);
  registerAutorun(context);
  registerPlugins(context);
  registerNatives(context);
  registerPak(context);
  context.registerExtensionAction(GAME_ID, "getReframeworkStatus", () => getReframeworkStatus(context));
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getReframeworkStatus(context));
  return true;
}
var index_default = main;
