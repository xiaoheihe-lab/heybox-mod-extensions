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

// extensions/PhantomBladeZero/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => src_default,
  installBinaries: () => installBinaries,
  installCombo: () => installCombo,
  installContent: () => installContent,
  installDll: () => installDll,
  installLogic: () => installLogic,
  installLua: () => installLua,
  installPak: () => installPak,
  installPakAlt: () => installPakAlt,
  installPreset: () => installPreset,
  installReshade: () => installReshade,
  installRoot: () => installRoot,
  installScript: () => installScript,
  installUe4ss: () => installUe4ss,
  installUe4ssFolder: () => installUe4ssFolder,
  testBinaries: () => testBinaries,
  testCombo: () => testCombo,
  testContent: () => testContent,
  testDll: () => testDll,
  testLogic: () => testLogic,
  testLua: () => testLua,
  testPak: () => testPak,
  testPakAlt: () => testPakAlt,
  testPreset: () => testPreset,
  testReshade: () => testReshade,
  testRoot: () => testRoot,
  testScript: () => testScript,
  testUe4ss: () => testUe4ss,
  testUe4ssFolder: () => testUe4ssFolder
});
module.exports = __toCommonJS(index_exports);

// extensions/PhantomBladeZero/src/constants.ts
var GAME_ID = 4115450;
var GAME_NAME = "Phantom Blade Zero";
var EXECUTABLE = "platform/steam/PBZ.exe";
var STEAM_APP_ID = "4115450";
var GAME_FOLDER = "ProjectPBZ";
var BINARIES_PATH = "platform/steam";
var UE4SS_RUNTIME_PATH = `${BINARIES_PATH}/ue4ss`;
var UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`;
var PAK_MODS_PATH = `${GAME_FOLDER}/Content/Paks/~mods`;
var LOGIC_MODS_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`;
var ROOT_DIRECTORIES = ["Engine", "ProjectPBZ", "platform", "steam"];
var UE4SS_DLL = "UE4SS.dll";
var UE4SS_DWMAPI = "dwmapi.dll";
var UE4SS_SETTINGS = "UE4SS-settings.ini";
var UE4SS_PROXY_DLLS = [UE4SS_DWMAPI, "xinput1_3.dll", "xinput1_4.dll"];
var UE4SS_REQUIREMENT_MOD_ID = "128413";
var MODS_FILE = "mods.txt";
var MODS_FILE_BACKUP = "mods.txt.original";
var ENABLED_FILE = "enabled.txt";
var LUA_EXTENSIONS = [".lua"];
var DLL_EXTENSIONS = [".dll"];
var UE_CONFIG_INI_NAMES = [
  "engine.ini",
  "game.ini",
  "gameusersettings.ini",
  "input.ini",
  "scalability.ini"
];
var CONTENT_ROOT_DIRECTORIES = ["Content", "Config", "Binaries"];
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`;
var MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`;
var MOD_TYPE_UE4SS_FOLDER = `${GAME_ID}-ue4ss-mod-folder`;
var MOD_TYPE_COMBO = `${GAME_ID}-combo`;
var MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_PAK_ALT = `${GAME_ID}-pak-alt`;
var MOD_TYPE_BINARIES = `${GAME_ID}-binaries`;
var MOD_TYPE_CONTENT = `${GAME_ID}-content`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_PRIORITY = {
  ue4ss: 200,
  combo: 190,
  logic: 185,
  script: 180,
  dll: 175,
  ue4ssFolder: 172,
  pak: 170,
  pakAlt: 168,
  content: 165,
  binaries: 160,
  root: 100
};
var INSTALLER_PRIORITY = {
  ue4ss: 1,
  combo: 10,
  logic: 11,
  script: 14,
  dll: 15,
  ue4ssFolder: 16,
  content: 17,
  pakAlt: 25,
  pak: 30,
  binaries: 35,
  root: 40
};

// extensions/PhantomBladeZero/src/paths.ts
var path = require("path");
function normalizeArchivePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}
function splitArchivePath(filePath) {
  return normalizeArchivePath(filePath).split("/").filter(Boolean);
}
function archiveBaseName(filePath) {
  const parts = splitArchivePath(filePath);
  return parts[parts.length - 1] || "";
}
function archiveExtName(filePath) {
  const base = archiveBaseName(filePath);
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx).toLowerCase() : "";
}
function archiveJoin(...parts) {
  return parts.flatMap((part) => splitArchivePath(part)).join("/");
}
function findSegment(filePath, name) {
  const lower = name.toLowerCase();
  return splitArchivePath(filePath).findIndex((segment) => segment.toLowerCase() === lower);
}
function removeLeadingSegments(filePath, count) {
  return splitArchivePath(filePath).slice(count).join("/");
}
function isDirectoryEntry(file, files) {
  const raw = String(file || "");
  if (/[\\/]$/.test(raw)) return true;
  const normalized = normalizeArchivePath(raw).replace(/\/+$/, "");
  if (!normalized) return true;
  const prefix = `${normalized.toLowerCase()}/`;
  return files.some((candidate) => normalizeArchivePath(candidate).toLowerCase().startsWith(prefix));
}
function isArchiveFile(file, files) {
  return Boolean(archiveBaseName(file)) && !isDirectoryEntry(file, files);
}
function safeArchivePath(source) {
  const file = String(source ?? "").replace(/\\/g, "/").replace(/^(\.\/)+/, "");
  if (!file || file.endsWith("/")) return void 0;
  if (file.startsWith("/") || /^[a-z]:/i.test(file) || file.includes("://") || file.includes("\0")) return void 0;
  const parts = file.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || /[. ]$/.test(part))) return void 0;
  return file;
}
function fallbackFolderId(stagingPath, fallback = "PhantomBladeZeroMod") {
  const clean = String(stagingPath || "").replace(/[\\/]+$/, "");
  const leaf = clean.split(/[\\/]/).pop() || fallback;
  return leaf.replace(/\.installing$/i, "").replace(/\.(zip|rar|7z)$/i, "") || fallback;
}
function getStagingSourcePath(file, stagingPath, sourcePathByFile) {
  const direct = sourcePathByFile?.[file];
  if (direct) return direct;
  return path.join(String(stagingPath || ""), file);
}

// extensions/PhantomBladeZero/src/installers.ts
var PATCH_EXTENSIONS = [".pak", ".ucas", ".utoc", ".sig"];
var FOMOD_CONFIG = /(^|\/)fomod\/moduleconfig\.xml$/i;
var CONTENT_MARKERS = new Set(CONTENT_ROOT_DIRECTORIES.map((directory) => directory.toLowerCase()));
function isPbz(gameId) {
  return Number(gameId) === GAME_ID;
}
function testResult(supported) {
  return { supported, requiredFiles: [] };
}
function hasBaseName(files, name) {
  const lower = name.toLowerCase();
  return files.some((file) => {
    const filePath = safeArchivePath(file);
    return Boolean(filePath && archiveBaseName(filePath).toLowerCase() === lower);
  });
}
function isFomodPackage(files) {
  return files.some((source) => {
    const file = safeArchivePath(source);
    return Boolean(file && FOMOD_CONFIG.test(file));
  });
}
function isPakLike(file) {
  return PATCH_EXTENSIONS.includes(archiveExtName(file));
}
function hasInstallablePak(files) {
  const byStem = /* @__PURE__ */ new Map();
  for (const entry of collectEntries(files)) {
    if (!PATCH_EXTENSIONS.includes(archiveExtName(entry.file))) continue;
    const stem = entry.file.slice(0, -archiveExtName(entry.file).length).toLowerCase();
    const extensions = byStem.get(stem) || /* @__PURE__ */ new Set();
    extensions.add(archiveExtName(entry.file));
    byStem.set(stem, extensions);
  }
  for (const extensions of byStem.values()) {
    if (extensions.has(".pak") || extensions.has(".utoc") && extensions.has(".ucas")) return true;
  }
  return false;
}
function pushUnique(instructions, instruction) {
  const destination = String(instruction.destination).toLowerCase();
  const previous = instructions.find((item) => String(item.destination).toLowerCase() === destination);
  if (!previous) {
    instructions.push(instruction);
    return;
  }
  if (previous.type === instruction.type && previous.source === instruction.source) return;
  throw new Error(`Phantom Blade Zero: multiple archive files target ${instruction.destination}`);
}
function collectEntries(files) {
  return files.flatMap((source) => {
    const file = safeArchivePath(source);
    return file && isArchiveFile(file, files) ? [{ source, file }] : [];
  });
}
function groupPaks(files) {
  const entries = collectEntries(files);
  const byStem = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (!PATCH_EXTENSIONS.includes(archiveExtName(entry.file))) continue;
    const stem = entry.file.slice(0, -archiveExtName(entry.file).length).toLowerCase();
    const list = byStem.get(stem) || [];
    list.push({ ...entry, extension: archiveExtName(entry.file) });
    byStem.set(stem, list);
  }
  const groups = [];
  for (const items of byStem.values()) {
    const pak = items.find((item) => item.extension === ".pak");
    const utoc = items.find((item) => item.extension === ".utoc");
    const ucas = items.find((item) => item.extension === ".ucas");
    const primary = pak ?? utoc ?? ucas;
    if (!primary) {
      throw new Error(
        `Phantom Blade Zero: ${normalizeArchivePath(items[0].file)} is a signature file without a .pak or IO Store chunk`
      );
    }
    if (Boolean(utoc) !== Boolean(ucas)) {
      throw new Error(`Phantom Blade Zero: incomplete IO Store pair for ${normalizeArchivePath(primary.file)}`);
    }
    const companions = items.filter((item) => item !== primary);
    const baseName = archiveBaseName(primary.file);
    const logicIndex = findSegment(primary.file, "LogicMods");
    groups.push({
      primary: primary.source,
      baseName,
      stem: baseName.slice(0, -primary.extension.length),
      logicRoot: logicIndex >= 0 ? splitArchivePath(primary.file).slice(0, logicIndex) : void 0,
      companions: companions.map((item) => ({ source: item.source, extension: item.extension }))
    });
  }
  return groups;
}
function pakInstructions(group) {
  const instructions = [];
  if (group.logicRoot) {
    const relative = removeLeadingSegments(group.primary, group.logicRoot.length + 1);
    instructions.push({
      type: "copy",
      source: group.primary,
      destination: archiveJoin(LOGIC_MODS_PATH, relative)
    });
    for (const companion of group.companions) {
      const companionFile = safeArchivePath(companion.source) || "";
      const relativeCompanion = removeLeadingSegments(companionFile, group.logicRoot.length + 1);
      instructions.push({
        type: "copy",
        source: companion.source,
        destination: archiveJoin(LOGIC_MODS_PATH, relativeCompanion)
      });
    }
    return instructions;
  }
  instructions.push({
    type: "copy",
    source: group.primary,
    destination: archiveJoin(PAK_MODS_PATH, group.baseName)
  });
  for (const companion of group.companions) {
    instructions.push({
      type: "copy",
      source: companion.source,
      destination: archiveJoin(PAK_MODS_PATH, `${group.stem}${companion.extension}`)
    });
  }
  return instructions;
}
function isProxyDll(filePath) {
  const base = archiveBaseName(filePath).toLowerCase();
  return UE4SS_PROXY_DLLS.some((proxy) => proxy.toLowerCase() === base);
}
function isSettingsFile(filePath) {
  return archiveBaseName(filePath).toLowerCase() === UE4SS_SETTINGS.toLowerCase();
}
function findLoaderAnchor(files) {
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath) continue;
    if (!isProxyDll(filePath) && !isSettingsFile(filePath)) continue;
    const rootSegments = splitArchivePath(filePath).slice(0, -1);
    const proxies = [];
    let hasRuntime = false;
    for (const candidate of files) {
      const candidatePath = safeArchivePath(candidate);
      if (!candidatePath) continue;
      const segments = splitArchivePath(candidatePath);
      const inRoot = rootSegments.every(
        (segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase()
      );
      if (!inRoot) continue;
      const relative = segments.slice(rootSegments.length);
      if (isProxyDll(candidatePath) && relative.length === 1) proxies.push(candidate);
      if (relative.length === 1 && archiveBaseName(candidatePath).toLowerCase() === UE4SS_DLL.toLowerCase()) {
        hasRuntime = true;
      }
      if (relative.length === 2 && relative[0].toLowerCase() === "ue4ss" && archiveBaseName(candidatePath).toLowerCase() === UE4SS_DLL.toLowerCase()) {
        hasRuntime = true;
      }
    }
    if (hasRuntime) return { rootSegments, proxyFiles: proxies };
  }
  return null;
}
function isLoaderLayout(files) {
  return findLoaderAnchor(files) !== null;
}
function findLogicAnchor(files) {
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isPakLike(filePath)) continue;
    const idx = findSegment(filePath, "LogicMods");
    if (idx >= 0) return splitArchivePath(filePath).slice(0, idx);
  }
  return null;
}
function findUe4ssModRoot(files, marker) {
  const markers = marker ? [marker] : [
    { segment: "scripts", extensions: LUA_EXTENSIONS },
    { segment: "dlls", extensions: DLL_EXTENSIONS }
  ];
  for (const { segment, extensions } of markers) {
    for (const file of files) {
      const filePath = safeArchivePath(file);
      if (!filePath || !extensions.includes(archiveExtName(filePath))) continue;
      const segments = splitArchivePath(filePath);
      const markerIndex = segments.findIndex((part) => part.toLowerCase() === segment);
      if (markerIndex < 0) continue;
      return segments.slice(0, markerIndex);
    }
  }
  return null;
}
var SCRIPT_MARKER = { segment: "scripts", extensions: LUA_EXTENSIONS };
var DLL_MARKER = { segment: "dlls", extensions: DLL_EXTENSIONS };
var UE4SS_DATA_FOLDERS = /* @__PURE__ */ new Set(["content", "data", "config", "configs", "binaries", "plugins", "paks", "icons", "menu", "assets"]);
function isDataFolder(segment) {
  return UE4SS_DATA_FOLDERS.has(segment.toLowerCase());
}
function splitModRoot(root) {
  for (let index = root.length - 1; index >= 0; index -= 1) {
    if (isDataFolder(root[index])) continue;
    return { prefixLength: index + 1, folderId: root[index] };
  }
  return { prefixLength: root.length, folderId: "" };
}
function collectUe4ssModRoots(files) {
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  for (const { segment, extensions } of [SCRIPT_MARKER, DLL_MARKER]) {
    for (const file of files) {
      const filePath = safeArchivePath(file);
      if (!filePath || !extensions.includes(archiveExtName(filePath))) continue;
      const segments = splitArchivePath(filePath);
      const markerIndex = segments.findIndex((part) => part.toLowerCase() === segment);
      if (markerIndex < 0) continue;
      const root = segments.slice(0, markerIndex);
      const { prefixLength } = splitModRoot(root);
      const key = root.slice(0, prefixLength).map((part) => part.toLowerCase()).join("/");
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(root);
    }
  }
  return found;
}
function findRootAnchor(file) {
  const segments = splitArchivePath(file);
  const roots = new Set(ROOT_DIRECTORIES.map((directory) => directory.toLowerCase()));
  for (let index = 0; index < segments.length; index += 1) {
    if (roots.has(segments[index].toLowerCase())) return { anchorIndex: index };
  }
  return null;
}
function isGameRelativeLayout(files) {
  return files.some((file) => {
    const filePath = safeArchivePath(file);
    return Boolean(filePath && isArchiveFile(file, files) && findRootAnchor(filePath) !== null);
  });
}
function findContentAnchor(filePaths) {
  const parsed = filePaths.map(splitArchivePath).filter((segments) => segments.length > 0);
  if (parsed.length === 0) return null;
  const at = (segments, index) => segments.length > index + 1 && CONTENT_MARKERS.has(segments[index].toLowerCase());
  if (parsed.some((segments) => at(segments, 0)) && parsed.every((segments) => segments.length === 1 || CONTENT_MARKERS.has(segments[0].toLowerCase()))) {
    return 0;
  }
  const top = parsed[0][0].toLowerCase();
  if (parsed.every((segments) => segments[0].toLowerCase() === top) && parsed.every((segments) => segments.length >= 2) && parsed.some((segments) => at(segments, 1))) {
    return 1;
  }
  return null;
}
function findPaksAnchor(files) {
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isPakLike(filePath)) continue;
    const idx = findSegment(filePath, "Paks");
    if (idx < 0) continue;
    const segments = splitArchivePath(filePath);
    if (segments.some((segment) => segment.toLowerCase() === "~mods")) continue;
    if (segments.some((segment) => segment.toLowerCase() === "logicmods")) continue;
    return idx;
  }
  return null;
}
function findMarkerDir(files, predicate) {
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files) || !predicate(filePath)) continue;
    return splitArchivePath(filePath).slice(0, -1);
  }
  return null;
}
function isReShadeIni(filePath) {
  return archiveBaseName(filePath).toLowerCase() === "reshade.ini";
}
function isUeConfigIni(filePath) {
  return UE_CONFIG_INI_NAMES.includes(archiveBaseName(filePath).toLowerCase());
}
function isLoosePresetIni(filePath) {
  return archiveExtName(filePath) === ".ini" && !isReShadeIni(filePath) && !isUeConfigIni(filePath);
}
function filesUnderRoot(files, rootSegments) {
  const result = [];
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files)) continue;
    const segments = splitArchivePath(filePath);
    const inRoot = rootSegments.every(
      (segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase()
    );
    if (!inRoot) continue;
    const relative = segments.slice(rootSegments.length).join("/");
    if (!relative) continue;
    result.push({ source: file, relative });
  }
  return result;
}
function deploySubtree(files, rootSegments, placeAt) {
  return filesUnderRoot(files, rootSegments).map(({ source, relative }) => ({
    type: "copy",
    source,
    destination: archiveJoin(placeAt, relative)
  }));
}
function testUe4ss(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isGameRelativeLayout(files) && isLoaderLayout(files)
  );
}
function testCombo(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isLoaderLayout(files) && !isGameRelativeLayout(files) && hasInstallablePak(files) && findUe4ssModRoot(files) !== null
  );
}
function testLogic(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isLoaderLayout(files) && !isGameRelativeLayout(files) && findLogicAnchor(files) !== null
  );
}
function testScript(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isLoaderLayout(files) && !isGameRelativeLayout(files) && findUe4ssModRoot(files, SCRIPT_MARKER) !== null
  );
}
function testDll(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isLoaderLayout(files) && !isGameRelativeLayout(files) && findUe4ssModRoot(files, DLL_MARKER) !== null
  );
}
function testUe4ssFolder(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (findUe4ssModRoot(files) !== null) return testResult(false);
  if (hasInstallablePak(files)) return testResult(false);
  const anchor = findMarkerDir(files, (filePath) => archiveBaseName(filePath).toLowerCase() === ENABLED_FILE.toLowerCase());
  return testResult(anchor !== null && anchor.length > 0);
}
function testLua(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (findUe4ssModRoot(files) !== null || hasInstallablePak(files)) return testResult(false);
  if (hasBaseName(files, ENABLED_FILE)) return testResult(false);
  return testResult(findMarkerDir(files, (filePath) => archiveExtName(filePath) === ".lua") !== null);
}
function testContent(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  const paths = collectEntries(files).map((entry) => entry.file);
  return testResult(findContentAnchor(paths) !== null);
}
function testPakAlt(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (!hasInstallablePak(files)) return testResult(false);
  if (findLogicAnchor(files) !== null) return testResult(false);
  return testResult(findPaksAnchor(files) !== null);
}
function testPak(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (!hasInstallablePak(files)) return testResult(false);
  if (findLogicAnchor(files) !== null) return testResult(false);
  if (findPaksAnchor(files) !== null) return testResult(false);
  const paths = collectEntries(files).map((entry) => entry.file);
  if (findContentAnchor(paths) !== null) return testResult(false);
  if (findUe4ssModRoot(files) !== null) return testResult(false);
  if (hasBaseName(files, ENABLED_FILE)) return testResult(false);
  return testResult(true);
}
function testReshade(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (hasInstallablePak(files)) return testResult(false);
  return testResult(hasBaseName(files, "ReShade.ini"));
}
function testPreset(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (hasInstallablePak(files) || hasBaseName(files, ENABLED_FILE)) return testResult(false);
  if (hasBaseName(files, "ReShade.ini")) return testResult(false);
  if (findUe4ssModRoot(files) !== null) return testResult(false);
  return testResult(findMarkerDir(files, isLoosePresetIni) !== null);
}
function testBinaryDll(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files) || isLoaderLayout(files)) return testResult(false);
  if (isGameRelativeLayout(files)) return testResult(false);
  if (hasInstallablePak(files) || hasBaseName(files, ENABLED_FILE)) return testResult(false);
  if (findUe4ssModRoot(files) !== null) return testResult(false);
  const hasReshade = hasBaseName(files, "ReShade.ini");
  if (hasReshade) return testResult(false);
  const paths = collectEntries(files).map((entry) => entry.file);
  if (findContentAnchor(paths) !== null) return testResult(false);
  return testResult(findMarkerDir(files, (filePath) => archiveExtName(filePath) === ".dll") !== null);
}
function testRoot(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files)) return testResult(false);
  return testResult(isGameRelativeLayout(files));
}
function testUe4ssFolderOrLua(files, gameId) {
  const folder = testUe4ssFolder(files, gameId);
  return folder.supported ? folder : testLua(files, gameId);
}
function installUe4ssFolderOrLua(files, stagingPath) {
  return testUe4ssFolder(files, GAME_ID).supported ? installUe4ssFolder(files, stagingPath) : installLua(files, stagingPath);
}
function testBinaries(files, gameId) {
  const reshade = testReshade(files, gameId);
  if (reshade.supported) return reshade;
  const preset = testPreset(files, gameId);
  if (preset.supported) return preset;
  return testBinaryDll(files, gameId);
}
function installBinaries(files) {
  if (testReshade(files, GAME_ID).supported) return installReshade(files);
  if (testPreset(files, GAME_ID).supported) return installPreset(files);
  return installBinaryDll(files);
}
function readTextSettings(context, sourcePath, encoding = "utf8") {
  return context.api.util.fs.readFile(sourcePath, { encoding });
}
async function rewriteSettings(context, file, stagingPath, options, destination) {
  try {
    const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile);
    const data = String(await readTextSettings(context, sourcePath));
    return {
      type: "generatefile",
      data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gim, "bUseUObjectArrayCache = false"),
      destination
    };
  } catch {
    return { type: "copy", source: file, destination };
  }
}
async function installUe4ss(context, files, stagingPath, options) {
  const anchor = findLoaderAnchor(files);
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS };
  const instructions = [];
  for (const { source, relative } of filesUnderRoot(files, anchor.rootSegments)) {
    const lowerRelative = relative.toLowerCase();
    if (isProxyDll(relative) && !lowerRelative.includes("/")) {
      instructions.push({ type: "copy", source, destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative)) });
      continue;
    }
    if (lowerRelative.startsWith("ue4ss/")) {
      const insideUe4ss = relative.slice("ue4ss/".length);
      const destination = archiveJoin(BINARIES_PATH, "ue4ss", insideUe4ss);
      if (insideUe4ss.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
        instructions.push(await rewriteSettings(context, source, stagingPath, options, destination));
        continue;
      }
      if (insideUe4ss.toLowerCase() === `mods/${MODS_FILE.toLowerCase()}`) {
        instructions.push({
          type: "copy",
          source,
          destination: archiveJoin(BINARIES_PATH, "ue4ss", "Mods", MODS_FILE_BACKUP)
        });
        continue;
      }
      instructions.push({ type: "copy", source, destination });
      continue;
    }
    if (isSettingsFile(relative) && !lowerRelative.includes("/")) {
      instructions.push(await rewriteSettings(context, source, stagingPath, options, archiveJoin(BINARIES_PATH, UE4SS_SETTINGS)));
      continue;
    }
    if (DLL_EXTENSIONS.includes(archiveExtName(relative)) && !lowerRelative.includes("/")) {
      instructions.push({ type: "copy", source, destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative)) });
      continue;
    }
    if (!relative.endsWith("/")) {
      instructions.push({ type: "copy", source, destination: archiveJoin(BINARIES_PATH, relative) });
    }
  }
  return { instructions, modType: MOD_TYPE_UE4SS };
}
function installCombo(context, files, stagingPath) {
  const instructions = [];
  const pakGroups = groupPaks(files);
  for (const instruction of installLogic(files).instructions) pushUnique(instructions, instruction);
  for (const group of pakGroups) {
    if (group.logicRoot) continue;
    for (const instruction of pakInstructions(group)) pushUnique(instructions, instruction);
  }
  const modInstall = installUe4ssMod(files, stagingPath, MOD_TYPE_COMBO);
  for (const instruction of modInstall.instructions) {
    if (instruction.type === "attribute") continue;
    pushUnique(instructions, instruction);
  }
  if (instructions.length > 0) {
    instructions.unshift({
      type: "attribute",
      key: "phantomBladeZeroPakFiles",
      value: pakGroups.map((group) => group.baseName)
    });
  }
  return { instructions, modType: MOD_TYPE_COMBO };
}
function installLogic(files) {
  const instructions = [];
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files)) continue;
    const idx = findSegment(filePath, "LogicMods");
    if (idx < 0) continue;
    const relative = splitArchivePath(filePath).slice(idx + 1).join("/");
    if (!relative) continue;
    pushUnique(instructions, {
      type: "copy",
      source: file,
      destination: archiveJoin(LOGIC_MODS_PATH, relative)
    });
  }
  return { instructions, modType: MOD_TYPE_LOGIC };
}
function installUe4ssMod(files, stagingPath, modType) {
  const roots = collectUe4ssModRoots(files);
  if (roots.length === 0) return { instructions: [], modType };
  if (roots.length > 1) {
    const names = roots.map((root2) => splitModRoot(root2).folderId || "<archive root>").join(", ");
    throw new Error(
      `Phantom Blade Zero: the archive contains ${roots.length} UE4SS mods (${names}); install them one at a time so their folders stay separate`
    );
  }
  const root = roots[0];
  const { prefixLength, folderId: detectedFolder } = splitModRoot(root);
  const folderId = detectedFolder || fallbackFolderId(stagingPath);
  const instructions = [
    { type: "attribute", key: "phantomBladeZeroUe4ssFolderId", value: folderId }
  ];
  let hasEnabledFile = false;
  const gameAnchorIndex = findRootAnchor(root.join("/"))?.anchorIndex ?? null;
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files)) continue;
    if (isPakLike(filePath)) continue;
    const segments = splitArchivePath(filePath);
    const inRoot = root.slice(0, prefixLength).every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase());
    if (!inRoot) continue;
    let destination = null;
    const ue4ssModsIndex = segments.findIndex((segment, index) => segment.toLowerCase() === "ue4ss" && segments[index + 1]?.toLowerCase() === "mods");
    if (ue4ssModsIndex >= 0 && segments.length > ue4ssModsIndex + 2) {
      const relativePath = segments.slice(ue4ssModsIndex + 2).join("/");
      if (relativePath) destination = archiveJoin(UE4SS_MODS_PATH, relativePath);
    }
    if (!destination && gameAnchorIndex !== null) {
      destination = segments.slice(gameAnchorIndex).join("/");
    }
    if (!destination) {
      const relativePath = segments.slice(prefixLength).join("/");
      if (!relativePath) continue;
      destination = archiveJoin(UE4SS_MODS_PATH, folderId, relativePath);
    }
    if (archiveBaseName(filePath).toLowerCase() === ENABLED_FILE.toLowerCase()) hasEnabledFile = true;
    pushUnique(instructions, { type: "copy", source: file, destination });
  }
  if (!hasEnabledFile && instructions.some((instruction) => instruction.type === "copy")) {
    const firstCopy = instructions.find((instruction) => instruction.type === "copy");
    const destination = String(firstCopy?.destination ?? "");
    const enabledFolder = destination.toLowerCase().startsWith(UE4SS_MODS_PATH.toLowerCase()) ? destination.split("/").slice(0, UE4SS_MODS_PATH.split("/").length + 1).join("/") : archiveJoin(UE4SS_MODS_PATH, folderId);
    instructions.push({
      type: "generatefile",
      data: "",
      destination: archiveJoin(enabledFolder, ENABLED_FILE)
    });
  }
  return { instructions, modType };
}
function installScript(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, MOD_TYPE_SCRIPT);
}
function installDll(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, MOD_TYPE_DLL);
}
function installUe4ssFolder(files, stagingPath) {
  const anchor = findMarkerDir(files, (filePath) => archiveBaseName(filePath).toLowerCase() === ENABLED_FILE.toLowerCase());
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS_FOLDER };
  const folderId = anchor[anchor.length - 1] || fallbackFolderId(stagingPath);
  const instructions = [
    { type: "attribute", key: "phantomBladeZeroUe4ssFolderId", value: folderId },
    ...deploySubtree(files, anchor, archiveJoin(UE4SS_MODS_PATH, folderId))
  ];
  return { instructions, modType: MOD_TYPE_UE4SS_FOLDER };
}
function installLua(files, stagingPath) {
  const anchor = findMarkerDir(files, (filePath) => archiveExtName(filePath) === ".lua");
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS_FOLDER };
  const folderId = anchor.length > 0 ? anchor[anchor.length - 1] : fallbackFolderId(stagingPath);
  const rootSegments = anchor.length > 0 ? anchor : [];
  const instructions = [
    { type: "attribute", key: "phantomBladeZeroUe4ssFolderId", value: folderId },
    ...deploySubtree(files, rootSegments, archiveJoin(UE4SS_MODS_PATH, folderId)),
    {
      type: "generatefile",
      data: "",
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, ENABLED_FILE)
    }
  ];
  return { instructions, modType: MOD_TYPE_UE4SS_FOLDER };
}
function installContent(files) {
  const paths = collectEntries(files).map((entry) => entry.file);
  const anchor = findContentAnchor(paths);
  if (anchor === null) return { instructions: [], modType: MOD_TYPE_CONTENT };
  const instructions = [];
  for (const { source, file } of collectEntries(files)) {
    const segments = splitArchivePath(file);
    const relativePath = segments.slice(anchor).join("/");
    if (!relativePath) continue;
    pushUnique(instructions, {
      type: "copy",
      source,
      destination: archiveJoin(GAME_FOLDER, relativePath)
    });
  }
  return { instructions, modType: MOD_TYPE_CONTENT };
}
function installPakAlt(files) {
  const anchor = findPaksAnchor(files);
  if (anchor === null) return { instructions: [], modType: MOD_TYPE_PAK_ALT };
  const instructions = [];
  for (const { source, file } of collectEntries(files)) {
    const segments = splitArchivePath(file);
    if (segments.length <= anchor) continue;
    const relativePath = segments.slice(anchor).join("/");
    pushUnique(instructions, {
      type: "copy",
      source,
      destination: archiveJoin(GAME_FOLDER, "Content", relativePath)
    });
  }
  return { instructions, modType: MOD_TYPE_PAK_ALT };
}
function installPak(context, files) {
  const groups = groupPaks(files);
  const instructions = [];
  for (const group of groups) {
    for (const instruction of pakInstructions(group)) pushUnique(instructions, instruction);
  }
  if (instructions.length > 0) {
    instructions.unshift({
      type: "attribute",
      key: "phantomBladeZeroPakFiles",
      value: groups.map((group) => group.baseName)
    });
  }
  return { instructions, modType: MOD_TYPE_PAK };
}
function installIntoBinaries(files, anchor, modType) {
  if (!anchor) return { instructions: [], modType };
  return {
    instructions: deploySubtree(files, anchor, BINARIES_PATH),
    modType
  };
}
function installReshade(files) {
  return installIntoBinaries(files, findMarkerDir(files, isReShadeIni), MOD_TYPE_BINARIES);
}
function installPreset(files) {
  return installIntoBinaries(files, findMarkerDir(files, isLoosePresetIni), MOD_TYPE_BINARIES);
}
function installBinaryDll(files) {
  const anchors = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files) || archiveExtName(filePath) !== ".dll") continue;
    const dir = splitArchivePath(filePath).slice(0, -1);
    const key = dir.map((part) => part.toLowerCase()).join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    anchors.push(dir);
  }
  const instructions = [];
  for (const anchor of anchors) {
    for (const instruction of deploySubtree(files, anchor, BINARIES_PATH)) pushUnique(instructions, instruction);
  }
  return { instructions, modType: MOD_TYPE_BINARIES };
}
function installRoot(files) {
  const instructions = [];
  for (const { source, file } of collectEntries(files)) {
    const anchor = findRootAnchor(file);
    if (!anchor) continue;
    const destination = splitArchivePath(file).slice(anchor.anchorIndex).join("/");
    pushUnique(instructions, { type: "copy", source, destination });
  }
  return { instructions, modType: MOD_TYPE_ROOT };
}

// extensions/PhantomBladeZero/src/policy.ts
var MUTABLE_UE4SS_FILES = /* @__PURE__ */ new Set([
  `${BINARIES_PATH}/ue4ss/${UE4SS_SETTINGS}`.toLowerCase(),
  `${BINARIES_PATH}/ue4ss/Mods/${MODS_FILE_BACKUP}`.toLowerCase()
]);
function normalizeDestination(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}
function applyMutableFilePolicies(result) {
  if (!result || !Array.isArray(result.instructions)) return result;
  return {
    ...result,
    instructions: result.instructions.map((instruction) => {
      if (!instruction || !MUTABLE_UE4SS_FILES.has(normalizeDestination(instruction.destination))) return instruction;
      return { ...instruction, verification: "exists", conflictPolicy: "overwrite" };
    })
  };
}

// extensions/PhantomBladeZero/src/modTypes.ts
function isPhantomBladeZero(gameId) {
  return Number(gameId) === GAME_ID;
}
function filesFromLocalInfo(input) {
  if (Array.isArray(input)) return input.map(String);
  const value = input;
  return Array.isArray(value?.files) ? value.files.map(String) : [];
}
function register(context, typeId, priority, name, installerPriority, test, install) {
  context.registerModType(
    typeId,
    priority,
    isPhantomBladeZero,
    () => "{gamePath}",
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name }
  );
  context.registerInstaller(typeId, installerPriority, test, async (...args) => applyMutableFilePolicies(await install(...args)));
}
function registerPhantomBladeZeroModTypes(context) {
  register(
    context,
    MOD_TYPE_UE4SS,
    MOD_TYPE_PRIORITY.ue4ss,
    "UE4SS for Phantom Blade Zero",
    INSTALLER_PRIORITY.ue4ss,
    testUe4ss,
    (files, stagingPath, options) => installUe4ss(context, files, stagingPath, options)
  );
  register(
    context,
    MOD_TYPE_COMBO,
    MOD_TYPE_PRIORITY.combo,
    "UE4SS Script + Pak Combo",
    INSTALLER_PRIORITY.combo,
    testCombo,
    (files, stagingPath) => installCombo(context, files, stagingPath)
  );
  register(
    context,
    MOD_TYPE_LOGIC,
    MOD_TYPE_PRIORITY.logic,
    "UE4SS LogicMod",
    INSTALLER_PRIORITY.logic,
    testLogic,
    installLogic
  );
  register(
    context,
    MOD_TYPE_SCRIPT,
    MOD_TYPE_PRIORITY.script,
    "UE4SS Script Mod",
    INSTALLER_PRIORITY.script,
    testScript,
    (files, stagingPath) => installScript(files, stagingPath)
  );
  register(
    context,
    MOD_TYPE_DLL,
    MOD_TYPE_PRIORITY.dll,
    "UE4SS DLL Mod",
    INSTALLER_PRIORITY.dll,
    testDll,
    (files, stagingPath) => installDll(files, stagingPath)
  );
  register(
    context,
    MOD_TYPE_UE4SS_FOLDER,
    MOD_TYPE_PRIORITY.ue4ssFolder,
    "UE4SS Mod Folder (enabled.txt / bare Lua)",
    INSTALLER_PRIORITY.ue4ssFolder,
    testUe4ssFolderOrLua,
    (files, stagingPath) => installUe4ssFolderOrLua(files, stagingPath)
  );
  register(
    context,
    MOD_TYPE_CONTENT,
    MOD_TYPE_PRIORITY.content,
    "Project Content Folder",
    INSTALLER_PRIORITY.content,
    testContent,
    installContent
  );
  register(
    context,
    MOD_TYPE_PAK_ALT,
    MOD_TYPE_PRIORITY.pakAlt,
    "UE5 Pak Mod (Paks folder)",
    INSTALLER_PRIORITY.pakAlt,
    testPakAlt,
    installPakAlt
  );
  register(
    context,
    MOD_TYPE_PAK,
    MOD_TYPE_PRIORITY.pak,
    "UE5 Pak Mod",
    INSTALLER_PRIORITY.pak,
    testPak,
    (files) => installPak(context, files)
  );
  register(
    context,
    MOD_TYPE_BINARIES,
    MOD_TYPE_PRIORITY.binaries,
    "Binaries (ReShade / DLL plugins)",
    INSTALLER_PRIORITY.binaries,
    testBinaries,
    installBinaries
  );
  register(
    context,
    MOD_TYPE_ROOT,
    MOD_TYPE_PRIORITY.root,
    "Root Game Folder Mod",
    INSTALLER_PRIORITY.root,
    testRoot,
    installRoot
  );
}

// extensions/PhantomBladeZero/src/requirements.ts
async function fileExists(context, filePath) {
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return Boolean(stat?.isFile);
  } catch {
    return false;
  }
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function getRequirementItems() {
  return [
    {
      key: "phantom-blade-zero-ue4ss",
      name: "UE4SS (Phantom Blade Zero build)",
      modId: UE4SS_REQUIREMENT_MOD_ID,
      mod_id: UE4SS_REQUIREMENT_MOD_ID,
      modType: MOD_TYPE_UE4SS,
      openModDetailDialog: false,
      requirement: "enabled"
    }
  ];
}
function getLocalModFeatures() {
  return [
    {
      modId: Number(UE4SS_REQUIREMENT_MOD_ID),
      marked: true,
      mark: { type: "prerequisite", label: "\u524D\u7F6E\u6A21\u7EC4" }
    }
  ];
}
function getUe4ssPaths(context, gamePath) {
  const join = context.api.util.path.join;
  const binaries = gamePath ? join(gamePath, ...BINARIES_PATH.split("/")) : "";
  return {
    binaries,
    proxies: gamePath ? UE4SS_PROXY_DLLS.map((proxy) => join(binaries, proxy)) : [],
    runtime: gamePath ? [join(binaries, "ue4ss", UE4SS_DLL), join(binaries, UE4SS_DLL)] : []
  };
}
function getSetupDirectories(context, gamePath) {
  if (!gamePath) return [];
  const join = context.api.util.path.join;
  return [PAK_MODS_PATH, LOGIC_MODS_PATH, UE4SS_MODS_PATH].map(
    (relative) => join(gamePath, ...relative.split("/"))
  );
}
async function ensureSetupDirectories(context, gamePath) {
  const fs = require("fs");
  for (const directory of getSetupDirectories(context, String(gamePath || ""))) {
    try {
      await fs.promises.mkdir(directory, { recursive: true });
    } catch {
    }
  }
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const paths = getUe4ssPaths(context, resolvedGamePath);
  const hasProxy = (await Promise.all(paths.proxies.map((file) => fileExists(context, file)))).some(Boolean);
  const hasRuntime = (await Promise.all(paths.runtime.map((file) => fileExists(context, file)))).some(Boolean);
  const requirements = hasProxy && hasRuntime ? [] : getRequirementItems();
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
async function setupExtension(context, gamePath) {
  const resolved = String(gamePath || await findGamePath(context) || "");
  await ensureSetupDirectories(context, resolved);
  return getExtensionRequiredMods(context, resolved);
}

// extensions/PhantomBladeZero/src/index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: "PBZ",
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, "ProjectPBZ/Content/Paks"],
    setup: async (discovery) => setupExtension(context, String(discovery?.path || "")),
    localModFeatures: getLocalModFeatures(),
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "phantombladezero",
      customOpenModsPath: PAK_MODS_PATH,
      // IoStore containers (.utoc/.ucas) are memory-mapped and read back 0 bytes
      // through a symlink, which crashes the UE5 Zen loader at startup.
      supportsSymlinks: false,
      // Per-install/per-mod bookkeeping files that must never raise a conflict
      // prompt when several UE4SS mods are enabled together.
      ignoreConflicts: ["UE4SS-settings.ini", "mods.txt.original", "enabled.txt"]
    }
  });
  registerPhantomBladeZeroModTypes(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => setupExtension(context));
  return true;
}
var src_default = main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installBinaries,
  installCombo,
  installContent,
  installDll,
  installLogic,
  installLua,
  installPak,
  installPakAlt,
  installPreset,
  installReshade,
  installRoot,
  installScript,
  installUe4ss,
  installUe4ssFolder,
  testBinaries,
  testCombo,
  testContent,
  testDll,
  testLogic,
  testLua,
  testPak,
  testPakAlt,
  testPreset,
  testReshade,
  testRoot,
  testScript,
  testUe4ss,
  testUe4ssFolder
});
