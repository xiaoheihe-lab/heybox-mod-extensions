"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var index_exports = {};
__export(index_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var GAME_ID = 1091500;
var GAME_NAME = "Cyberpunk 2077";
var EXECUTABLE = "bin/x64/Cyberpunk2077.exe";
var NEXUS_DOMAIN = "cyberpunk2077";
var REDMOD_PRELAUNCHER = "REDprelauncher.exe";
var REDMOD_DEPLOY_EXE = "tools/redmod/bin/redMod.exe";
var REDMOD_METADATA = "tools/redmod/metadata.json";
var typeId = (name) => `${GAME_ID}-${name}`;
var MOD_TYPE = {
  fomod: typeId("fomod"),
  pipeline: typeId("pipeline"),
  coreCet: typeId("core-cet"),
  coreRedscript: typeId("core-redscript"),
  coreRed4ext: typeId("core-red4ext"),
  coreAudioware: typeId("core-audioware"),
  coreTweakXL: typeId("core-tweak-xl"),
  coreArchiveXL: typeId("core-archive-xl"),
  coreInputLoader: typeId("core-input-loader"),
  coreModSettings: typeId("core-mod-settings"),
  coreCyberCat: typeId("core-cybercat"),
  coreAmm: typeId("core-amm"),
  coreCyberScript: typeId("core-cyberscript"),
  asi: typeId("asi"),
  multiType: typeId("multi-type"),
  multiTypeRedmod: typeId("multi-type-redmod"),
  red4ext: typeId("red4ext"),
  redmod: typeId("redmod"),
  amm: typeId("amm"),
  cet: typeId("cet"),
  redscript: typeId("redscript"),
  audioware: typeId("audioware"),
  tweakXL: typeId("tweak-xl"),
  ini: typeId("ini"),
  jsonConfig: typeId("json-config"),
  xmlConfig: typeId("xml-config"),
  preset: typeId("character-preset"),
  archive: typeId("archive"),
  fallback: typeId("fallback")
};
var MOD_TYPE_NAMES = {
  [MOD_TYPE.fomod]: "FOMOD Installer",
  [MOD_TYPE.pipeline]: "Cyberpunk 2077 Installer Pipeline",
  [MOD_TYPE.coreCet]: "Cyber Engine Tweaks",
  [MOD_TYPE.coreRedscript]: "redscript",
  [MOD_TYPE.coreRed4ext]: "RED4ext",
  [MOD_TYPE.coreAudioware]: "Audioware",
  [MOD_TYPE.coreTweakXL]: "TweakXL",
  [MOD_TYPE.coreArchiveXL]: "ArchiveXL",
  [MOD_TYPE.coreInputLoader]: "Input Loader",
  [MOD_TYPE.coreModSettings]: "Mod Settings",
  [MOD_TYPE.coreCyberCat]: "CyberCAT Save Editor",
  [MOD_TYPE.coreAmm]: "Appearance Menu Mod",
  [MOD_TYPE.coreCyberScript]: "CyberScript",
  [MOD_TYPE.asi]: "ASI Mod",
  [MOD_TYPE.multiType]: "Multi-type Mod",
  [MOD_TYPE.multiTypeRedmod]: "Multi-type Mod with REDmod",
  [MOD_TYPE.red4ext]: "RED4ext Mod",
  [MOD_TYPE.redmod]: "REDmod",
  [MOD_TYPE.amm]: "Appearance Menu Mod Content",
  [MOD_TYPE.cet]: "Cyber Engine Tweaks Mod",
  [MOD_TYPE.redscript]: "redscript Mod",
  [MOD_TYPE.audioware]: "Audioware Mod",
  [MOD_TYPE.tweakXL]: "TweakXL Mod",
  [MOD_TYPE.ini]: "INI / ReShade Mod",
  [MOD_TYPE.jsonConfig]: "JSON Configuration Mod",
  [MOD_TYPE.xmlConfig]: "XML Configuration Mod",
  [MOD_TYPE.preset]: "Character Preset",
  [MOD_TYPE.archive]: "Archive / ArchiveXL Mod",
  [MOD_TYPE.fallback]: "Root Folder Mod"
};
var KNOWN_TOP_LEVEL_DIRS = /* @__PURE__ */ new Set(["archive", "bin", "engine", "r6", "red4ext", "mods"]);
var EXTRA_FILE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".md",
  ".txt",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".odt",
  ".rtf",
  ".doc"
]);
var PATHS = {
  cetMods: "bin/x64/plugins/cyber_engine_tweaks/mods",
  amm: "bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceMenuMod",
  archive: "archive/pc/mod",
  legacyArchive: "archive/pc/patch",
  red4extPlugins: "red4ext/plugins",
  redscript: "r6/scripts",
  redscriptHints: "r6/config/redsUserHints",
  tweakXL: "r6/tweaks",
  audioware: "r6/audioware",
  xmlConfig: "r6/config",
  xmlInput: "r6/input",
  iniConfig: "engine/config/platform/pc",
  reshade: "bin/x64",
  redmods: "mods",
  extras: "V2077/mod-extra-files",
  cyberCat: "CyberCAT",
  cyberCatPresets: "V2077/presets/cybercat",
  appearancePresets: "bin/x64/plugins/cyber_engine_tweaks/mods/AppearanceChangeUnlocker/character-presets"
};
var XML_PROTECTED_NAMES = /* @__PURE__ */ new Set([
  "inputcontexts.xml",
  "inputdeadzones.xml",
  "inputusermappings.xml",
  "uiinputactions.xml"
]);
var JSON_CANONICAL_PATHS = {
  "giweights.json": "engine/config/giweights.json",
  "bumperssettings.json": "r6/config/bumpersSettings.json"
};
var RED4EXT_RESERVED_DLLS = /* @__PURE__ */ new Set([
  "clrcompression.dll",
  "clrjit.dll",
  "coreclr.dll",
  "d3dcompiler_47_cor3.dll",
  "mscordaccore.dll",
  "penimc_cor3.dll",
  "presentationnative_cor3.dll",
  "vcruntime140_cor3.dll",
  "wpfgfx_cor3.dll"
]);

// src/ui.ts
var INSTALL_CANCELLED = "Cyberpunk 2077 mod installation cancelled by user";
async function confirmInstall(context, title, content, confirmText = "\u7EE7\u7EED\u5B89\u88C5") {
  const response = await context.api.util.ui.request({
    type: "mod_install_confirmation",
    title,
    content,
    confirm: { text: confirmText, type: "primary", visible: true },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED);
}
function notify(context, title, content, variant = "warning") {
  context.api.util.ui.notify({
    type: "cyberpunk2077_extension_notice",
    display: "toast",
    variant,
    title,
    content
  });
}

// src/loadOrder/deployer.ts
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_child_process = require("child_process");

// src/loadOrder/provider.ts
var import_path = __toESM(require("path"));
var REDMOD_LOAD_ORDER_PROVIDER_ID = "redmod";
function isRedmodLoadOrderModRelevant(mod) {
  return Array.isArray(mod.metaInfo?.cyberpunkRedmodInfo) && mod.metaInfo.cyberpunkRedmodInfo.length > 0;
}
function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
function createRedmodEntryId(modKey, relativePath) {
  return `${modKey}:${normalizeRelativePath(relativePath).toLowerCase()}`;
}
function getRedmodMetadata(context) {
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  for (const mod of context.mods) {
    const values = mod.metaInfo?.cyberpunkRedmodInfo;
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (!value || typeof value !== "object") continue;
      const raw = value;
      const name = String(raw.name || "").trim();
      const version = String(raw.version || "").trim();
      const relativePath = normalizeRelativePath(raw.relativePath);
      if (!name || !version || !/^mods\/[^/]+$/i.test(relativePath)) continue;
      const id = createRedmodEntryId(mod.modKey, relativePath);
      if (seen.has(id)) continue;
      seen.add(id);
      const sourceName = String(mod.metaInfo?.name || mod.metaInfo?.title || mod.modKey);
      entries.push({
        id,
        ownerModKey: mod.modKey,
        name: `${name} ${version}\uFF08\u6765\u81EA ${sourceName}\uFF09`,
        enabled: mod.enabled,
        data: { name, version, relativePath, sourceModKey: mod.modKey }
      });
    }
  }
  return entries;
}
function deserializeRedmodLoadOrder(context) {
  const entries = getRedmodMetadata(context);
  const savedIndex = new Map(context.savedOrder.map((id, index) => [id, index]));
  const newIndex = context.savedOrder.length;
  return entries.sort((left, right) => {
    const leftIndex = savedIndex.get(left.id) ?? newIndex;
    const rightIndex = savedIndex.get(right.id) ?? newIndex;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    const leftPath = import_path.default.basename(String(left.data.relativePath || ""));
    const rightPath = import_path.default.basename(String(right.data.relativePath || ""));
    const pathOrder = leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
    return pathOrder || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  });
}
function getEnabledRedmodNames(entries) {
  return entries.filter((entry) => entry.enabled).map((entry) => import_path.default.basename(String(entry.data?.relativePath || ""))).filter(Boolean);
}

// src/loadOrder/deployer.ts
var V2077_DIR = "V2077";
var LOAD_ORDER_DIR = import_path2.default.join(V2077_DIR, "Load Order");
var MODLIST_PATH = import_path2.default.join(V2077_DIR, "modlist.txt");
var LOAD_ORDER_PATH = import_path2.default.join(LOAD_ORDER_DIR, "heybox-managed.json");
var RedmodDeploymentError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "RedmodDeploymentError";
  }
};
async function fileExists(filePath) {
  try {
    return (await import_fs.default.promises.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
async function atomicWrite(filePath, data) {
  await import_fs.default.promises.mkdir(import_path2.default.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await import_fs.default.promises.writeFile(temporaryPath, data, "utf8");
    await import_fs.default.promises.rename(temporaryPath, filePath);
  } catch (error) {
    try {
      await import_fs.default.promises.unlink(temporaryPath);
    } catch {
    }
    throw error;
  }
}
function buildRedmodDeployArgs(gamePath, modlistPath) {
  return [
    "deploy",
    "-force",
    `-root=${gamePath}`,
    `-rttiSchemaFile=${import_path2.default.join(gamePath, REDMOD_METADATA)}`,
    `-modlist=${modlistPath}`
  ];
}
function runRedmod(executable, gamePath, modlistPath) {
  return new Promise((resolve, reject) => {
    (0, import_child_process.execFile)(
      executable,
      buildRedmodDeployArgs(gamePath, modlistPath),
      { cwd: import_path2.default.dirname(executable), windowsHide: true },
      (error, _stdout, stderr) => {
        if (!error) return resolve();
        const details = String(stderr || "").trim();
        reject(new RedmodDeploymentError(
          "REDMOD_DEPLOY_FAILED",
          details ? `${error.message}: ${details}` : error.message
        ));
      }
    );
  });
}
var defaultDependencies = { fileExists, atomicWrite, runRedmod };
async function serializeAndDeployRedmods(entries, context, dependencies = defaultDependencies) {
  const gamePath = String(context.gamePath || "");
  if (!gamePath) throw new RedmodDeploymentError("REDMOD_GAME_PATH_MISSING", "\u672A\u627E\u5230 Cyberpunk 2077 \u6E38\u620F\u76EE\u5F55\u3002");
  const executable = import_path2.default.join(gamePath, REDMOD_DEPLOY_EXE);
  const metadataPath = import_path2.default.join(gamePath, REDMOD_METADATA);
  const modlistPath = import_path2.default.join(gamePath, MODLIST_PATH);
  const loadOrderPath = import_path2.default.join(gamePath, LOAD_ORDER_PATH);
  const diagnostic = {
    schemaVersion: 1,
    providerId: REDMOD_LOAD_ORDER_PROVIDER_ID,
    revision: context.revision,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    entries
  };
  await dependencies.atomicWrite(modlistPath, getEnabledRedmodNames(entries).join("\r\n"));
  await dependencies.atomicWrite(loadOrderPath, `${JSON.stringify(diagnostic, null, 2)}
`);
  if (!await dependencies.fileExists(executable) || !await dependencies.fileExists(metadataPath)) {
    throw new RedmodDeploymentError(
      "REDMOD_TOOL_MISSING",
      "Steam REDmod DLC \u672A\u5B89\u88C5\u6216\u4E0D\u5B8C\u6574\uFF1BLoad Order \u5DF2\u4FDD\u5B58\uFF0C\u4F46\u5C1A\u672A\u8FD0\u884C redMod.exe\u3002"
    );
  }
  await dependencies.runRedmod(executable, gamePath, modlistPath);
}
async function prepareRedmodDirectories(gamePath) {
  if (!gamePath) return;
  await Promise.all([
    import_fs.default.promises.mkdir(import_path2.default.join(gamePath, "mods"), { recursive: true }),
    import_fs.default.promises.mkdir(import_path2.default.join(gamePath, "r6/cache/modded"), { recursive: true }),
    import_fs.default.promises.mkdir(import_path2.default.join(gamePath, LOAD_ORDER_DIR), { recursive: true })
  ]);
}

// src/redmod/attributes.ts
var import_fs2 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));

// src/package.ts
function normalizeRelativePath2(value) {
  const normalized = String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
  if (!normalized) return "";
  const segments = normalized.split("/");
  if (segments.includes("..") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return normalized;
}
function sanitizePackageName(value) {
  const cleaned = String(value ?? "").replace(/[<>:"/\\|?*\x00-\x1F]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return cleaned || "Cyberpunk2077Mod";
}
function commonWrapper(paths) {
  if (paths.length === 0) return void 0;
  const first2 = paths[0].split("/")[0];
  if (!first2 || paths.some((file) => file.split("/")[0].toLowerCase() !== first2.toLowerCase())) return void 0;
  if (KNOWN_TOP_LEVEL_DIRS.has(first2.toLowerCase())) return void 0;
  const unwrapped = paths.map((file) => file.slice(first2.length + 1)).filter(Boolean);
  if (unwrapped.length !== paths.length) return void 0;
  const revealsKnownRoot = unwrapped.some((file) => KNOWN_TOP_LEVEL_DIRS.has(file.split("/")[0].toLowerCase()));
  return revealsKnownRoot ? first2 : void 0;
}
function preparePackage(inputFiles) {
  const normalized = inputFiles.map(normalizeRelativePath2).filter(Boolean);
  const wrapper = commonWrapper(normalized);
  const files = normalized.map((source) => {
    const path4 = wrapper ? source.slice(wrapper.length + 1) : source;
    return { source, path: path4, lower: path4.toLowerCase() };
  });
  const fallbackName = files.find((file) => file.path.includes("/"))?.path.split("/")[0] || files[0]?.path.replace(/\.[^.]+$/, "") || "Cyberpunk2077Mod";
  return {
    files,
    wrapper,
    packageName: sanitizePackageName(wrapper || fallbackName)
  };
}
function extname(filePath) {
  const name = filePath.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}
function basename(filePath) {
  return filePath.split("/").pop() || "";
}
function dirname(filePath) {
  const index = filePath.lastIndexOf("/");
  return index < 0 ? "" : filePath.slice(0, index);
}
function isUnder(file, prefix) {
  const normalized = normalizeRelativePath2(prefix).toLowerCase();
  return file.lower === normalized || file.lower.startsWith(`${normalized}/`);
}
function relativeTo(file, prefix) {
  const normalized = normalizeRelativePath2(prefix);
  return file.path.slice(normalized.length).replace(/^\//, "");
}
function hasPath(files, expected) {
  const lower = normalizeRelativePath2(expected).toLowerCase();
  return files.some((file) => file.lower === lower);
}
function hasAllPaths(files, expected) {
  return expected.every((path4) => hasPath(files, path4));
}

// src/redmod/metadata.ts
var SCRIPT_DIRS = /* @__PURE__ */ new Set(["core", "cyberpunk", "exec", "samples", "tests"]);
var TWEAK_DIRS = ["base/gameplay/static_data", "ep1/gameplay/static_data"];
function hasRedmodInfo(files, canonicalOnly = false) {
  return files.some((file) => {
    if (canonicalOnly) return /^mods\/[^/]+\/info\.json$/i.test(file.path);
    return file.lower === "info.json" || /^mods\/[^/]+\/info\.json$/i.test(file.path) || /^[^/]+\/info\.json$/i.test(file.path);
  });
}
async function decodeInfo(file, readText2) {
  let value;
  try {
    value = JSON.parse(await readText2(file));
  } catch (error) {
    throw new Error(`REDmod info.json \u65E0\u6CD5\u89E3\u6790\uFF1A${file.path} (${String(error)})`);
  }
  const info = value;
  if (!info || typeof info.name !== "string" || !info.name.trim() || typeof info.version !== "string" || !info.version.trim()) {
    throw new Error(`REDmod info.json \u7F3A\u5C11\u6709\u6548\u7684 name/version\uFF1A${file.path}`);
  }
  return info;
}
async function findRedmodRoots(pkg, readText2, canonicalOnly = false) {
  const roots = [];
  for (const file of pkg.files) {
    let sourceRoot = null;
    let destinationRoot = null;
    const canonical = file.path.match(/^mods\/([^/]+)\/info\.json$/i);
    const named = file.path.match(/^([^/]+)\/info\.json$/i);
    if (canonical) {
      sourceRoot = `mods/${canonical[1]}`;
      destinationRoot = sourceRoot;
    } else if (!canonicalOnly && file.lower === "info.json") {
      sourceRoot = "";
    } else if (!canonicalOnly && named) {
      sourceRoot = named[1];
      destinationRoot = `mods/${named[1]}`;
    }
    if (sourceRoot === null) continue;
    const info = await decodeInfo(file, readText2);
    destinationRoot ||= `mods/${sanitizePackageName(info.name || pkg.packageName)}`;
    roots.push({ infoFile: file, sourceRoot, destinationRoot, info });
  }
  return roots;
}
function relativeFromRedmodRoot(file, root) {
  if (!root) return file.path;
  if (file.path.toLowerCase() === root.toLowerCase()) return "";
  if (!file.path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return null;
  return file.path.slice(root.length + 1);
}
function isValidRedmodFile(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower === "info.json") return true;
  const segments = lower.split("/");
  if (segments[0] === "archives") return [".archive", ".xl"].includes(extname(lower));
  if (segments[0] === "customsounds") return extname(lower) === ".wav";
  if (segments[0] === "scripts") {
    return segments.length >= 3 && SCRIPT_DIRS.has(segments[1]) && [".script", ".ws"].includes(extname(lower));
  }
  if (segments[0] === "tweaks") {
    return TWEAK_DIRS.includes(segments.slice(1, -1).join("/")) && extname(lower) === ".tweak";
  }
  return false;
}
function validateRedmodRoot(pkg, root) {
  const scopedFiles = pkg.files.filter((file) => relativeFromRedmodRoot(file, root.sourceRoot) !== null);
  const invalid = scopedFiles.find((file) => {
    const relative = relativeFromRedmodRoot(file, root.sourceRoot) || "";
    return !isValidRedmodFile(relative) && !EXTRA_FILE_EXTENSIONS.has(extname(file.path));
  });
  if (invalid) throw new Error(`REDmod \u5305\u542B\u65E0\u6548\u76EE\u5F55\u6216\u6587\u4EF6\u7C7B\u578B\uFF1A${invalid.path}`);
  const rootFiles = scopedFiles.filter((file) => isValidRedmodFile(relativeFromRedmodRoot(file, root.sourceRoot) || ""));
  const payloadFiles = rootFiles.filter((file) => file.source !== root.infoFile.source);
  if (payloadFiles.length === 0) {
    const sounds = Array.isArray(root.info.customSounds) ? root.info.customSounds : [];
    if (sounds.length === 0 || sounds.some((sound) => sound?.type !== "mod_skip")) {
      throw new Error(`REDmod \u53EA\u6709 info.json\uFF0C\u4F46\u672A\u58F0\u660E\u7EAF mod_skip \u97F3\u9891\u6761\u76EE\uFF1A${root.infoFile.path}`);
    }
  }
  return rootFiles;
}
function metadataFromRoots(roots) {
  return roots.map((root) => ({
    name: root.info.name,
    version: root.info.version,
    relativePath: root.destinationRoot
  }));
}

// src/redmod/attributes.ts
async function listFiles(root, current = "") {
  const directory = import_path3.default.join(root, current);
  const entries = await import_fs2.default.promises.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative.replace(/\\/g, "/"));
  }
  return files;
}
async function extractRedmodAttributes(_modInfo, stagingPath) {
  try {
    const pkg = preparePackage(await listFiles(stagingPath));
    if (pkg.files.some((file) => /(^|\/)fomod\/moduleconfig\.xml$/i.test(file.path))) return {};
    const roots = await findRedmodRoots(
      pkg,
      async (file) => import_fs2.default.promises.readFile(import_path3.default.join(stagingPath, file.source), "utf8")
    );
    if (roots.length === 0) return {};
    for (const root of roots) validateRedmodRoot(pkg, root);
    return {
      cyberpunkRedmodInfo: metadataFromRoots(roots),
      cyberpunkRedmodRequiresDeploy: true
    };
  } catch {
    return {};
  }
}

// src/redmod/fomodAttributes.ts
function invalidFomodRedmod(message, cause) {
  const error = new Error(message);
  error.code = "FOMOD_INVALID_CONFIG";
  if (cause !== void 0) error.cause = cause;
  return error;
}
function normalizeDeploymentPath(value) {
  const raw = String(value ?? "").replace(/\\/g, "/");
  if (!raw || raw.startsWith("/") || raw.startsWith("//") || /^[A-Za-z]:/.test(raw)) {
    throw invalidFomodRedmod(`FOMOD REDmod target path must be relative to the game directory: ${raw}`);
  }
  try {
    return normalizeRelativePath2(raw);
  } catch (error) {
    throw invalidFomodRedmod(`FOMOD REDmod target path is unsafe: ${raw}`, error);
  }
}
function projectSelectedCopies(context) {
  const copiesByDestination = /* @__PURE__ */ new Map();
  for (const instruction of context.instructions) {
    if (instruction.type !== "copy") continue;
    const destination = normalizeDeploymentPath(instruction.destination);
    const source = normalizeRelativePath2(instruction.source);
    const key = destination.toLowerCase();
    copiesByDestination.delete(key);
    copiesByDestination.set(key, { source, path: destination, lower: key });
  }
  const files = Array.from(copiesByDestination.values());
  const firstRoot = files.find((file) => /^mods\/[^/]+\//i.test(file.path))?.path.split("/")[1];
  return {
    files,
    packageName: sanitizePackageName(firstRoot || "FomodRedmod")
  };
}
async function extractFomodRedmodAttributes(contextValue, context) {
  if (context.modTypeId !== MOD_TYPE.fomod && context.installerTypeId !== MOD_TYPE.fomod) return {};
  const pkg = projectSelectedCopies(context);
  const hasCanonicalInfo = pkg.files.some((file) => /^mods\/[^/]+\/info\.json$/i.test(file.path));
  if (!hasCanonicalInfo) {
    return {
      cyberpunkRedmodInfo: [],
      cyberpunkRedmodRequiresDeploy: false
    };
  }
  try {
    const roots = await findRedmodRoots(
      pkg,
      async (file) => String(await contextValue.api.util.fs.readFileAsync(
        contextValue.api.util.path.join(context.stagingPath, file.source),
        "utf8"
      )),
      true
    );
    for (const root of roots) validateRedmodRoot(pkg, root);
    return {
      cyberpunkRedmodInfo: metadataFromRoots(roots),
      cyberpunkRedmodRequiresDeploy: roots.length > 0
    };
  } catch (error) {
    if (error?.code === "FOMOD_INVALID_CONFIG") throw error;
    throw invalidFomodRedmod(`The selected FOMOD REDmod content is invalid: ${String(error?.message || error)}`, error);
  }
}
function registerFomodRedmodAttributeExtractor(contextValue) {
  const context = contextValue;
  context.registerPostInstallerAttributeExtractor(100, (payload) => extractFomodRedmodAttributes(contextValue, payload));
}

// src/launchOptions/arguments.ts
var REDMOD_STEAM_ARGUMENT = "-modded";
function hasLaunchOptionArgument(launchOptions, argument = REDMOD_STEAM_ARGUMENT) {
  const expected = String(argument || "").toLowerCase();
  if (!expected) return false;
  const value = String(launchOptions || "");
  const tokens = [];
  let token = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (/\s/.test(character) && !quoted) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += character;
  }
  if (token) tokens.push(token);
  return tokens.some((value2) => value2.toLowerCase() === expected);
}

// src/launchOptions/prompt.ts
function buildRedmodLaunchOptionPrompt(missingUserCount) {
  const userText = missingUserCount === 1 ? "1 \u4E2A\u672C\u5730 Steam \u7528\u6237" : `${missingUserCount} \u4E2A\u672C\u5730 Steam \u7528\u6237`;
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    `<strong>\u68C0\u6D4B\u5230 ${userText}\u5C1A\u672A\u914D\u7F6E REDmod \u542F\u52A8\u53C2\u6570\u3002</strong>`,
    `<code style="word-break:break-all;white-space:pre-wrap;">${REDMOD_STEAM_ARGUMENT}</code>`,
    "<span>\u786E\u8BA4\u540E\u4F1A\u5148\u5173\u95ED Steam\uFF0C\u518D\u53EA\u4E3A\u7F3A\u5C11\u8BE5\u53C2\u6570\u7684\u7528\u6237\u8FFD\u52A0\u542F\u52A8\u9879\uFF1B\u5DF2\u6709\u7684\u5176\u4ED6\u542F\u52A8\u53C2\u6570\u4F1A\u4FDD\u6301\u4E0D\u53D8\u3002</span>",
    "<small>Heybox \u4EE5\u540E\u4E0D\u4F1A\u81EA\u52A8\u5220\u9664\u8FD9\u4E2A\u53C2\u6570\u3002\u82E5\u6682\u4E0D\u6DFB\u52A0\uFF0C\u540E\u7EED REDmod \u6210\u529F\u90E8\u7F72\u65F6\u4ECD\u4F1A\u518D\u6B21\u63D0\u9192\u3002</small>",
    "</div>"
  ].join("");
}

// src/launchOptions/coordinator.ts
function responsePayload(response) {
  return response?.payload && typeof response.payload === "object" ? response.payload : {};
}
var RedmodSteamLaunchOptionCoordinator = class {
  constructor(context) {
    this.context = context;
  }
  async afterDeploy(entries) {
    if (!entries.some((entry) => entry.enabled)) return;
    try {
      const current = await this.context.api.util.steam.getLaunchOptions(GAME_ID);
      if (current.length === 0) {
        notify(
          this.context,
          "\u65E0\u6CD5\u914D\u7F6E Steam \u542F\u52A8\u9879",
          "\u6CA1\u6709\u627E\u5230\u53EF\u5199\u5165\u7684\u672C\u5730 Steam \u7528\u6237\u914D\u7F6E\uFF1BREDmod \u5DF2\u5B8C\u6210\u90E8\u7F72\uFF0C\u8BF7\u786E\u8BA4 Steam \u5DF2\u5728\u672C\u673A\u767B\u5F55\u540E\u91CD\u8BD5\u90E8\u7F72\u3002",
          "error"
        );
        return;
      }
      const missing2 = current.filter((entry) => !hasLaunchOptionArgument(entry.launchOptions));
      if (missing2.length === 0) return;
      const response = await this.context.api.util.ui.request({
        type: "steam_launch_options_confirm",
        title: "\u4E3A Cyberpunk 2077 \u6DFB\u52A0 REDmod \u542F\u52A8\u9879",
        content: buildRedmodLaunchOptionPrompt(missing2.length),
        confirm: { text: "\u6DFB\u52A0\u5E76\u91CD\u542F Steam", type: "primary", visible: true },
        cancel: { text: "\u6682\u4E0D\u6DFB\u52A0", type: "cancel", visible: true },
        requiresSteamClosed: true,
        relaunchSteamAfterWrite: true
      });
      if (!response?.confirmed) return;
      const payload = responsePayload(response);
      if (payload.steamClosed === false) {
        notify(this.context, "Steam \u672A\u5173\u95ED", "\u8BF7\u5B8C\u5168\u9000\u51FA Steam \u540E\uFF0C\u5728\u4E0B\u4E00\u6B21 REDmod \u90E8\u7F72\u65F6\u91CD\u8BD5\u3002", "error");
        return;
      }
      const ensured = await this.context.api.util.steam.ensureLaunchOptionArgument(GAME_ID, REDMOD_STEAM_ARGUMENT);
      const verified = await this.context.api.util.steam.getLaunchOptions(GAME_ID);
      const verifiedUserIds = new Set(verified.map((entry) => entry.userId));
      const success2 = ensured.failures.length === 0 && ensured.entries.length > 0 && verified.length === ensured.entries.length && current.every((entry) => verifiedUserIds.has(entry.userId)) && verified.every((entry) => hasLaunchOptionArgument(entry.launchOptions));
      if (!success2) {
        notify(
          this.context,
          "Steam \u542F\u52A8\u9879\u5199\u5165\u4E0D\u5B8C\u6574",
          "\u90E8\u5206\u672C\u5730 Steam \u7528\u6237\u672A\u80FD\u6DFB\u52A0 -modded\uFF1B\u5DF2\u6210\u529F\u5199\u5165\u7684\u7528\u6237\u4F1A\u4FDD\u6301\u4E0D\u53D8\uFF0C\u4E0B\u6B21 REDmod \u90E8\u7F72\u65F6\u5C06\u7EE7\u7EED\u8865\u5145\u7F3A\u5931\u7528\u6237\u3002",
          "error"
        );
        return;
      }
      notify(
        this.context,
        "Steam \u542F\u52A8\u9879\u5DF2\u8BBE\u7F6E",
        `\u5DF2\u4E3A\u7F3A\u5C11\u53C2\u6570\u7684 Steam \u7528\u6237\u6DFB\u52A0 ${REDMOD_STEAM_ARGUMENT}\uFF0C\u6B63\u5728\u91CD\u65B0\u6253\u5F00 Steam\u3002`,
        "success"
      );
      if (payload.relaunchSteam === false) return;
      const launchResponse = await this.context.api.util.steam.launchClient();
      const launchPayload = responsePayload(launchResponse);
      if (launchResponse?.confirmed && launchPayload.success !== false) return;
      notify(
        this.context,
        "Steam \u542F\u52A8\u5931\u8D25",
        String(launchPayload.error || "\u542F\u52A8\u9879\u5DF2\u5199\u5165\uFF0C\u4F46 Steam \u672A\u80FD\u81EA\u52A8\u542F\u52A8\uFF0C\u8BF7\u624B\u52A8\u6253\u5F00 Steam\u3002"),
        "error"
      );
    } catch (error) {
      notify(
        this.context,
        "Steam \u542F\u52A8\u9879\u914D\u7F6E\u5931\u8D25",
        error instanceof Error ? error.message : String(error),
        "error"
      );
    }
  }
};

// src/loadOrder/index.ts
function registerRedmodLoadOrder(contextValue) {
  const context = contextValue;
  const launchOptions = new RedmodSteamLaunchOptionCoordinator(contextValue);
  context.registerAttributeExtractor(100, extractRedmodAttributes);
  registerFomodRedmodAttributeExtractor(contextValue);
  context.registerLoadOrder({
    id: REDMOD_LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: "REDmod \u52A0\u8F7D\u987A\u5E8F",
    usageInstructions: [
      "\u8D8A\u9760\u524D\u7684 REDmod \u4F18\u5148\u7EA7\u8D8A\u9AD8\u3002",
      "\u7981\u7528\u9879\u76EE\u4ECD\u4F1A\u4FDD\u7559\u4F4D\u7F6E\uFF0C\u4F46\u4E0D\u4F1A\u5199\u5165\u672C\u6B21 REDmod \u90E8\u7F72\u3002"
    ],
    modTypes: [MOD_TYPE.redmod, MOD_TYPE.multiTypeRedmod, MOD_TYPE.fomod],
    isModRelevant: isRedmodLoadOrderModRelevant,
    deserializeLoadOrder: deserializeRedmodLoadOrder,
    serializeLoadOrder: serializeAndDeployRedmods,
    onDidDeploy: (entries) => launchOptions.afterDeploy(entries)
  });
  context.registerExtensionAction(GAME_ID, "deployRedmods", () => context.api.loadOrder.deploy(REDMOD_LOAD_ORDER_PROVIDER_ID));
}

// src/game.ts
async function fileExists2(context, filePath) {
  try {
    return Boolean((await context.api.util.fs.stat(filePath))?.isFile);
  } catch {
    return false;
  }
}
async function findGamePath(context) {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath;
}
async function getRedmodStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const join = context.api.util.path.join;
  const checks = resolvedGamePath ? await Promise.all([
    fileExists2(context, join(resolvedGamePath, REDMOD_PRELAUNCHER)),
    fileExists2(context, join(resolvedGamePath, REDMOD_DEPLOY_EXE)),
    fileExists2(context, join(resolvedGamePath, REDMOD_METADATA))
  ]) : [false, false, false];
  return {
    installed: checks.every(Boolean),
    gamePath: resolvedGamePath,
    files: {
      prelauncher: checks[0],
      deployExecutable: checks[1],
      metadata: checks[2]
    }
  };
}
async function setup(context, gamePath) {
  await prepareRedmodDirectories(gamePath);
  const status = await getRedmodStatus(context, gamePath);
  if (status.installed) return;
  notify(
    context,
    "REDmod DLC \u672A\u5B89\u88C5\u6216\u4E0D\u5B8C\u6574",
    "\u666E\u901A Mod \u4ECD\u53EF\u6B63\u5E38\u7BA1\u7406\uFF1B\u5B89\u88C5 REDmod \u7C7B\u578B\u5185\u5BB9\u524D\uFF0C\u8BF7\u5148\u5728 Steam \u4E2D\u5B89\u88C5\u514D\u8D39\u7684 REDmod DLC\u3002"
  );
}
function registerCyberpunkGame(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery) => setup(context, String(discovery?.path || discovery?.gamePath || "")),
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: NEXUS_DOMAIN,
      customOpenModsPath: PATHS.archive,
      supportsSymlinks: false,
      mergeMods: true
    }
  });
  context.registerExtensionAction(GAME_ID, "getRedmodStatus", (gamePath) => getRedmodStatus(context, String(gamePath || "")));
}

// ../../utils/fomod-utils/dist/security/paths.js
var DRIVE_OR_UNC = /^(?:[a-z]:|\\\\|\/\/)/i;
function normalizeArchivePath(input, allowEmpty = false) {
  const raw = String(input ?? "").replace(/\\/g, "/").trim();
  if (!raw) {
    if (allowEmpty)
      return "";
    throw new Error("FOMOD path is empty");
  }
  if (raw.startsWith("/") || DRIVE_OR_UNC.test(raw) || raw.includes("\0")) {
    throw new Error(`Unsafe FOMOD path: ${raw}`);
  }
  const parts = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".")
      continue;
    if (part === "..")
      throw new Error(`FOMOD path traversal is not allowed: ${raw}`);
    parts.push(part);
  }
  if (parts.length === 0 && !allowEmpty)
    throw new Error(`Invalid FOMOD path: ${raw}`);
  return parts.join("/");
}
function joinArchivePath(...parts) {
  return normalizeArchivePath(parts.filter((part) => String(part ?? "").trim()).join("/"), true);
}
function findFomodRoot(files) {
  const matches = files.map((source) => ({ source, normalized: normalizeArchivePath(source) })).filter(({ normalized }) => {
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length !== 2 && parts.length !== 3)
      return false;
    return parts[parts.length - 2]?.toLowerCase() === "fomod" && parts[parts.length - 1]?.toLowerCase() === "moduleconfig.xml";
  });
  if (matches.length === 0)
    return null;
  const unique = new Map(matches.map((entry2) => [entry2.normalized.toLowerCase(), entry2]));
  if (unique.size !== 1)
    throw new Error("FOMOD package contains multiple ModuleConfig.xml files");
  const entry = [...unique.values()][0];
  const suffixLength = "fomod/moduleconfig.xml".length;
  return {
    configPath: entry.source,
    root: entry.normalized.slice(0, Math.max(0, entry.normalized.length - suffixLength)).replace(/\/$/, "")
  };
}

// ../../utils/fomod-utils/dist/security/xml.js
var MAX_XML_BYTES = 2 * 1024 * 1024;
var MAX_OPTIONS = 2e3;
function assertSafeXml(xml) {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES)
    throw new Error("FOMOD ModuleConfig.xml exceeds 2 MiB");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("FOMOD DTD and ENTITY declarations are not supported");
}
function assertSupportedXmlFeatures(xml) {
  const unsupported = [
    [/<\s*gameDependency\b/i, "gameDependency"],
    [/<\s*fommDependency\b/i, "fommDependency"],
    [/<\s*fileDependency\b[^>]*\bstate\s*=\s*["']Inactive["']/i, "fileDependency Inactive state"],
    [/<\s*enableplugin\b/i, "enableplugin"],
    [/<\s*enableallplugins\b/i, "enableallplugins"],
    [/<\s*iniedit\b/i, "iniedit"],
    [/<\s*generatefile\b/i, "generatefile"]
  ];
  const match = unsupported.find(([pattern]) => pattern.test(xml));
  if (!match)
    return;
  const error = new Error(`Unsupported FOMOD feature: ${match[1]}`);
  error.code = "FOMOD_UNSUPPORTED_FEATURE";
  throw error;
}

// ../../utils/fomod-utils/dist/parser/xml-helpers.js
function list(value) {
  if (value === void 0 || value === null)
    return [];
  return Array.isArray(value) ? value : [value];
}
function first(value) {
  return list(value)[0];
}
function attr(node, name, fallback = "") {
  return String(node?.$?.[name] ?? fallback);
}
function text(node, fallback = "") {
  if (typeof node === "string" || typeof node === "number")
    return String(node);
  return String(node?._ ?? fallback).trim();
}
function boolAttr(node, name) {
  return attr(node, name, "false").toLowerCase() === "true";
}

// ../../utils/fomod-utils/dist/parser/module-config.js
var OPTION_TYPES = /* @__PURE__ */ new Set(["Required", "Recommended", "Optional", "NotUsable", "CouldBeUsable"]);
var GROUP_TYPES = /* @__PURE__ */ new Set(["SelectAny", "SelectAll", "SelectExactlyOne", "SelectAtMostOne", "SelectAtLeastOne"]);
var fileOrder = 0;
function parseOrder(value) {
  const order = String(value || "Explicit");
  return order === "Ascending" || order === "Descending" ? order : "Explicit";
}
function ordered(items, order) {
  if (order === "Explicit")
    return items;
  const direction = order === "Ascending" ? 1 : -1;
  return [...items].sort((a, b) => direction * a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
}
function parseDependency(node) {
  if (!node)
    return { kind: "all", children: [] };
  const children = [];
  for (const item of list(node.fileDependency)) {
    children.push({
      kind: "file",
      path: normalizeArchivePath(attr(item, "file")),
      state: attr(item, "state", "Active")
    });
  }
  for (const item of list(node.flagDependency)) {
    children.push({ kind: "flag", flag: attr(item, "flag"), value: attr(item, "value") });
  }
  for (const item of list(node.gameDependency)) {
    children.push({ kind: "unsupported", feature: `gameDependency ${attr(item, "version")}` });
  }
  for (const item of list(node.fommDependency)) {
    children.push({ kind: "unsupported", feature: `fommDependency ${attr(item, "version")}` });
  }
  for (const item of list(node.dependencies))
    children.push(parseDependency(item));
  return { kind: attr(node, "operator", "And") === "Or" ? "any" : "all", children };
}
function parseFiles(node) {
  const output = [];
  for (const kind of ["file", "folder"]) {
    for (const item of list(node?.[kind])) {
      output.push({
        kind,
        source: normalizeArchivePath(attr(item, "source")),
        destination: normalizeArchivePath(attr(item, "destination"), true),
        priority: Number(attr(item, "priority", "0")) || 0,
        alwaysInstall: boolAttr(item, "alwaysInstall"),
        installIfUsable: boolAttr(item, "installIfUsable"),
        order: fileOrder++
      });
    }
  }
  return output;
}
function optionType(value, fallback = "Optional") {
  const type = String(value || fallback);
  return OPTION_TYPES.has(type) ? type : fallback;
}
function parseTypeDescriptor(node) {
  const direct = first(node?.type);
  if (direct)
    return { defaultType: optionType(attr(direct, "name")), patterns: [] };
  const dependencyType = first(node?.dependencyType);
  if (!dependencyType)
    return { defaultType: "Optional", patterns: [] };
  const patterns = list(first(dependencyType.patterns)?.pattern).map((pattern) => ({
    dependency: parseDependency(first(pattern.dependencies)),
    type: optionType(attr(first(pattern.type), "name"))
  }));
  return {
    defaultType: optionType(attr(first(dependencyType.defaultType), "name")),
    patterns
  };
}
function parseOption(node, stepIndex, groupIndex, optionIndex) {
  const flags = {};
  for (const flag of list(first(node.conditionFlags)?.flag))
    flags[attr(flag, "name")] = text(flag);
  return {
    id: `s${stepIndex}:g${groupIndex}:o${optionIndex}`,
    name: attr(node, "name", `Option ${optionIndex + 1}`),
    description: text(first(node.description)) || void 0,
    image: attr(first(node.image), "path") || void 0,
    files: parseFiles(first(node.files)),
    flags,
    type: parseTypeDescriptor(first(node.typeDescriptor))
  };
}
function parseGroup(node, stepIndex, groupIndex) {
  const rawType = attr(node, "type", "SelectAny");
  const options = list(first(node.plugins)?.plugin).map((plugin, optionIndex) => parseOption(plugin, stepIndex, groupIndex, optionIndex));
  return {
    id: `s${stepIndex}:g${groupIndex}`,
    name: attr(node, "name", `Group ${groupIndex + 1}`),
    type: GROUP_TYPES.has(rawType) ? rawType : "SelectAny",
    options: ordered(options, parseOrder(attr(first(node.plugins), "order")))
  };
}
function parseStep(node, stepIndex) {
  const groupsRoot = first(node.optionalFileGroups);
  const groups = list(groupsRoot?.group).map((group, groupIndex) => parseGroup(group, stepIndex, groupIndex));
  return {
    id: `s${stepIndex}`,
    name: attr(node, "name", `Step ${stepIndex + 1}`),
    visible: first(node.visible) ? parseDependency(first(node.visible)) : void 0,
    groups: ordered(groups, parseOrder(attr(groupsRoot, "order")))
  };
}
function collectDependencyPaths(dependency, output) {
  if (!dependency)
    return;
  if (dependency.kind === "file" && dependency.path)
    output.add(dependency.path);
  for (const child of dependency.children || [])
    collectDependencyPaths(child, output);
}
function parseModuleConfig(parsed) {
  fileOrder = 0;
  const config = first(parsed.config);
  if (!config)
    throw new Error("FOMOD ModuleConfig.xml does not contain a config root");
  const stepsRoot = first(config.installSteps);
  const steps = list(stepsRoot?.installStep).map((step, index) => parseStep(step, index));
  const optionCount = steps.reduce((sum, step) => sum + step.groups.reduce((n, group) => n + group.options.length, 0), 0);
  if (optionCount > MAX_OPTIONS)
    throw new Error(`FOMOD contains too many options: ${optionCount}`);
  const conditionalFiles = list(first(config.conditionalFileInstalls)?.patterns?.[0]?.pattern).map((pattern) => ({
    dependency: parseDependency(first(pattern.dependencies)),
    files: parseFiles(first(pattern.files))
  }));
  const model = {
    moduleName: text(first(config.moduleName), "FOMOD Installer"),
    moduleImage: attr(first(config.moduleImage), "path") || void 0,
    moduleDependencies: first(config.moduleDependencies) ? parseDependency(first(config.moduleDependencies)) : void 0,
    requiredFiles: parseFiles(first(config.requiredInstallFiles)),
    steps: ordered(steps, parseOrder(attr(stepsRoot, "order"))),
    conditionalFiles,
    allFileDependencyPaths: []
  };
  const paths = /* @__PURE__ */ new Set();
  collectDependencyPaths(model.moduleDependencies, paths);
  for (const step of model.steps) {
    collectDependencyPaths(step.visible, paths);
    for (const group of step.groups) {
      for (const option of group.options) {
        for (const pattern of option.type.patterns)
          collectDependencyPaths(pattern.dependency, paths);
      }
    }
  }
  for (const pattern of model.conditionalFiles)
    collectDependencyPaths(pattern.dependency, paths);
  model.allFileDependencyPaths = [...paths];
  return model;
}

// ../../utils/fomod-utils/dist/parser/info.js
function parseInfoXml(parsed) {
  const root = first(parsed.fomod || parsed.Fomod || parsed.fomodInfo || Object.values(parsed)[0]);
  if (!root || typeof root !== "object")
    return {};
  return {
    name: text(first(root.Name || root.name)) || void 0,
    author: text(first(root.Author || root.author)) || void 0,
    version: text(first(root.Version || root.version)) || void 0,
    website: text(first(root.Website || root.website)) || void 0
  };
}

// ../../utils/fomod-utils/dist/installer/errors.js
var FomodError = class extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "FomodError";
    this.code = code;
    this.details = details;
  }
};
function asFomodError(error, fallbackCode = "FOMOD_INVALID_CONFIG") {
  if (error instanceof FomodError)
    return error;
  const value = error;
  return new FomodError(String(value?.code || fallbackCode), String(value?.message || value || "FOMOD installation failed"), value?.details);
}

// ../../utils/fomod-utils/dist/evaluator/dependencies.js
function evaluateDependency(dependency, state) {
  if (!dependency)
    return true;
  switch (dependency.kind) {
    case "all":
      return (dependency.children || []).every((child) => evaluateDependency(child, state));
    case "any":
      return (dependency.children || []).some((child) => evaluateDependency(child, state));
    case "flag":
      return state.flags[dependency.flag || ""] === String(dependency.value ?? "");
    case "file": {
      const expected = dependency.state || "Active";
      if (expected === "Inactive") {
        const error = new Error("Unsupported FOMOD feature: fileDependency Inactive state");
        error.code = "FOMOD_UNSUPPORTED_FEATURE";
        throw error;
      }
      return (state.files[dependency.path || ""] || "Missing") === expected;
    }
    case "unsupported": {
      const error = new Error(`Unsupported FOMOD feature: ${dependency.feature || "unknown dependency"}`);
      error.code = "FOMOD_UNSUPPORTED_FEATURE";
      throw error;
    }
  }
}
function resolveOptionType(descriptor, state) {
  for (const pattern of descriptor.patterns) {
    if (evaluateDependency(pattern.dependency, state))
      return pattern.type;
  }
  return descriptor.defaultType;
}

// ../../utils/fomod-utils/dist/evaluator/selection.js
function defaultSelections(group, optionTypes2) {
  const usable = group.options.filter((option) => optionTypes2[option.id] !== "NotUsable");
  const required = usable.filter((option) => optionTypes2[option.id] === "Required").map((option) => option.id);
  if (group.type === "SelectAll")
    return usable.map((option) => option.id);
  if (group.type === "SelectExactlyOne") {
    const preferred = usable.find((option) => optionTypes2[option.id] === "Recommended") || usable[0];
    return preferred ? [preferred.id] : [];
  }
  return [.../* @__PURE__ */ new Set([...required, ...usable.filter((option) => optionTypes2[option.id] === "Recommended").map((option) => option.id)])];
}
function validateStepSelections(step, selectedIds, optionTypes2) {
  const selected = new Set(selectedIds);
  const result = {};
  for (const group of step.groups) {
    const valid = group.options.filter((option) => selected.has(option.id) && optionTypes2[option.id] !== "NotUsable").map((option) => option.id);
    for (const option of group.options) {
      if (optionTypes2[option.id] === "Required" && !valid.includes(option.id))
        valid.push(option.id);
    }
    const usableCount = group.options.filter((option) => optionTypes2[option.id] !== "NotUsable").length;
    if (group.type === "SelectExactlyOne" && valid.length !== 1)
      throw new Error(`${group.name}: select exactly one option`);
    if (group.type === "SelectAtMostOne" && valid.length > 1)
      throw new Error(`${group.name}: select at most one option`);
    if (group.type === "SelectAtLeastOne" && valid.length < 1 && usableCount > 0)
      throw new Error(`${group.name}: select at least one option`);
    if (group.type === "SelectAll" && valid.length !== usableCount)
      throw new Error(`${group.name}: all usable options are required`);
    result[group.id] = valid;
  }
  return result;
}

// ../../utils/fomod-utils/dist/installer/files.js
function expandFileItems(items, archiveFiles, packageRoot) {
  const byLower = new Map(archiveFiles.map((source) => [source.replace(/\\/g, "/").toLowerCase(), source]));
  const mappings = [];
  for (const item of items) {
    const sourceBase = joinArchivePath(packageRoot, item.source);
    if (item.kind === "file") {
      const actual = byLower.get(sourceBase.toLowerCase());
      if (!actual)
        throw new Error(`FOMOD source file does not exist: ${item.source}`);
      const destination = item.destination || item.source.split("/").pop() || "";
      mappings.push({ source: actual, destination: normalizeArchivePath(destination), priority: item.priority, order: item.order });
      continue;
    }
    const prefix = `${sourceBase.toLowerCase().replace(/\/$/, "")}/`;
    const folderFiles = archiveFiles.filter((source) => source.replace(/\\/g, "/").toLowerCase().startsWith(prefix));
    for (const actual of folderFiles) {
      const normalizedActual = actual.replace(/\\/g, "/");
      const suffix = normalizedActual.slice(sourceBase.length).replace(/^\//, "");
      mappings.push({
        source: actual,
        destination: joinArchivePath(item.destination, suffix),
        priority: item.priority,
        order: item.order
      });
    }
  }
  mappings.sort((a, b) => a.priority - b.priority || a.order - b.order);
  const finalByDestination = /* @__PURE__ */ new Map();
  for (const mapping of mappings)
    finalByDestination.set(mapping.destination.toLowerCase(), mapping);
  return [...finalByDestination.values()].sort((a, b) => a.priority - b.priority || a.order - b.order).map((mapping) => ({
    type: "copy",
    source: mapping.source,
    destination: mapping.destination,
    verification: "exists",
    conflictPolicy: "overwrite"
  }));
}

// ../../utils/fomod-utils/dist/installer/images.js
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif"
};
async function loadImageDataUrl(imagePath, packageRoot, stagingPath, pathApi, fsApi) {
  if (!imagePath)
    return void 0;
  try {
    const relative = joinArchivePath(packageRoot, normalizeArchivePath(imagePath));
    const ext = relative.split(".").pop()?.toLowerCase() || "";
    const mime = MIME_BY_EXT[ext];
    if (!mime)
      return void 0;
    const content = await fsApi.readFileAsync(pathApi.join(stagingPath, relative));
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (buffer.length > MAX_IMAGE_BYTES)
      return void 0;
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return void 0;
  }
}

// ../../utils/fomod-utils/dist/installer/run.js
function flattenSelections(selections) {
  return new Set(Object.values(selections).flat());
}
function replayState(model, selections, files, throughStepIndex = model.steps.length - 1) {
  const state = { flags: {}, files };
  const selected = flattenSelections(selections);
  for (const step of model.steps.slice(0, throughStepIndex + 1)) {
    for (const group of step.groups) {
      for (const option of group.options) {
        if (selected.has(option.id))
          Object.assign(state.flags, option.flags);
      }
    }
  }
  return state;
}
function optionTypes(step, state) {
  return Object.fromEntries(step.groups.flatMap((group) => group.options.map((option) => [option.id, resolveOptionType(option.type, state)])));
}
function isStoredSelectionValid(model, stored, files) {
  try {
    const state = { flags: {}, files };
    if (!evaluateDependency(model.moduleDependencies, state))
      return false;
    for (const step of model.steps) {
      if (!evaluateDependency(step.visible, state)) {
        if ((stored.selections[step.id] || []).length > 0)
          return false;
        continue;
      }
      const knownIds = new Set(step.groups.flatMap((group) => group.options.map((option) => option.id)));
      if ((stored.selections[step.id] || []).some((id) => !knownIds.has(id)))
        return false;
      validateStepSelections(step, stored.selections[step.id] || [], optionTypes(step, state));
      const selected = new Set(stored.selections[step.id] || []);
      for (const group of step.groups) {
        for (const option of group.options) {
          if (selected.has(option.id))
            Object.assign(state.flags, option.flags);
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}
async function buildUiGroups(step, selectedIds, types, options) {
  return Promise.all(step.groups.map(async (group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    options: await Promise.all(group.options.map(async (option) => ({
      id: option.id,
      name: option.name,
      description: option.description,
      imageDataUrl: await loadImageDataUrl(option.image, options.packageRoot, options.stagingPath, options.pathApi, options.fsApi),
      type: types[option.id],
      selected: selectedIds.has(option.id),
      disabled: types[option.id] === "Required" || types[option.id] === "NotUsable" || group.type === "SelectAll"
    })))
  })));
}
function selectedOptions(model, selections) {
  const selected = flattenSelections(selections);
  return model.steps.flatMap((step) => step.groups.flatMap((group) => group.options.filter((option) => selected.has(option.id))));
}
function collectInstallFiles(model, selections, state) {
  const output = [...model.requiredFiles];
  const selected = flattenSelections(selections);
  for (const step of model.steps) {
    for (const group of step.groups) {
      for (const option of group.options) {
        const type = resolveOptionType(option.type, state);
        const includeOption = selected.has(option.id);
        for (const file of option.files) {
          if (includeOption || file.alwaysInstall || file.installIfUsable && type !== "NotUsable")
            output.push(file);
        }
      }
    }
  }
  for (const conditional of model.conditionalFiles) {
    if (evaluateDependency(conditional.dependency, state))
      output.push(...conditional.files);
  }
  return output;
}
async function runFomod(options) {
  const dependencyResult = await options.api.resolveFileDependencies(options.model.allFileDependencyPaths);
  const files = dependencyResult?.states || {};
  let selections = {};
  const stored = options.storedState;
  const hasMatchingStoredState = stored?.schemaVersion === 1 && stored.protocolVersion === "1.0" && stored.configHash === options.configHash;
  const canReuse = Boolean(hasMatchingStoredState && (options.reuseOnly || isStoredSelectionValid(options.model, stored, files)));
  if (options.reuseOnly && !canReuse) {
    throw new FomodError("FOMOD_INVALID_CONFIG", "A compatible saved FOMOD selection is required for silent reuse");
  }
  if (canReuse)
    selections = Object.fromEntries(Object.entries(stored.selections).map(([key, value]) => [key, [...value]]));
  let sessionId;
  if (!canReuse || options.forceInteractive) {
    sessionId = `fomod:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const moduleImageDataUrl = await loadImageDataUrl(options.model.moduleImage, options.packageRoot, options.stagingPath, options.pathApi, options.fsApi);
    let cursor = 0;
    try {
      while (cursor < options.model.steps.length) {
        const state2 = replayState(options.model, selections, files, cursor - 1);
        if (!evaluateDependency(options.model.moduleDependencies, state2))
          throw new FomodError("FOMOD_INVALID_CONFIG", "FOMOD module dependencies are not satisfied");
        const step = options.model.steps[cursor];
        if (!evaluateDependency(step.visible, state2)) {
          delete selections[step.id];
          cursor += 1;
          continue;
        }
        const types = optionTypes(step, state2);
        const existing = selections[step.id] || step.groups.flatMap((group) => defaultSelections(group, types));
        const projectedSelections = { ...selections, [step.id]: existing };
        const projectedState = replayState(options.model, projectedSelections, files, cursor);
        const response = await options.api.requestStep({
          sessionId,
          moduleName: options.model.moduleName === "FOMOD Installer" && options.info?.name ? options.info.name : options.model.moduleName,
          moduleAuthor: options.info?.author,
          moduleVersion: options.info?.version,
          moduleWebsite: options.info?.website,
          moduleImageDataUrl,
          stepId: step.id,
          stepName: step.name,
          stepIndex: cursor,
          totalSteps: options.model.steps.length,
          canGoBack: options.model.steps.slice(0, cursor).some((candidate, index) => evaluateDependency(candidate.visible, replayState(options.model, selections, files, index - 1))),
          isLastStep: options.model.steps.slice(cursor + 1).every((candidate) => !evaluateDependency(candidate.visible, projectedState)),
          groups: await buildUiGroups(step, new Set(existing), types, options)
        });
        if (response.action === "cancel")
          throw new FomodError("FOMOD_INSTALL_CANCELLED", "FOMOD installation was cancelled");
        if (response.action === "back") {
          delete selections[step.id];
          let previous = cursor - 1;
          while (previous > 0) {
            const candidate = options.model.steps[previous];
            const candidateState = replayState(options.model, selections, files, previous - 1);
            if (evaluateDependency(candidate.visible, candidateState))
              break;
            delete selections[candidate.id];
            previous -= 1;
          }
          cursor = Math.max(0, previous);
          continue;
        }
        const validated = validateStepSelections(step, response.selectedOptionIds || [], types);
        selections[step.id] = Object.values(validated).flat();
        for (const later of options.model.steps.slice(cursor + 1))
          delete selections[later.id];
        cursor += 1;
      }
    } catch (error) {
      await options.api.closeSession({ sessionId, status: error?.code === "FOMOD_INSTALL_CANCELLED" ? "cancelled" : "failed", message: String(error?.message || error) });
      throw error;
    }
  }
  const finalState = replayState(options.model, selections, files);
  for (const option of selectedOptions(options.model, selections))
    Object.assign(finalState.flags, option.flags);
  const selected = flattenSelections(selections);
  const groupSelections = Object.fromEntries(options.model.steps.flatMap((step) => step.groups.map((group) => [
    group.id,
    group.options.filter((option) => selected.has(option.id)).map((option) => option.id)
  ])));
  const state = {
    schemaVersion: 1,
    protocolVersion: "1.0",
    configHash: options.configHash,
    selections,
    groupSelections
  };
  const instructions = [
    ...expandFileItems(collectInstallFiles(options.model, selections, finalState), options.archiveFiles, options.packageRoot),
    { type: "attribute", key: "fomod", value: state }
  ];
  if (sessionId)
    await options.api.closeSession({ sessionId, status: "completed" });
  return { instructions, state };
}

// ../../utils/fomod-utils/dist/installer/register.js
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const cryptoApi = globalThis.crypto?.subtle;
  if (cryptoApi) {
    const digest = await cryptoApi.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new FomodError("FOMOD_UNSUPPORTED_FEATURE", "SHA-256 is unavailable in the extension runtime");
}
function isFomodPackage(files) {
  return findFomodRoot(files) !== null;
}
function registerFomodInstaller(contextValue, options) {
  const context = contextValue;
  const isTargetGame = (gameId) => String(gameId) === String(options.gameId);
  context.registerModType(options.typeId, 1e3, isTargetGame, () => "{gamePath}", () => false, {
    name: options.name || "FOMOD Installer"
  });
  context.registerInstaller(options.typeId, options.priority ?? 100, (files, gameId) => ({
    supported: isTargetGame(gameId) && isFomodPackage(files)
  }), async (files, stagingPath = "", deploymentOptions = {}) => {
    const located = findFomodRoot(files);
    if (!located)
      throw new FomodError("FOMOD_INVALID_CONFIG", "FOMOD ModuleConfig.xml was not found");
    if (files.some((file) => /(?:^|\/)fomod\/.*\.cs$/i.test(file.replace(/\\/g, "/")))) {
      throw new FomodError("FOMOD_UNSUPPORTED_FEATURE", "C# scripted FOMOD installers are not supported");
    }
    try {
      const configPhysicalPath = context.api.util.path.join(stagingPath, located.configPath);
      const raw = await context.api.util.fs.readFileAsync(configPhysicalPath, "utf8");
      const xml = String(raw);
      assertSafeXml(xml);
      assertSupportedXmlFeatures(xml);
      const parsed = await context.api.util.fileParseApi.parseXmlToObject(xml);
      const model = parseModuleConfig(parsed);
      let info;
      const expectedInfoPath = `${located.root ? `${located.root}/` : ""}fomod/info.xml`.toLowerCase();
      const infoPath = files.find((file) => file.replace(/\\/g, "/").toLowerCase() === expectedInfoPath);
      if (infoPath) {
        try {
          const infoXml = String(await context.api.util.fs.readFileAsync(context.api.util.path.join(stagingPath, infoPath), "utf8"));
          assertSafeXml(infoXml);
          info = parseInfoXml(await context.api.util.fileParseApi.parseXmlToObject(infoXml));
        } catch (error) {
          console.warn("[FOMOD] Failed to read optional info.xml metadata", error);
        }
      }
      const fomodOptions = deploymentOptions?.fomod || {};
      const result = await runFomod({
        model,
        configHash: await sha256(xml),
        archiveFiles: files,
        packageRoot: located.root,
        stagingPath,
        storedState: fomodOptions.storedState,
        forceInteractive: fomodOptions.mode === "reconfigure",
        reuseOnly: fomodOptions.mode === "reuse",
        info,
        api: context.api.util.fomod,
        pathApi: context.api.util.path,
        fsApi: context.api.util.fs
      });
      return { instructions: result.instructions, modTypeId: options.typeId };
    } catch (error) {
      throw asFomodError(error);
    }
  });
}

// src/installers/shared.ts
function copy(file, destination = file.path) {
  return { type: "copy", source: file.source, destination };
}
function copySame(files) {
  return files.map((file) => copy(file));
}
function filesUnder(files, prefix) {
  return files.filter((file) => isUnder(file, prefix));
}
function extraDestination(input, file) {
  return `${PATHS.extras}/${input.pkg.packageName}/${file.path}`;
}
function findUnsafeUnmappedFiles(input, mapped) {
  return input.pkg.files.filter((file) => !mapped.has(file.source) && !EXTRA_FILE_EXTENSIONS.has(extname(file.path)));
}
async function finalizeMappedInstall(input, modTypeId, mapped, attributes = []) {
  const unsafeRemaining = findUnsafeUnmappedFiles(input, mapped);
  if (unsafeRemaining.length > 0) {
    return installFallback(
      input,
      `\u8BC6\u522B\u51FA\u7684\u5B89\u88C5\u89C4\u5219\u672A\u8986\u76D6 ${unsafeRemaining.length} \u4E2A\u6587\u4EF6\uFF08\u4F8B\u5982 ${basename(unsafeRemaining[0].path)}\uFF09\u3002\u4E3A\u907F\u514D\u9759\u9ED8\u4E22\u6587\u4EF6\uFF0C\u5C06\u6309\u538B\u7F29\u5305\u539F\u59CB\u7ED3\u6784\u5B89\u88C5\u3002`
    );
  }
  const instructions = input.pkg.files.map((file) => mapped.get(file.source) || copy(file, extraDestination(input, file)));
  return { modTypeId, instructions: [...attributes, ...instructions] };
}
async function installFallback(input, reason) {
  await confirmInstall(
    input.context,
    "\u672A\u8BC6\u522B\u7684 Cyberpunk 2077 Mod \u7ED3\u6784",
    `${reason ? `${reason}

` : ""}\u6B64 Mod \u5C06\u6309\u538B\u7F29\u5305\u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84\u90E8\u7F72\u5230\u6E38\u620F\u6839\u76EE\u5F55\u3002\u8BF7\u786E\u8BA4\u538B\u7F29\u5305\u672C\u8EAB\u5DF2\u7ECF\u4F7F\u7528\u6B63\u786E\u7684\u6E38\u620F\u76EE\u5F55\u7ED3\u6784\u3002`
  );
  return { modTypeId: MOD_TYPE.fallback, instructions: copySame(input.pkg.files) };
}
async function readText(input, file) {
  const fullPath = input.context.api.util.path.join(input.stagingPath, file.source);
  const result = await input.context.api.util.fs.readFile(fullPath, "utf8");
  return typeof result === "string" ? result : result.toString("utf8");
}
function mapInstruction(mapped, file, destination = file.path) {
  mapped.set(file.source, copy(file, destination));
}
function mapSame(mapped, files) {
  for (const file of files) mapInstruction(mapped, file);
}

// src/installers/amm.ts
var AMM_COLLAB_DIRS = [
  "Custom Appearances",
  "Custom Entities",
  "Custom Poses",
  "Custom Props"
];
var AMM_USER_DIRS = ["Decor", "Locations", "Scripts", "Themes"];
function isCanonicalAmm(file) {
  return isUnder(file, `${PATHS.amm}/Collabs`) || isUnder(file, `${PATHS.amm}/User`);
}
function isTopLevelAmmTree(file) {
  return isUnder(file, "Collabs") || isUnder(file, "User");
}
async function looseAmmDestination(input, file) {
  if (file.path.includes("/")) return null;
  const extension = extname(file.path);
  if (![".lua", ".json"].includes(extension)) return null;
  let text2;
  try {
    text2 = await readText(input, file);
  } catch {
    return null;
  }
  if (extension === ".lua") {
    const matchers = [
      [[/modder\s*=/i, /unique_identifier\s*=/i, /entity_id\s*=/i, /appearances\s*=/i], AMM_COLLAB_DIRS[0]],
      [[/modder\s*=/i, /unique_identifier\s*=/i, /entity_info\s*=/i], AMM_COLLAB_DIRS[1]],
      [[/modder\s*=/i, /category\s*=/i, /entity_path\s*=/i, /anims\s*=/i], AMM_COLLAB_DIRS[2]],
      [[/modder\s*=/i, /unique_identifier\s*=/i, /props\s*=/i], AMM_COLLAB_DIRS[3]]
    ];
    const found = matchers.find(([patterns]) => patterns.every((pattern) => pattern.test(text2)));
    return found ? `${PATHS.amm}/Collabs/${found[1]}/${basename(file.path)}` : null;
  }
  try {
    const value = JSON.parse(text2);
    const keys = new Set(Object.keys(value));
    const matchers = [
      [["name", "props", "lights"], AMM_USER_DIRS[0]],
      [["x", "y", "z"], AMM_USER_DIRS[1]],
      [["title", "actors"], AMM_USER_DIRS[2]],
      [["Text", "Border"], AMM_USER_DIRS[3]]
    ];
    const found = matchers.find(([required]) => required.every((key) => keys.has(key)));
    return found ? `${PATHS.amm}/User/${found[1]}/${basename(file.path)}` : null;
  } catch {
    return null;
  }
}
async function hasAmm(input) {
  if (input.pkg.files.some((file) => isCanonicalAmm(file) || isTopLevelAmmTree(file))) return true;
  for (const file of input.pkg.files) {
    if (await looseAmmDestination(input, file)) return true;
  }
  return false;
}
var ammCandidate = {
  id: "Appearance Menu Mod Content",
  modTypeId: MOD_TYPE.amm,
  matches: hasAmm,
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapSame(mapped, input.pkg.files.filter(isCanonicalAmm));
    for (const file of input.pkg.files.filter(isTopLevelAmmTree)) {
      mapInstruction(mapped, file, `${PATHS.amm}/${file.path}`);
    }
    for (const file of input.pkg.files) {
      if (mapped.has(file.source)) continue;
      const destination = await looseAmmDestination(input, file);
      if (destination) mapInstruction(mapped, file, destination);
    }
    return finalizeMappedInstall(input, MOD_TYPE.amm, mapped);
  }
};

// src/installers/config.ts
var JSON_PROTECTED_PATHS = /* @__PURE__ */ new Set([
  ...Object.values(JSON_CANONICAL_PATHS).map((path4) => path4.toLowerCase()),
  "r6/config/settings/options.json",
  "r6/config/settings/platform/pc/options.json"
]);
function isJsonInProtectedTree(file) {
  return (isUnder(file, "engine/config") || isUnder(file, "r6/config")) && extname(file.path) === ".json";
}
function hasJsonConfig(files, canonicalOnly = false) {
  if (files.some((file) => JSON_PROTECTED_PATHS.has(file.lower) || isJsonInProtectedTree(file))) return true;
  if (canonicalOnly) return false;
  return files.some((file) => !file.path.includes("/") && [...Object.keys(JSON_CANONICAL_PATHS), "options.json"].includes(basename(file.lower)));
}
function mapJsonConfig(files, mapped) {
  let protectedFiles = false;
  let unresolved = false;
  for (const file of files) {
    if (JSON_PROTECTED_PATHS.has(file.lower)) {
      protectedFiles = true;
      mapInstruction(mapped, file);
      continue;
    }
    if (file.path.includes("/") || extname(file.path) !== ".json") continue;
    const name = basename(file.lower);
    const target = JSON_CANONICAL_PATHS[name];
    if (target) {
      protectedFiles = true;
      mapInstruction(mapped, file, target);
    } else if (name === "options.json") {
      unresolved = true;
    }
  }
  return { protected: protectedFiles, unresolved };
}
function xmlKind(file) {
  if (extname(file.path) !== ".xml") return null;
  if (dirname(file.lower) === PATHS.xmlConfig.toLowerCase()) {
    return XML_PROTECTED_NAMES.has(basename(file.lower)) ? "protected" : "canonical";
  }
  if (dirname(file.lower) === PATHS.xmlInput.toLowerCase()) return "mergeable";
  if (!file.path.includes("/") && XML_PROTECTED_NAMES.has(basename(file.lower))) return "toplevel";
  return null;
}
function hasXmlConfig(files, canonicalOnly = false) {
  return files.some((file) => {
    const kind = xmlKind(file);
    return kind !== null && (!canonicalOnly || kind !== "toplevel");
  });
}
function mapXmlConfig(files, mapped) {
  let protectedFiles = false;
  for (const file of files) {
    const kind = xmlKind(file);
    if (!kind) continue;
    if (kind === "protected" || kind === "toplevel") protectedFiles = true;
    mapInstruction(mapped, file, kind === "toplevel" ? `${PATHS.xmlConfig}/${basename(file.path)}` : file.path);
  }
  return { protected: protectedFiles };
}
function hasIni(files) {
  const hasIniFile = files.some((file) => extname(file.path) === ".ini");
  const belongsToScriptMod = files.some((file) => basename(file.lower) === "init.lua" || extname(file.path) === ".reds");
  return hasIniFile && !belongsToScriptMod && !files.some((file) => file.lower === "bin/x64/global.ini");
}
async function looksLikeReshade(input, ini2) {
  try {
    const text2 = (await readText(input, ini2)).slice(0, 16384);
    return /(^|\r?\n)\s*(Techniques|TechniqueSorting|PreprocessorDefinitions|TextureSearchPaths|EffectSearchPaths)\s*=/im.test(text2) || /(^|\r?\n)\s*\[(GENERAL|INPUT|STYLE)\]\s*$/im.test(text2);
  } catch {
    return false;
  }
}
var jsonConfig = {
  id: "JSON Config",
  modTypeId: MOD_TYPE.jsonConfig,
  matches: ({ pkg }) => hasJsonConfig(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    const state = mapJsonConfig(input.pkg.files, mapped);
    if (state.unresolved) {
      return installFallback(input, "\u9876\u5C42 options.json \u65E0\u6CD5\u53EF\u9760\u5224\u65AD\u5C5E\u4E8E r6/config/settings \u8FD8\u662F platform/pc\u3002");
    }
    if (mapped.size === 0) return finalizeMappedInstall(input, MOD_TYPE.jsonConfig, mapped);
    if (findUnsafeUnmappedFiles(input, mapped).length > 0) {
      return finalizeMappedInstall(input, MOD_TYPE.jsonConfig, mapped);
    }
    if (state.protected) {
      await confirmInstall(input.context, "\u5B89\u88C5\u53D7\u4FDD\u62A4\u7684 JSON \u914D\u7F6E", "\u8BE5 Mod \u4F1A\u8986\u76D6 Cyberpunk 2077 \u7684\u6838\u5FC3 JSON \u914D\u7F6E\u6587\u4EF6\u3002\u8BF7\u786E\u8BA4\u5176\u4E0E\u5F53\u524D\u6E38\u620F\u7248\u672C\u517C\u5BB9\u3002");
    }
    return finalizeMappedInstall(input, MOD_TYPE.jsonConfig, mapped);
  }
};
var xmlConfig = {
  id: "XML Config",
  modTypeId: MOD_TYPE.xmlConfig,
  matches: ({ pkg }) => hasXmlConfig(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    const state = mapXmlConfig(input.pkg.files, mapped);
    if (findUnsafeUnmappedFiles(input, mapped).length > 0) {
      return finalizeMappedInstall(input, MOD_TYPE.xmlConfig, mapped);
    }
    if (state.protected) {
      await confirmInstall(input.context, "\u5B89\u88C5\u53D7\u4FDD\u62A4\u7684 XML \u914D\u7F6E", "\u8BE5 Mod \u4F1A\u8986\u76D6 inputContexts\u3001inputUserMappings \u7B49\u8F93\u5165\u914D\u7F6E\u3002\u8BF7\u786E\u8BA4\u5176\u4E0E\u5F53\u524D\u6E38\u620F\u7248\u672C\u53CA\u5176\u4ED6\u8F93\u5165 Mod \u517C\u5BB9\u3002");
    }
    return finalizeMappedInstall(input, MOD_TYPE.xmlConfig, mapped);
  }
};
var ini = {
  id: "INI / ReShade",
  modTypeId: MOD_TYPE.ini,
  matches: ({ pkg }) => hasIni(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    const iniFiles = input.pkg.files.filter((file) => extname(file.path) === ".ini");
    const reshade = iniFiles.length > 0 && await looksLikeReshade(input, iniFiles[0]);
    for (const file of iniFiles) {
      mapInstruction(mapped, file, `${reshade ? PATHS.reshade : PATHS.iniConfig}/${basename(file.path)}`);
    }
    if (reshade) {
      for (const file of input.pkg.files) {
        const marker = "/reshade-shaders/";
        const index = `/${file.lower}`.indexOf(marker);
        if (index < 0) continue;
        const suffix = file.path.slice(index);
        mapInstruction(mapped, file, `${PATHS.reshade}/${suffix}`);
      }
    }
    return finalizeMappedInstall(input, MOD_TYPE.ini, mapped);
  }
};
var CONFIG_CANDIDATES = { ini, jsonConfig, xmlConfig };

// src/installers/core.ts
var REDSCRIPT_CURRENT = [
  "engine/config/base/scripts.ini",
  "engine/tools/scc.exe",
  "r6/config/cybercmd/scc.toml"
];
var REDSCRIPT_DEPRECATED = [
  "engine/config/base/scripts.ini",
  "engine/tools/scc.exe",
  "r6/scripts/redscript.toml"
];
var RED4EXT_BASE = ["red4ext/license.txt", "red4ext/red4ext.dll"];
var RED4EXT_CURRENT_EXTRA = "red4ext/third_party_licenses.txt";
var INPUT_LOADER_CURRENT = [
  "engine/config/platform/pc/input_loader.ini",
  "r6/cache/inputcontexts.xml",
  "r6/cache/inputusermappings.xml",
  "red4ext/plugins/input_loader/input_loader.dll",
  "red4ext/plugins/input_loader/inputusermappings.xml",
  "red4ext/plugins/input_loader/license.md",
  "red4ext/plugins/input_loader/readme.md"
];
var INPUT_LOADER_011 = [
  "red4ext/plugins/input_loader/input_loader.dll",
  "red4ext/plugins/input_loader/inputusermappings.xml",
  "red4ext/plugins/input_loader/license.md",
  "red4ext/plugins/input_loader/readme.md",
  "red4ext/plugins/input_loader_uninstall.bat"
];
var INPUT_LOADER_010 = [
  "red4ext/plugins/input_loader/input_loader.dll",
  "red4ext/plugins/input_loader/inputusermappings.xml"
];
var MOD_SETTINGS = [
  "red4ext/plugins/mod_settings/modsettings.archive",
  "red4ext/plugins/mod_settings/modsettings.archive.xl",
  "red4ext/plugins/mod_settings/mod_settings.dll",
  "red4ext/plugins/mod_settings/module.reds",
  "red4ext/plugins/mod_settings/packed.reds",
  "red4ext/plugins/mod_settings/license.md",
  "red4ext/plugins/mod_settings/readme.md"
];
var TWEAK_XL = [
  "red4ext/plugins/tweakxl/tweakxl.dll",
  "red4ext/plugins/tweakxl/scripts/tweakxl.global.reds",
  "red4ext/plugins/tweakxl/scripts/tweakxl.reds",
  "red4ext/plugins/tweakxl/data/extraflats.dat",
  "red4ext/plugins/tweakxl/data/inheritancemap.dat",
  "red4ext/plugins/tweakxl/license",
  "red4ext/plugins/tweakxl/third_party_licenses"
];
var AUDIOWARE = [
  "red4ext/plugins/audioware/audioware.dll",
  ...["Codeware", "Config", "Ext", "Hooks", "Natives", "Preset", "Service", "Settings", "System", "Tween", "Utils"].map((name) => `r6/scripts/audioware/${name.toLowerCase()}.reds`)
];
var ARCHIVE_XL = [
  "r6/config/redsuserhints/archivexl.toml",
  "red4ext/plugins/archivexl/archivexl.dll",
  "red4ext/plugins/archivexl/bundle/archivexl.archive",
  "red4ext/plugins/archivexl/bundle/photomodescope.xl",
  "red4ext/plugins/archivexl/bundle/playerbasescope.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationbeardfix.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationbeardscope.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationbrowsfix.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationbrowspatch.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationbrowsscope.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationhairfix.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationhairpatch.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationhairscope.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationlashesfix.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationlashespatch.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationlashesscope.xl",
  "red4ext/plugins/archivexl/bundle/playercustomizationscope.xl",
  "red4ext/plugins/archivexl/bundle/questbasescope.xl",
  "red4ext/plugins/archivexl/license",
  "red4ext/plugins/archivexl/scripts/archivexl.global.reds",
  "red4ext/plugins/archivexl/scripts/archivexl.reds",
  "red4ext/plugins/archivexl/third_party_licenses"
];
var CYBERCAT_EXECUTABLE = "cp2077saveeditor.exe";
var CYBERCAT = [
  CYBERCAT_EXECUTABLE,
  "d3dcompiler_47_cor3.dll",
  "e_sqlite3.dll",
  "kraken.dll",
  "penimc_cor3.dll",
  "presentationnative_cor3.dll",
  "vcruntime140_cor3.dll",
  "wpfgfx_cor3.dll"
];
var AMM_CORE = [
  `${PATHS.amm}/init.lua`,
  `${PATHS.amm}/db.sqlite3`,
  `${PATHS.amm}/collabs/api.lua`,
  `${PATHS.archive}/basegame_amm_props.archive`
];
var CYBERSCRIPT = [
  "bin/x64/plugins/immersiveroleplayframework.asi",
  `${PATHS.cetMods}/quest_mod/init.lua`
];
function success(input, modTypeId) {
  return { modTypeId, instructions: copySame(input.pkg.files) };
}
function missing(name) {
  throw new Error(`${name} \u538B\u7F29\u5305\u770B\u8D77\u6765\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u62D2\u7EDD\u6309\u6846\u67B6\u672C\u4F53\u5B89\u88C5\u3002`);
}
function strictCandidate(id, modTypeId, marker, required) {
  return {
    id,
    modTypeId,
    matches: ({ pkg }) => hasPath(pkg.files, marker),
    install: (input) => {
      if (!hasAllPaths(input.pkg.files, required)) missing(id);
      return success(input, modTypeId);
    }
  };
}
var coreCet = {
  id: "Core CET",
  modTypeId: MOD_TYPE.coreCet,
  matches: ({ pkg }) => hasPath(pkg.files, "bin/x64/plugins/cyber_engine_tweaks.asi"),
  install: (input) => success(input, MOD_TYPE.coreCet)
};
var coreRedscript = {
  id: "Core redscript",
  modTypeId: MOD_TYPE.coreRedscript,
  matches: ({ pkg }) => hasPath(pkg.files, "engine/tools/scc.exe"),
  install: async (input) => {
    if (hasAllPaths(input.pkg.files, REDSCRIPT_CURRENT)) return success(input, MOD_TYPE.coreRedscript);
    if (!hasAllPaths(input.pkg.files, REDSCRIPT_DEPRECATED)) missing("redscript");
    await confirmInstall(input.context, "\u65E7\u7248 redscript", "\u8BE5\u538B\u7F29\u5305\u4F7F\u7528\u5DF2\u5F03\u7528\u7684 redscript \u5E03\u5C40\uFF0C\u53EF\u80FD\u4E0D\u517C\u5BB9\u5F53\u524D\u6E38\u620F\u7248\u672C\u3002");
    return success(input, MOD_TYPE.coreRedscript);
  }
};
var coreRed4ext = {
  id: "Core RED4ext",
  modTypeId: MOD_TYPE.coreRed4ext,
  matches: ({ pkg }) => hasPath(pkg.files, "red4ext/red4ext.dll"),
  install: async (input) => {
    const files = input.pkg.files;
    const baseOk = hasAllPaths(files, RED4EXT_BASE);
    const current = baseOk && hasPath(files, RED4EXT_CURRENT_EXTRA) && (hasPath(files, "bin/x64/winmm.dll") || hasPath(files, "bin/x64/d3d11.dll"));
    const deprecated = baseOk && hasPath(files, "bin/x64/powrprof.dll");
    if (!current && !deprecated) missing("RED4ext");
    if (deprecated) {
      await confirmInstall(input.context, "\u65E7\u7248 RED4ext", "\u8BE5\u538B\u7F29\u5305\u4F7F\u7528 powrprof.dll \u6CE8\u5165\u65B9\u5F0F\uFF0C\u5DF2\u88AB RED4ext \u5F03\u7528\u3002");
    }
    return success(input, MOD_TYPE.coreRed4ext);
  }
};
var blockedCsvMerge = {
  id: "Deprecated CSVMerge",
  modTypeId: MOD_TYPE.fallback,
  matches: ({ pkg }) => hasPath(pkg.files, "csvmerge/csvmerge.cmd"),
  install: () => {
    throw new Error("CSVMerge \u5DF2\u5F03\u7528\uFF0C\u8BF7\u6539\u7528 TweakXL / ArchiveXL\u3002");
  }
};
var blockedWolvenKit = {
  id: "Deprecated WolvenKit CLI",
  modTypeId: MOD_TYPE.fallback,
  matches: ({ pkg }) => pkg.files.some((file) => file.lower === "wolvenkit cli/wolvenkit.cli.exe" || file.lower.startsWith("wolvenkit desktop/")),
  install: () => {
    throw new Error("WolvenKit CLI/Desktop \u4E0D\u80FD\u4F5C\u4E3A\u6E38\u620F Mod \u5B89\u88C5\u3002");
  }
};
var coreInputLoader = {
  id: "Core Input Loader",
  modTypeId: MOD_TYPE.coreInputLoader,
  matches: ({ pkg }) => hasPath(pkg.files, "red4ext/plugins/input_loader/input_loader.dll"),
  install: async (input) => {
    if (hasAllPaths(input.pkg.files, INPUT_LOADER_CURRENT)) return success(input, MOD_TYPE.coreInputLoader);
    const is011 = hasAllPaths(input.pkg.files, INPUT_LOADER_011);
    const is010 = hasAllPaths(input.pkg.files, INPUT_LOADER_010);
    if (!is011 && !is010) missing("Input Loader");
    await confirmInstall(input.context, "\u65E7\u7248 Input Loader", "\u8BE5\u538B\u7F29\u5305\u4F7F\u7528\u65E7\u7248 Input Loader \u5E03\u5C40\uFF0C\u5C06\u8865\u5145 input_loader.ini\u3002");
    const instructions = copySame(input.pkg.files);
    if (!hasPath(input.pkg.files, "engine/config/platform/pc/input_loader.ini")) {
      instructions.unshift({
        type: "generatefile",
        data: "[Player/Input]\n",
        destination: "engine/config/platform/pc/input_loader.ini"
      });
    }
    return { modTypeId: MOD_TYPE.coreInputLoader, instructions };
  }
};
var coreCyberCat = {
  id: "Core CyberCAT",
  modTypeId: MOD_TYPE.coreCyberCat,
  matches: ({ pkg }) => hasPath(pkg.files, CYBERCAT_EXECUTABLE),
  install: (input) => {
    if (!hasAllPaths(input.pkg.files, CYBERCAT)) missing("CyberCAT");
    notify(input.context, "CyberCAT \u5DF2\u5B89\u88C5", "CyberCAT \u662F\u72EC\u7ACB\u5DE5\u5177\uFF1B\u542F\u7528\u5E76\u90E8\u7F72\u540E\u8BF7\u4ECE\u6E38\u620F\u76EE\u5F55\u7684 CyberCAT \u6587\u4EF6\u5939\u624B\u52A8\u542F\u52A8\u3002", "info");
    return {
      modTypeId: MOD_TYPE.coreCyberCat,
      instructions: input.pkg.files.map((file) => copy(file, `${PATHS.cyberCat}/${file.path}`))
    };
  }
};
var CORE_CANDIDATES = [
  coreCet,
  coreRedscript,
  coreRed4ext,
  blockedCsvMerge,
  blockedWolvenKit,
  strictCandidate("Core Audioware", MOD_TYPE.coreAudioware, AUDIOWARE[0], AUDIOWARE),
  strictCandidate("Core TweakXL", MOD_TYPE.coreTweakXL, TWEAK_XL[0], TWEAK_XL),
  strictCandidate("Core ArchiveXL", MOD_TYPE.coreArchiveXL, ARCHIVE_XL[1], ARCHIVE_XL),
  coreInputLoader,
  strictCandidate("Core Mod Settings", MOD_TYPE.coreModSettings, MOD_SETTINGS[2], MOD_SETTINGS),
  coreCyberCat,
  strictCandidate("Core Appearance Menu Mod", MOD_TYPE.coreAmm, AMM_CORE[0], AMM_CORE),
  strictCandidate("Core CyberScript", MOD_TYPE.coreCyberScript, CYBERSCRIPT[0], CYBERSCRIPT)
];

// src/installers/red4ext/safety.ts
var RED4EXT_RESERVED_DLL_DIRECTORY = "bin/x64";
function isDangerousRed4extDll(file) {
  if (extname(file.path) !== ".dll") return false;
  const directory = dirname(file.lower);
  const isReservedDirectory = directory === RED4EXT_RESERVED_DLL_DIRECTORY;
  const isReservedTopLevelName = directory === "" && RED4EXT_RESERVED_DLLS.has(basename(file.lower));
  return isReservedDirectory || isReservedTopLevelName;
}
function findDangerousRed4extDlls(files) {
  return files.filter(isDangerousRed4extDll);
}
function assertSafeRed4ext(files) {
  const dangerous = findDangerousRed4extDlls(files);
  if (dangerous.length === 0) return;
  throw new Error(`RED4ext Mod \u5305\u542B\u7981\u6B62\u8986\u76D6\u7684\u8FD0\u884C\u5E93 DLL\uFF1A${dangerous.map((file) => file.path).join(", ")}`);
}

// src/installers/gameplay.ts
var CET_PREFIX = `${PATHS.cetMods.toLowerCase()}/`;
var REDSCRIPT_PREFIX = `${PATHS.redscript.toLowerCase()}/`;
var RED4EXT_PREFIX = `${PATHS.red4extPlugins.toLowerCase()}/`;
function hasAsi(files) {
  return files.some((file) => isUnder(file, "bin/x64/plugins") && extname(file.path) === ".asi");
}
function hasCet(files) {
  return files.some((file) => {
    if (!file.lower.startsWith(CET_PREFIX)) return false;
    const relative = file.lower.slice(CET_PREFIX.length).split("/");
    return relative.length === 2 && relative[1] === "init.lua";
  });
}
function hasRedscript(files, canonicalOnly = false) {
  const hasScripts = files.some((file) => file.lower.startsWith(REDSCRIPT_PREFIX) && extname(file.path) === ".reds");
  const hasHints = files.some((file) => isUnder(file, PATHS.redscriptHints) && extname(file.path) === ".toml");
  const topLevel = !canonicalOnly && files.some((file) => !file.path.includes("/") && extname(file.path) === ".reds");
  return hasScripts || hasHints || topLevel;
}
function hasTweakXL(files) {
  return files.some((file) => isUnder(file, PATHS.tweakXL) && [".yaml", ".yml"].includes(extname(file.path)));
}
function hasAudioware(files) {
  return files.some((file) => isUnder(file, PATHS.audioware) && [".yaml", ".yml", ".wav", ".ogg", ".mp3", ".flac"].includes(extname(file.path)));
}
function hasArchive(files, canonicalOnly = false) {
  return files.some((file) => {
    if (file.lower.startsWith("mods/")) return false;
    const archive2 = [".archive", ".xl"].includes(extname(file.path));
    return archive2 && (!canonicalOnly || isUnder(file, PATHS.archive) || isUnder(file, PATHS.legacyArchive));
  });
}
function dllFiles(files) {
  return files.filter((file) => extname(file.path) === ".dll");
}
function hasRed4ext(files, canonicalOnly = false) {
  if (hasPath(files, "red4ext/red4ext.dll")) return false;
  return dllFiles(files).some((file) => {
    if (canonicalOnly) return file.lower.startsWith(RED4EXT_PREFIX);
    return isDangerousRed4extDll(file) || file.lower.startsWith(RED4EXT_PREFIX) || !file.path.includes("/") || dirname(file.path).split("/").length === 1;
  });
}
function mapArchiveFiles(files, mapped) {
  for (const file of files) {
    if (file.lower.startsWith("mods/")) continue;
    const extension = extname(file.path);
    if (![".archive", ".xl"].includes(extension)) continue;
    if (isUnder(file, PATHS.archive)) {
      mapInstruction(mapped, file);
    } else if (isUnder(file, PATHS.legacyArchive)) {
      mapInstruction(mapped, file, `${PATHS.archive}/${relativeTo(file, PATHS.legacyArchive)}`);
    } else {
      mapInstruction(mapped, file, `${PATHS.archive}/${file.path}`);
    }
  }
}
function mapCetFiles(files, mapped) {
  mapSame(mapped, filesUnder(files, PATHS.cetMods));
}
function mapRedscriptFiles(input, mapped, canonicalOnly = false) {
  const scripts = filesUnder(input.pkg.files, PATHS.redscript);
  const hasDirectReds = scripts.some((file) => dirname(file.lower) === PATHS.redscript.toLowerCase() && extname(file.path) === ".reds");
  for (const file of scripts) {
    const destination = hasDirectReds ? `${PATHS.redscript}/${input.pkg.packageName}/${relativeTo(file, PATHS.redscript)}` : file.path;
    mapInstruction(mapped, file, destination);
  }
  mapSame(mapped, filesUnder(input.pkg.files, PATHS.redscriptHints).filter((file) => extname(file.path) === ".toml"));
  if (!canonicalOnly) {
    const topLevelReds = input.pkg.files.filter((file) => !file.path.includes("/") && extname(file.path) === ".reds");
    if (topLevelReds.length > 0) {
      for (const file of input.pkg.files) {
        mapInstruction(mapped, file, `${PATHS.redscript}/${input.pkg.packageName}/${file.path}`);
      }
    }
  }
}
function mapTweakXLFiles(files, mapped) {
  for (const file of filesUnder(files, PATHS.tweakXL)) {
    if ([".yaml", ".yml"].includes(extname(file.path))) mapInstruction(mapped, file);
  }
}
function mapAudiowareFiles(files, mapped) {
  for (const file of filesUnder(files, PATHS.audioware)) {
    if ([".yaml", ".yml", ".wav", ".ogg", ".mp3", ".flac"].includes(extname(file.path))) mapInstruction(mapped, file);
  }
}
function mapRed4extFiles(input, mapped, canonicalOnly = false) {
  const files = input.pkg.files;
  try {
    assertSafeRed4ext(files);
  } catch (error) {
    notify(input.context, "\u5DF2\u963B\u6B62\u5371\u9669\u7684 RED4ext DLL", String(error?.message || error), "error");
    throw error;
  }
  const underBase = filesUnder(files, PATHS.red4extPlugins);
  const directDll = underBase.some((file) => dirname(file.lower) === PATHS.red4extPlugins.toLowerCase() && extname(file.path) === ".dll");
  if (underBase.length > 0) {
    for (const file of underBase) {
      const destination = directDll ? `${PATHS.red4extPlugins}/${input.pkg.packageName}/${relativeTo(file, PATHS.red4extPlugins)}` : file.path;
      mapInstruction(mapped, file, destination);
    }
    return;
  }
  if (canonicalOnly) return;
  const topLevelDll = files.some((file) => !file.path.includes("/") && extname(file.path) === ".dll");
  if (topLevelDll) {
    for (const file of files) {
      mapInstruction(mapped, file, `${PATHS.red4extPlugins}/${input.pkg.packageName}/${file.path}`);
    }
    return;
  }
  const dllRoots = new Set(
    dllFiles(files).filter((file) => dirname(file.path).split("/").length === 1).map((file) => file.path.split("/")[0])
  );
  if (dllRoots.size === 1) {
    const root = [...dllRoots][0];
    for (const file of files.filter((entry) => entry.path === root || entry.path.startsWith(`${root}/`))) {
      mapInstruction(mapped, file, `${PATHS.red4extPlugins}/${file.path}`);
    }
  }
}
var asi = {
  id: "ASI",
  modTypeId: MOD_TYPE.asi,
  matches: ({ pkg }) => hasAsi(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapSame(mapped, filesUnder(input.pkg.files, "bin/x64/plugins"));
    return finalizeMappedInstall(input, MOD_TYPE.asi, mapped);
  }
};
var red4ext = {
  id: "RED4ext Mod",
  modTypeId: MOD_TYPE.red4ext,
  matches: ({ pkg }) => hasRed4ext(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapRed4extFiles(input, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.red4ext, mapped);
  }
};
var cet = {
  id: "CET Mod",
  modTypeId: MOD_TYPE.cet,
  matches: ({ pkg }) => hasCet(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapCetFiles(input.pkg.files, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.cet, mapped);
  }
};
var redscript = {
  id: "redscript Mod",
  modTypeId: MOD_TYPE.redscript,
  matches: ({ pkg }) => hasRedscript(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapRedscriptFiles(input, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.redscript, mapped);
  }
};
var audioware = {
  id: "Audioware Mod",
  modTypeId: MOD_TYPE.audioware,
  matches: ({ pkg }) => hasAudioware(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapAudiowareFiles(input.pkg.files, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.audioware, mapped);
  }
};
var tweakXL = {
  id: "TweakXL Mod",
  modTypeId: MOD_TYPE.tweakXL,
  matches: ({ pkg }) => hasTweakXL(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapTweakXLFiles(input.pkg.files, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.tweakXL, mapped);
  }
};
var archive = {
  id: "Archive / ArchiveXL Mod",
  modTypeId: MOD_TYPE.archive,
  matches: ({ pkg }) => hasArchive(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    mapArchiveFiles(input.pkg.files, mapped);
    const destinations = [...mapped.values()].filter((item) => item.type === "copy").map((item) => item.destination.toLowerCase());
    const nested = destinations.some((destination) => destination.slice(`${PATHS.archive}/`.length).includes("/"));
    const nestedXl = destinations.some((destination) => destination.endsWith(".xl") && destination.slice(`${PATHS.archive}/`.length).includes("/"));
    if (nested || nestedXl) {
      notify(
        input.context,
        "Archive Mod \u8DEF\u5F84\u9700\u8981\u68C0\u67E5",
        "\u6B64\u538B\u7F29\u5305\u4F1A\u5728 archive/pc/mod \u4E0B\u4FDD\u7559\u5B50\u76EE\u5F55\uFF1BCyberpunk 2077 \u6216 ArchiveXL \u4E0D\u4E00\u5B9A\u4F1A\u52A0\u8F7D\u8BE5\u5E03\u5C40\u3002"
      );
    }
    return finalizeMappedInstall(input, MOD_TYPE.archive, mapped);
  }
};
var GAMEPLAY_CANDIDATES = { asi, red4ext, cet, redscript, audioware, tweakXL, archive };

// src/installers/redmod.ts
function hasRedmod(files, canonicalOnly = false) {
  return hasRedmodInfo(files, canonicalOnly);
}
async function mapRedmods(input, mapped, canonicalOnly = false) {
  const roots = await findRedmodRoots(input.pkg, (file) => readText(input, file), canonicalOnly);
  if (roots.length === 0) return [];
  for (const root of roots) {
    const rootFiles = validateRedmodRoot(input.pkg, root);
    for (const file of rootFiles) {
      const relative = relativeFromRedmodRoot(file, root.sourceRoot) || basename(file.path);
      mapInstruction(mapped, file, `${root.destinationRoot}/${relative}`);
    }
  }
  return [
    { type: "attribute", key: "cyberpunkRedmodInfo", value: metadataFromRoots(roots) },
    { type: "attribute", key: "cyberpunkRedmodRequiresDeploy", value: true }
  ];
}
var redmodCandidate = {
  id: "REDmod",
  modTypeId: MOD_TYPE.redmod,
  matches: ({ pkg }) => hasRedmod(pkg.files),
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    const attributes = await mapRedmods(input, mapped);
    return finalizeMappedInstall(input, MOD_TYPE.redmod, mapped, attributes);
  }
};

// src/installers/multitype.ts
function detectedKinds(input) {
  const files = input.pkg.files;
  return [
    hasArchive(files, true) && "archive",
    hasAudioware(files) && "audioware",
    hasJsonConfig(files, true) && "json",
    hasXmlConfig(files, true) && "xml",
    hasCet(files) && "cet",
    hasRedmod(files, true) && "redmod",
    hasRedscript(files, true) && "redscript",
    hasRed4ext(files, true) && "red4ext",
    hasTweakXL(files) && "tweak-xl"
  ].filter((value) => Boolean(value));
}
var multiTypeCandidate = {
  id: "Multi-type Mod",
  modTypeId: MOD_TYPE.multiType,
  matches: (input) => detectedKinds(input).length >= 2,
  install: async (input) => {
    const kinds = detectedKinds(input);
    const mapped = /* @__PURE__ */ new Map();
    const attributes = [
      { type: "attribute", key: "cyberpunkModKinds", value: kinds }
    ];
    if (kinds.includes("archive")) mapArchiveFiles(input.pkg.files, mapped);
    if (kinds.includes("audioware")) mapAudiowareFiles(input.pkg.files, mapped);
    if (kinds.includes("cet")) mapCetFiles(input.pkg.files, mapped);
    if (kinds.includes("redscript")) mapRedscriptFiles(input, mapped, true);
    if (kinds.includes("red4ext")) mapRed4extFiles(input, mapped, true);
    if (kinds.includes("tweak-xl")) mapTweakXLFiles(input.pkg.files, mapped);
    let protectedConfig = false;
    let unresolvedConfig = false;
    if (kinds.includes("json")) {
      const state = mapJsonConfig(input.pkg.files, mapped);
      unresolvedConfig ||= state.unresolved;
      protectedConfig ||= state.protected;
    }
    if (kinds.includes("xml")) {
      protectedConfig ||= mapXmlConfig(input.pkg.files, mapped).protected;
    }
    if (kinds.includes("redmod")) {
      attributes.push(...await mapRedmods(input, mapped, true));
    }
    if (unresolvedConfig || findUnsafeUnmappedFiles(input, mapped).length > 0) {
      return finalizeMappedInstall(
        input,
        kinds.includes("redmod") ? MOD_TYPE.multiTypeRedmod : MOD_TYPE.multiType,
        mapped,
        attributes
      );
    }
    if (protectedConfig) {
      await confirmInstall(input.context, "\u5B89\u88C5\u53D7\u4FDD\u62A4\u7684\u6E38\u620F\u914D\u7F6E", "\u8BE5 Multi-type Mod \u4F1A\u8986\u76D6 Cyberpunk 2077 \u7684 JSON/XML \u6838\u5FC3\u914D\u7F6E\u3002");
    }
    return finalizeMappedInstall(
      input,
      kinds.includes("redmod") ? MOD_TYPE.multiTypeRedmod : MOD_TYPE.multiType,
      mapped,
      attributes
    );
  }
};

// src/installers/preset.ts
var CYBERCAT_KEYS = [
  "DataExists",
  "Unknown1",
  "UnknownFirstBytes",
  "FirstSection",
  "SecondSection",
  "ThirdSection",
  "StringTriples"
];
async function presetDestination(input, file) {
  if (isUnder(file, PATHS.cyberCatPresets) || isUnder(file, PATHS.appearancePresets)) return file.path;
  let text2;
  try {
    text2 = await readText(input, file);
  } catch {
    return null;
  }
  try {
    const value = JSON.parse(text2);
    if (CYBERCAT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
      return `${PATHS.cyberCatPresets}/${basename(file.path)}`;
    }
  } catch {
  }
  if (/LocKey#14444638123505366956:\d+/.test(text2)) {
    return `${PATHS.appearancePresets}/female/${basename(file.path)}`;
  }
  if (/LocKey#\d+:\d+/.test(text2)) {
    return `${PATHS.appearancePresets}/male/${basename(file.path)}`;
  }
  return null;
}
function presetFiles(files) {
  return files.filter((file) => extname(file.path) === ".preset");
}
var presetCandidate = {
  id: "Character Preset",
  modTypeId: MOD_TYPE.preset,
  matches: ({ pkg }) => presetFiles(pkg.files).length > 0,
  install: async (input) => {
    const mapped = /* @__PURE__ */ new Map();
    for (const file of presetFiles(input.pkg.files)) {
      const destination = await presetDestination(input, file);
      if (destination) mapInstruction(mapped, file, destination);
    }
    return finalizeMappedInstall(input, MOD_TYPE.preset, mapped);
  }
};

// src/installers/pipeline.ts
var PIPELINE = [
  ...CORE_CANDIDATES,
  GAMEPLAY_CANDIDATES.asi,
  multiTypeCandidate,
  GAMEPLAY_CANDIDATES.red4ext,
  redmodCandidate,
  ammCandidate,
  GAMEPLAY_CANDIDATES.cet,
  GAMEPLAY_CANDIDATES.redscript,
  GAMEPLAY_CANDIDATES.audioware,
  GAMEPLAY_CANDIDATES.tweakXL,
  CONFIG_CANDIDATES.ini,
  CONFIG_CANDIDATES.jsonConfig,
  CONFIG_CANDIDATES.xmlConfig,
  presetCandidate,
  GAMEPLAY_CANDIDATES.archive
];
function testCyberpunkPackage(_files, gameId) {
  return { supported: Number(gameId) === GAME_ID };
}
async function installCyberpunkPackage(context, files, stagingPath = "") {
  const input = { context, pkg: preparePackage(files), stagingPath };
  if (input.pkg.files.length === 0) throw new Error("Mod archive does not contain installable files.");
  for (const candidate of PIPELINE) {
    if (await candidate.matches(input)) return candidate.install(input);
  }
  return installFallback(input);
}

// src/modTypes.ts
function isCyberpunk(gameId) {
  return Number(gameId) === GAME_ID;
}
function registerType(context, typeId2, priority) {
  context.registerModType(
    typeId2,
    priority,
    isCyberpunk,
    () => "{gamePath}",
    () => false,
    { name: MOD_TYPE_NAMES[typeId2] }
  );
}
function registerCyberpunkModTypes(context) {
  const orderedTypes = Object.values(MOD_TYPE).filter((typeId2) => typeId2 !== MOD_TYPE.fomod);
  orderedTypes.forEach((typeId2, index) => registerType(context, typeId2, 200 - index));
  registerFomodInstaller(context, {
    gameId: GAME_ID,
    typeId: MOD_TYPE.fomod,
    priority: 100,
    name: MOD_TYPE_NAMES[MOD_TYPE.fomod]
  });
  context.registerInstaller(
    MOD_TYPE.pipeline,
    30,
    testCyberpunkPackage,
    (files, stagingPath) => installCyberpunkPackage(context, files, stagingPath)
  );
}

// src/index.ts
async function main(context) {
  registerCyberpunkGame(context);
  registerCyberpunkModTypes(context);
  registerRedmodLoadOrder(context);
  return true;
}
var src_default = main;
