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
  installLoosePak: () => installLoosePak,
  installWrappedPak: () => installWrappedPak,
  testLoosePak: () => testLoosePak,
  testWrappedPak: () => testWrappedPak
});
module.exports = __toCommonJS(index_exports);
var GAME_ID = 1139900;
var MOD_TYPE = `${GAME_ID}-pak`;
var LOOSE_MOD_TYPE = `${GAME_ID}-loose-pak`;
var MOD_PATH = "Ghostrunner/Content/Paks";
var WRAPPED_PRIORITY = 30;
var LOOSE_PRIORITY = 25;
function archivePath(file) {
  const value = file.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
  if (!value || value.endsWith("/") || value.startsWith("/") || value.includes(":") || value.includes("\0")) return void 0;
  if (value.split("/").some((part) => !part || part === "." || part === "..")) return void 0;
  return value;
}
function destinationPath(file) {
  const parts = file.split("/");
  if (parts.length === 1) return `LogicMods/${file}`;
  const anchor = parts.findIndex((part) => part.toLowerCase() === "paks");
  if (anchor < 0) return void 0;
  const relative = parts.slice(anchor + 1);
  if (relative.length === 1) return relative[0];
  if (relative.length !== 2) return void 0;
  const folder = relative[0].toLowerCase();
  if (folder === "logicmods") return `LogicMods/${relative[1]}`;
  if (folder === "~mods") return `~mods/${relative[1]}`;
  return void 0;
}
function supportedFiles(files, wrapped) {
  if (!wrapped) {
    const entries = files.flatMap((source) => {
      const file = archivePath(source);
      return file ? [{ source, file }] : [];
    });
    const firstPak = entries.find((entry) => entry.file.toLowerCase().endsWith(".pak"));
    if (!firstPak) return [];
    const directory = (file) => file.slice(0, file.lastIndexOf("/") + 1).toLowerCase();
    const root = directory(firstPak.file);
    return entries.filter((entry) => directory(entry.file) === root && /\.(pak|sig)$/i.test(entry.file)).map((entry) => ({ ...entry, destination: `LogicMods/${entry.file.slice(entry.file.lastIndexOf("/") + 1)}` }));
  }
  return files.flatMap((source) => {
    const file = archivePath(source);
    if (!file?.toLowerCase().endsWith(".pak")) return [];
    if (file.includes("/") !== wrapped) return [];
    const destination = destinationPath(file);
    return destination ? [{ source, file, destination }] : [];
  });
}
function testWrappedPak(files, gameId) {
  return { supported: String(gameId) === String(GAME_ID) && supportedFiles(files, true).length > 0, requiredFiles: [] };
}
function testLoosePak(files, gameId) {
  return { supported: String(gameId) === String(GAME_ID) && supportedFiles(files, false).length > 0 && supportedFiles(files, true).length === 0, requiredFiles: [] };
}
function installWrappedPak(files) {
  return installPaks(files, true);
}
function installLoosePak(files) {
  return installPaks(files, false);
}
function installPaks(files, wrapped) {
  const paks = supportedFiles(files, wrapped);
  if (!paks.length) throw new Error("Ghostrunner: archive contains no supported .pak layout");
  const signatures = /* @__PURE__ */ new Map();
  for (const source of files) {
    const file = archivePath(source);
    if (!file?.toLowerCase().endsWith(".sig")) continue;
    const key = file.slice(0, -4).toLowerCase();
    signatures.set(key, [...signatures.get(key) ?? [], { source, file }]);
  }
  const instructions = [];
  const destinations = /* @__PURE__ */ new Map();
  const copy = (source, destination) => {
    const key = destination.toLowerCase();
    const previous = destinations.get(key);
    if (previous === source) return;
    if (previous !== void 0) throw new Error(`Ghostrunner: multiple archive files target ${destination}`);
    destinations.set(key, source);
    instructions.push({ type: "copy", source, destination });
  };
  for (const pak of paks) {
    copy(pak.source, pak.destination);
    if (!wrapped) continue;
    for (const sig of signatures.get(pak.file.slice(0, -4).toLowerCase()) ?? []) {
      copy(sig.source, `${pak.destination.slice(0, -4)}${sig.file.slice(-4)}`);
    }
  }
  return { instructions, modType: wrapped ? MOD_TYPE : LOOSE_MOD_TYPE };
}
function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: "Ghostrunner",
    executable: "Ghostrunner.exe",
    queryPath: async () => (await context.api.util.GameStoreHelper.findByAppId(String(GAME_ID)))?.gamePath,
    requiredFiles: ["Ghostrunner.exe"],
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "ghostrunner",
      customOpenModsPath: MOD_PATH
    }
  });
  const registrations = [
    { id: MOD_TYPE, priority: WRAPPED_PRIORITY, test: testWrappedPak, install: installWrappedPak, name: "Ghostrunner Wrapped Pak Mod" },
    { id: LOOSE_MOD_TYPE, priority: LOOSE_PRIORITY, test: testLoosePak, install: installLoosePak, name: "Ghostrunner Loose Pak Mod" }
  ];
  for (const registration of registrations) {
    context.registerModType(
      registration.id,
      registration.priority,
      (gameId) => String(gameId) === String(GAME_ID),
      () => `{gamePath}/${MOD_PATH}`,
      (input) => {
        const files = Array.isArray(input) ? input : input?.files;
        return Array.isArray(files) && registration.test(files.map(String), GAME_ID).supported;
      },
      { name: registration.name }
    );
    context.registerInstaller(registration.id, registration.priority, registration.test, registration.install);
  }
  return true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installLoosePak,
  installWrappedPak,
  testLoosePak,
  testWrappedPak
});
