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
var GAME_ID = 3489700;
var GAME_NAME = "Stellar Blade";
var EXECUTABLE = "SB.exe";
var STEAM_APP_ID = "3489700";
var GAME_FOLDER = "SB";
var WIN64_PATH = "SB/Binaries/Win64";
var UE4SS_MODS_PATH = "SB/Binaries/Win64/ue4ss/Mods";
var PAK_MODS_PATH = "SB/Content/Paks/~mods";
var LOGIC_MODS_PATH = "SB/Content/Paks/LogicMods";
var MOVIES_PATH = "SB/Content/Movies";
var MENU_PATH = "SB/Content/Movies/Menu";
var SPLASH_PATH = "SB/Content/Splash";
var CNS_JSON_PATH = "SB/Content/Paks/~mods/CustomNanosuitSystem";
var UE4SS_DWMAPI = "dwmapi.dll";
var UE4SS_DLL = "UE4SS.dll";
var UE4SS_SOURCE_URL = "https://github.com/Chrisr0/RE-UE4SS/releases";
var UE4SS_REQUIREMENT_MOD_ID = "5338";
var PAK_EXTENSIONS = [".pak", ".utoc", ".ucas", ".json"];
var VIDEO_EXTENSIONS = [".bk2", ".webm"];
var MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`;
var MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`;
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`;
var MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_BINARIES = `${GAME_ID}-binaries`;
var MOD_TYPE_MENU = `${GAME_ID}-menu`;
var MOD_TYPE_MOVIE = `${GAME_ID}-movie`;
var MOD_TYPE_SPLASH = `${GAME_ID}-splash`;
var MOD_TYPE_CNS_JSON = `${GAME_ID}-cns-json`;
var MOD_TYPE_PRIORITY = {
  ue4ss: 160,
  ue4ssCombo: 150,
  logic: 145,
  script: 130,
  dll: 125,
  cnsJson: 120,
  menu: 115,
  movie: 110,
  splash: 105,
  pak: 100,
  root: 90,
  binaries: 80
};

// src/paths.ts
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
function hasSegment(filePath, name) {
  return findSegment(filePath, name) >= 0;
}
function removeLeadingSegments(filePath, count) {
  return splitArchivePath(filePath).slice(count).join("/");
}
function isFileLike(file) {
  return archiveBaseName(file).includes(".");
}
function fallbackFolderId(stagingPath, fallback = "StellarBladeMod") {
  const clean = String(stagingPath || "").replace(/[\\/]+$/, "");
  const leaf = clean.split(/[\\/]/).pop() || fallback;
  return leaf.replace(/\.installing$/i, "").replace(/\.(zip|rar|7z)$/i, "") || fallback;
}

// src/installers.ts
function isGame(gameId) {
  return Number(gameId) === GAME_ID;
}
function hasBaseName(files, name) {
  const lower = name.toLowerCase();
  return files.some((file) => archiveBaseName(file).toLowerCase() === lower);
}
function isFomod(files) {
  return files.some((file) => {
    const parts = splitArchivePath(file);
    return archiveBaseName(file).toLowerCase() === "moduleconfig.xml" && parts[parts.length - 2]?.toLowerCase() === "fomod";
  });
}
function result(supported) {
  return { supported, requiredFiles: [] };
}
function hasPakFile(files) {
  return files.some((file) => archiveExtName(file) === ".pak");
}
function testUe4ssCombo(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => archiveExtName(file) === ".lua") && hasPakFile(files) && files.some((file) => hasSegment(file, GAME_FOLDER)));
}
function testLogic(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && hasBaseName(files, "LogicMods"));
}
function findUe4ssAnchor(files) {
  for (const dwmapiFile of files) {
    if (archiveBaseName(dwmapiFile).toLowerCase() !== UE4SS_DWMAPI) continue;
    const dwmapiParts = splitArchivePath(dwmapiFile);
    const rootParts = dwmapiParts.slice(0, -1);
    const hasNestedUe4ssDll = files.some((file) => {
      const parts = splitArchivePath(file);
      if (parts.length !== rootParts.length + 2) return false;
      const rootMatches = rootParts.every((part, index) => parts[index]?.toLowerCase() === part.toLowerCase());
      return rootMatches && parts[rootParts.length]?.toLowerCase() === "ue4ss" && parts[rootParts.length + 1]?.toLowerCase() === "ue4ss.dll";
    });
    if (hasNestedUe4ssDll) return { dwmapiFile, rootParts };
  }
  return null;
}
function testUe4ss(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && findUe4ssAnchor(files) !== null);
}
function testScript(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => archiveExtName(file) === ".lua" && hasSegment(file, "Scripts")));
}
function testDll(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => archiveExtName(file) === ".dll" && hasSegment(file, "dlls")));
}
function testCnsJson(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && !hasPakFile(files) && files.some((file) => archiveBaseName(file).toLowerCase().endsWith(".dekcns.json")));
}
function testMenu(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => VIDEO_EXTENSIONS.includes(archiveExtName(file)) && hasSegment(file, "Menu")));
}
function testMovie(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => archiveExtName(file) === ".bk2"));
}
function testSplash(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && hasBaseName(files, "splash.bmp"));
}
function testPak(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && hasPakFile(files));
}
function testRoot(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && files.some((file) => hasSegment(file, GAME_FOLDER)));
}
function testBinaries(files, gameId) {
  return result(isGame(gameId) && !isFomod(files) && !hasPakFile(files) && files.some((file) => hasSegment(file, "Win64") && isFileLike(file)));
}
function installUe4ssCombo(files) {
  const instructions = files.filter(isFileLike).flatMap((file) => {
    const idx = findSegment(file, GAME_FOLDER);
    return idx >= 0 ? [{ type: "copy", source: file, destination: removeLeadingSegments(file, idx) }] : [];
  });
  return { instructions, modType: MOD_TYPE_UE4SS_COMBO };
}
function installLogic(files) {
  const instructions = files.filter(isFileLike).flatMap((file) => {
    const idx = findSegment(file, "LogicMods");
    return idx >= 0 ? [{ type: "copy", source: file, destination: archiveJoin(LOGIC_MODS_PATH, removeLeadingSegments(file, idx + 1)) }] : [];
  });
  return { instructions, modType: MOD_TYPE_LOGIC };
}
function installUe4ss(files) {
  const anchor = findUe4ssAnchor(files);
  const instructions = anchor ? files.flatMap((file) => {
    if (/[\\/]$/.test(file)) return [];
    if (file === anchor.dwmapiFile) {
      return [{ type: "copy", source: file, destination: archiveJoin(WIN64_PATH, UE4SS_DWMAPI) }];
    }
    const parts = splitArchivePath(file);
    const rootMatches = anchor.rootParts.every((part, index) => parts[index]?.toLowerCase() === part.toLowerCase());
    const ue4ssIndex = anchor.rootParts.length;
    if (!rootMatches || parts[ue4ssIndex]?.toLowerCase() !== "ue4ss" || parts.length <= ue4ssIndex + 1) return [];
    return [{
      type: "copy",
      source: file,
      destination: archiveJoin(WIN64_PATH, parts.slice(ue4ssIndex).join("/"))
    }];
  }) : [];
  return { instructions, modType: MOD_TYPE_UE4SS };
}
function findUe4ssModAnchor(files, marker, extension) {
  return files.find((file) => archiveExtName(file) === extension && hasSegment(file, marker)) || "";
}
function installUe4ssMod(files, stagingPath, marker, extension, modType) {
  const anchor = findUe4ssModAnchor(files, marker, extension);
  const anchorParts = splitArchivePath(anchor);
  const markerIndex = findSegment(anchor, marker);
  const hasFolder = markerIndex > 0;
  const folderId = hasFolder ? anchorParts[markerIndex - 1] : fallbackFolderId(stagingPath);
  const rootIndex = hasFolder ? markerIndex - 1 : 0;
  const sourceRoot = hasFolder ? anchorParts.slice(0, rootIndex + 1).map((part) => part.toLowerCase()) : [];
  const instructions = [];
  let hasEnabledFile = false;
  for (const file of files) {
    if (!isFileLike(file)) continue;
    const parts = splitArchivePath(file);
    const prefixMatches = sourceRoot.every((part, index) => parts[index]?.toLowerCase() === part);
    if (!prefixMatches) continue;
    const relative = hasFolder ? parts.slice(rootIndex).join("/") : archiveJoin(folderId, parts.join("/"));
    if (archiveBaseName(relative).toLowerCase() === "enabled.txt") hasEnabledFile = true;
    instructions.push({
      type: "copy",
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, relative)
    });
  }
  if (!hasEnabledFile) {
    instructions.push({
      type: "generatefile",
      data: "",
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, "enabled.txt")
    });
  }
  instructions.unshift({ type: "attribute", key: "stellarBladeUe4ssFolderId", value: folderId });
  return { instructions, modType };
}
function installScript(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "Scripts", ".lua", MOD_TYPE_SCRIPT);
}
function installDll(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "dlls", ".dll", MOD_TYPE_DLL);
}
function copyBaseNames(files, target, extensions) {
  return files.filter((file) => isFileLike(file) && (!extensions || extensions.includes(archiveExtName(file)))).map((file) => ({ type: "copy", source: file, destination: archiveJoin(target, archiveBaseName(file)) }));
}
function installCnsJson(files) {
  const selected = files.filter((file) => archiveBaseName(file).toLowerCase().endsWith(".dekcns.json"));
  return { instructions: copyBaseNames(selected, CNS_JSON_PATH), modType: MOD_TYPE_CNS_JSON };
}
function installMenu(files) {
  return { instructions: copyBaseNames(files, MENU_PATH, VIDEO_EXTENSIONS), modType: MOD_TYPE_MENU };
}
function installMovie(files) {
  return { instructions: copyBaseNames(files, MOVIES_PATH, [".bk2"]), modType: MOD_TYPE_MOVIE };
}
function installSplash(files) {
  const selected = files.filter((file) => archiveBaseName(file).toLowerCase() === "splash.bmp");
  return { instructions: copyBaseNames(selected, SPLASH_PATH), modType: MOD_TYPE_SPLASH };
}
function installPak(files) {
  const selected = files.filter((file) => PAK_EXTENSIONS.includes(archiveExtName(file)));
  const instructions = [
    {
      type: "attribute",
      key: "stellarBladePakFiles",
      value: selected.map((file) => archiveBaseName(file))
    },
    ...copyBaseNames(selected, PAK_MODS_PATH)
  ];
  return { instructions, modType: MOD_TYPE_PAK };
}
function installRoot(files) {
  const instructions = files.filter(isFileLike).flatMap((file) => {
    const idx = findSegment(file, GAME_FOLDER);
    return idx >= 0 ? [{ type: "copy", source: file, destination: removeLeadingSegments(file, idx) }] : [];
  });
  return { instructions, modType: MOD_TYPE_ROOT };
}
function installBinaries(files) {
  const instructions = files.filter(isFileLike).flatMap((file) => {
    const idx = findSegment(file, "Win64");
    return idx >= 0 ? [{ type: "copy", source: file, destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, idx + 1)) }] : [];
  });
  return { instructions, modType: MOD_TYPE_BINARIES };
}

// src/modTypes.ts
function isStellarBlade(gameId) {
  return Number(gameId) === GAME_ID;
}
function filesFromLocalInfo(input) {
  if (Array.isArray(input)) return input;
  return Array.isArray(input?.files) ? input.files : [];
}
function register(context, typeId, priority, name, installerPriority, test, install) {
  context.registerModType(
    typeId,
    priority,
    isStellarBlade,
    () => "{gamePath}",
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name }
  );
  context.registerInstaller(typeId, installerPriority, test, install);
}
function registerStellarBladeModTypes(context) {
  register(context, MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, "UE4SS for Stellar Blade", 1, testUe4ss, installUe4ss);
  register(context, MOD_TYPE_UE4SS_COMBO, MOD_TYPE_PRIORITY.ue4ssCombo, "UE4SS Script + LogicMod", 10, testUe4ssCombo, installUe4ssCombo);
  register(context, MOD_TYPE_LOGIC, MOD_TYPE_PRIORITY.logic, "UE4SS LogicMod", 11, testLogic, installLogic);
  register(context, MOD_TYPE_SCRIPT, MOD_TYPE_PRIORITY.script, "UE4SS Script Mod", 14, testScript, (files, stagingPath) => installScript(files, stagingPath));
  register(context, MOD_TYPE_DLL, MOD_TYPE_PRIORITY.dll, "UE4SS DLL Mod", 15, testDll, (files, stagingPath) => installDll(files, stagingPath));
  register(context, MOD_TYPE_CNS_JSON, MOD_TYPE_PRIORITY.cnsJson, "CNS JSON Mod", 20, testCnsJson, installCnsJson);
  register(context, MOD_TYPE_MENU, MOD_TYPE_PRIORITY.menu, "Menu Video Mod", 21, testMenu, installMenu);
  register(context, MOD_TYPE_MOVIE, MOD_TYPE_PRIORITY.movie, "Movie Mod", 22, testMovie, installMovie);
  register(context, MOD_TYPE_SPLASH, MOD_TYPE_PRIORITY.splash, "Splash Screen Mod", 23, testSplash, installSplash);
  register(context, MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, "UE IoStore Pak Mod", 30, testPak, installPak);
  register(context, MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, "Root Game Folder Mod", 40, testRoot, installRoot);
  register(context, MOD_TYPE_BINARIES, MOD_TYPE_PRIORITY.binaries, "Binaries / Engine Injector", 50, testBinaries, installBinaries);
}

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
function requirement(key, name, modType, modId, sourceUrl) {
  return {
    key,
    name,
    modType,
    ...modId ? { modId, mod_id: modId } : {},
    ...sourceUrl ? { sourceUrl, url: sourceUrl } : {},
    openModDetailDialog: false,
    requirement: "enabled"
  };
}
function getRequirementItems() {
  return [
    requirement(
      "stellar-blade-ue4ss",
      "UE4SS for Stellar Blade",
      MOD_TYPE_UE4SS,
      UE4SS_REQUIREMENT_MOD_ID,
      UE4SS_SOURCE_URL
    )
  ];
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const path = context.api.util.path;
  const dwmapiPath = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH, UE4SS_DWMAPI) : "";
  const nestedUe4ssPath = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH, "ue4ss", UE4SS_DLL) : "";
  const hasDwmapi = !!resolvedGamePath && await fileExists(context, dwmapiPath);
  const hasUe4ssDll = !!resolvedGamePath && await fileExists(context, nestedUe4ssPath);
  const items = getRequirementItems();
  const requirements = [];
  if (!hasDwmapi || !hasUe4ssDll) requirements.push(items[0]);
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

// src/index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, "SB"],
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")),
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      epicAppId: "4013d48a20c1403282fc9d1453ec8f5a",
      nexusGameDomainName: "stellarblade",
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: false
    }
  });
  registerStellarBladeModTypes(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var src_default = main;
