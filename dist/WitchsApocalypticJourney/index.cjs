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

// extensions/WitchsApocalypticJourney/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var fs = require("fs");
var path = require("path");
var GAME_ID = 3709430;
var GAME_NAME = "Witch's Apocalyptic Journey";
var EXECUTABLE = "Witch's Apocalyptic Journey.exe";
var MOD_ID = `${GAME_ID}-mod`;
var MOD_NAME = "Mod";
var MOD_PATH = path.join("Witch's Apocalyptic Journey_Data", "Mods");
var ARCHIVE_MODS_ROOT = "Mods";
var MOD_TYPE_PRIORITY = 100;
var INSTALLER_PRIORITY = 100;
var MOD_CONFIG_FILE = "modconfig.json";
function normalizeArchivePath(file) {
  const normalized = String(file || "").replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return segments.join("/");
}
function normalizeFiles(files) {
  return files.map((file) => {
    const normalized = normalizeArchivePath(file);
    if (!normalized) return null;
    return {
      source: normalized,
      normalized,
      segments: normalized.split("/")
    };
  }).filter(Boolean);
}
function isModConfig(entry) {
  return entry.segments[entry.segments.length - 1]?.toLowerCase() === MOD_CONFIG_FILE;
}
function findLayout(files) {
  const entries = normalizeFiles(files);
  const config = entries.find(isModConfig);
  if (!config) return null;
  const [first, second] = config.segments;
  if (first?.toLowerCase() === ARCHIVE_MODS_ROOT.toLowerCase()) {
    return second ? { kind: "mods-root", config, modFolder: second } : { kind: "loose", config };
  }
  if (config.segments.length > 1) {
    return { kind: "mod-folder", config, modFolder: first };
  }
  return { kind: "loose", config };
}
function sanitizeFilename(name, fallback = "UnnamedMod") {
  const sanitized = String(name || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/[. ]+$/g, "").replace(/\s+/g, " ");
  const base = sanitized || fallback;
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base) ? `_${base}` : base;
}
function readLooseModName(stagingPath, configPath) {
  if (!stagingPath || typeof stagingPath !== "string") {
    throw new Error("WitchsApocalypticJourney installer requires stagingPath to read loose ModConfig.json");
  }
  const configFullPath = path.join(stagingPath, configPath);
  const config = JSON.parse(fs.readFileSync(configFullPath, "utf8"));
  if (typeof config?.ModName !== "string" || !config.ModName.trim()) {
    throw new Error("ModConfig.json must contain a non-empty ModName field");
  }
  return sanitizeFilename(config.ModName);
}
function rewriteDestination(entry, layout, stagingPath) {
  const [first, ...rest] = entry.segments;
  if (layout.kind === "mods-root") {
    if (first?.toLowerCase() !== ARCHIVE_MODS_ROOT.toLowerCase()) return null;
    if (rest.length === 0) return null;
    return path.join(sanitizeFilename(rest[0]), ...rest.slice(1));
  }
  if (layout.kind === "mod-folder") {
    if (first !== layout.modFolder) return null;
    return path.join(sanitizeFilename(first), ...rest);
  }
  const modName = readLooseModName(stagingPath, layout.config.source);
  return path.join(modName, entry.normalized);
}
async function findGame(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function testMod(files, gameId) {
  return {
    supported: Number(gameId) === GAME_ID && !!findLayout(files)
  };
}
function installMod(files, stagingPath) {
  const layout = findLayout(files);
  if (!layout) {
    return { modTypeId: MOD_ID, instructions: [] };
  }
  const instructions = normalizeFiles(files).map((entry) => {
    const destination = rewriteDestination(entry, layout, stagingPath);
    if (!destination) return null;
    return {
      type: "copy",
      source: entry.source,
      destination
    };
  }).filter(Boolean);
  return {
    modTypeId: MOD_ID,
    instructions
  };
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: () => EXECUTABLE,
    queryPath: () => findGame(context),
    modPath: MOD_PATH,
    modPathIsRelative: true,
    requiredFiles: []
  });
  context.registerModType(
    MOD_ID,
    MOD_TYPE_PRIORITY,
    (gameId) => Number(gameId) === GAME_ID,
    () => `{gamePath}/${MOD_PATH}`,
    () => Promise.resolve(false),
    { name: MOD_NAME }
  );
  context.registerInstaller(MOD_ID, INSTALLER_PRIORITY, testMod, installMod);
}
var index_default = main;
