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
  installCombo: () => installCombo,
  installDll: () => installDll,
  installLogic: () => installLogic,
  installPak: () => installPak,
  installRoot: () => installRoot,
  installScript: () => installScript,
  installUe4ss: () => installUe4ss,
  testCombo: () => testCombo,
  testDll: () => testDll,
  testLogic: () => testLogic,
  testPak: () => testPak,
  testRoot: () => testRoot,
  testScript: () => testScript,
  testUe4ss: () => testUe4ss
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
var UE4SS_REQUIREMENT_MOD_ID = "128413";
var MODS_FILE = "mods.txt";
var MODS_FILE_BACKUP = "mods.txt.original";
var ENABLED_FILE = "enabled.txt";
var LUA_EXTENSIONS = [".lua"];
var DLL_EXTENSIONS = [".dll"];
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`;
var MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`;
var MOD_TYPE_COMBO = `${GAME_ID}-combo`;
var MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_PRIORITY = {
  ue4ss: 200,
  combo: 190,
  logic: 185,
  script: 180,
  dll: 175,
  pak: 170,
  root: 100
};
var INSTALLER_PRIORITY = {
  ue4ss: 1,
  combo: 10,
  logic: 11,
  script: 14,
  dll: 15,
  pak: 30,
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
function isUe4ssRuntime(files) {
  return hasBaseName(files, UE4SS_DWMAPI) && hasBaseName(files, UE4SS_DLL);
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
function findUe4ssAnchor(files) {
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || archiveBaseName(filePath).toLowerCase() !== UE4SS_DWMAPI) continue;
    const rootSegments = splitArchivePath(filePath).slice(0, -1);
    const dllSegments = [...rootSegments, "ue4ss", UE4SS_DLL];
    const hasRuntime = files.some((candidate) => {
      const candidatePath = safeArchivePath(candidate);
      if (!candidatePath) return false;
      const segments = splitArchivePath(candidatePath);
      return segments.length === dllSegments.length && dllSegments.every((segment, index) => segments[index].toLowerCase() === segment.toLowerCase());
    });
    if (hasRuntime) return { rootSegments, dwmapiFile: file };
  }
  return null;
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
function isDedicatedModLayout(filePath) {
  const segments = splitArchivePath(filePath);
  const lower = segments.map((segment) => segment.toLowerCase());
  if (lower.includes("ue4ss")) return true;
  if (lower.includes("logicmods")) return true;
  if (isPakLike(filePath) && lower.includes("projectpbz") && lower.includes("paks")) return true;
  return false;
}
function findRootAnchor(file) {
  const segments = splitArchivePath(file);
  const roots = new Set(ROOT_DIRECTORIES.map((directory) => directory.toLowerCase()));
  for (let index = 0; index < segments.length; index += 1) {
    if (roots.has(segments[index].toLowerCase())) return { anchorIndex: index };
  }
  return null;
}
function testUe4ss(files, gameId) {
  return testResult(isPbz(gameId) && !isFomodPackage(files) && findUe4ssAnchor(files) !== null);
}
function testCombo(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isUe4ssRuntime(files) && hasInstallablePak(files) && findUe4ssModRoot(files) !== null
  );
}
function testLogic(files, gameId) {
  return testResult(isPbz(gameId) && !isFomodPackage(files) && findLogicAnchor(files) !== null);
}
function testScript(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isUe4ssRuntime(files) && findUe4ssModRoot(files, SCRIPT_MARKER) !== null
  );
}
function testDll(files, gameId) {
  return testResult(
    isPbz(gameId) && !isFomodPackage(files) && !isUe4ssRuntime(files) && findUe4ssModRoot(files, DLL_MARKER) !== null
  );
}
function testPak(files, gameId) {
  const supported = isPbz(gameId) && !isFomodPackage(files) && hasInstallablePak(files) && findLogicAnchor(files) === null && findUe4ssModRoot(files) === null && !findUe4ssAnchor(files);
  return testResult(supported);
}
function testRoot(files, gameId) {
  if (!isPbz(gameId) || isFomodPackage(files)) return testResult(false);
  if (findUe4ssAnchor(files) !== null) return testResult(false);
  const anchored = files.some((file) => {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files) || isDedicatedModLayout(filePath)) return false;
    return findRootAnchor(filePath) !== null;
  });
  return testResult(anchored);
}
function readTextSettings(context, sourcePath, encoding = "utf8") {
  return context.api.util.fs.readFile(sourcePath, { encoding });
}
async function installUe4ss(context, files, stagingPath, options) {
  const anchor = findUe4ssAnchor(files);
  if (!anchor) return { instructions: [], modType: MOD_TYPE_UE4SS };
  const instructions = [];
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files)) continue;
    const segments = splitArchivePath(filePath);
    const inRoot = anchor.rootSegments.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase());
    if (!inRoot) continue;
    const relative = segments.slice(anchor.rootSegments.length).join("/");
    const lowerRelative = relative.toLowerCase();
    if (lowerRelative === UE4SS_DWMAPI.toLowerCase()) {
      instructions.push({
        type: "copy",
        source: file,
        destination: archiveJoin(BINARIES_PATH, UE4SS_DWMAPI)
      });
      continue;
    }
    if (lowerRelative.startsWith("ue4ss/")) {
      const insideUe4ss = relative.slice("ue4ss/".length);
      const destination = archiveJoin(BINARIES_PATH, "ue4ss", insideUe4ss);
      if (insideUe4ss.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
        try {
          const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile);
          const data = String(await readTextSettings(context, sourcePath));
          instructions.push({
            type: "generatefile",
            data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gim, "bUseUObjectArrayCache = false"),
            destination
          });
        } catch {
          instructions.push({ type: "copy", source: file, destination });
        }
        continue;
      }
      if (insideUe4ss.toLowerCase() === `mods/${MODS_FILE.toLowerCase()}`) {
        instructions.push({
          type: "copy",
          source: file,
          destination: archiveJoin(BINARIES_PATH, "ue4ss", "Mods", MODS_FILE_BACKUP)
        });
        continue;
      }
      instructions.push({ type: "copy", source: file, destination });
      continue;
    }
    const isRootDll = DLL_EXTENSIONS.includes(archiveExtName(relative)) && segments.length === anchor.rootSegments.length + 1;
    if (isRootDll) {
      instructions.push({
        type: "copy",
        source: file,
        destination: archiveJoin(BINARIES_PATH, archiveBaseName(relative))
      });
    }
  }
  return { instructions, modType: MOD_TYPE_UE4SS };
}
function installCombo(context, files, stagingPath) {
  const instructions = [];
  const pakGroups = groupPaks(files);
  for (const group of pakGroups) {
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
    if (!filePath || !isArchiveFile(file, files) || !isPakLike(filePath)) continue;
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
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files)) continue;
    if (isPakLike(filePath)) continue;
    const segments = splitArchivePath(filePath);
    const inRoot = root.slice(0, prefixLength).every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase());
    if (!inRoot) continue;
    const relative = segments.slice(prefixLength).join("/");
    if (!relative) continue;
    if (archiveBaseName(relative).toLowerCase() === ENABLED_FILE.toLowerCase()) hasEnabledFile = true;
    pushUnique(instructions, {
      type: "copy",
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, relative)
    });
  }
  if (!hasEnabledFile && instructions.some((instruction) => instruction.type === "copy")) {
    instructions.push({
      type: "generatefile",
      data: "",
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, ENABLED_FILE)
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
function installRoot(files) {
  const instructions = [];
  if (findUe4ssAnchor(files) !== null) return { instructions, modType: MOD_TYPE_ROOT };
  for (const file of files) {
    const filePath = safeArchivePath(file);
    if (!filePath || !isArchiveFile(file, files) || isDedicatedModLayout(filePath)) continue;
    const anchor = findRootAnchor(filePath);
    if (!anchor) continue;
    const destination = splitArchivePath(filePath).slice(anchor.anchorIndex).join("/");
    pushUnique(instructions, { type: "copy", source: file, destination });
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
    MOD_TYPE_PAK,
    MOD_TYPE_PRIORITY.pak,
    "UE5 Pak Mod",
    INSTALLER_PRIORITY.pak,
    testPak,
    (files) => installPak(context, files)
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
  const path2 = context.api.util.path;
  return {
    dwmapi: gamePath ? path2.join(gamePath, BINARIES_PATH, UE4SS_DWMAPI) : "",
    dll: gamePath ? path2.join(gamePath, BINARIES_PATH, "ue4ss", UE4SS_DLL) : ""
  };
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const paths = getUe4ssPaths(context, resolvedGamePath);
  const hasDwmapi = Boolean(resolvedGamePath) && await fileExists(context, paths.dwmapi);
  const hasUe4ssDll = Boolean(resolvedGamePath) && await fileExists(context, paths.dll);
  const requirements = hasDwmapi && hasUe4ssDll ? [] : getRequirementItems();
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

// extensions/PhantomBladeZero/src/index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: "PBZ",
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, "ProjectPBZ/Content/Paks"],
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")),
    localModFeatures: getLocalModFeatures(),
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "phantombladezero",
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: true
    }
  });
  registerPhantomBladeZeroModTypes(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var src_default = main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installCombo,
  installDll,
  installLogic,
  installPak,
  installRoot,
  installScript,
  installUe4ss,
  testCombo,
  testDll,
  testLogic,
  testPak,
  testRoot,
  testScript,
  testUe4ss
});
