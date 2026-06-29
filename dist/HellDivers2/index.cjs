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
var BINARIES_ID = "helldivers2-binaries";
var BINARIES_NAME = "Binaries (Engine Injector)";
var BINARIES_PATH = "bin";
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
var SOUND_PATCH_EXTS = [".patch_0"];
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
function hasGraphicsGpuPatchFile(files) {
  return files.some((file) => {
    const name = archiveBasename(file).toLowerCase();
    return PATCH_FILE_STEMS.some((stem) => new RegExp(`^${stem}\\.patch_\\d+\\.gpu_resources$`, "i").test(name));
  });
}
function hasGraphicsPatchFile(files) {
  return hasGraphicsGpuPatchFile(files) && files.some((file) => isGraphicsPatchStem(getPatchFileStem(file)));
}
function isPatchSidecarFile(file, allowedExts) {
  const name = archiveBasename(file);
  return allowedExts.includes(archiveExtname(file)) && PATCH_TOKEN_RE.test(name);
}
function isPatchManagedFile(file, allowedExts) {
  return isPatchDataFile(file) || isPatchSidecarFile(file, allowedExts);
}
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
async function getNextPatchNumber(context) {
  const gamePath = await findGamePath(context);
  if (!gamePath) return 0;
  const dataPath = context.api.util.path.join(gamePath, PATCH_PATH);
  let entries = [];
  try {
    entries = await context.api.util.fs.readdir(dataPath);
  } catch {
    return 0;
  }
  const occupied = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const number = parsePatchNumber(entry);
    if (number === null) continue;
    const fullPath = context.api.util.path.join(dataPath, entry);
    if (!await isFile(context, fullPath)) continue;
    occupied.add(number);
  }
  let nextNumber = 0;
  while (occupied.has(nextNumber)) nextNumber += 1;
  return nextNumber;
}
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
function testPatch(files, gameId) {
  return testerResult(isGameId(gameId) && hasGraphicsPatchFile(files));
}
function testSoundPatch(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => isPatchDataFile(file));
  return testerResult(supported);
}
function testStream(files, gameId) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === STREAM_EXT);
  return testerResult(supported);
}
async function chooseVariant(context, patchFile, candidates) {
  if (candidates.length <= 1) return candidates[0] || "";
  const response = await context.api.util.ui.request({
    type: "mod_choice",
    title: "Choose Variant",
    content: `This mod has several variants for "${patchFile}". Choose the variant you wish to install.`,
    choices: candidates.map((candidate, index) => ({
      id: candidate,
      text: candidate,
      value: index === 0
    })),
    confirm: { text: "Confirm", type: "primary" },
    cancel: { text: "Cancel", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) {
    throw new Error(`User cancelled variant selection for ${patchFile}`);
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
async function installPatchMulti(context, files) {
  const filtered = await filterPatchVariants(context, files, PATCH_EXTS, PATCH_FILES);
  const patchNumber = await getNextPatchNumber(context);
  const items = filtered.map((file) => makePatchInstruction(file, patchNumber));
  const instructions = items.map((item) => item.instruction);
  instructions.push({
    type: "attribute",
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment)
  });
  return { instructions, modType: PATCH_ID };
}
async function installSoundPatchMulti(context, files) {
  const filtered = await filterPatchVariants(context, files, SOUND_PATCH_EXTS);
  const patchNumber = await getNextPatchNumber(context);
  const items = filtered.filter((file) => !isDirectoryEntry(file)).map((file) => makePatchInstruction(file, patchNumber));
  const instructions = items.map((item) => item.instruction);
  instructions.push({
    type: "attribute",
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment)
  });
  return { instructions, modType: SOUND_PATCH_ID };
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
function buildPatchNumberExtensions() {
  const out = [".gpu_resources", ".stream"];
  for (let i = 0; i <= 99; i += 1) out.push(`.patch_${i}`);
  return out;
}
function basenameFromPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
}
function replacePathBasename(filePath, filename) {
  return String(filePath || "").replace(/[^\\/]+$/, filename);
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
function getPatchSortNumber(entries) {
  let best = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const currentName = basenameFromPath(entry?.targetPath || entry?.absolutePath || "");
    const current = parsePatchNumber(currentName);
    if (current !== null) best = Math.min(best, current);
    for (const deployment of getPatchDeployments(entry)) {
      if (!isPatchDeploymentFile(deployment)) continue;
      if (typeof deployment.patchNumber === "number") best = Math.min(best, deployment.patchNumber);
    }
  }
  return best;
}
function getUnmanagedPatchNumbers(mutation) {
  const occupied = /* @__PURE__ */ new Set();
  const gameFiles = Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : [];
  for (const file of gameFiles) {
    if (file?.managed === true) continue;
    const number = parsePatchNumber(basenameFromPath(file?.targetPath || file?.absolutePath || ""));
    if (number !== null) occupied.add(number);
  }
  return occupied;
}
function getBlockedManagedPatchNumbers(mutation, normalizingModKeys) {
  const occupied = /* @__PURE__ */ new Set();
  const entries = Array.isArray(mutation?.entries) ? mutation.entries : [];
  for (const entry of entries) {
    const modKey = String(entry?.modKey || "");
    if (normalizingModKeys.has(modKey)) continue;
    const number = parsePatchNumber(basenameFromPath(entry?.targetPath || entry?.absolutePath || ""));
    if (number !== null) occupied.add(number);
  }
  return occupied;
}
function samePatchShape(a, b) {
  return a.fileStart.toLowerCase() === b.fileStart.toLowerCase() && a.fileEnd.toLowerCase() === b.fileEnd.toLowerCase();
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
  const entriesByModKey = patchEntries.reduce((acc, entry) => {
    const key = String(entry.modKey || "");
    acc[key] = acc[key] ? acc[key].concat(entry) : [entry];
    return acc;
  }, {});
  const modKeys = Object.keys(entriesByModKey).sort((a, b) => {
    const diff = getPatchSortNumber(entriesByModKey[a]) - getPatchSortNumber(entriesByModKey[b]);
    return diff || a.localeCompare(b);
  });
  const assigned = /* @__PURE__ */ new Map();
  const normalizingModKeys = new Set(modKeys);
  const occupiedNumbers = /* @__PURE__ */ new Set([
    ...getUnmanagedPatchNumbers(mutation),
    ...getBlockedManagedPatchNumbers(mutation, normalizingModKeys)
  ]);
  let nextNumber = 0;
  for (const modKey of modKeys) {
    while (occupiedNumbers.has(nextNumber)) nextNumber += 1;
    assigned.set(modKey, nextNumber);
    nextNumber += 1;
  }
  const moveRecords = [];
  const metadataStateByModKey = /* @__PURE__ */ new Map();
  for (const [modKey, modEntries] of Object.entries(entriesByModKey)) {
    const patchNumber = assigned.get(modKey);
    if (patchNumber === void 0) continue;
    const firstEntry = modEntries[0];
    const deployments = getPatchDeployments(firstEntry);
    metadataStateByModKey.set(modKey, deployments);
    for (const entry of modEntries) {
      const currentName = basenameFromPath(entry.targetPath);
      const deployment = findPatchDeploymentForCurrentFile(deployments, currentName);
      if (!deployment) continue;
      const nextFilename = buildPatchFilename(deployment, patchNumber);
      const nextTarget = replacePathBasename(entry.targetPath, nextFilename);
      if (!nextTarget || nextTarget === entry.targetPath) continue;
      moveRecords.push({
        modKey,
        from: entry.targetPath,
        to: nextTarget,
        deployedFilename: nextFilename,
        deployment,
        patchNumber,
        currentPatchNumber: parsePatchTokenNumber(currentName) ?? Number.MAX_SAFE_INTEGER,
        expectedHash: entry.expectedHash
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
        title: "Special Instructions for Helldivers 2",
        content: "Graphics patch mods are automatically renumbered by Heybox. Sound patch mods are not merged and may conflict like in Vortex."
      });
    }
  });
  registerModType(context, PATCH_ID, 100, PATCH_PATH, PATCH_NAME);
  registerModType(context, SOUND_PATCH_ID, 90, PATCH_PATH, SOUND_PATCH_NAME);
  registerModType(context, DATA_ID, 80, DATA_PATH, DATA_NAME);
  registerModType(context, STREAM_ID, 70, STREAM_PATH, STREAM_NAME);
  registerModType(context, BINARIES_ID, 60, BINARIES_PATH, BINARIES_NAME);
  context.registerInstaller(PATCH_ID, 27, testPatch, (files) => installPatchMulti(context, files));
  context.registerInstaller(SOUND_PATCH_ID, 27, testSoundPatch, (files) => installSoundPatchMulti(context, files));
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);
  registerPatchNormalizeHooks(context);
  return true;
}
var index_default = main;
