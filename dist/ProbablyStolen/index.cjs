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
  default: () => main
});
module.exports = __toCommonJS(index_exports);
var GAME_ID = 4348910;
var MELONLOADER_REQUIREMENT_MOD_ID = "129002";
var EXECUTABLE = "Probably Stolen.exe";
var REQUIRED_GAME_FILES = [
  EXECUTABLE,
  "UnityPlayer.dll",
  "GameAssembly.dll",
  "Probably Stolen_Data/il2cpp_data/Metadata/global-metadata.dat"
];
var modType = (kind) => `${GAME_ID}-${kind}`;
var RUNTIME_FILES = {
  melonloader: ["version.dll", "MelonLoader/net6/MelonLoader.dll", "MelonLoader/net6/MelonLoader.runtimeconfig.json"],
  bepinex: [
    "winhttp.dll",
    "doorstop_config.ini",
    "BepInEx/core/BepInEx.Unity.IL2CPP.dll",
    "BepInEx/core/BepInEx.Core.dll",
    "dotnet/coreclr.dll"
  ]
};
var ROOTS = new Map(["Mods", "Plugins", "UserData", "UserLibs", "BepInEx"].map((p) => [p.toLowerCase(), p]));
var BLOCKED = /\.(exe|bat|cmd|ps1|vbs|msi|lnk|reg|sh)$/i;
var INJECTORS = /* @__PURE__ */ new Set(["version.dll", "winhttp.dll", "dobby.dll", "gameassembly.dll", "unityplayer.dll"]);
function safePath(source) {
  if (!source || /^[\\/]/.test(source) || /[:\x00-\x1f]/.test(source)) return void 0;
  const value = source.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
  if (value.endsWith("/")) return void 0;
  const parts = value.split("/");
  if (parts.some((p) => !p || p === "." || p === ".." || /[. ]$/.test(p) || /[<>"|?*]/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) return void 0;
  return value;
}
function runtimeRoot(files, loader) {
  const paths = files.map(safePath).filter((p) => !!p);
  const names = new Set(paths.map((p) => p.toLowerCase()));
  const marker = RUNTIME_FILES[loader][0].toLowerCase();
  for (const path of paths) {
    if (path.split("/").at(-1)?.toLowerCase() !== marker) continue;
    const prefix = path.slice(0, -marker.length);
    if (RUNTIME_FILES[loader].every((p) => names.has((prefix + p).toLowerCase()))) return prefix;
  }
  return void 0;
}
function looksLikeRuntime(files) {
  return files.some((source) => {
    const path = safePath(source)?.toLowerCase();
    return !!path && (path.split("/").some((p) => p === "melonloader" || p === "dotnet") || /(^|\/)bepinex\/core\//.test(path) || INJECTORS.has(path.split("/").at(-1)));
  });
}
function checkedInstructions(instructions) {
  const seen = /* @__PURE__ */ new Set();
  for (const instruction of instructions) {
    const key = instruction.destination.toLowerCase();
    if (seen.has(key)) throw new Error(`\u538B\u7F29\u5305\u6709\u91CD\u590D\u76EE\u6807\u6587\u4EF6\uFF1A${instruction.destination}`);
    seen.add(key);
  }
  return instructions;
}
function runtimeInstructions(files, loader) {
  const prefix = runtimeRoot(files, loader);
  if (prefix === void 0) throw new Error("\u8BF7\u9009\u62E9\u5B8C\u6574\u7684 Windows x64 IL2CPP \u9884\u8F7D\u5668 ZIP\u3002");
  const result = [];
  for (const source of files) {
    const path = safePath(source);
    if (!path || !path.toLowerCase().startsWith(prefix.toLowerCase())) continue;
    const destination = path.slice(prefix.length);
    const lower = destination.toLowerCase();
    const allowed = loader === "melonloader" ? lower.startsWith("melonloader/") || lower === "version.dll" || lower === "dobby.dll" : lower.startsWith("bepinex/") || lower.startsWith("dotnet/") || lower === "winhttp.dll" || lower === "doorstop_config.ini" || lower === ".doorstop_version";
    if (allowed) result.push({ type: "copy", source, destination });
  }
  return checkedInstructions(result);
}
function modInstructions(files) {
  if (looksLikeRuntime(files)) return [];
  const paths = files.map((source) => ({ source, path: safePath(source) })).filter((p) => !!p.path);
  const structured = [];
  for (const { source, path } of paths) {
    const parts = path.split("/");
    const anchor = parts.findIndex((p) => ROOTS.has(p.toLowerCase()));
    if (anchor < 0 || anchor === parts.length - 1 || BLOCKED.test(path)) continue;
    const root = ROOTS.get(parts[anchor].toLowerCase());
    if (root === "BepInEx" && !["plugins", "patchers", "config"].includes(parts[anchor + 1].toLowerCase())) continue;
    structured.push({ type: "copy", source, destination: [root, ...parts.slice(anchor + 1)].join("/") });
  }
  if (structured.length) return checkedInstructions(structured);
  const looseFiles = paths.filter(({ path }) => !BLOCKED.test(path) && !/(^|\/)(readme[^/]*|changelog[^/]*|license[^/]*|manifest\.json|icon\.png)$/i.test(path) && !/\.(md|png|jpe?g|webp)$/i.test(path));
  const dlls = looseFiles.filter(({ path }) => /\.dll$/i.test(path));
  if (!dlls.length) return [];
  let prefix = dlls[0].path.split("/").slice(0, -1);
  for (const { path } of looseFiles) {
    const pieces = path.split("/").slice(0, -1);
    while (!prefix.every((p, i) => pieces[i] === p)) prefix.pop();
  }
  return checkedInstructions(looseFiles.flatMap(({ source, path }) => {
    return [{ type: "copy", source, destination: `Mods/${path.split("/").slice(prefix.length).join("/")}` }];
  }));
}
async function main(context) {
  let selectedPath;
  const exists = async (root, relative) => {
    try {
      return Boolean((await context.api.util.fs.stat(context.api.util.path.join(root, relative)))?.isFile);
    } catch {
      return false;
    }
  };
  const validGame = async (path) => (await Promise.all(REQUIRED_GAME_FILES.map((p) => exists(path, p)))).every(Boolean);
  const findGamePath = async () => {
    if (selectedPath && await validGame(selectedPath)) return selectedPath;
    const found = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
    if (!found?.gamePath) return void 0;
    for (const path of [found.gamePath, context.api.util.path.join(found.gamePath, "Probably Stolen")]) {
      if (await validGame(path)) return path;
    }
    return void 0;
  };
  const getLoaderStatus = async () => {
    const gamePath = await findGamePath();
    const read = async (loader) => {
      const missingFiles = [];
      for (const file of RUNTIME_FILES[loader]) if (!gamePath || !await exists(gamePath, file)) missingFiles.push(file);
      return {
        installed: missingFiles.length === 0,
        missingFiles,
        injectorPresent: !!gamePath && await exists(gamePath, RUNTIME_FILES[loader][0])
      };
    };
    const melonloader = await read("melonloader");
    const bepinex = await read("bepinex");
    return {
      gamePath: gamePath ?? "",
      melonloader,
      bepinex,
      conflict: melonloader.injectorPresent && bepinex.injectorPresent
    };
  };
  const getExtensionRequiredMods = async () => {
    const status = await getLoaderStatus();
    if (status.conflict) throw new Error("\u68C0\u6D4B\u5230 MelonLoader \u548C BepInEx \u540C\u65F6\u542F\u7528\uFF0C\u8BF7\u53EA\u4FDD\u7559\u4E00\u79CD\u9884\u8F7D\u5668\u3002");
    if (status.bepinex.injectorPresent && !status.bepinex.installed)
      throw new Error("\u68C0\u6D4B\u5230\u4E0D\u5B8C\u6574\u7684 BepInEx \u5B89\u88C5\uFF0C\u8BF7\u5148\u4FEE\u590D\u6216\u79FB\u9664\uFF0C\u518D\u5B89\u88C5 MelonLoader\u3002");
    const requirements = status.melonloader.installed || status.bepinex.installed ? [] : [{
      key: "probably-stolen-melonloader",
      name: "MelonLoader 0.7.3 (x64)",
      modId: MELONLOADER_REQUIREMENT_MOD_ID,
      mod_id: MELONLOADER_REQUIREMENT_MOD_ID,
      modType: modType("melonloader"),
      openModDetailDialog: false,
      requirement: "enabled"
    }];
    const result = { installed: requirements.length === 0, gamePath: status.gamePath, requirements };
    if (result.installed) return result;
    return {
      ...result,
      code: "EXTENSION_REQUIRED_MODS_MISSING",
      requirement: { code: "EXTENSION_REQUIRED_MODS_MISSING", requirements }
    };
  };
  context.registerGame({
    id: GAME_ID,
    name: "Probably Stolen",
    executable: EXECUTABLE,
    requiredFiles: REQUIRED_GAME_FILES,
    queryPath: findGamePath,
    setup: async (discovery) => {
      const candidate = discovery?.path || discovery?.gamePath;
      if (candidate && !await validGame(candidate)) throw new Error("\u8BF7\u9009\u62E9\u5305\u542B Probably Stolen.exe \u7684 IL2CPP \u6E38\u620F\u76EE\u5F55\u3002");
      selectedPath = candidate || await findGamePath();
      return getExtensionRequiredMods();
    },
    localModFeatures: [{
      modId: Number(MELONLOADER_REQUIREMENT_MOD_ID),
      marked: true,
      mark: { type: "prerequisite", label: "\u524D\u7F6E\u6A21\u7EC4" }
    }],
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID }
  });
  const supportedGame = (id) => String(id) === String(GAME_ID);
  for (const loader of ["melonloader", "bepinex"]) {
    context.registerModType(
      modType(loader),
      60,
      supportedGame,
      () => "{gamePath}",
      () => false,
      { name: loader === "melonloader" ? "MelonLoader IL2CPP Runtime" : "BepInEx 6 IL2CPP Runtime" }
    );
    context.registerInstaller(
      modType(loader),
      60,
      (files, id) => ({ supported: supportedGame(id) && runtimeRoot(files, loader) !== void 0 }),
      async (files) => {
        if (runtimeRoot(files, loader === "melonloader" ? "bepinex" : "melonloader") !== void 0)
          throw new Error("\u538B\u7F29\u5305\u540C\u65F6\u5305\u542B\u4E24\u79CD\u9884\u8F7D\u5668\uFF0C\u8BF7\u62C6\u5206\u5E76\u53EA\u542F\u7528\u4E00\u79CD\u3002");
        const status = await getLoaderStatus();
        const other = loader === "melonloader" ? "bepinex" : "melonloader";
        if (status[other].injectorPresent) throw new Error(`\u8BF7\u5148\u7981\u7528\u6216\u79FB\u9664 ${other} \u9884\u8F7D\u5668\uFF0C\u518D\u5B89\u88C5 ${loader}\u3002`);
        return { instructions: runtimeInstructions(files, loader), modType: modType(loader) };
      }
    );
  }
  context.registerModType(
    modType("mods"),
    30,
    supportedGame,
    () => "{gamePath}",
    () => false,
    { name: "Probably Stolen Mods / Content Packs" }
  );
  context.registerInstaller(
    modType("mods"),
    30,
    (files, id) => ({ supported: supportedGame(id) && modInstructions(files).length > 0 }),
    (files) => ({ instructions: modInstructions(files), modType: modType("mods") })
  );
  context.registerExtensionAction(GAME_ID, "getLoaderStatus", getLoaderStatus);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", getExtensionRequiredMods);
  return true;
}
