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
  default: () => src_default
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var GAME_ID = 1623730;
var GAME_NAME = "Palworld";
var EXECUTABLE = "Palworld.exe";
var STEAM_APP_ID = "1623730";
var UE4SS_MOD_ID = "2782";
var UNREAL_PAK_TOOL_MOD_ID = "2783";
var PAL_WIN64_PATH = "Pal/Binaries/Win64";
var UE4SS_RUNTIME_PATH = `${PAL_WIN64_PATH}/ue4ss`;
var PAK_MODS_PATH = "Pal/Content/Paks/~mods";
var BLUEPRINT_PAK_MODS_PATH = "Pal/Content/Paks/LogicMods";
var UNREAL_PAK_TOOL_PATH = "UnrealPakTool";
var UE4SS_DLL = "UE4SS.dll";
var UE4SS_DWMAPI = "dwmapi.dll";
var UE4SS_SETTINGS = "UE4SS-settings.ini";
var MODS_FILE = "mods.txt";
var MODS_FILE_BACKUP = "mods.txt.original";
var UNREAL_PAK_EXE = "UnrealPak.exe";
var PAK_EXTENSIONS = [".pak", ".utoc", ".ucas"];
var LUA_EXTENSIONS = [".lua"];
var ROOT_DIRECTORIES = ["Engine", "Pal", "Resources"];
var IGNORE_CONFLICT_FILES = ["enabled.txt", "ue4sslogicmod.info", ".ue4sslogicmod", ".logicmod"];
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_UNREAL_PAK_TOOL = `${GAME_ID}-unreal-pak-tool`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_BLUEPRINT_PAK = `${GAME_ID}-blueprint-pak`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_LUA_V2 = `${GAME_ID}-lua-v2`;
var MOD_TYPE_PRIORITY = {
  ue4ss: 130,
  unrealPakTool: 120,
  root: 115,
  blueprintPak: 110,
  luaV2: 100,
  pak: 90
};

// src/requirements.ts
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
function requirement(key, name, modId, modType) {
  return {
    key,
    name,
    modId,
    mod_id: modId,
    modType,
    openModDetailDialog: false,
    requirement: "enabled"
  };
}
function getRequirementItems() {
  return [
    requirement("palworld-ue4ss", "UE4SS", UE4SS_MOD_ID, MOD_TYPE_UE4SS),
    requirement("palworld-unreal-pak-tool", "UnrealPakTool", UNREAL_PAK_TOOL_MOD_ID, MOD_TYPE_UNREAL_PAK_TOOL)
  ];
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const path5 = context.api.util.path;
  const ue4ssDllPath = resolvedGamePath ? path5.join(resolvedGamePath, PAL_WIN64_PATH, UE4SS_DLL) : "";
  const dwmapiPath = resolvedGamePath ? path5.join(resolvedGamePath, PAL_WIN64_PATH, UE4SS_DWMAPI) : "";
  const unrealPakPath = resolvedGamePath ? path5.join(resolvedGamePath, UNREAL_PAK_TOOL_PATH, UNREAL_PAK_EXE) : "";
  const hasUe4ss = !!resolvedGamePath && await fileExists(context, ue4ssDllPath) && await fileExists(context, dwmapiPath);
  const hasUnrealPakTool = !!resolvedGamePath && await fileExists(context, unrealPakPath);
  const requirements = [];
  if (!hasUe4ss) requirements.push(getRequirementItems()[0]);
  if (!hasUnrealPakTool) requirements.push(getRequirementItems()[1]);
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

// src/paths.ts
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
function removeLeadingSegments(filePath, count) {
  return splitArchivePath(filePath).slice(count).join("/");
}
function getStagingSourcePath(file, stagingPath, sourcePathByFile) {
  const direct = sourcePathByFile?.[file];
  if (direct) return direct;
  return path.join(String(stagingPath || ""), file);
}
function stripKnownTopWrapper(files, predicate) {
  const matched = files.filter(predicate).map(splitArchivePath).filter((parts) => parts.length > 0);
  if (matched.length === 0) return 0;
  const first = matched[0];
  let common = 0;
  while (common < first.length - 1) {
    const segment = first[common];
    if (!matched.every((parts) => parts[common] === segment)) break;
    common += 1;
  }
  return common;
}

// src/ue4ss.ts
var fs = require("fs");
var path2 = require("path");
function getOverridesModsFolderPath(settings) {
  let inOverrides = false;
  for (const line of String(settings || "").split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)]\s*$/);
    if (section) {
      inOverrides = section[1].trim().toLowerCase() === "overrides";
      continue;
    }
    if (!inOverrides) continue;
    const match = line.match(/^\s*ModsFolderPath\s*=\s*(.*?)\s*$/i);
    if (match) return match[1].trim();
  }
  return void 0;
}
async function findUe4ssDllDirectory(directory) {
  const preferredDirectory = path2.join(directory, "ue4ss");
  try {
    const preferredEntries = await fs.promises.readdir(preferredDirectory, { withFileTypes: true });
    if (preferredEntries.some((entry) => entry.isFile() && entry.name.toLowerCase() === UE4SS_DLL.toLowerCase())) {
      return preferredDirectory;
    }
  } catch {
  }
  let entries;
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch {
    return void 0;
  }
  const dll = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === UE4SS_DLL.toLowerCase());
  if (dll) return directory;
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const found = await findUe4ssDllDirectory(path2.join(directory, entry.name));
    if (found) return found;
  }
  return void 0;
}
async function getUe4ssModsPath(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  if (!resolvedGamePath) return archiveJoin(UE4SS_RUNTIME_PATH, "Mods");
  const win64Path = path2.join(resolvedGamePath, PAL_WIN64_PATH);
  const dllDirectory = await findUe4ssDllDirectory(win64Path);
  if (!dllDirectory) return archiveJoin(UE4SS_RUNTIME_PATH, "Mods");
  const settingsPath = path2.join(dllDirectory, UE4SS_SETTINGS);
  try {
    const settings = await fs.promises.readFile(settingsPath, "utf8");
    const configuredPath = getOverridesModsFolderPath(settings);
    return archiveJoin(path2.relative(resolvedGamePath, dllDirectory), configuredPath || "Mods");
  } catch {
    return archiveJoin(UE4SS_RUNTIME_PATH, "Mods");
  }
}

// src/luaModsFile.ts
var path3 = require("path");
var STATE_FILE = ".heybox-palworld-lua-mods.json";
async function pathExists(filePath) {
  const fs2 = require("fs");
  try {
    await fs2.promises.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readTextIfExists(filePath) {
  const fs2 = require("fs");
  try {
    return await fs2.promises.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
async function writeText(filePath, data) {
  const fs2 = require("fs");
  await fs2.promises.mkdir(path3.dirname(filePath), { recursive: true });
  await fs2.promises.writeFile(filePath, data, "utf8");
}
async function getModsDir(context, gamePath) {
  const modsPath = await getUe4ssModsPath(context, gamePath);
  return path3.join(gamePath, ...modsPath.split("/"));
}
async function ensureModsFile(modsDir) {
  const fs2 = require("fs");
  const modsFile = path3.join(modsDir, MODS_FILE);
  const backup = path3.join(modsDir, MODS_FILE_BACKUP);
  await fs2.promises.mkdir(modsDir, { recursive: true });
  if (!await pathExists(modsFile)) {
    const backupData = await readTextIfExists(backup);
    await writeText(modsFile, backupData ?? "\r\n");
  }
  return modsFile;
}
async function readState(modsDir) {
  const statePath = path3.join(modsDir, STATE_FILE);
  const text = await readTextIfExists(statePath);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
async function writeState(modsDir, state) {
  const statePath = path3.join(modsDir, STATE_FILE);
  await writeText(statePath, `${JSON.stringify(state, null, 2)}
`);
}
async function findFolderId(context, modKey, modType) {
  let folderId = "";
  await context.api.vfs.runManagedDeploymentMutation({ modType }, (mutation) => {
    const entry = Array.isArray(mutation?.entries) ? mutation.entries.find((item) => item?.modKey === modKey && item?.metaInfo?.palworldFolderId) : null;
    folderId = String(entry?.metaInfo?.palworldFolderId || "");
  });
  return folderId;
}
async function addModsFileEntry(modsDir, folderId) {
  const modsFile = await ensureModsFile(modsDir);
  const data = await readTextIfExists(modsFile) ?? "";
  const lines = data.split(/\r?\n/).filter((line) => line.length > 0);
  const target = `${folderId} : 1`;
  if (!lines.some((line) => line.trim() === target)) {
    const insertAt = Math.max(0, lines.length - 2);
    lines.splice(insertAt, 0, target);
    await writeText(modsFile, lines.join("\r\n"));
  }
}
async function removeModsFileEntry(modsDir, folderId) {
  const modsFile = await ensureModsFile(modsDir);
  const data = await readTextIfExists(modsFile) ?? "";
  const target = `${folderId} : 1`;
  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== target);
  await writeText(modsFile, lines.join("\r\n"));
}
async function onLuaEnabled(context, modKey, modType) {
  const gamePath = await findGamePath(context);
  if (!gamePath) return;
  const modsDir = await getModsDir(context, gamePath);
  const folderId = await findFolderId(context, modKey, modType);
  if (!folderId) return;
  await addModsFileEntry(modsDir, folderId);
  const state = await readState(modsDir);
  state[modKey] = folderId;
  await writeState(modsDir, state);
}
async function onLuaRemoved(context, modKey) {
  const gamePath = await findGamePath(context);
  if (!gamePath) return;
  const modsDir = await getModsDir(context, gamePath);
  const state = await readState(modsDir);
  const folderId = state[modKey];
  if (!folderId) return;
  await removeModsFileEntry(modsDir, folderId);
  delete state[modKey];
  await writeState(modsDir, state);
}
function registerLuaModsFileHooks(context) {
  for (const modType of [MOD_TYPE_LUA_V2]) {
    context.registerManagedDeploymentHook("afterEnable", { modType }, async (payload) => {
      await onLuaEnabled(context, String(payload.modKey || ""), modType);
    });
    context.registerManagedDeploymentHook("afterDisable", { modType }, async (payload) => {
      await onLuaRemoved(context, String(payload.modKey || ""));
    });
    context.registerManagedDeploymentHook("afterUninstall", { modType }, async (payload) => {
      await onLuaRemoved(context, String(payload.modKey || ""));
    });
  }
}

// src/pak.ts
var path4 = require("path");
var BLUEPRINT_SEGMENT = "mods";
var MAX_BUFFER = 10 * 1024 * 1024;
function normalizePakPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").split("/").filter((segment) => segment && segment !== "." && segment !== "..").join("/");
}
function hasBlueprintSegment(filePath) {
  return normalizePakPath(filePath).split("/").some((segment) => segment.toLowerCase() === BLUEPRINT_SEGMENT);
}
function parsePakListOutput(logText) {
  const result = {
    mountPoint: "",
    files: [],
    modType: MOD_TYPE_PAK
  };
  let mountPointHasMods = false;
  for (const line of String(logText || "").split(/\r?\n/)) {
    if (line.startsWith("LogPakFile: Display: Mount point")) {
      const mountPoint = normalizePakPath(line.split("Mount point")[1] || "");
      result.mountPoint = mountPoint;
      mountPointHasMods = hasBlueprintSegment(mountPoint);
      if (mountPointHasMods) result.modType = MOD_TYPE_BLUEPRINT_PAK;
      continue;
    }
    if (!line.startsWith('LogPakFile: Display: "')) continue;
    const match = line.match(/"([^"]+)"/);
    if (!match?.[1]) continue;
    const fileName = normalizePakPath(match[1]);
    result.files.push(fileName);
    if (mountPointHasMods || hasBlueprintSegment(fileName)) {
      result.modType = MOD_TYPE_BLUEPRINT_PAK;
    }
  }
  return result.files.length > 0 ? result : null;
}
async function listPak(context, gamePath, pakPath) {
  const childProcess = require("child_process");
  const unrealPakExe = path4.join(gamePath, UNREAL_PAK_TOOL_PATH, UNREAL_PAK_EXE);
  return await new Promise((resolve, reject) => {
    childProcess.execFile(
      unrealPakExe,
      [pakPath, "-list"],
      { maxBuffer: MAX_BUFFER },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        resolve(parsePakListOutput(stdout));
      }
    );
  });
}

// src/installers.ts
function hasBaseName(files, name) {
  const lower = name.toLowerCase();
  return files.some((file) => archiveBaseName(file).toLowerCase() === lower);
}
function isFileLike(file) {
  return archiveBaseName(file).includes(".");
}
function isIgnoredConflictFile(file) {
  const lower = archiveBaseName(file).toLowerCase();
  return IGNORE_CONFLICT_FILES.includes(lower);
}
function hasPakFile(files) {
  return files.some((file) => PAK_EXTENSIONS.includes(archiveExtName(file)));
}
function hasLuaFile(files) {
  return files.some((file) => LUA_EXTENSIONS.includes(archiveExtName(file)));
}
function getLegacyUe4ssModsIndex(segments) {
  for (let i = 0; i < segments.length - 2; i += 1) {
    if (segments[i].toLowerCase() === "ue4ss" && segments[i + 1].toLowerCase() === "mods") return i + 1;
  }
  return -1;
}
function testUe4ss(files, gameId) {
  return {
    supported: Number(gameId) === 1623730 && hasBaseName(files, UE4SS_DLL) && hasBaseName(files, UE4SS_DWMAPI),
    requiredFiles: [UE4SS_DLL, UE4SS_DWMAPI]
  };
}
function testUnrealPakTool(files, gameId) {
  return {
    supported: Number(gameId) === 1623730 && hasBaseName(files, UNREAL_PAK_EXE),
    requiredFiles: [UNREAL_PAK_EXE]
  };
}
function testPak(files, gameId) {
  return {
    supported: Number(gameId) === 1623730 && hasPakFile(files) && !files.some(isIgnoredConflictFile),
    requiredFiles: []
  };
}
function testLua(files, gameId) {
  return {
    supported: Number(gameId) === 1623730 && hasLuaFile(files),
    requiredFiles: []
  };
}
function testRoot(files, gameId) {
  const supported = Number(gameId) === 1623730 && files.some((file) => {
    const first = splitArchivePath(file)[0] || "";
    return ROOT_DIRECTORIES.some((dir) => dir.toLowerCase() === first.toLowerCase());
  });
  return { supported, requiredFiles: [] };
}
async function installUe4ss(context, files, stagingPath, options) {
  const fs2 = context.api.util.fs;
  const wrapperSegments = stripKnownTopWrapper(files, (file) => {
    const base = archiveBaseName(file).toLowerCase();
    return [UE4SS_DLL, UE4SS_DWMAPI, UE4SS_SETTINGS].some((name) => name.toLowerCase() === base);
  });
  const instructions = [];
  for (const file of files) {
    if (!isFileLike(file)) continue;
    const relative = removeLeadingSegments(file, wrapperSegments) || archiveBaseName(file);
    const base = archiveBaseName(file);
    if (base.toLowerCase() === MODS_FILE.toLowerCase()) {
      const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile);
      const data = await fs2.readFile(sourcePath, { encoding: "utf8" });
      instructions.push({
        type: "generatefile",
        data,
        destination: archiveJoin(PAL_WIN64_PATH, "Mods", MODS_FILE_BACKUP)
      });
      continue;
    }
    if (base.toLowerCase() === UE4SS_SETTINGS.toLowerCase()) {
      const sourcePath = getStagingSourcePath(file, stagingPath, options?.sourcePathByFile);
      const data = await fs2.readFile(sourcePath, { encoding: "utf8" });
      instructions.push({
        type: "generatefile",
        data: data.replace(/bUseUObjectArrayCache\s*=\s*true/gm, "bUseUObjectArrayCache = false"),
        destination: archiveJoin(PAL_WIN64_PATH, relative)
      });
      continue;
    }
    instructions.push({
      type: "copy",
      source: file,
      destination: archiveJoin(PAL_WIN64_PATH, relative)
    });
  }
  return { instructions };
}
function installUnrealPakTool(files) {
  const wrapperSegments = stripKnownTopWrapper(files, (file) => archiveBaseName(file).toLowerCase() === UNREAL_PAK_EXE.toLowerCase());
  const instructions = files.filter(isFileLike).map((file) => {
    const relative = removeLeadingSegments(file, wrapperSegments) || archiveBaseName(file);
    const hasToolPrefix = splitArchivePath(relative)[0]?.toLowerCase() === UNREAL_PAK_TOOL_PATH.toLowerCase();
    return {
      type: "copy",
      source: file,
      destination: hasToolPrefix ? normalizeArchivePath(relative) : archiveJoin(UNREAL_PAK_TOOL_PATH, relative)
    };
  });
  return { instructions };
}
async function detectPakModType(context, files, stagingPath, options) {
  const pakFile = files.find((file) => archiveExtName(file) === ".pak");
  const gamePath = await findGamePath(context);
  if (pakFile && gamePath) {
    try {
      const sourcePath = getStagingSourcePath(pakFile, stagingPath, options?.sourcePathByFile);
      const result = await listPak(context, gamePath, sourcePath);
      return result?.modType === MOD_TYPE_BLUEPRINT_PAK ? MOD_TYPE_BLUEPRINT_PAK : MOD_TYPE_PAK;
    } catch {
    }
  }
  if (files.some((file) => splitArchivePath(file).some((segment) => segment.toLowerCase() === "logicmods"))) {
    return MOD_TYPE_BLUEPRINT_PAK;
  }
  return MOD_TYPE_PAK;
}
async function installPak(context, files, stagingPath, options) {
  const modType = await detectPakModType(context, files, stagingPath, options);
  const target = modType === MOD_TYPE_BLUEPRINT_PAK ? BLUEPRINT_PAK_MODS_PATH : PAK_MODS_PATH;
  const instructions = files.filter((file) => PAK_EXTENSIONS.includes(archiveExtName(file))).map((file) => ({
    type: "copy",
    source: file,
    destination: archiveJoin(target, archiveBaseName(file))
  }));
  return { instructions, modType };
}
function getFallbackFolderId(stagingPath) {
  const clean = String(stagingPath || "").replace(/[\\/]+$/, "");
  const leaf = clean.split(/[\\/]/).pop() || "PalworldLuaMod";
  return leaf.replace(/\.installing$/i, "") || "PalworldLuaMod";
}
function getLuaFolderId(files, stagingPath) {
  const luaFiles = files.filter((file) => LUA_EXTENSIONS.includes(archiveExtName(file))).sort((a, b) => a.length - b.length);
  const shortest = luaFiles[0] || "";
  const segments = splitArchivePath(shortest);
  const legacyModsIndex = getLegacyUe4ssModsIndex(segments);
  if (legacyModsIndex >= 0 && segments[legacyModsIndex + 1]) return segments[legacyModsIndex + 1];
  const modsIndex = segments.findIndex((segment) => segment.toLowerCase() === "mods");
  if (modsIndex >= 0 && segments[modsIndex + 1]) return segments[modsIndex + 1];
  if (segments.length > 1) return segments[0];
  return getFallbackFolderId(stagingPath);
}
async function installLua(context, files, stagingPath, modType) {
  const folderId = getLuaFolderId(files, stagingPath);
  const modsPath = await getUe4ssModsPath(context);
  const luaFiles = files.filter((file) => LUA_EXTENSIONS.includes(archiveExtName(file))).sort((a, b) => a.length - b.length);
  const shortestSegments = splitArchivePath(luaFiles[0] || "");
  const modsIndex = shortestSegments.findIndex((segment) => segment.toLowerCase() === "mods");
  const instructions = [
    { type: "attribute", key: "palworldFolderId", value: folderId }
  ];
  for (const file of files) {
    if (!isFileLike(file)) continue;
    const segments = splitArchivePath(file);
    const legacyModsIndex = getLegacyUe4ssModsIndex(segments);
    const destination = legacyModsIndex >= 0 ? archiveJoin(modsPath, segments.slice(legacyModsIndex + 1).join("/")) : modsIndex >= 0 ? archiveJoin(modsPath, segments.slice(modsIndex + 1).join("/")) : segments.length > 1 ? archiveJoin(modsPath, folderId, segments.slice(1).join("/")) : archiveJoin(modsPath, folderId, file);
    instructions.push({
      type: "copy",
      source: file,
      destination
    });
  }
  return { instructions, modType };
}
function installRoot(files) {
  const instructions = files.filter(isFileLike).map((file) => ({
    type: "copy",
    source: file,
    destination: normalizeArchivePath(file)
  }));
  return { instructions };
}

// src/modTypes.ts
function isPalworld(gameId) {
  return Number(gameId) === GAME_ID;
}
function filesFromLocalInfo(input) {
  if (Array.isArray(input)) return input;
  return Array.isArray(input?.files) ? input.files : [];
}
function gameRootTarget() {
  return "{gamePath}";
}
function registerPalworldModTypes(context) {
  context.registerModType(MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, isPalworld, gameRootTarget, (input) => {
    const files = filesFromLocalInfo(input);
    return files.some((file) => /(^|[\\/])UE4SS\.dll$/i.test(file)) && files.some((file) => /(^|[\\/])dwmapi\.dll$/i.test(file));
  }, { name: "UE4SS" });
  context.registerInstaller(MOD_TYPE_UE4SS, 10, testUe4ss, (files, stagingPath, options) => installUe4ss(context, files, stagingPath, options));
  context.registerModType(MOD_TYPE_UNREAL_PAK_TOOL, MOD_TYPE_PRIORITY.unrealPakTool, isPalworld, gameRootTarget, (input) => {
    const files = filesFromLocalInfo(input);
    return files.some((file) => /(^|[\\/])UnrealPak\.exe$/i.test(file));
  }, { name: "Unreal Pak Tool" });
  context.registerInstaller(MOD_TYPE_UNREAL_PAK_TOOL, 11, testUnrealPakTool, (files) => installUnrealPakTool(files));
  context.registerModType(MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, isPalworld, gameRootTarget, (input) => testRoot(filesFromLocalInfo(input), GAME_ID).supported, { name: "Root Mod" });
  context.registerInstaller(MOD_TYPE_ROOT, 12, testRoot, (files) => installRoot(files));
  context.registerModType(MOD_TYPE_BLUEPRINT_PAK, MOD_TYPE_PRIORITY.blueprintPak, isPalworld, gameRootTarget, (input) => hasPakFile(filesFromLocalInfo(input)), { name: "Blueprint Mod" });
  context.registerInstaller(MOD_TYPE_BLUEPRINT_PAK, 40, testPak, (files, stagingPath, options) => installPak(context, files, stagingPath, options));
  context.registerModType(MOD_TYPE_LUA_V2, MOD_TYPE_PRIORITY.luaV2, isPalworld, gameRootTarget, (input) => hasLuaFile(filesFromLocalInfo(input)), { name: "LUA Mod V2" });
  context.registerInstaller(MOD_TYPE_LUA_V2, 14, testLua, (files, stagingPath) => installLua(context, files, stagingPath, MOD_TYPE_LUA_V2));
  context.registerModType(MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, isPalworld, gameRootTarget, (input) => hasPakFile(filesFromLocalInfo(input)), { name: "Pak Mod" });
  context.registerInstaller(MOD_TYPE_PAK, 40, testPak, (files, stagingPath, options) => installPak(context, files, stagingPath, options));
}

// src/index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")),
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "palworld",
      customOpenModsPath: "Pal/Content/Paks/~mods",
      supportsSymlinks: true
    }
  });
  registerPalworldModTypes(context);
  registerLuaModsFileHooks(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var src_default = main;
