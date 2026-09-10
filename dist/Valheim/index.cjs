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

// src/constants.ts
var GAME_ID = 892970;
var BEPINEX_MOD_ID = "82254";
var typeId = (kind) => `${GAME_ID}-${kind}`;
var PAYLOAD_FILES = ["winhttp.dll"];

// src/installers.ts
var metadata = /^(manifest\.json|icon\.png|readme(?:\..*)?|changelog(?:\..*)?|license(?:\..*)?)$/i;
var base = (p) => p.split("/").at(-1);
var dir = (p) => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
var join = (...parts) => parts.filter(Boolean).join("/");
function entries(files) {
  return files.flatMap((source) => {
    const p = source.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
    if (!p || p.endsWith("/")) return [];
    if (p.startsWith("/") || p.split("/").some((s) => !s || s === ".." || s === "." || /[<>:"|?*\x00-\x1f]/.test(s) || /[. ]$/.test(s) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s))) {
      throw new Error(`Unsafe archive path: ${source}`);
    }
    return [{ source, path: p, lower: p.toLowerCase() }];
  });
}
function payloadRoot(es) {
  const roots = es.filter((e) => base(e.lower) === "winhttp.dll").map((e) => dir(e.path));
  if (roots.length > 1) throw new Error("Multiple BepInEx payloads; select a single variant");
  return roots[0];
}
function assemblyRoots(es) {
  return [...new Set(es.flatMap((e) => {
    const segments = e.lower.split("/");
    const i = segments.findIndex((s) => ["unstripped_corlib", "core_lib", "unstripped_managed"].includes(s));
    return i < 0 ? [] : [e.path.split("/").slice(0, i + 1).join("/")];
  }))].filter((root) => es.some((e) => ["mscorlib.dll", "mono.posix.dll", "mono.security.dll"].some((name) => e.lower === join(root, name).toLowerCase())));
}
var hasSegment = (e, names) => e.lower.split("/").some((s) => names.includes(s));
function classify(es) {
  if (payloadRoot(es) !== void 0) return "bepinex";
  if (assemblyRoots(es).length) return "unstripped";
  if (es.some((e) => base(e.lower) === "inslimvml.ini")) return "inslim-loader";
  if (es.some((e) => /(^|\/)core\/(bepinex|0harmony)/.test(e.lower))) return "core-remover";
  if (es.some((e) => hasSegment(e, ["bepinex", "plugins", "patchers", "config", "custommeshes", "customtextures"]))) return "bepinex-root";
  if (es.some((e) => hasSegment(e, ["valheim_data"]) || ["winhttp.dll", "doorstop_config.ini", "version.dll", "dxgi.dll", "d3d11.dll"].includes(base(e.lower)))) return "engine";
  if (es.some((e) => base(e.lower) === "configurationmanager.dll")) return "config-manager";
  if (es.some((e) => hasSegment(e, ["inslimvml"]) || e.lower.endsWith("_vml.dll"))) return "inslim";
  if (es.some((e) => e.lower.endsWith(".bettercontinents"))) return "better-continents";
  if (es.some((e) => e.lower.endsWith(".fwl") && es.some((other) => other.lower === e.lower.slice(0, -4) + ".db"))) return "world";
  if (es.some((e) => e.lower.endsWith(".vbuild"))) return "vbuild";
  if (es.some((e) => /\.(fbx|obj)$/.test(e.lower))) return "meshes";
  if (es.some((e) => /tex\.png$/.test(e.lower))) return "textures";
  if (es.some((e) => /\.(assets|ress|resource)$/i.test(e.path))) return "engine";
  if (es.some((e) => e.lower.endsWith(".dll"))) return "plugin";
  return void 0;
}
function testKind(kind, files, gameId) {
  let supported = false;
  try {
    supported = Number(gameId) === GAME_ID && classify(entries(files)) === kind;
  } catch {
  }
  return { supported, requiredFiles: [] };
}
function commonRoot(es) {
  const parts = es.map((e) => dir(e.path).split("/").filter(Boolean));
  const root = parts[0]?.slice() ?? [];
  while (root.length && !parts.every((p) => root.every((s, i) => s.toLowerCase() === p[i]?.toLowerCase()))) root.pop();
  return root.join("/");
}
function relative(e, root) {
  return !root ? e.path : e.lower.startsWith(root.toLowerCase() + "/") ? e.path.slice(root.length + 1) : void 0;
}
function mapped(e) {
  const parts = e.path.split("/");
  const lower = e.lower.split("/");
  const i = lower.findIndex((s) => ["bepinex", "plugins", "patchers", "config", "custommeshes", "customtextures", "inslimvml", "valheim_data", "advancedbuilder", "vortex-worlds"].includes(s));
  if (i < 0) return void 0;
  const tail = parts.slice(i + 1).join("/");
  const key = lower[i];
  if (key === "bepinex") return join("BepInEx", tail);
  if (["plugins", "patchers", "config"].includes(key)) return join("BepInEx", key, tail);
  if (key === "custommeshes" || key === "customtextures") return join("BepInEx/plugins", key === "custommeshes" ? "CustomMeshes" : "CustomTextures", tail);
  return join({ inslimvml: "InSlimVML", valheim_data: "valheim_Data", advancedbuilder: "AdvancedBuilder", "vortex-worlds": "vortex-worlds" }[key], tail);
}
var bundledCore = (e) => hasSegment(e, ["core", "valheim_data"]) || /^(winhttp\.dll|doorstop_config\.ini|bepinex\.cfg|0harmony.*|bepinex\..*|monomod\..*|mono\.cecil.*|harmonyxinterop\.dll)$/i.test(base(e.lower));
function installKind(kind, files) {
  const es = entries(files);
  const instructions = [];
  const used = /* @__PURE__ */ new Set();
  function copy(e, destination) {
    if (!destination) return;
    const key = destination.toLowerCase();
    if (used.has(key)) throw new Error(`Conflicting archive destinations: ${destination}`);
    used.add(key);
    const mutable = /(^|\/)config\/.*\.(cfg|yml|yaml|json)$/i.test(destination) || key === "doorstop_config.ini";
    instructions.push({
      type: "copy",
      source: e.source,
      destination,
      ...mutable ? { verification: "exists", conflictPolicy: "overwrite" } : {}
    });
  }
  if (kind === "bepinex") {
    const root = payloadRoot(es);
    if (root === void 0) throw new Error("Incomplete Valheim BepInEx payload");
    for (const e of es) {
      const p = relative(e, root);
      if (p) copy(e, p);
    }
  } else if (kind === "unstripped") {
    const roots = assemblyRoots(es);
    if (roots.length !== 1) throw new Error("Select exactly one unstripped assembly variant");
    for (const e of es) {
      const p = relative(e, roots[0]);
      if (p && !metadata.test(base(p))) copy(e, join("unstripped_corlib", p));
    }
  } else {
    const payload = es.filter((e) => !metadata.test(base(e.path)) && (kind !== "core-remover" || !bundledCore(e)));
    let root = commonRoot(payload);
    if (kind === "inslim-loader") root = dir(es.find((e) => base(e.lower) === "inslimvml.ini")?.path ?? "");
    if (kind === "better-continents") {
      const roots = [...new Set(es.filter((e) => e.lower.endsWith(".bettercontinents")).map((e) => dir(e.path)))];
      if (roots.length !== 1) throw new Error("Select a single Better Continents world package");
      root = roots[0];
    }
    const defaults = {
      "config-manager": "BepInEx/plugins/ConfigurationManager",
      inslim: "InSlimVML/Mods",
      "better-continents": "vortex-worlds",
      world: "vortex-worlds",
      vbuild: "AdvancedBuilder/Builds",
      meshes: "BepInEx/plugins/CustomMeshes",
      textures: "BepInEx/plugins/CustomTextures",
      plugin: "BepInEx/plugins",
      "bepinex-root": "BepInEx/plugins",
      "core-remover": "BepInEx/plugins"
    };
    for (const e of payload) {
      const p = relative(e, root);
      if (!p) continue;
      if (kind === "vbuild") {
        if (e.lower.endsWith(".vbuild")) copy(e, join(defaults.vbuild, base(e.path)));
        continue;
      }
      if (kind === "inslim-loader") {
        if (["winhttp.dll", "doorstop_config.ini", "slimvml.loader.dll", "0harmony.dll"].includes(base(e.lower))) continue;
        copy(e, p);
        continue;
      }
      if (kind === "engine") {
        copy(e, mapped(e) ?? (/\.(assets|ress|resource)$/i.test(e.path) ? join("valheim_Data", p) : p));
        continue;
      }
      copy(e, mapped(e) ?? join(defaults[kind] ?? "", p));
    }
  }
  if (!instructions.length) throw new Error("No supported Valheim files in archive");
  return { instructions, modType: typeId(kind) };
}
var installers = [
  { kind: "bepinex", priority: 1, name: "BepInExPack Valheim" },
  { kind: "unstripped", priority: 2, name: "Denikson Unstripped Assemblies" },
  { kind: "inslim-loader", priority: 10, name: "InSlimVML Mod Loader" },
  { kind: "core-remover", priority: 11, name: "Mod with bundled BepInEx Core" },
  { kind: "bepinex-root", priority: 20, name: "BepInEx Root Mod" },
  { kind: "engine", priority: 21, name: "Engine Injector / Asset Replacer" },
  { kind: "config-manager", priority: 22, name: "Configuration Manager" },
  { kind: "inslim", priority: 23, name: "InSlimVML Mod" },
  { kind: "better-continents", priority: 24, name: "Better Continents World" },
  { kind: "world", priority: 25, name: "Vortex Worlds" },
  { kind: "vbuild", priority: 26, name: "BuildShare / AdvancedBuilder" },
  { kind: "meshes", priority: 27, name: "CustomMeshes Mod" },
  { kind: "textures", priority: 28, name: "CustomTextures Mod" },
  { kind: "plugin", priority: 50, name: "BepInEx Plugin" }
];

// src/requirements.ts
async function findGamePath(context) {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath;
}
function getRequirementItems() {
  return [
    {
      kind: "bepinex",
      name: "BepInExPack Valheim",
      modId: BEPINEX_MOD_ID,
      url: "https://thunderstore.io/c/valheim/p/denikson/BepInExPack_Valheim/"
    }
  ].map(({ kind, name, modId, url }) => ({
    key: `valheim-${kind}`,
    name,
    modType: typeId(kind),
    modId,
    mod_id: modId,
    sourceUrl: url,
    url,
    openModDetailDialog: false,
    requirement: "enabled"
  }));
}
async function getRequirementStatus(context, gamePath) {
  const resolved = String(gamePath || await findGamePath(context) || "");
  const fs = context.api.util.fs;
  const path = context.api.util.path;
  async function exists(file) {
    if (!resolved) return false;
    try {
      return Boolean((await fs.stat(path.join(resolved, file))).isFile);
    } catch {
      return false;
    }
  }
  const payload = await Promise.all(PAYLOAD_FILES.map(exists));
  const requirements = payload.every(Boolean) ? [] : getRequirementItems();
  return { installed: requirements.length === 0, gamePath: resolved, requirements };
}
async function getExtensionRequiredMods(context, gamePath) {
  const status = await getRequirementStatus(context, gamePath);
  return status.installed ? status : {
    ...status,
    code: "EXTENSION_REQUIRED_MODS_MISSING",
    requirement: { code: "EXTENSION_REQUIRED_MODS_MISSING", requirements: status.requirements }
  };
}

// src/index.ts
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: "\u82F1\u7075\u795E\u6BBF",
    shortName: "Valheim",
    executable: "valheim.exe",
    requiredFiles: ["valheim.exe"],
    queryPath: () => findGamePath(context),
    modPath: ".",
    modPathIsRelative: true,
    queryModPath: () => ".",
    mergeMods: true,
    requiresCleanup: true,
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")),
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: "valheim", customOpenModsPath: "BepInEx/plugins" }
  });
  for (const { kind, priority, name } of installers) {
    const test = (files, id) => testKind(kind, files, id);
    context.registerModType(
      typeId(kind),
      200 - priority,
      (id) => Number(id) === GAME_ID,
      () => "{gamePath}",
      (input) => test(Array.isArray(input) ? input : input?.files ?? [], GAME_ID).supported,
      { name }
    );
    context.registerInstaller(typeId(kind), 200 - priority, test, (files) => installKind(kind, files));
  }
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
