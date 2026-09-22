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
  default: () => main,
  installPak: () => installPak,
  installRoot: () => installRoot,
  testPak: () => testPak,
  testRoot: () => testRoot
});
module.exports = __toCommonJS(index_exports);

// pak-installer.ts
function archivePath(source) {
  const file = source.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
  if (!file || file.endsWith("/") || file.startsWith("/") || /[:\0]/.test(file)) return void 0;
  if (file.split("/").some((part) => !part || part === "." || part === ".." || /[. ]$/.test(part))) return void 0;
  return file;
}
function entriesFor(files) {
  return files.flatMap((source) => {
    const file = archivePath(source);
    return file ? [{ source, file }] : [];
  });
}
function selectPaks(files) {
  const entries = entriesFor(files);
  if (entries.some(({ file }) => /(^|\/)fomod\/moduleconfig\.xml$/i.test(file) || /(^|\/)logicmods\//i.test(file) || /\.(dll|asi|lua)$/i.test(file))) return [];
  const first = entries.find(({ file }) => /\.pak$/i.test(file));
  if (!first) return [];
  const root = first.file.slice(0, first.file.lastIndexOf("/") + 1);
  return entries.filter(({ file }) => file.toLowerCase().startsWith(root.toLowerCase()) && /\.pak$/i.test(file)).map((entry) => ({ ...entry, destination: entry.file.slice(root.length) }));
}
function testPakArchive(files, gameId, options) {
  return { supported: String(gameId) === String(options.gameId) && selectPaks(files).length > 0, requiredFiles: [] };
}
function installPakArchive(files, options) {
  const paks = selectPaks(files);
  if (!paks.length) throw new Error(`${options.gameName}: no supported Pak layout (FOMOD, LogicMods and loader/script bundles are not supported)`);
  const entries = entriesFor(files);
  const instructions = [];
  const destinations = /* @__PURE__ */ new Map();
  const copy = (source, destination) => {
    const key = destination.toLowerCase();
    const previous = destinations.get(key);
    if (previous === source) return;
    if (previous !== void 0) throw new Error(`${options.gameName}: multiple archive files target ${destination}`);
    destinations.set(key, source);
    instructions.push({ type: "copy", source, destination });
  };
  for (const pak of paks) {
    const stem = pak.file.slice(0, -4).toLowerCase();
    let targetStem = pak.destination.slice(0, -4);
    if (options.requirePatchSuffix) targetStem = targetStem.replace(/_p$/i, "") + "_P";
    const companions = entries.filter(({ file }) => /\.(sig|ucas|utoc)$/i.test(file) && file.slice(0, file.lastIndexOf(".")).toLowerCase() === stem);
    const has = (extension) => companions.some(({ file }) => file.toLowerCase().endsWith(extension));
    if (has(".ucas") !== has(".utoc")) throw new Error(`${options.gameName}: incomplete IO Store pair for ${pak.file}`);
    copy(pak.source, `${targetStem}.pak`);
    for (const companion of companions) copy(companion.source, targetStem + companion.file.slice(companion.file.lastIndexOf(".")).toLowerCase());
  }
  return { instructions, modType: options.modType };
}

// root-installer.ts
var GAME_ID = 1332010;
var ROOT_MOD_TYPE = `${GAME_ID}-root`;
function rootFiles(files) {
  return files.flatMap((source) => {
    const file = archivePath(source);
    if (!file) return [];
    const parts = file.split("/");
    const anchor = parts.findIndex((part) => part.toLowerCase() === "hk_project");
    if (anchor < 0 || parts.length < anchor + 3) return [];
    if (!["content", "binaries", "config"].includes(parts[anchor + 1].toLowerCase())) return [];
    return [{ source, prefix: parts.slice(0, anchor).join("/"), destination: ["Hk_project", ...parts.slice(anchor + 1)].join("/") }];
  });
}
function hasRootLayout(files) {
  return rootFiles(files).length > 0;
}
function testRoot(files, gameId) {
  const fomod = files.some((source) => {
    const file = archivePath(source);
    return file !== void 0 && /(^|\/)fomod\/moduleconfig\.xml$/i.test(file);
  });
  return { supported: String(gameId) === String(GAME_ID) && !fomod && hasRootLayout(files), requiredFiles: [] };
}
function installRoot(files) {
  if (!testRoot(files, GAME_ID).supported) throw new Error("Stray: no supported root layout (FOMOD requires a separate installer)");
  const entries = rootFiles(files);
  if (new Set(entries.map((entry) => entry.prefix.toLowerCase())).size !== 1) {
    throw new Error("Stray: multiple game roots; select one mod variant before installing");
  }
  const destinations = /* @__PURE__ */ new Map();
  const instructions = [];
  for (const { source, destination } of entries) {
    const key = destination.toLowerCase();
    const previous = destinations.get(key);
    if (previous === source) continue;
    if (previous !== void 0) throw new Error(`Stray: multiple archive files target ${destination}`);
    destinations.set(key, source);
    instructions.push({ type: "copy", source, destination });
  }
  return { instructions, modType: ROOT_MOD_TYPE };
}

// index.ts
var GAME_ID2 = 1332010;
var MOD_TYPE = `${GAME_ID2}-pak`;
var MOD_PATH = "Hk_project/Content/Paks/~mods";
var PRIORITY = 25;
var OPTIONS = { gameId: GAME_ID2, gameName: "Stray", modType: MOD_TYPE, requirePatchSuffix: true };
function testPak(files, gameId) {
  if (hasRootLayout(files)) return { supported: false, requiredFiles: [] };
  return testPakArchive(files, gameId, OPTIONS);
}
function installPak(files) {
  return installPakArchive(files, OPTIONS);
}
function main(context) {
  context.registerGame({
    id: GAME_ID2,
    name: "Stray",
    executable: "Stray.exe",
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(String(GAME_ID2)))?.gamePath,
    requiredFiles: ["Stray.exe"],
    environment: { SteamAPPId: String(GAME_ID2) },
    details: { steamAppId: GAME_ID2, nexusGameDomainName: "stray", customOpenModsPath: MOD_PATH }
  });
  context.registerModType(
    MOD_TYPE,
    PRIORITY,
    (gameId) => String(gameId) === String(GAME_ID2),
    () => "{gamePath}/" + MOD_PATH,
    (input) => {
      const files = Array.isArray(input) ? input : input?.files;
      return Array.isArray(files) && testPak(files.map(String), GAME_ID2).supported;
    },
    { name: "Stray Pak Mod" }
  );
  context.registerInstaller(MOD_TYPE, PRIORITY, testPak, installPak);
  context.registerModType(
    ROOT_MOD_TYPE,
    30,
    (gameId) => String(gameId) === String(GAME_ID2),
    () => "{gamePath}",
    (input) => {
      const files = Array.isArray(input) ? input : input?.files;
      return Array.isArray(files) && testRoot(files.map(String), GAME_ID2).supported;
    },
    { name: "Stray Root Mod" }
  );
  context.registerInstaller(ROOT_MOD_TYPE, 30, testRoot, installRoot);
  return true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installPak,
  installRoot,
  testPak,
  testRoot
});
