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

// src/constants.ts
var STEAM_APP_ID = 553850;
var GAME_ID = STEAM_APP_ID;
var GAME_NAME = "Helldivers 2";
var EXECUTABLE = "bin/helldivers2.exe";
var DATA_ID = "helldivers2-data";
var DATA_NAME = "Game Data (.dl_bin)";
var DATA_PATH = "data/game";
var DATA_EXT = ".dl_bin";
var STREAM_ID = "helldivers2-stream";
var STREAM_NAME = "Data Stream File (.stream)";
var STREAM_PATH = "data";
var STREAM_EXT = ".stream";
var BINARIES_PATH = "bin";
var RESHADE_ID = "helldivers2-reshade";
var RESHADE_NAME = "ReShade Preset";
var PATCH_ID = "helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE";
var PATCH_NAME = "Data Patch (.patch0)";
var PATCH_PATH = "data";
var PATCH_TOKEN_RE = /patch_(\d+)/i;
var PATCH_FILE_RE = /\.patch_(\d+)$/i;
var PATCH_FILES = [
  "9ba626afa44a3aa3.patch_0",
  "9ba626afa44a3aa3.patch_0.gpu_resources",
  "9ba626afa44a3aa3.patch_0.stream"
];
var PATCH_FILE_STEMS = ["9ba626afa44a3aa3"];
var PATCH_EXTS = [".gpu_resources", ".stream"];
var PATCH_METADATA_KEY = "helldivers2PatchDeployments";
var SOUND_PATCH_ID = "helldivers2-soundpatch";
var SOUND_PATCH_NAME = "Data Sound Patch (.patch0)";
var SOUND_PATCH_EXTS = [".stream"];
var INSTALL_CANCELLED_MESSAGE = "\u5DF2\u53D6\u6D88\u5B89\u88C5";

// src/archive-utils.ts
function normalizeArchivePath(input) {
  return String(input || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/, "");
}
function isDirectoryEntry(file) {
  return /[\\/]$/.test(String(file || ""));
}
function pathParts(input) {
  return normalizeArchivePath(input).split("/").filter(Boolean);
}
function archiveBasename(input) {
  const parts = pathParts(input);
  return parts[parts.length - 1] || "";
}
function archiveDirname(input) {
  const parts = pathParts(input);
  parts.pop();
  return parts.join("/");
}
function archiveExtname(input) {
  const name = archiveBasename(input);
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}
function archiveJoin(...parts) {
  return parts.map(normalizeArchivePath).filter(Boolean).join("/");
}
function getRootRelativeDestination(file, rootPath) {
  const normalized = normalizeArchivePath(file);
  const root = normalizeArchivePath(rootPath);
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : archiveBasename(normalized);
}
function filterUnderRoot(files, rootPath) {
  const root = normalizeArchivePath(rootPath);
  return files.filter((file) => {
    const normalized = normalizeArchivePath(file);
    return !isDirectoryEntry(file) && (!root || normalized === root || normalized.startsWith(`${root}/`));
  });
}
function basenameFromPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
}
function replacePathBasename(filePath, filename) {
  return String(filePath || "").replace(/[^\\/]+$/, filename);
}
function uniqueFiles(files) {
  return Array.from(new Set(files.map(normalizeArchivePath))).filter(Boolean);
}

// src/game.ts
function isGameId(gameId) {
  return Number(gameId) === GAME_ID || String(gameId).toLowerCase() === "helldivers2";
}
function hasFomodInstaller(files) {
  return files.some((file) => {
    const parts = pathParts(file).map((part) => part.toLowerCase());
    return parts.length >= 2 && parts[parts.length - 1] === "moduleconfig.xml" && parts[parts.length - 2] === "fomod";
  });
}
function testerResult(supported) {
  return Promise.resolve({ supported, requiredFiles: [] });
}
function getTargetPath(game, target) {
  const gamePath = String(game?.gamePath || "{gamePath}").replace(/\\/g, "/").replace(/\/+$/, "");
  return `${gamePath}/${target}`;
}
function registerModType(context, typeId, priority, target, name) {
  context.registerModType(
    typeId,
    priority,
    (gameId) => isGameId(gameId),
    (game) => getTargetPath(game, target),
    () => Promise.resolve(false),
    { name }
  );
}

// src/basic-installers.ts
function testDlbin(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === DATA_EXT);
  return testerResult(supported);
}
function installDlbin(files) {
  const modFile = files.find((file) => archiveExtname(file) === DATA_EXT);
  if (!modFile) return { instructions: [], modType: DATA_ID };
  const rootPath = archiveDirname(modFile);
  const instructions = filterUnderRoot(files, rootPath).map((file) => ({
    type: "copy",
    source: file,
    destination: getRootRelativeDestination(file, rootPath)
  }));
  return { instructions, modType: DATA_ID };
}
function testStream(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === STREAM_EXT);
  return testerResult(supported);
}
function installStream(files) {
  const modFile = files.find((file) => archiveExtname(file) === STREAM_EXT);
  if (!modFile) return { instructions: [], modType: STREAM_ID };
  const rootPath = archiveDirname(modFile);
  const instructions = files.filter((file) => !isDirectoryEntry(file)).map((file) => ({
    type: "copy",
    source: file,
    destination: getRootRelativeDestination(file, rootPath)
  }));
  return { instructions, modType: STREAM_ID };
}

// src/reshade.ts
var INI_EXT = ".ini";
function testReshade(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === INI_EXT);
  return testerResult(supported);
}
function installReshade(files) {
  const preset = files.find((file) => archiveExtname(file) === INI_EXT);
  if (!preset) return { instructions: [], modType: RESHADE_ID };
  const rootPath = archiveDirname(preset);
  const instructions = filterUnderRoot(files, rootPath).map((file) => ({
    type: "copy",
    source: file,
    destination: getRootRelativeDestination(file, rootPath)
  }));
  console.log("[Helldivers2ReShadeModInstaller]", {
    preset,
    rootPath,
    files,
    instructions
  });
  return { instructions, modType: RESHADE_ID };
}

// ../../utils/shared-utils/dist/json.js
function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n" && input[i] !== "\r")
        i += 1;
      i -= 1;
      continue;
    }
    if (char === "/" && next === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/"))
        i += 1;
      if (i >= input.length)
        throw new Error("Unterminated block comment");
      i += 1;
      continue;
    }
    output += char;
  }
  return output;
}
function stripJsonTrailingCommas(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === ",") {
      let nextIndex = i + 1;
      while (nextIndex < input.length && /\s/.test(input[nextIndex]))
        nextIndex += 1;
      if (input[nextIndex] === "}" || input[nextIndex] === "]")
        continue;
    }
    output += char;
  }
  return output;
}
function formatJSONPlainText(input) {
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  return stripJsonTrailingCommas(stripJsonComments(text));
}

// src/manifest-options.ts
var nodeFs = require("fs");
function findManifestFiles(files, options) {
  return uniqueFiles(files.concat(Object.keys(options?.sourcePathByFile || {}))).filter((file) => archiveBasename(file).toLowerCase() === "manifest.json").sort((a, b) => pathParts(a).length - pathParts(b).length || normalizeArchivePath(a).localeCompare(normalizeArchivePath(b)));
}
function findSourcePath(options, archivePath) {
  const sourcePathByFile = options?.sourcePathByFile || {};
  if (sourcePathByFile[archivePath]) return String(sourcePathByFile[archivePath]);
  const normalized = normalizeArchivePath(archivePath).toLowerCase();
  const match = Object.entries(sourcePathByFile).find(([key]) => normalizeArchivePath(key).toLowerCase() === normalized);
  return match ? String(match[1]) : "";
}
async function readManifestFile(context, files, options) {
  for (const manifestArchivePath of findManifestFiles(files, options)) {
    console.log("mainfest archivePath", manifestArchivePath);
    const sourcePath = findSourcePath(options, manifestArchivePath) || (options?.stagingPath ? context.api.util.path.join(options.stagingPath, manifestArchivePath) : "");
    console.log("mainfest sourcePath", sourcePath);
    if (!sourcePath) continue;
    try {
      const text = await nodeFs.promises.readFile(sourcePath, "utf8");
      const normalizedText = formatJSONPlainText(text);
      console.log("mainfest text compact", normalizedText.replace(/\s+/g, " ").trim());
      const manifest = JSON.parse(normalizedText);
      console.log("mainfest manifest", manifest);
      const guid = String(manifest?.Guid || "").trim();
      if (!guid || !Array.isArray(manifest?.Options) || manifest.Options.length === 0) continue;
      console.log("mainfest guid", guid);
      return {
        manifest,
        rootPath: archiveDirname(manifestArchivePath),
        archivePath: normalizeArchivePath(manifestArchivePath)
      };
    } catch (error) {
      console.warn("[Helldivers2ManifestOptions] failed to read manifest.json", manifestArchivePath, error);
    }
  }
  return null;
}
function getOptionName(option, fallback) {
  return String(option?.Name || fallback);
}
function buildManifestOptionChoices(manifest) {
  const options = Array.isArray(manifest.Options) ? manifest.Options : [];
  const choices = [];
  options.forEach((option, optionIndex) => {
    const optionId = `option:${optionIndex}`;
    const subOptions = Array.isArray(option.SubOptions) ? option.SubOptions.filter(Boolean) : [];
    if (subOptions.length > 0) {
      choices.push({
        id: optionId,
        text: getOptionName(option, `Option ${optionIndex + 1}`),
        description: String(option.Description || ""),
        disabled: true,
        level: 0,
        selectMode: "none"
      });
      subOptions.forEach((subOption, subIndex) => {
        choices.push({
          id: `${optionId}:sub:${subIndex}`,
          text: getOptionName(subOption, `Sub Option ${subIndex + 1}`),
          description: String(subOption.Description || ""),
          level: 1,
          selectMode: "radio",
          groupId: optionId,
          payload: {
            kind: "suboption",
            option,
            subOption
          }
        });
      });
      return;
    }
    choices.push({
      id: optionId,
      text: getOptionName(option, `Option ${optionIndex + 1}`),
      description: String(option.Description || ""),
      level: 0,
      selectMode: "checkbox",
      payload: {
        kind: "option",
        option
      }
    });
  });
  return choices;
}
function logManifestOptions(manifestResult, choices) {
  console.log("[Helldivers2ManifestOptions] manifest", {
    archivePath: manifestResult.archivePath,
    rootPath: manifestResult.rootPath,
    guid: manifestResult.manifest.Guid,
    name: manifestResult.manifest.Name,
    description: manifestResult.manifest.Description,
    options: manifestResult.manifest.Options
  });
  console.log("[Helldivers2ManifestOptions] generated choices", choices);
}
function getManifestSelectionPayloads(responsePayload, choices) {
  const payload = responsePayload && typeof responsePayload === "object" ? responsePayload : {};
  const returnedChoices = Array.isArray(payload.choices) ? payload.choices : [];
  const fromReturned = returnedChoices.filter(
    (item) => !!item && typeof item === "object" && ["option", "suboption"].includes(String(item.kind || ""))
  );
  if (fromReturned.length > 0) return fromReturned;
  const choiceIds = Array.isArray(payload.choiceIds) ? payload.choiceIds.map((id) => String(id || "")) : [String(payload.choiceId || payload.value || payload.selected || "")];
  const byId = new Map(choices.map((choice) => [choice.id, choice.payload]));
  return choiceIds.map((id) => byId.get(id)).filter(
    (item) => !!item && typeof item === "object" && ["option", "suboption"].includes(String(item.kind || ""))
  );
}
function coerceIncludePaths(value) {
  const values = Array.isArray(value) ? value : value === void 0 || value === null ? [] : [value];
  return values.map((item) => normalizeArchivePath(String(item || ""))).filter(Boolean);
}
function filesUnderInclude(files, includePath, manifestRootPath) {
  const include = archiveJoin(manifestRootPath, includePath).replace(/\/+$/, "");
  if (!include) return [];
  return files.filter((file) => {
    const normalized = normalizeArchivePath(file);
    return !isDirectoryEntry(file) && normalized.startsWith(`${include}/`);
  });
}
async function getManifestOptionFileGroups(context, files, options) {
  const manifestCandidates = findManifestFiles(files, options);
  if (manifestCandidates.length === 0) return null;
  const manifestResult = await readManifestFile(context, files, options);
  if (!manifestResult) {
    console.log("[Helldivers2ManifestOptions] ignoring manifest candidates without install options", {
      manifestCandidates,
      hasSourcePathByFile: !!options?.sourcePathByFile,
      stagingPath: options?.stagingPath || "",
      sourcePathKeys: Object.keys(options?.sourcePathByFile || {})
    });
    return null;
  }
  const { manifest, rootPath } = manifestResult;
  const choices = buildManifestOptionChoices(manifest);
  logManifestOptions(manifestResult, choices);
  const response = await context.api.util.ui.request({
    type: "helldivers2_manifest_options",
    title: String(manifest.Name || "\u9009\u62E9\u5B89\u88C5\u5185\u5BB9"),
    content: "\u6B64mod\u5305\u542B\u591A\u4E2A\u5185\u5BB9\uFF0C\u8BF7\u9009\u62E9\u8981\u5B89\u88C5\u7684\u5185\u5BB9",
    choiceMode: "multiple",
    choices,
    confirm: { text: "\u5B89\u88C5\u9009\u4E2D\u5185\u5BB9", type: "primary" },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
  }
  const selections = getManifestSelectionPayloads(response.payload, choices);
  if (selections.length === 0) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
  }
  const groups = selections.flatMap((selection) => {
    const subOptionIncludes = selection.kind === "suboption" ? coerceIncludePaths(selection.subOption.Include) : [];
    const includePaths = selection.kind === "suboption" && subOptionIncludes.length > 0 ? subOptionIncludes : coerceIncludePaths(selection.option.Include);
    return includePaths.map((includePath) => uniqueFiles(filesUnderInclude(files, includePath, rootPath)));
  }).filter((group) => group.length > 0);
  if (groups.length === 0) {
    throw new Error("Selected Helldivers 2 manifest options did not include any installable files");
  }
  return groups;
}

// src/patch.ts
function parsePatchNumber(filename) {
  const match = archiveBasename(filename).match(PATCH_FILE_RE);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
function parsePatchTokenNumber(filename) {
  const match = PATCH_TOKEN_RE.exec(archiveBasename(filename));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
function isPatchDataFile(file) {
  return parsePatchNumber(file) !== null;
}
function getPatchFileStem(file) {
  const match = archiveBasename(file).match(/^(.+)\.patch_\d+$/i);
  return match ? match[1].toLowerCase() : null;
}
function isGraphicsPatchStem(stem) {
  return stem !== null && PATCH_FILE_STEMS.includes(stem);
}
function hasGraphicsPatchSidecarFile(files) {
  return files.some((file) => {
    const name = archiveBasename(file).toLowerCase();
    return PATCH_FILE_STEMS.some((stem) => new RegExp(`^${stem}\\.patch_\\d+\\.(gpu_resources|stream)$`, "i").test(name));
  });
}
function hasGraphicsPatchFile(files) {
  return hasGraphicsPatchSidecarFile(files) && files.some((file) => isGraphicsPatchStem(getPatchFileStem(file)));
}
function isPatchSidecarFile(file, allowedExts) {
  const name = archiveBasename(file);
  return allowedExts.includes(archiveExtname(file)) && PATCH_TOKEN_RE.test(name);
}
function isPatchManagedFile(file, allowedExts) {
  return isPatchDataFile(file) || isPatchSidecarFile(file, allowedExts);
}
function splitPatchFilename(filename) {
  const match = PATCH_TOKEN_RE.exec(filename);
  if (!match || match.index < 0) return { fileStart: filename, fileEnd: "" };
  return {
    fileStart: filename.slice(0, match.index),
    fileEnd: filename.slice(match.index + match[0].length)
  };
}
function buildPatchFilename(deployment, patchNumber) {
  return `${deployment.fileStart}patch_${patchNumber}${deployment.fileEnd}`;
}
function normalizePatchGroup(input) {
  return String(input || "").toLowerCase();
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
  return String(game?.gamePath || "");
}
async function isFile(context, filePath) {
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return !!stat.isFile;
  } catch {
    return false;
  }
}
async function readOccupiedPatchNumbers(context, fileStart) {
  const gamePath = await findGamePath(context);
  const occupied = /* @__PURE__ */ new Set();
  if (!gamePath) return occupied;
  const dataPath = context.api.util.path.join(gamePath, PATCH_PATH);
  let entries = [];
  try {
    entries = await context.api.util.fs.readdir(dataPath);
  } catch {
    return occupied;
  }
  const expectedGroup = normalizePatchGroup(fileStart);
  for (const entry of entries) {
    const number = parsePatchNumber(entry);
    if (number === null) continue;
    const currentGroup = normalizePatchGroup(splitPatchFilename(entry).fileStart);
    if (currentGroup !== expectedGroup) continue;
    const fullPath = context.api.util.path.join(dataPath, entry);
    if (!await isFile(context, fullPath)) continue;
    occupied.add(number);
  }
  return occupied;
}
var PatchNumberAllocator = class {
  constructor(context) {
    this.context = context;
  }
  occupiedByGroup = /* @__PURE__ */ new Map();
  async allocate(fileStart) {
    const group = normalizePatchGroup(fileStart);
    if (!this.occupiedByGroup.has(group)) {
      this.occupiedByGroup.set(group, await readOccupiedPatchNumbers(this.context, fileStart));
    }
    const occupied = this.occupiedByGroup.get(group) || /* @__PURE__ */ new Set();
    let nextNumber = 0;
    while (occupied.has(nextNumber)) nextNumber += 1;
    occupied.add(nextNumber);
    this.occupiedByGroup.set(group, occupied);
    return nextNumber;
  }
};
function testPatch(files, gameId) {
  return testerResult(isGameId(gameId) && hasGraphicsPatchFile(files));
}
function testSoundPatch(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => isPatchDataFile(file));
  return testerResult(supported);
}
async function chooseVariant(context, patchFile, candidates) {
  if (candidates.length <= 1) return candidates[0] || "";
  const response = await context.api.util.ui.request({
    type: "mod_choice",
    title: "\u9009\u62E9\u5B89\u88C5\u5185\u5BB9",
    content: "\u6B64mod\u5305\u542B\u591A\u4E2A\u5185\u5BB9\uFF0C\u8BF7\u9009\u62E9\u8981\u5B89\u88C5\u7684\u5185\u5BB9",
    choices: candidates.map((candidate, index) => ({
      id: candidate,
      text: candidate,
      value: index === 0
    })),
    confirm: { text: "\u786E\u5B9A", type: "primary" },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
  }
  const payload = response.payload && typeof response.payload === "object" ? response.payload : {};
  const choiceId = String(payload.choiceId ?? payload.value ?? payload.selected ?? "");
  if (candidates.includes(choiceId)) return choiceId;
  throw new Error(`Invalid variant selection for ${patchFile}`);
}
async function filterPatchVariants(context, files, allowedExts, requiredNames) {
  const requiredNameSet = requiredNames ? new Set(requiredNames) : null;
  const groups = files.reduce((acc, file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return acc;
    if (requiredNameSet && !requiredNameSet.has(name)) return acc;
    acc[name] = acc[name] ? acc[name].concat(file) : [file];
    return acc;
  }, {});
  const selected = /* @__PURE__ */ new Set();
  for (const [name, candidates] of Object.entries(groups)) {
    selected.add(await chooseVariant(context, name, candidates));
  }
  return files.filter((file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return false;
    if (!requiredNameSet) return selected.has(file);
    return !requiredNameSet.has(name) || selected.has(file);
  });
}
function selectPatchManagedFiles(files, allowedExts, requiredNames) {
  const requiredNameSet = requiredNames ? new Set(requiredNames) : null;
  return files.filter((file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return false;
    return !requiredNameSet || requiredNameSet.has(name);
  });
}
function makePatchInstruction(file, patchNumber) {
  const filename = archiveBasename(file);
  const { fileStart, fileEnd } = splitPatchFilename(filename);
  const deployedFilename = buildPatchFilename({ fileStart, fileEnd }, patchNumber);
  const deployment = {
    originalArchivePath: normalizeArchivePath(file),
    originalFilename: filename,
    tempFilename: deployedFilename,
    deployedFilename,
    fileStart,
    fileEnd,
    isPatchFile: isPatchDataFile(filename),
    patchNumber
  };
  return {
    instruction: {
      type: "copy",
      source: file,
      destination: deployedFilename
    },
    deployment
  };
}
async function makePatchItems(context, files, allocator = new PatchNumberAllocator(context)) {
  const patchNumbers = /* @__PURE__ */ new Map();
  const items = [];
  for (const file of files) {
    const filename = archiveBasename(file);
    const { fileStart } = splitPatchFilename(filename);
    const group = normalizePatchGroup(fileStart);
    if (!patchNumbers.has(group)) {
      patchNumbers.set(group, await allocator.allocate(fileStart));
    }
    items.push(makePatchInstruction(file, patchNumbers.get(group) || 0));
  }
  return items;
}
async function makePatchItemsFromGroups(context, groups, allowedExts, requiredNames) {
  const allocator = new PatchNumberAllocator(context);
  const allItems = [];
  for (const group of groups) {
    const selected = selectPatchManagedFiles(group, allowedExts, requiredNames);
    const items = await makePatchItems(context, selected, allocator);
    allItems.push(...items);
  }
  return allItems;
}
async function installPatchMulti(context, files, options) {
  const optionGroups = await getManifestOptionFileGroups(context, files, options);
  const items = optionGroups ? await makePatchItemsFromGroups(context, optionGroups, PATCH_EXTS, PATCH_FILES) : await makePatchItems(context, await filterPatchVariants(context, files, PATCH_EXTS, PATCH_FILES));
  const instructions = items.map((item) => item.instruction);
  instructions.push({
    type: "attribute",
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment)
  });
  return { instructions, modType: PATCH_ID };
}
async function installSoundPatchMulti(context, files, options) {
  const optionGroups = await getManifestOptionFileGroups(context, files, options);
  const items = optionGroups ? await makePatchItemsFromGroups(context, optionGroups, SOUND_PATCH_EXTS) : await makePatchItems(context, (await filterPatchVariants(context, files, SOUND_PATCH_EXTS)).filter((file) => !isDirectoryEntry(file)));
  const instructions = items.map((item) => item.instruction);
  instructions.push({
    type: "attribute",
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment)
  });
  return { instructions, modType: SOUND_PATCH_ID };
}
function buildPatchNumberExtensions() {
  const out = [".gpu_resources", ".stream"];
  for (let i = 0; i <= 99; i += 1) out.push(`.patch_${i}`);
  return out;
}
function getPatchDeployments(entry) {
  return Array.isArray(entry?.metaInfo?.[PATCH_METADATA_KEY]) ? entry.metaInfo[PATCH_METADATA_KEY] : [];
}
function hasPatchDeploymentMetadata(entry) {
  return getPatchDeployments(entry).length > 0;
}
function isPatchDeploymentFile(deployment) {
  if (deployment.isPatchFile === true) return true;
  if (deployment.isPatchFile === false) return false;
  return deployment.fileEnd === "" && parsePatchNumber(deployment.originalFilename || deployment.deployedFilename) !== null;
}
function hasMissingPatchDeployments(mutation) {
  const entries = Array.isArray(mutation?.entries) ? mutation.entries : [];
  return entries.some((entry) => entry?.exists === false && hasPatchDeploymentMetadata(entry));
}
function maybeAdoptMissingPatchDeployment(mutation, entry) {
  if (entry?.exists !== false) return entry;
  if (typeof mutation?.adoptDeployment !== "function") return null;
  const candidates = (Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : []).filter(
    (file) => file?.managed !== true && entry?.expectedHash && file?.hash === entry.expectedHash
  );
  if (candidates.length !== 1) {
    mutation?.warn?.("Helldivers 2 patch normalize skipped a missing managed patch because no unique same-hash candidate was found.", {
      target: entry?.targetPath,
      candidates: candidates.length
    });
    return null;
  }
  const candidate = candidates[0];
  mutation.adoptDeployment({
    modKey: entry.modKey,
    from: entry.targetPath,
    to: candidate.targetPath,
    expectedHash: entry.expectedHash
  });
  return {
    ...entry,
    targetPath: candidate.targetPath,
    absolutePath: candidate.absolutePath || candidate.targetPath,
    exists: true
  };
}
function getPatchSortNumber(entries, group) {
  let best = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const currentName = basenameFromPath(entry?.targetPath || entry?.absolutePath || "");
    const currentShape = splitPatchFilename(currentName);
    if (normalizePatchGroup(currentShape.fileStart) !== group) continue;
    const current = parsePatchNumber(currentName);
    if (current !== null) best = Math.min(best, current);
    for (const deployment of getPatchDeployments(entry)) {
      if (!isPatchDeploymentFile(deployment)) continue;
      if (normalizePatchGroup(deployment.fileStart) !== group) continue;
      if (typeof deployment.patchNumber === "number") best = Math.min(best, deployment.patchNumber);
    }
  }
  return best;
}
function getUnmanagedPatchNumbers(mutation, group) {
  const occupied = /* @__PURE__ */ new Set();
  const gameFiles = Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : [];
  for (const file of gameFiles) {
    if (file?.managed === true) continue;
    const name = basenameFromPath(file?.targetPath || file?.absolutePath || "");
    const number = parsePatchNumber(name);
    if (number === null) continue;
    if (normalizePatchGroup(splitPatchFilename(name).fileStart) !== group) continue;
    occupied.add(number);
  }
  return occupied;
}
function getBlockedManagedPatchNumbers(mutation, normalizingModKeys, group) {
  const occupied = /* @__PURE__ */ new Set();
  const entries = Array.isArray(mutation?.entries) ? mutation.entries : [];
  for (const entry of entries) {
    const modKey = String(entry?.modKey || "");
    if (normalizingModKeys.has(modKey)) continue;
    const name = basenameFromPath(entry?.targetPath || entry?.absolutePath || "");
    const number = parsePatchNumber(name);
    if (number === null) continue;
    if (normalizePatchGroup(splitPatchFilename(name).fileStart) !== group) continue;
    occupied.add(number);
  }
  return occupied;
}
function samePatchShape(a, b) {
  return normalizePatchGroup(a.fileStart) === normalizePatchGroup(b.fileStart) && a.fileEnd.toLowerCase() === b.fileEnd.toLowerCase();
}
function findPatchDeploymentForCurrentFile(deployments, currentName) {
  const direct = deployments.find(
    (item) => item.deployedFilename === currentName || item.tempFilename === currentName || item.originalFilename === currentName
  );
  if (direct) return direct;
  const currentShape = splitPatchFilename(currentName);
  return deployments.find((item) => samePatchShape(item, currentShape));
}
function updatePatchDeploymentMetadata(deployments, deploymentToUpdate, deployedFilename, patchNumber) {
  return deployments.map((item) => {
    if (!samePatchShape(item, deploymentToUpdate)) return item;
    return {
      ...item,
      deployedFilename,
      patchNumber
    };
  });
}
function normalizePatchDeployments(mutation) {
  const entries = Array.isArray(mutation?.entries) ? mutation.entries : [];
  const patchEntries = entries.filter(hasPatchDeploymentMetadata).map((entry) => maybeAdoptMissingPatchDeployment(mutation, entry)).filter(Boolean);
  const moveRecords = [];
  const metadataStateByModKey = /* @__PURE__ */ new Map();
  const recordsByGroup = {};
  for (const entry of patchEntries) {
    const modKey = String(entry.modKey || "");
    const deployments = getPatchDeployments(entry);
    if (!metadataStateByModKey.has(modKey)) metadataStateByModKey.set(modKey, deployments);
    const currentName = basenameFromPath(entry.targetPath);
    const deployment = findPatchDeploymentForCurrentFile(deployments, currentName);
    if (!deployment) continue;
    const group = normalizePatchGroup(deployment.fileStart);
    if (!group) continue;
    const record = {
      entry,
      modKey,
      deployment,
      currentName,
      currentPatchNumber: parsePatchTokenNumber(currentName) ?? Number.MAX_SAFE_INTEGER
    };
    recordsByGroup[group] = recordsByGroup[group] ? recordsByGroup[group].concat(record) : [record];
  }
  for (const [group, groupRecords] of Object.entries(recordsByGroup)) {
    const entriesByModKey = groupRecords.reduce((acc, record) => {
      acc[record.modKey] = acc[record.modKey] ? acc[record.modKey].concat(record.entry) : [record.entry];
      return acc;
    }, {});
    const modKeys = Object.keys(entriesByModKey).sort((a, b) => {
      const diff = getPatchSortNumber(entriesByModKey[a], group) - getPatchSortNumber(entriesByModKey[b], group);
      return diff || a.localeCompare(b);
    });
    const normalizingModKeys = new Set(modKeys);
    const occupiedNumbers = /* @__PURE__ */ new Set([
      ...getUnmanagedPatchNumbers(mutation, group),
      ...getBlockedManagedPatchNumbers(mutation, normalizingModKeys, group)
    ]);
    const assigned = /* @__PURE__ */ new Map();
    let nextNumber = 0;
    for (const modKey of modKeys) {
      while (occupiedNumbers.has(nextNumber)) nextNumber += 1;
      assigned.set(modKey, nextNumber);
      nextNumber += 1;
    }
    for (const record of groupRecords) {
      const patchNumber = assigned.get(record.modKey);
      if (patchNumber === void 0) continue;
      const nextFilename = buildPatchFilename(record.deployment, patchNumber);
      const nextTarget = replacePathBasename(record.entry.targetPath, nextFilename);
      if (!nextTarget || nextTarget === record.entry.targetPath) continue;
      moveRecords.push({
        modKey: record.modKey,
        from: record.entry.targetPath,
        to: nextTarget,
        deployedFilename: nextFilename,
        deployment: record.deployment,
        patchNumber,
        currentPatchNumber: record.currentPatchNumber,
        expectedHash: record.entry.expectedHash
      });
    }
  }
  moveRecords.sort(
    (a, b) => a.currentPatchNumber - b.currentPatchNumber || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
  );
  for (const record of moveRecords) {
    console.log(`[Helldivers2PatchNormalize] move ${record.modKey}: ${record.from} -> ${record.to}`);
    mutation.moveDeployment({
      modKey: record.modKey,
      from: record.from,
      to: record.to,
      expectedHash: record.expectedHash
    });
    const currentMetadata = metadataStateByModKey.get(record.modKey) || [];
    const nextMetadata = updatePatchDeploymentMetadata(
      currentMetadata,
      record.deployment,
      record.deployedFilename,
      record.patchNumber
    );
    metadataStateByModKey.set(record.modKey, nextMetadata);
    mutation.setModMetadata({
      modKey: record.modKey,
      patch: { [PATCH_METADATA_KEY]: nextMetadata }
    });
  }
}
function registerPatchNormalizeHooks(context) {
  const buildOptions = (includeGameFileHashes) => ({
    includeManagedCurrentHashes: false,
    includeGameFileHashes,
    includeGameFiles: {
      directories: ["{gamePath}/data"],
      extensions: buildPatchNumberExtensions()
    }
  });
  for (const modType of [PATCH_ID, SOUND_PATCH_ID]) {
    for (const phase of ["afterEnable", "afterDisable", "afterUninstall"]) {
      context.registerManagedDeploymentHook(phase, { modType }, async () => {
        let needsHashedAdoptPass = false;
        await context.api.vfs.runManagedDeploymentMutation(buildOptions(false), (mutation) => {
          if (hasMissingPatchDeployments(mutation)) {
            needsHashedAdoptPass = true;
            return;
          }
          normalizePatchDeployments(mutation);
        });
        if (!needsHashedAdoptPass) return;
        await context.api.vfs.runManagedDeploymentMutation(buildOptions(true), normalizePatchDeployments);
      });
    }
  }
}

// index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    modPath: ".",
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
      return game?.gamePath;
    },
    queryModPath: () => ".",
    requiresCleanup: true,
    environment: {
      SteamAPPId: String(STEAM_APP_ID)
    },
    details: {
      steamAppId: STEAM_APP_ID,
      ignoreConflicts: PATCH_FILES.map((file) => `**/${file}`)
    },
    setup: async () => {
      context.api.util.ui.notify({
        type: "helldivers2_setup",
        display: "toast",
        variant: "warning",
        title: "\u5730\u72F1\u6F5C\u5175 2 \u5B89\u88C5\u63D0\u793A",
        content: "\u56FE\u50CF\u548C\u97F3\u6548 patch \u6A21\u7EC4\u4F1A\u7531\u5C0F\u9ED1\u76D2\u81EA\u52A8\u5206\u914D\u5E76\u91CD\u6392\u7F16\u53F7\uFF1B\u5982\u679C\u591A\u4E2A\u6A21\u7EC4\u4FEE\u6539\u540C\u4E00\u6E38\u620F\u8D44\u6E90\uFF0C\u4ECD\u53EF\u80FD\u6309\u6E38\u620F\u52A0\u8F7D\u987A\u5E8F\u4E92\u76F8\u8986\u76D6\u3002"
      });
    }
  });
  registerModType(context, PATCH_ID, 100, PATCH_PATH, PATCH_NAME);
  registerModType(context, SOUND_PATCH_ID, 90, PATCH_PATH, SOUND_PATCH_NAME);
  registerModType(context, DATA_ID, 80, DATA_PATH, DATA_NAME);
  registerModType(context, STREAM_ID, 70, STREAM_PATH, STREAM_NAME);
  registerModType(context, RESHADE_ID, 60, BINARIES_PATH, RESHADE_NAME);
  context.registerInstaller(PATCH_ID, 27, testPatch, (files, stagingPath, options) => installPatchMulti(context, files, {
    ...options || {},
    stagingPath: typeof stagingPath === "string" ? stagingPath : ""
  }));
  context.registerInstaller(SOUND_PATCH_ID, 27, testSoundPatch, (files, stagingPath, options) => installSoundPatchMulti(context, files, {
    ...options || {},
    stagingPath: typeof stagingPath === "string" ? stagingPath : ""
  }));
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);
  context.registerInstaller(RESHADE_ID, 32, testReshade, installReshade);
  registerPatchNormalizeHooks(context);
  return true;
}
var index_default = main;
