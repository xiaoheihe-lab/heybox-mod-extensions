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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var import_os = __toESM(require("os"));

// src/configMod.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var CONFIG_FILE = "config.json";
var MODS_REL_PATH = "Mods";
var SMAPI_INTERNAL_DIRECTORY = "smapi-internal";
var CONFIG_MOD_ID = 413150240;
var CONFIG_FILE_ID = 1;
var BUNDLED_SMAPI_MODS = /* @__PURE__ */ new Set(["errorhandler", "consolecommands", "savebackup"]);
function normalizeRel(input) {
  const raw = String(input ?? "").replace(/\\/g, "/").replace(/^\/+/g, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return "";
  return parts.join("/");
}
function walkFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = import_fs.default.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = import_path.default.join(dir, name);
      let stat;
      try {
        stat = import_fs.default.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(root);
  return out;
}
function isSmapiInternal(rel) {
  const parts = normalizeRel(rel).split("/").map((part) => part.toLowerCase().replace(/[-_]/g, ""));
  return parts.includes(SMAPI_INTERNAL_DIRECTORY.replace(/[-_]/g, ""));
}
function isBundledSmapiConfig(rel) {
  const parts = normalizeRel(rel).split("/").map((part) => part.toLowerCase());
  return parts.length >= 2 && BUNDLED_SMAPI_MODS.has(parts[0]);
}
function createConfigModActions(getGamePath) {
  const collectConfigFiles = () => {
    const gamePath = getGamePath();
    const modsPath = import_path.default.join(gamePath, MODS_REL_PATH);
    const files = walkFiles(modsPath).filter((file) => import_path.default.basename(file).toLowerCase() === CONFIG_FILE).map((file) => {
      const relUnderMods = normalizeRel(import_path.default.relative(modsPath, file));
      const destination = normalizeRel(import_path.default.posix.join(MODS_REL_PATH, relUnderMods));
      return { sourcePath: file, source: destination, destination, relUnderMods };
    }).filter((item) => item.relUnderMods && !isSmapiInternal(item.relUnderMods) && !isBundledSmapiConfig(item.relUnderMods));
    return {
      type: "generated-files",
      modInfo: {
        modId: CONFIG_MOD_ID,
        fileId: CONFIG_FILE_ID,
        versionId: Date.now(),
        name: "Stardew Valley Configuration",
        mod_identifier: "stardew-valley-configuration",
        metaInfo: {
          synthetic: true,
          type: "stardew-config-mod",
          trackedConfigFiles: files.map((item) => item.destination)
        }
      },
      files: files.map(({ source, sourcePath, destination }) => ({ source, sourcePath, destination }))
    };
  };
  return {
    collectConfigFiles,
    getConfigModStatus: () => {
      const result = collectConfigFiles();
      return {
        available: true,
        count: result.files.length,
        files: result.files.map((file) => file.destination)
      };
    }
  };
}

// src/manifests.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var MOD_MANIFEST = "manifest.json";
function normalizeRel2(input) {
  return String(input ?? "").replace(/\\/g, "/");
}
function isManifest(file) {
  const rel = normalizeRel2(file);
  if (import_path2.default.posix.basename(rel).toLowerCase() !== MOD_MANIFEST) return false;
  const parts = rel.split("/").map((part) => part.toLowerCase());
  return !parts.includes("i18n") && !parts.includes("locale") && !parts.includes("locales");
}
function parseManifestFile(filePath) {
  const raw = import_fs2.default.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error(`Invalid Stardew manifest: ${filePath}`);
  return parsed;
}
function collectManifestFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = import_fs2.default.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = import_path2.default.join(dir, name);
      let stat;
      try {
        stat = import_fs2.default.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (isManifest(import_path2.default.relative(root, full))) out.push(full);
    }
  };
  walk(root);
  return out;
}
function versionParts(version) {
  return String(version).split(/[^\d]+/).filter(Boolean).map((part) => Number(part || 0));
}
function compareVersionDesc(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
function createManifestAttributeExtractor() {
  return async (modInfo, modPath) => {
    const manifestFiles = collectManifestFiles(modPath);
    const manifests = manifestFiles.map((file) => {
      try {
        return parseManifestFile(file);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (manifests.length === 0) return {};
    const ref = manifests[0];
    const additionalLogicalFileNames = manifests.map((manifest) => String(manifest.UniqueID || "").trim().toLowerCase()).filter(Boolean);
    const minSMAPIVersion = manifests.map((manifest) => String(manifest.MinimumApiVersion || "").trim()).filter(Boolean).sort((lhs, rhs) => compareVersionDesc(rhs, lhs))[0];
    return {
      additionalLogicalFileNames,
      ...minSMAPIVersion ? { minSMAPIVersion } : null,
      ...Number(modInfo?.modId) !== 592 && ref?.Name ? { customFileName: ref.Name, name: ref.Name } : null,
      ...typeof ref?.Version === "string" ? { manifestVersion: ref.Version, version: ref.Version } : null,
      ...ref?.UniqueID ? { mod_identifier: String(ref.UniqueID).toLowerCase() } : null,
      stardewManifests: manifests
    };
  };
}

// src/index.ts
var GAME_ID = "stardewvalley";
var STEAM_APPID = 413150;
var MODS_REL_PATH2 = "Mods";
var MOD_TYPE_SMAPI = "SMAPI";
var MOD_TYPE_ROOT = "sdvrootfolder";
var MOD_TYPE_CONFIG = "sdv-configuration-mod";
var INSTALLER_ID_SMAPI = "smapi-installer";
var INSTALLER_ID_ROOT = "sdvrootfolder";
var INSTALLER_ID_MANIFEST = "stardew-valley-installer";
var SMAPI_MOD_ID = 90;
var SMAPI_BUNDLED_MODS = ["ErrorHandler", "ConsoleCommands", "SaveBackup"];
function normalizeRel3(input) {
  const raw = String(input ?? "").replace(/\\/g, "/").replace(/^\/+/g, "").replace(/^(\.\/)+/g, "");
  if (!raw || /^[a-zA-Z]:/.test(raw) || raw.includes("://")) return "";
  const parts = raw.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return "";
  return parts.join("/");
}
function normalizedPathEndsWith(file, suffix) {
  const value = String(file ?? "").replace(/\\/g, "/").replace(/^(\.\/)+/g, "").toLowerCase();
  const expected = String(suffix ?? "").replace(/\\/g, "/").replace(/^\/+/g, "").replace(/^(\.\/)+/g, "").toLowerCase();
  return !!value && !!expected && value.endsWith(expected);
}
function pathParts(input) {
  return normalizeRel3(input).split("/").filter(Boolean);
}
function isGameArchive(gameId) {
  return String(gameId) === GAME_ID || Number(gameId) === STEAM_APPID;
}
function basenameLower(file) {
  return import_path3.default.posix.basename(String(file).replace(/\\/g, "/")).toLowerCase();
}
function hasContentFolder(files) {
  return files.some((file) => pathParts(file).some((part) => part.toLowerCase() === "content"));
}
function hasSmapiInstallerDll(files) {
  return files.some((file) => basenameLower(file) === "smapi.installer.dll");
}
function hasSmapiExecutable(files) {
  const platform = getSmapiPlatform();
  if (platform.unsupported) return false;
  return files.some((file) => normalizedPathEndsWith(file, platform.executableName));
}
function testSMAPI(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && (hasSmapiInstallerDll(files) || hasSmapiExecutable(files)), requiredFiles: [] });
}
function testRootFolder(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && hasContentFolder(files), requiredFiles: [] });
}
function testSupported(files, gameId) {
  return Promise.resolve({ supported: isGameArchive(gameId) && files.some(isManifest) && !hasContentFolder(files) && !hasSmapiInstallerDll(files), requiredFiles: [] });
}
function sanitizeName(name, fallback) {
  const value = String(name || fallback || "Stardew Mod").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/[. ]+$/g, "").trim();
  return value || fallback || "Stardew Mod";
}
function installStardewValley(files, stagingPath) {
  const manifestFiles = files.filter(isManifest);
  if (manifestFiles.length === 0) {
    throw new Error("No Stardew Valley manifest.json found");
  }
  const instructions = [];
  for (const manifestFile of manifestFiles) {
    const relManifest = normalizeRel3(manifestFile);
    const manifestDir = import_path3.default.posix.dirname(relManifest);
    const rootFolder = manifestDir === "." ? "" : manifestDir;
    const manifest = parseManifestFile(import_path3.default.join(stagingPath, relManifest));
    const modName = sanitizeName(rootFolder ? import_path3.default.posix.basename(rootFolder) : manifest?.Name, "Stardew Mod");
    const prefix = rootFolder ? `${rootFolder}/` : "";
    for (const source of files) {
      const relSource = normalizeRel3(source);
      if (!relSource || prefix && !relSource.startsWith(prefix)) continue;
      const relativeInsideMod = prefix ? relSource.slice(prefix.length) : relSource;
      if (!relativeInsideMod) continue;
      instructions.push({
        type: "copy",
        source,
        destination: import_path3.default.posix.join(modName, relativeInsideMod)
      });
    }
  }
  return { instructions, modType: MOD_TYPE_SMAPI };
}
function findContentRoot(files) {
  for (const file of files) {
    const parts = pathParts(file);
    const idx = parts.findIndex((part) => part.toLowerCase() === "content");
    if (idx >= 0) return parts.slice(0, idx).join("/");
  }
  return "";
}
function installRootFolder(files) {
  const root = findContentRoot(files);
  const prefix = root ? `${root}/` : "";
  const instructions = files.map((source) => normalizeRel3(source)).filter((source) => source && (!prefix || source.startsWith(prefix))).filter((source) => !source.toLowerCase().endsWith(".txt")).map((source) => ({
    type: "copy",
    source,
    destination: prefix ? source.slice(prefix.length) : source
  }));
  return { instructions, modType: MOD_TYPE_ROOT };
}
function posixRelative(root, file) {
  const rel = import_path3.default.posix.relative(normalizeRel3(root), normalizeRel3(file));
  return rel && rel !== "." ? rel : "";
}
function getSmapiPlatform() {
  const platform = import_os.default.platform();
  if (platform === "win32") {
    return { id: "windows", archiveFolder: "windows", executableName: "StardewModdingAPI.exe", dataFiles: ["windows-install.dat", "install.dat"] };
  }
  if (platform === "linux") {
    return { id: "linux", archiveFolder: "linux", executableName: "StardewModdingAPI", dataFiles: ["linux-install.dat", "install.dat"] };
  }
  return {
    id: "macos",
    archiveFolder: "macOS",
    executableName: "StardewModdingAPI",
    dataFiles: ["macos-install.dat", "install.dat"],
    unsupported: "SMAPI automatic installation on macOS is not implemented yet. Please install SMAPI manually."
  };
}
function buildSmapiSteamLaunchOptions(smapiExePath) {
  return `"${smapiExePath}" %command%`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function buildSteamLaunchOptionWriteDesc(launchOptions) {
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    "<strong>\u5C06\u4E3A\u672C\u673ASteam\u6E38\u620F\u5199\u5165\u542F\u52A8\u9879\uFF0C\u6B64\u64CD\u4F5C\u5C06\u81EA\u52A8\u91CD\u542FSteam\u5BA2\u6237\u7AEF</strong>",
    `<code style="box-sizing:border-box;width:100%;padding:10px 12px;border-radius:6px;background:rgba(255,255,255,0.06);font-size:13px;line-height:18px;word-break:break-all;white-space:pre-wrap;">${escapeHtml(launchOptions)}</code>`,
    "<small>\u672A\u643A\u5E26\u542F\u52A8\u9879\u8FDB\u884C\u6E38\u620F\uFF0C\u53EF\u80FD\u5BFC\u81F4Mod\u65E0\u6CD5\u6B63\u5E38\u8BC6\u522B</small>",
    "</div>"
  ].join("");
}
function buildSteamLaunchOptionClearDesc() {
  return [
    '<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">',
    "<strong>\u5C06\u6E05\u7A7A\u68C0\u6D4B\u5230\u7684Steam\u7528\u6237\u7684\u661F\u9732\u8C37\u7269\u8BED\u542F\u52A8\u9879\u3002\u6B64\u64CD\u4F5C\u5C06\u81EA\u52A8\u91CD\u542FSteam\u5BA2\u6237\u7AEF</strong>",
    "<small>\u672A\u542F\u7528\u672CMod\u65F6\u643A\u5E26\u542F\u52A8\u9879\uFF0C\u53EF\u80FD\u5BFC\u81F4\u6E38\u620F\u65E0\u6CD5\u6B63\u5E38\u8FD0\u884C</small>",
    "</div>"
  ].join("");
}
function isCorrectPlatformPath(filePath, platformFolder) {
  return pathParts(filePath).some((part) => part.toLowerCase() === platformFolder.toLowerCase());
}
function findSmapiDataFile(files, platform) {
  const dataFiles = new Set((platform.dataFiles || []).map((fileName) => fileName.toLowerCase()));
  return files.map((file) => normalizeRel3(file)).find((file) => file && isCorrectPlatformPath(file, platform.archiveFolder) && dataFiles.has(basenameLower(file))) || "";
}
async function installSMAPI(getGameInstallPath, files, stagingPath, archiveApi, onSmapiExeResolved) {
  const platform = getSmapiPlatform();
  if (platform.unsupported) throw new Error(platform.unsupported);
  let smapiFiles = files.map((file) => normalizeRel3(file)).filter(Boolean);
  let exeFile = smapiFiles.find((file) => normalizedPathEndsWith(file, platform.executableName));
  if (!exeFile) {
    const dataFile = findSmapiDataFile(files, platform);
    if (!dataFile) {
      throw new Error("Failed to find the SMAPI data files; please re-download SMAPI and try again");
    }
    smapiFiles = await archiveApi.extractZip(import_path3.default.join(stagingPath, dataFile), stagingPath);
    exeFile = smapiFiles.find((file) => normalizedPathEndsWith(file, platform.executableName));
    if (!exeFile) {
      throw new Error(`Failed to extract ${platform.executableName}; please re-download SMAPI and try again`);
    }
  }
  const gamePath = getGameInstallPath();
  const targetSmapiExePath = import_path3.default.join(gamePath, platform.executableName);
  if (typeof onSmapiExeResolved === "function") onSmapiExeResolved(targetSmapiExePath);
  const exeRel = normalizeRel3(exeFile);
  const smapiRoot = import_path3.default.posix.dirname(exeRel);
  const smapiPrefix = smapiRoot === "." ? "" : `${smapiRoot}/`;
  const instructions = smapiFiles.map((file) => normalizeRel3(file)).filter((file) => file && (!smapiPrefix || file.startsWith(smapiPrefix))).map((source) => {
    const rel = smapiPrefix ? posixRelative(smapiRoot, source) : source;
    return {
      type: "copy",
      source,
      destination: import_path3.default.join(gamePath, rel)
    };
  });
  const depsPath = import_path3.default.join(gamePath, "Stardew Valley.deps.json");
  if (import_fs3.default.existsSync(depsPath)) {
    instructions.push({
      type: "generatefile",
      data: import_fs3.default.readFileSync(depsPath, "utf8"),
      destination: import_path3.default.join(gamePath, "StardewModdingAPI.deps.json")
    });
  }
  instructions.push({ type: "attribute", key: "smapiBundledMods", value: SMAPI_BUNDLED_MODS.map((mod) => mod.toLowerCase()) });
  return { instructions, modType: MOD_TYPE_ROOT };
}
function makeRequiredModsError(gamePath) {
  const err = new Error("Extension required mods are missing");
  err.name = "ClientInvokeError";
  err.status = "failed";
  err.msg = "Extension required mods are missing";
  err.result = {
    code: "EXTENSION_REQUIRED_MODS_MISSING",
    gameId: GAME_ID,
    gamePath,
    requirements: [
      {
        key: "stardew-smapi",
        name: "SMAPI",
        modId: SMAPI_MOD_ID,
        openModDetailDialog: false,
        requirement: "enabled"
      }
    ]
  };
  return err;
}
function main(context) {
  let cachedGamePath = "";
  let cachedSmapiExePath = "";
  const getGameInstallPath = () => {
    if (!cachedGamePath) throw new Error("Stardew Valley was not discovered");
    return cachedGamePath;
  };
  const setSmapiExePath = (filePath) => {
    cachedSmapiExePath = String(filePath || "");
  };
  const queryPath = async () => {
    const found = await context.api.util.GameStoreHelper.findByAppId([
      String(STEAM_APPID),
      "1453375253",
      "ConcernedApe.StardewValleyPC"
    ]);
    cachedGamePath = String(found?.gamePath || "");
    return cachedGamePath || void 0;
  };
  const executable = () => import_os.default.platform() === "win32" ? "Stardew Valley.exe" : "StardewValley";
  const smapiExecutable = () => getSmapiPlatform().executableName;
  const resolveSmapiExePath = async () => {
    if (!cachedGamePath) await queryPath();
    const exePath = cachedGamePath ? import_path3.default.join(cachedGamePath, smapiExecutable()) : "";
    cachedSmapiExePath = exePath && import_fs3.default.existsSync(exePath) ? exePath : "";
    return cachedSmapiExePath;
  };
  const getSmapiStatus = async () => {
    if (!cachedGamePath) await queryPath();
    const exePath = cachedGamePath ? import_path3.default.join(cachedGamePath, smapiExecutable()) : "";
    if (exePath && import_fs3.default.existsSync(exePath)) cachedSmapiExePath = exePath;
    return {
      installed: !!exePath && import_fs3.default.existsSync(exePath),
      gamePath: cachedGamePath,
      executable: smapiExecutable(),
      requirements: makeRequiredModsError(cachedGamePath).result.requirements
    };
  };
  context.registerGame({
    id: GAME_ID,
    name: "Stardew Valley",
    logo: "assets/gameart.jpg",
    requiredFiles: import_os.default.platform() === "win32" ? ["Stardew Valley.exe"] : ["StardewValley"],
    environment: { SteamAPPId: String(STEAM_APPID) },
    details: { steamAppId: STEAM_APPID },
    supportedTools: [{
      id: "smapi",
      name: "SMAPI",
      executable: smapiExecutable,
      requiredFiles: [smapiExecutable()],
      shell: true,
      exclusive: true,
      relative: true,
      defaultPrimary: true
    }],
    mergeMods: true,
    requiresCleanup: true,
    shell: true,
    queryPath,
    executable,
    queryModPath: () => MODS_REL_PATH2,
    setup: async (discovery) => {
      cachedGamePath = String(discovery?.path || cachedGamePath || "");
      if (cachedGamePath) import_fs3.default.mkdirSync(import_path3.default.join(cachedGamePath, MODS_REL_PATH2), { recursive: true });
      return getSmapiStatus();
    }
  });
  context.registerModType(MOD_TYPE_SMAPI, 30, (gameId) => String(gameId) === GAME_ID, () => import_path3.default.join("{gamePath}", MODS_REL_PATH2), () => Promise.resolve(false), { name: "SMAPI" });
  context.registerModType(MOD_TYPE_CONFIG, 30, (gameId) => String(gameId) === GAME_ID, () => import_path3.default.join("{gamePath}", MODS_REL_PATH2), () => Promise.resolve(false), { name: "Stardew Configuration" });
  context.registerModType(MOD_TYPE_ROOT, 25, (gameId) => String(gameId) === GAME_ID, () => "{gamePath}", () => Promise.resolve(false), { name: "Stardew Root Folder" });
  context.registerInstaller(INSTALLER_ID_SMAPI, 30, testSMAPI, (files, stagingPath) => installSMAPI(getGameInstallPath, files, stagingPath, context.api.util.archive, setSmapiExePath));
  context.registerInstaller(INSTALLER_ID_ROOT, 50, testRootFolder, (files) => installRootFolder(files));
  context.registerInstaller(INSTALLER_ID_MANIFEST, 50, testSupported, async (files, stagingPath) => installStardewValley(files, stagingPath));
  context.registerAttributeExtractor(25, createManifestAttributeExtractor());
  const configModActions = createConfigModActions(getGameInstallPath);
  context.registerExtensionAction(GAME_ID, "getSmapiStatus", getSmapiStatus);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", getSmapiStatus);
  context.registerExtensionAction(GAME_ID, "syncModConfigurations", configModActions.collectConfigFiles);
  context.registerExtensionAction(GAME_ID, "getConfigModStatus", configModActions.getConfigModStatus);
  function getUiResponsePayload(response) {
    return response?.payload && typeof response.payload === "object" ? response.payload : {};
  }
  async function requestLaunchOptionWriteConfirm(payload) {
    const response = await context.api.util.ui.request(payload);
    if (!response?.confirmed) return null;
    return response;
  }
  async function relaunchSteamAfterLaunchOptionWrite(response) {
    const responsePayload = getUiResponsePayload(response);
    if (responsePayload.relaunchSteam === false) return;
    const launchResponse = await context.api.util.steam.launchClient();
    const launchPayload = getUiResponsePayload(launchResponse);
    if (launchResponse?.confirmed && launchPayload.success !== false) return;
    context.api.util.ui.notify({
      type: "steam_launch_client_failed",
      display: "toast",
      variant: "error",
      title: "Steam launch failed",
      content: String(launchPayload.error || "Steam did not report a successful launch. Please open Steam manually.")
    });
  }
  async function ensureSmapiSteamLaunchOptions(payload) {
    if (Number(payload?.mod_id ?? payload?.modId ?? 0) !== SMAPI_MOD_ID) return;
    const smapiExePath = cachedSmapiExePath || await resolveSmapiExePath();
    if (!smapiExePath) return;
    const expected = buildSmapiSteamLaunchOptions(smapiExePath);
    const current = await context.api.util.steam.getLaunchOptions(STEAM_APPID);
    if (current.length > 0 && current.every((entry) => String(entry?.launchOptions || "") === expected)) {
      return;
    }
    const response = await requestLaunchOptionWriteConfirm({
      type: "steam_launch_options_confirm",
      title: "\u8BBE\u7F6E Steam \u542F\u52A8\u9879",
      content: buildSteamLaunchOptionWriteDesc(expected),
      confirm: { text: "\u5199\u5165", type: "primary" },
      cancel: { text: "\u6682\u4E0D\u8C03\u6574", type: "cancel", visible: true },
      requiresSteamClosed: true,
      relaunchSteamAfterWrite: true
    });
    if (!response) return;
    const written = await context.api.util.steam.setLaunchOptions(STEAM_APPID, expected);
    const verified = await context.api.util.steam.getLaunchOptions(STEAM_APPID);
    if (written.length === 0 || verified.length === 0 || !verified.every((entry) => String(entry?.launchOptions || "") === expected)) {
      context.api.util.ui.notify({
        type: "steam_launch_options_failed",
        display: "toast",
        variant: "error",
        title: "Steam \u542F\u52A8\u9879\u5199\u5165\u5931\u8D25",
        content: "SMAPI \u542F\u52A8\u9879\u672A\u6210\u529F\u5199\u5165\uFF0C\u8BF7\u786E\u8BA4 Steam \u5DF2\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002"
      });
      return;
    }
    context.api.util.ui.notify({
      type: "steam_launch_options_success",
      display: "toast",
      variant: "success",
      title: "Steam \u542F\u52A8\u9879\u5DF2\u8BBE\u7F6E",
      content: "SMAPI \u542F\u52A8\u9879\u5DF2\u5199\u5165\uFF0C\u6B63\u5728\u91CD\u65B0\u6253\u5F00 Steam\u3002"
    });
    await relaunchSteamAfterLaunchOptionWrite(response);
  }
  async function clearSmapiSteamLaunchOptions(payload) {
    if (Number(payload?.mod_id ?? payload?.modId ?? 0) !== SMAPI_MOD_ID) return;
    const current = await context.api.util.steam.getLaunchOptions(STEAM_APPID);
    if (current.length > 0 && current.every((entry) => String(entry?.launchOptions || "") === "")) {
      return;
    }
    const response = await requestLaunchOptionWriteConfirm({
      type: "steam_launch_options_confirm",
      title: "\u6E05\u7A7A Steam \u542F\u52A8\u9879",
      content: buildSteamLaunchOptionClearDesc(),
      confirm: { text: "\u6E05\u7A7A", type: "primary" },
      cancel: { text: "\u6682\u4E0D\u8C03\u6574", type: "cancel", visible: true },
      requiresSteamClosed: true,
      relaunchSteamAfterWrite: true
    });
    if (!response) return;
    const cleared = await context.api.util.steam.clearLaunchOptions(STEAM_APPID);
    const verified = await context.api.util.steam.getLaunchOptions(STEAM_APPID);
    if (cleared.length === 0 || verified.length === 0 || !verified.every((entry) => String(entry?.launchOptions || "") === "")) {
      context.api.util.ui.notify({
        type: "steam_launch_options_clear_failed",
        display: "toast",
        variant: "error",
        title: "Steam \u542F\u52A8\u9879\u6E05\u7406\u5931\u8D25",
        content: "SMAPI \u542F\u52A8\u9879\u672A\u6210\u529F\u6E05\u7A7A\uFF0C\u8BF7\u786E\u8BA4 Steam \u5DF2\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002"
      });
      return;
    }
    context.api.util.ui.notify({
      type: "steam_launch_options_cleared",
      display: "toast",
      variant: "success",
      title: "Steam \u542F\u52A8\u9879\u5DF2\u6E05\u7A7A",
      content: "SMAPI \u542F\u52A8\u9879\u5DF2\u6E05\u7A7A\uFF0C\u6B63\u5728\u91CD\u65B0\u6253\u5F00 Steam\u3002"
    });
    await relaunchSteamAfterLaunchOptionWrite(response);
  }
  context.once(() => {
    context.api.onAsync("did-enable-mod-file", ensureSmapiSteamLaunchOptions);
    context.api.onAsync("did-disable-mod-file", clearSmapiSteamLaunchOptions);
  });
}
var index_default = main;
