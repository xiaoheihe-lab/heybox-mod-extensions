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
var GAME_ID = 294100;
var MOD_TYPE_ID = "rimworld-steam-mod";
var ABOUT_XML_FILE = "about.xml";
var GIT_FILES = /* @__PURE__ */ new Set([".gitignore", ".gitattributes"]);
var ROOT_FOLDER_FILES = /* @__PURE__ */ new Set(["readme.md", "license", "contributing.md"]);
function getArchiveSegments(filePath) {
  if (filePath.includes("\0")) {
    throw new Error("Archive path contains invalid null byte");
  }
  const segments = filePath.replace(/\\/g, "/").replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Archive path is not safe: ${filePath}`);
  }
  return segments;
}
function archiveBaseName(filePath) {
  const segments = getArchiveSegments(filePath);
  return segments[segments.length - 1] || "";
}
function hasFileExtension(context, filePath) {
  return context.api.util.path.extname(archiveBaseName(filePath)) !== "";
}
function sanitizeFileName(context, name) {
  return context.api.util.sanitizeFilename(name, "rimworld_mod").replace(/\./g, "_");
}
function toDestinationPath(context, segments) {
  const safeSegments = segments.map((segment) => context.api.util.sanitizeFilename(segment, "_"));
  if (safeSegments.length === 0) {
    throw new Error("Archive destination path is empty");
  }
  return context.api.util.path.join(...safeSegments);
}
async function findGame(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function isAboutFile(filePath) {
  return archiveBaseName(filePath).toLowerCase() === ABOUT_XML_FILE;
}
function getRootSegment(files, aboutFile) {
  const rootCandidate = files.find((file) => ROOT_FOLDER_FILES.has(archiveBaseName(file).toLowerCase()));
  return getArchiveSegments(rootCandidate || aboutFile)[0] || "";
}
function isLooseRootArchive(files) {
  const topSegments = /* @__PURE__ */ new Set();
  for (const file of files) {
    const first = getArchiveSegments(file)[0];
    if (first) topSegments.add(first);
    if (topSegments.size > 1) return true;
  }
  return false;
}
function readPackageId(parsedXml) {
  const metadata = parsedXml?.ModMetaData;
  const packageId = metadata?.packageId;
  if (Array.isArray(packageId)) return typeof packageId[0] === "string" ? packageId[0] : void 0;
  return typeof packageId === "string" ? packageId : void 0;
}
async function getModNameFromAboutXml(context, aboutFile, options) {
  const sourcePath = options?.sourcePathByFile?.[aboutFile];
  if (!sourcePath) return void 0;
  try {
    const fileData = await context.api.util.fs.readFileAsync(sourcePath, { encoding: "utf8" });
    const parsed = await context.api.util.fileParseApi.parseXmlToObject(fileData);
    return readPackageId(parsed);
  } catch {
    return void 0;
  }
}
function testSupportedSteamMod(_context, files, gameId) {
  if (Number(gameId) !== GAME_ID) {
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }
  const aboutFiles = files.filter(isAboutFile);
  if (aboutFiles.length === 0) {
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }
  if (aboutFiles.length > 1) {
    console.warn("RimWorld installer skipped archive with multiple About.xml files.");
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }
  return Promise.resolve({ supported: true, requiredFiles: [] });
}
async function installSteamMod(context, files, options) {
  const aboutFile = files.find(isAboutFile);
  if (!aboutFile) {
    return { instructions: [] };
  }
  const rootSegment = getRootSegment(files, aboutFile);
  const looseRootArchive = isLooseRootArchive(files);
  const modNameFromAbout = await getModNameFromAboutXml(context, aboutFile, options);
  const modName = sanitizeFileName(context, modNameFromAbout || rootSegment || "rimworld_mod");
  const filtered = files.filter((filePath) => {
    const baseName = archiveBaseName(filePath).toLowerCase();
    return !/[\\/]$/.test(filePath) && hasFileExtension(context, filePath) && !GIT_FILES.has(baseName);
  });
  const instructions = filtered.map((file) => {
    const fileSegments = getArchiveSegments(file);
    if (looseRootArchive) {
      return {
        type: "copy",
        source: file,
        destination: toDestinationPath(context, [modName, ...fileSegments])
      };
    }
    if (rootSegment && fileSegments.length > 1 && fileSegments[0] === rootSegment) {
      return {
        type: "copy",
        source: file,
        destination: toDestinationPath(context, [modName, ...fileSegments.slice(1)])
      };
    }
    return {
      type: "copy",
      source: file,
      destination: toDestinationPath(context, [modName, ...fileSegments])
    };
  });
  return { instructions };
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: "RimWorld",
    mergeMods: true,
    queryPath: () => findGame(context),
    logo: "gameart.jpg",
    executable: "RimWorldWin64.exe",
    requiredFiles: ["RimWorldWin64.exe"],
    environment: {
      SteamAPPId: String(GAME_ID)
    },
    details: {
      steamAppId: GAME_ID
    }
  });
  context.registerModType(
    MOD_TYPE_ID,
    25,
    () => true,
    () => "{gamePath}/Mods",
    () => Promise.resolve(false),
    { name: "RimWorld Steam Mod" }
  );
  context.registerInstaller(
    MOD_TYPE_ID,
    25,
    (files, gameId) => testSupportedSteamMod(context, files, gameId),
    (files, options) => installSteamMod(context, files, options)
  );
  return true;
}
var index_default = main;
