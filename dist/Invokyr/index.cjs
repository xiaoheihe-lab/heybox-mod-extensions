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

// extensions/Invokyr/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var GAME_ID = 3883570;
var GAME_NAME = "Invokyr";
var STEAM_APP_ID = String(GAME_ID);
var EXECUTABLE = "Invokyr.exe";
var GAME_ROOT_TARGET = "{gamePath}";
var MOD_TYPE_BEPINEX_RUNTIME = `${GAME_ID}-bepinex6-il2cpp-runtime`;
var MOD_TYPE_BEPINEX_PLUGIN = `${GAME_ID}-bepinex6-il2cpp-plugin`;
var BEPINEX_REQUIREMENT_MOD_ID = "127953";
var REQUIRED_GAME_FILES = [
  EXECUTABLE,
  "GameAssembly.dll",
  "UnityPlayer.dll",
  "Invokyr_Data/il2cpp_data/Metadata/global-metadata.dat"
];
var REQUIRED_BEPINEX_FILES = [
  "winhttp.dll",
  "doorstop_config.ini",
  "BepInEx/core/BepInEx.Unity.IL2CPP.dll"
];
function normalizeArchivePath(value) {
  const normalized = String(value ?? "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^(\.\/)+/, "");
  if (!normalized || /^[a-z]:\//i.test(normalized) || normalized.includes("://")) return "";
  const pathParts = normalized.split("/").filter(Boolean);
  if (pathParts.some((part) => part === "." || part === "..")) return "";
  return pathParts.join("/");
}
function parts(value) {
  const normalized = normalizeArchivePath(value);
  return normalized ? normalized.split("/") : [];
}
function basename(value) {
  return parts(value).at(-1) ?? "";
}
function joinArchivePath(...segments) {
  return segments.flatMap((segment) => parts(segment)).join("/");
}
function findAnchor(value, anchor) {
  return parts(value).findIndex((part) => part.toLowerCase() === anchor.toLowerCase());
}
function isGameArchive(gameId) {
  return String(gameId) === STEAM_APP_ID || Number(gameId) === GAME_ID;
}
function hasExactPath(files, expected) {
  return files.some((file) => {
    const fileParts = parts(file);
    return fileParts.length === expected.length && expected.every((part, index) => fileParts[index]?.toLowerCase() === part.toLowerCase());
  });
}
function findBepInExRuntimeRoot(files) {
  const normalizedFiles = files.map(normalizeArchivePath).filter(Boolean);
  for (const winhttpFile of normalizedFiles) {
    if (basename(winhttpFile).toLowerCase() !== "winhttp.dll") continue;
    const root = parts(winhttpFile).slice(0, -1);
    if (hasExactPath(normalizedFiles, [...root, "doorstop_config.ini"]) && hasExactPath(normalizedFiles, [...root, "BepInEx", "core", "BepInEx.Unity.IL2CPP.dll"])) return root;
  }
  return null;
}
function isBepInExRuntime(files) {
  return findBepInExRuntimeRoot(files) !== null;
}
function isRuntimeDll(file) {
  const fileParts = parts(file).map((part) => part.toLowerCase());
  const bepinexIndex = fileParts.indexOf("bepinex");
  if (bepinexIndex >= 0 && fileParts[bepinexIndex + 1] === "core") return true;
  return fileParts.includes("dotnet") || basename(file).toLowerCase() === "winhttp.dll";
}
function isBepInExPlugin(files) {
  if (isBepInExRuntime(files)) return false;
  return files.some((file) => {
    const normalized = normalizeArchivePath(file);
    return normalized.toLowerCase().endsWith(".dll") && !isRuntimeDll(normalized);
  });
}
function testBepInExRuntime(files, gameId) {
  return Promise.resolve({
    supported: isGameArchive(gameId) && isBepInExRuntime(files),
    requiredFiles: []
  });
}
function testBepInExPlugin(files, gameId) {
  return Promise.resolve({
    supported: isGameArchive(gameId) && isBepInExPlugin(files),
    requiredFiles: []
  });
}
function installBepInExRuntime(files) {
  const root = findBepInExRuntimeRoot(files);
  if (!root) return { instructions: [], modType: MOD_TYPE_BEPINEX_RUNTIME };
  const instructions = [];
  for (const source of files) {
    const normalized = normalizeArchivePath(source);
    if (!normalized) continue;
    const sourceParts = parts(normalized);
    const belongsToRoot = root.every(
      (part, index) => sourceParts[index]?.toLowerCase() === part.toLowerCase()
    );
    if (!belongsToRoot || sourceParts.length <= root.length) continue;
    instructions.push({
      type: "copy",
      source,
      destination: sourceParts.slice(root.length).join("/")
    });
  }
  return { instructions, modType: MOD_TYPE_BEPINEX_RUNTIME };
}
var PACKAGE_METADATA_FILES = /* @__PURE__ */ new Set([
  "changelog.md",
  "icon.png",
  "license",
  "license.md",
  "manifest.json",
  "readme",
  "readme.md",
  "readme.txt"
]);
function pluginDestination(source) {
  const normalized = normalizeArchivePath(source);
  if (!normalized) return null;
  const sourceParts = parts(normalized);
  const bepinexIndex = findAnchor(normalized, "BepInEx");
  if (bepinexIndex >= 0) {
    const area = sourceParts[bepinexIndex + 1]?.toLowerCase();
    if (area === "plugins" || area === "patchers" || area === "config") {
      return sourceParts.slice(bepinexIndex).join("/");
    }
    return null;
  }
  const pluginsIndex = findAnchor(normalized, "plugins");
  if (pluginsIndex >= 0) {
    const relative = sourceParts.slice(pluginsIndex + 1).join("/");
    return relative ? joinArchivePath("BepInEx/plugins", relative) : null;
  }
  const fileName = basename(normalized).toLowerCase();
  if (PACKAGE_METADATA_FILES.has(fileName) || /\.(md|png|jpe?g|webp)$/i.test(fileName)) return null;
  return joinArchivePath("BepInEx/plugins", normalized);
}
function installBepInExPlugin(files) {
  const instructions = [];
  for (const source of files) {
    const destination = pluginDestination(source);
    if (destination) instructions.push({ type: "copy", source, destination });
  }
  return { instructions, modType: MOD_TYPE_BEPINEX_PLUGIN };
}
async function fileExists(context, filePath) {
  if (!filePath) return false;
  try {
    return Boolean((await context.api.util.fs.stat(filePath))?.isFile);
  } catch {
    return false;
  }
}
async function isGameRoot(context, candidate) {
  if (!candidate) return false;
  const checks = await Promise.all(REQUIRED_GAME_FILES.map(
    (file) => fileExists(context, context.api.util.path.join(candidate, file))
  ));
  return checks.every(Boolean);
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
  const steamPath = game?.gamePath ?? "";
  const candidates = [
    steamPath,
    steamPath ? context.api.util.path.join(steamPath, "Invokyr") : "",
    steamPath ? context.api.util.path.join(steamPath, "Invokyr", "Invokyr") : ""
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    if (await isGameRoot(context, candidate)) return candidate;
  }
  return void 0;
}
async function getBepInExStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const missingFiles = [];
  if (resolvedGamePath) {
    for (const file of REQUIRED_BEPINEX_FILES) {
      if (!await fileExists(context, context.api.util.path.join(resolvedGamePath, file))) {
        missingFiles.push(file);
      }
    }
  } else {
    missingFiles.push(...REQUIRED_BEPINEX_FILES);
  }
  const initialized = missingFiles.length === 0 && await fileExists(context, context.api.util.path.join(resolvedGamePath, "BepInEx/LogOutput.log"));
  return {
    installed: missingFiles.length === 0,
    initialized,
    gamePath: resolvedGamePath,
    missingFiles
  };
}
function getBepInExRequirement() {
  return {
    key: "invokyr-bepinex6-il2cpp",
    name: "BepInEx 6 IL2CPP",
    modId: BEPINEX_REQUIREMENT_MOD_ID,
    mod_id: BEPINEX_REQUIREMENT_MOD_ID,
    modType: MOD_TYPE_BEPINEX_RUNTIME,
    openModDetailDialog: false,
    requirement: "enabled"
  };
}
async function getRequirementStatus(context, gamePath) {
  const status = await getBepInExStatus(context, gamePath);
  const requirements = [];
  if (!status.installed) requirements.push(getBepInExRequirement());
  return {
    installed: requirements.length === 0,
    gamePath: status.gamePath,
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
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE],
    setup: async (discovery) => getExtensionRequiredMods(
      context,
      String(discovery?.path || discovery?.gamePath || "")
    ),
    localModFeatures: [
      {
        modId: Number(BEPINEX_REQUIREMENT_MOD_ID),
        marked: true,
        mark: { type: "prerequisite", label: "\u524D\u7F6E\u6A21\u7EC4" }
      }
    ],
    environment: { SteamAPPId: STEAM_APP_ID },
    details: { steamAppId: GAME_ID }
  });
  context.registerModType(
    MOD_TYPE_BEPINEX_RUNTIME,
    40,
    (gameId) => isGameArchive(gameId),
    () => GAME_ROOT_TARGET,
    () => Promise.resolve(false),
    { name: "BepInEx 6 IL2CPP Runtime" }
  );
  context.registerModType(
    MOD_TYPE_BEPINEX_PLUGIN,
    30,
    (gameId) => isGameArchive(gameId),
    () => GAME_ROOT_TARGET,
    () => Promise.resolve(false),
    { name: "BepInEx 6 IL2CPP Plugin" }
  );
  context.registerInstaller(
    MOD_TYPE_BEPINEX_RUNTIME,
    40,
    testBepInExRuntime,
    (files) => installBepInExRuntime(files)
  );
  context.registerInstaller(
    MOD_TYPE_BEPINEX_PLUGIN,
    30,
    testBepInExPlugin,
    (files) => installBepInExPlugin(files)
  );
  context.registerExtensionAction(GAME_ID, "getBepInExStatus", () => getBepInExStatus(context));
  context.registerExtensionAction(
    GAME_ID,
    "getExtensionRequiredMods",
    () => getExtensionRequiredMods(context)
  );
  return true;
}
var index_default = main;
