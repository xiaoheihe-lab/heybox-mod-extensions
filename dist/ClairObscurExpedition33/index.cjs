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
var GAME_ID = 1903340;
var GAME_NAME = "Clair Obscur: Expedition 33";
var GAME_SHORT_NAME = "Expedition 33";
var STEAM_APP_ID = "1903340";
var EXECUTABLE = "Expedition33_Steam.exe";
var NEXUS_GAME_DOMAIN = "clairobscurexpedition33";
var GAME_FOLDER = "Sandfall";
var WIN64_PATH = `${GAME_FOLDER}/Binaries/Win64`;
var UE4SS_RUNTIME_PATH = `${WIN64_PATH}/ue4ss`;
var UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`;
var PAK_MODS_PATH = `${GAME_FOLDER}/Content/Paks/~mods`;
var LOGIC_MODS_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`;
var UE4SS_DWMAPI = "dwmapi.dll";
var UE4SS_DLL = "UE4SS.dll";
var UE4SS_REQUIREMENT_MOD_ID = "8577";
var PAK_EXTENSIONS = [".pak", ".ucas", ".utoc"];
var PAK_EXTENSION = ".pak";
var MOD_TYPE_FOMOD = `${GAME_ID}-fomod`;
var MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`;
var MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`;
var MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_CONTENT = `${GAME_ID}-content`;
var MOD_TYPE_BINARIES = `${GAME_ID}-binaries`;
var MOD_TYPE_PRIORITY = {
  combo: 950,
  logic: 900,
  pak: 850,
  ue4ss: 800,
  script: 650,
  dll: 600,
  root: 500,
  content: 450,
  binaries: 100
};
var PAK_LOAD_ORDER_PROVIDER_ID = "clair-obscur-expedition-33-pak";
var PAK_ATTRIBUTE = "clairObscurExpedition33PakFiles";

// src/game.ts
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function registerGame(context, setup) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, GAME_FOLDER],
    ...setup ? { setup } : {},
    environment: {
      SteamAPPId: STEAM_APP_ID
    },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: NEXUS_GAME_DOMAIN,
      customOpenModsPath: PAK_MODS_PATH,
      supportsSymlinks: false
    }
  });
}

// src/utils/archivePaths.ts
function normalizeArchivePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+/, "");
}
function splitArchivePath(filePath) {
  return normalizeArchivePath(filePath).split("/").filter(Boolean);
}
function archiveBaseName(filePath) {
  const parts = splitArchivePath(filePath);
  return parts[parts.length - 1] || "";
}
function archiveDirName(filePath) {
  return splitArchivePath(filePath).slice(0, -1).join("/");
}
function archiveExtName(filePath) {
  const base = archiveBaseName(filePath);
  const index = base.lastIndexOf(".");
  return index >= 0 ? base.slice(index).toLowerCase() : "";
}
function archiveStem(filePath) {
  const base = archiveBaseName(filePath);
  const index = base.lastIndexOf(".");
  return index >= 0 ? base.slice(0, index) : base;
}
function archiveJoin(...parts) {
  return parts.flatMap((part) => splitArchivePath(part)).join("/");
}
function removeLeadingSegments(filePath, count) {
  return splitArchivePath(filePath).slice(count).join("/");
}
function isDirectoryEntry(file, files) {
  const raw = String(file || "");
  if (/[\\/]$/.test(raw)) return true;
  const normalized = normalizeArchivePath(file).replace(/\/+$/, "");
  if (!normalized) return true;
  const prefix = `${normalized.toLowerCase()}/`;
  return files.some((candidate) => normalizeArchivePath(candidate).toLowerCase().startsWith(prefix));
}
function isArchiveFile(file, files) {
  return Boolean(archiveBaseName(file)) && !isDirectoryEntry(file, files);
}
function isUnderSegments(filePath, parent) {
  const parts = splitArchivePath(filePath);
  return parent.every((segment, index) => parts[index]?.toLowerCase() === segment.toLowerCase());
}
function findExplicitDirectory(files, name, under) {
  const lower = name.toLowerCase();
  for (const file of files) {
    const parts = splitArchivePath(file);
    if (parts[parts.length - 1]?.toLowerCase() !== lower) continue;
    if (under && !isUnderSegments(file, under)) continue;
    if (isDirectoryEntry(file, files)) return parts;
  }
  return null;
}
function fallbackFolderId(stagingPath, fallback = "Expedition33Mod") {
  const clean = String(stagingPath || "").replace(/[\\/]+$/, "");
  const leaf = clean.split(/[\\/]/).pop() || fallback;
  return leaf.replace(/\.installing$/i, "").replace(/\.(zip|rar|7z)$/i, "") || fallback;
}
function normalizeDeploymentPath(value) {
  return normalizeArchivePath(String(value ?? "")).replace(/^\.\//, "").toLowerCase();
}

// src/loadOrder/deployer.ts
var PREFIX_CAPACITY = 26 * 26 * 26;
function makeLoadOrderPrefix(index) {
  if (!Number.isInteger(index) || index < 0 || index >= PREFIX_CAPACITY) {
    throw new Error(`Pak Load Order exceeds three-letter prefix capacity: ${index}`);
  }
  const first2 = Math.floor(index / (26 * 26));
  const second = Math.floor(index / 26) % 26;
  const third = index % 26;
  return [first2, second, third].map((value) => String.fromCharCode(65 + value)).join("");
}
function safeFolderId(modKey) {
  const normalized = String(modKey || "").replace(/[^0-9A-Za-z._-]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) throw new Error("Pak Load Order entry has no valid modKey");
  return normalized;
}
function isPakDeploymentPath(targetPath) {
  const normalized = normalizeArchivePath(targetPath).toLowerCase();
  const root = normalizeArchivePath(PAK_MODS_PATH).toLowerCase();
  return normalized === root || normalized.startsWith(`${root}/`);
}
function planPakLoadOrderMutation(mutation, entries) {
  const orderIndex = new Map(entries.map((entry, index) => [entry.ownerModKey, index]));
  let planned = 0;
  for (const deployment of Array.isArray(mutation.entries) ? mutation.entries : []) {
    const index = orderIndex.get(deployment.modKey);
    if (index === void 0 || !isPakDeploymentPath(deployment.targetPath)) continue;
    if (deployment.exists === false) {
      mutation.warn("Pak Load Order skipped a missing VFS deployment file", {
        modKey: deployment.modKey,
        targetPath: deployment.targetPath
      });
      continue;
    }
    const destination = archiveJoin(
      PAK_MODS_PATH,
      `${makeLoadOrderPrefix(index)}-${safeFolderId(deployment.modKey)}`,
      archiveBaseName(deployment.targetPath)
    );
    if (normalizeArchivePath(destination).toLowerCase() === normalizeArchivePath(deployment.targetPath).toLowerCase()) continue;
    mutation.moveDeployment({
      modKey: deployment.modKey,
      from: deployment.targetPath,
      to: destination,
      expectedHash: deployment.expectedHash
    });
    planned += 1;
  }
  return planned;
}
async function serializePakLoadOrder(context, entries, _loadOrderContext) {
  for (const modType of [MOD_TYPE_PAK, MOD_TYPE_FOMOD]) {
    const result = await context.api.vfs.runManagedDeploymentMutation(
      { modType },
      (mutation) => planPakLoadOrderMutation(mutation, entries)
    );
    if (result?.ok === false) {
      const message = result.warnings?.map((warning) => String(warning?.message || "")).filter(Boolean).join("; ");
      throw new Error(message || "Pak Load Order deployment failed");
    }
  }
}

// src/loadOrder/provider.ts
function modDisplayName(mod) {
  const metaInfo = mod.metaInfo || {};
  const name = String(metaInfo.customFileName || metaInfo.logicalFileName || metaInfo.name || metaInfo.title || mod.modKey);
  const files = Array.isArray(metaInfo[PAK_ATTRIBUTE]) ? metaInfo[PAK_ATTRIBUTE] : [];
  return files.length > 1 ? `${name} (${files.length} IO Store files)` : name;
}
function isPakLoadOrderModRelevant(mod) {
  const modType = String(mod.modType || "");
  if (modType === MOD_TYPE_PAK) return true;
  const files = mod.metaInfo && Array.isArray(mod.metaInfo[PAK_ATTRIBUTE]) ? mod.metaInfo[PAK_ATTRIBUTE] : [];
  return modType === MOD_TYPE_FOMOD && files.length > 0;
}
function deserializePakLoadOrder(context) {
  const entries = context.mods.filter(isPakLoadOrderModRelevant).map((mod) => ({
    id: mod.modKey,
    ownerModKey: mod.modKey,
    name: modDisplayName(mod),
    enabled: mod.enabled,
    data: { modKey: mod.modKey }
  }));
  const savedIndex = new Map(context.savedOrder.map((id, index) => [id, index]));
  const appendIndex = context.savedOrder.length;
  return entries.sort((left, right) => {
    const leftIndex = savedIndex.get(left.id) ?? appendIndex;
    const rightIndex = savedIndex.get(right.id) ?? appendIndex;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    const nameOrder = left.name.localeCompare(right.name);
    return nameOrder || left.id.localeCompare(right.id);
  });
}

// src/loadOrder/index.ts
function registerPakLoadOrder(contextValue) {
  const context = contextValue;
  context.registerLoadOrder({
    id: PAK_LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: "Expedition 33 Pak Load Order",
    usageInstructions: [
      "Entries later in the list have higher load priority.",
      "Disabled entries keep their relative position and retain it when enabled again."
    ],
    modTypes: [MOD_TYPE_PAK, MOD_TYPE_FOMOD],
    isModRelevant: isPakLoadOrderModRelevant,
    deserializeLoadOrder: deserializePakLoadOrder,
    serializeLoadOrder: (entries, loadOrderContext) => serializePakLoadOrder(contextValue, entries, loadOrderContext)
  });
  context.registerExtensionAction(GAME_ID, "deployPakLoadOrder", () => context.api.loadOrder.deploy(PAK_LOAD_ORDER_PROVIDER_ID));
}

// ../../utils/fomod-utils/dist/security/paths.js
var DRIVE_OR_UNC = /^(?:[a-z]:|\\\\|\/\/)/i;
function normalizeArchivePath2(input, allowEmpty = false) {
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
  return normalizeArchivePath2(parts.filter((part) => String(part ?? "").trim()).join("/"), true);
}
function findFomodRoot(files) {
  const matches = files.map((source) => ({ source, normalized: normalizeArchivePath2(source) })).filter(({ normalized }) => {
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
      path: normalizeArchivePath2(attr(item, "file")),
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
        source: normalizeArchivePath2(attr(item, "source")),
        destination: normalizeArchivePath2(attr(item, "destination"), true),
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
      mappings.push({ source: actual, destination: normalizeArchivePath2(destination), priority: item.priority, order: item.order });
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
    const relative = joinArchivePath(packageRoot, normalizeArchivePath2(imagePath));
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
  const isTargetGame2 = (gameId) => String(gameId) === String(options.gameId);
  context.registerModType(options.typeId, 1e3, isTargetGame2, () => "{gamePath}", () => false, {
    name: options.name || "FOMOD Installer"
  });
  context.registerInstaller(options.typeId, options.priority ?? 100, (files, gameId) => ({
    supported: isTargetGame2(gameId) && isFomodPackage(files)
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

// src/installers/common.ts
function isTargetGame(gameId) {
  return Number(gameId) === GAME_ID;
}
function isFomodPackage2(files) {
  return files.some((file) => {
    const parts = splitArchivePath(file);
    return archiveBaseName(file).toLowerCase() === "moduleconfig.xml" && parts[parts.length - 2]?.toLowerCase() === "fomod";
  });
}
function testResult(supported) {
  return { supported, requiredFiles: [] };
}

// src/installers/fallback.ts
var FALLBACK_INSTALL_CANCELLED = "Clair Obscur: Expedition 33 Binaries fallback installation cancelled by user";
function testBinaries(files, gameId) {
  const hasIostoreFile = files.some((file) => isArchiveFile(file, files) && PAK_EXTENSIONS.includes(archiveExtName(file)));
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && !hasIostoreFile);
}
async function installBinaries(context, files) {
  const response = await context.api.util.ui.request({
    type: "clair_obscur_expedition_33_binaries_fallback",
    title: "\u6309 Binaries \u56DE\u9000\u89C4\u5219\u5B89\u88C5",
    content: "\u6B64\u538B\u7F29\u5305\u672A\u5339\u914D\u5230\u4E13\u7528\u5B89\u88C5\u5668\u3002\u5C06\u6309\u5176\u539F\u6709\u76F8\u5BF9\u8DEF\u5F84\u90E8\u7F72\u5230 Sandfall/Binaries/Win64\uFF1B\u8BF7\u786E\u8BA4\u538B\u7F29\u5305\u662F\u9762\u5411\u8BE5\u76EE\u5F55\u6253\u5305\u7684\u3002",
    confirm: { text: "\u7EE7\u7EED\u5B89\u88C5", type: "warning", visible: true },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  });
  if (!response?.confirmed) throw new Error(FALLBACK_INSTALL_CANCELLED);
  return {
    instructions: files.filter((file) => isArchiveFile(file, files)).map((file) => ({
      type: "copy",
      source: file,
      destination: archiveJoin(WIN64_PATH, file)
    })),
    modType: MOD_TYPE_BINARIES
  };
}

// src/installers/root.ts
function findGameRootAnchor(files) {
  return findExplicitDirectory(files, GAME_FOLDER);
}
function findContentAnchor(files) {
  return findExplicitDirectory(files, "Content");
}
function testRoot(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findGameRootAnchor(files) !== null);
}
function testContent(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findContentAnchor(files) !== null);
}
function installRoot(files) {
  const anchor = findGameRootAnchor(files);
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor)).map((file) => ({
    type: "copy",
    source: file,
    destination: removeLeadingSegments(file, Math.max(0, anchor.length - 1))
  })) : [];
  return { instructions, modType: MOD_TYPE_ROOT };
}
function installContent(files) {
  const anchor = findContentAnchor(files);
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor)).map((file) => ({
    type: "copy",
    source: file,
    destination: archiveJoin(GAME_FOLDER, removeLeadingSegments(file, Math.max(0, anchor.length - 1)))
  })) : [];
  return { instructions, modType: MOD_TYPE_CONTENT };
}

// src/installers/ue4ss.ts
function findUe4ssAnchor(files) {
  for (const anchorFile of files) {
    if (!isArchiveFile(anchorFile, files) || archiveBaseName(anchorFile).toLowerCase() !== UE4SS_DWMAPI) continue;
    const rootSegments = splitArchivePath(anchorFile).slice(0, -1);
    const hasNestedUe4ssDll = files.some((file) => {
      if (!isArchiveFile(file, files)) return false;
      const segments = splitArchivePath(file);
      return segments.length === rootSegments.length + 2 && rootSegments.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase()) && segments[rootSegments.length]?.toLowerCase() === "ue4ss" && segments[rootSegments.length + 1]?.toLowerCase() === UE4SS_DLL.toLowerCase();
    });
    if (hasNestedUe4ssDll) return { rootSegments };
  }
  return null;
}
function testUe4ss(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findUe4ssAnchor(files) !== null);
}
function installUe4ss(files) {
  const anchor = findUe4ssAnchor(files);
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files)).filter((file) => splitArchivePath(anchor.rootSegments.join("/")).every((segment, index) => splitArchivePath(file)[index]?.toLowerCase() === segment.toLowerCase())).map((file) => ({
    type: "copy",
    source: file,
    destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, anchor.rootSegments.length))
  })) : [];
  return { instructions, modType: MOD_TYPE_UE4SS };
}

// src/installers/ue4ssMods.ts
function findUe4ssModAnchor(files, marker, extension) {
  const markerSegments = findExplicitDirectory(files, marker);
  if (!markerSegments) return null;
  const hasPayload = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === extension && isUnderSegments(file, markerSegments));
  return hasPayload ? { markerSegments, rootSegments: markerSegments.slice(0, -1) } : null;
}
function testScript(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findUe4ssModAnchor(files, "Scripts", ".lua") !== null);
}
function testDll(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findUe4ssModAnchor(files, "dlls", ".dll") !== null);
}
function installUe4ssMod(files, stagingPath, marker, extension, modType) {
  const anchor = findUe4ssModAnchor(files, marker, extension);
  if (!anchor) return { instructions: [], modType };
  const folderId = anchor.rootSegments[anchor.rootSegments.length - 1] || fallbackFolderId(stagingPath);
  const instructions = [];
  let hasEnabledFile = false;
  for (const file of files) {
    if (!isArchiveFile(file, files) || !isUnderSegments(file, anchor.rootSegments)) continue;
    const relative = removeLeadingSegments(file, anchor.rootSegments.length);
    if (archiveBaseName(relative).toLowerCase() === "enabled.txt") hasEnabledFile = true;
    instructions.push({
      type: "copy",
      source: file,
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, relative)
    });
  }
  if (!hasEnabledFile) {
    instructions.push({
      type: "generatefile",
      data: "",
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, "enabled.txt")
    });
  }
  return { instructions, modType };
}
function installScript(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "Scripts", ".lua", MOD_TYPE_SCRIPT);
}
function installDll(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "dlls", ".dll", MOD_TYPE_DLL);
}

// src/installers/unreal.ts
var INSTALL_CANCELLED = "Clair Obscur: Expedition 33 mod installation cancelled by user";
function isPakFile(file, files) {
  return isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION;
}
function isIostoreFile(file, files) {
  return isArchiveFile(file, files) && PAK_EXTENSIONS.includes(archiveExtName(file));
}
function findComboAnchor(files) {
  const gameRoot = findExplicitDirectory(files, GAME_FOLDER);
  if (!gameRoot) return null;
  const hasPak = files.some((file) => isPakFile(file, files) && isUnderSegments(file, gameRoot));
  const hasLua = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === ".lua" && isUnderSegments(file, gameRoot));
  return hasPak && hasLua ? gameRoot : null;
}
function findLogicAnchor(files) {
  const logic = findExplicitDirectory(files, "LogicMods");
  if (!logic) return null;
  return files.some((file) => isPakFile(file, files) && isUnderSegments(file, logic)) ? logic : null;
}
function testUe4ssCombo(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findComboAnchor(files) !== null);
}
function testLogic(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findLogicAnchor(files) !== null);
}
function testPak(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && files.some((file) => isIostoreFile(file, files)));
}
function installUe4ssCombo(files) {
  const anchor = findComboAnchor(files);
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor)).map((file) => ({
    type: "copy",
    source: file,
    destination: removeLeadingSegments(file, Math.max(0, anchor.length - 1))
  })) : [];
  return { instructions, modType: MOD_TYPE_UE4SS_COMBO };
}
function installLogic(files) {
  const anchor = findLogicAnchor(files);
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor)).map((file) => ({
    type: "copy",
    source: file,
    destination: archiveJoin(LOGIC_MODS_PATH, removeLeadingSegments(file, anchor.length))
  })) : [];
  return { instructions, modType: MOD_TYPE_LOGIC };
}
function getSelectedChoiceIds(payload) {
  if (!payload || typeof payload !== "object") return [];
  const value = payload;
  const ids = value.choiceIds ?? value.selectedChoiceIds;
  if (Array.isArray(ids)) return ids.map(String).filter(Boolean);
  return [];
}
function selectedBundleIds(payload, bundles) {
  const allowed = new Set(bundles.map((bundle) => bundle.id));
  const selectedById = getSelectedChoiceIds(payload).filter((id) => allowed.has(id));
  if (selectedById.length > 0) return [...new Set(selectedById)];
  if (!payload || typeof payload !== "object") return [];
  const choices = payload.choices;
  if (!Array.isArray(choices)) return [];
  const byFile = new Map(bundles.flatMap((bundle) => bundle.files.map((file) => [normalizeArchivePath(file), bundle.id])));
  return [...new Set(choices.map((choice) => {
    if (typeof choice === "string") return allowed.has(choice) ? choice : byFile.get(normalizeArchivePath(choice));
    if (!choice || typeof choice !== "object") return void 0;
    const value = choice;
    if (typeof value.id === "string" && allowed.has(value.id)) return value.id;
    const payloadValue = value.payload && typeof value.payload === "object" ? value.payload : void 0;
    const file = typeof payloadValue?.file === "string" ? payloadValue.file : typeof value.file === "string" ? value.file : void 0;
    return file ? byFile.get(normalizeArchivePath(file)) : void 0;
  }).filter((id) => Boolean(id)))];
}
function makeBundles(files) {
  const grouped = /* @__PURE__ */ new Map();
  for (const file of files) {
    const key = `${archiveDirName(file).toLowerCase()}/${archiveStem(file).toLowerCase()}`;
    const bundle = grouped.get(key) || [];
    bundle.push(file);
    grouped.set(key, bundle);
  }
  return [...grouped.entries()].map(([key, bundle], index) => ({
    id: `iostore-${index}`,
    key,
    files: bundle
  }));
}
async function chooseIostoreFiles(context, files) {
  const bundles = makeBundles(files);
  if (bundles.length <= 1) return [...files];
  const response = await context.api.util.ui.request({
    type: "clair_obscur_expedition_33_iostore_selection",
    title: "\u9009\u62E9\u8981\u5B89\u88C5\u7684 IO Store Mod",
    content: `\u538B\u7F29\u5305\u5305\u542B ${bundles.length} \u7EC4 Pak/UCAS/UTOC \u6587\u4EF6\u3002\u6BCF\u7EC4\u4F1A\u6574\u4F53\u5B89\u88C5\uFF0C\u907F\u514D\u7F3A\u5C11 IO Store \u914D\u5957\u6587\u4EF6\u3002`,
    choiceMode: "multiple",
    selectedChoiceIds: bundles.map((bundle) => bundle.id),
    choices: bundles.map((bundle) => ({
      id: bundle.id,
      text: bundle.files.map(archiveBaseName).join(", "),
      description: bundle.files.map(normalizeArchivePath).join("\n"),
      value: true,
      payload: { file: bundle.files[0] }
    })),
    confirm: { text: "\u5B89\u88C5\u9009\u4E2D\u7684\u6587\u4EF6\u7EC4", type: "primary", visible: true },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED);
  const selectedIds = new Set(selectedBundleIds(response.payload, bundles));
  if (selectedIds.size === 0) throw new Error(INSTALL_CANCELLED);
  return bundles.filter((bundle) => selectedIds.has(bundle.id)).flatMap((bundle) => bundle.files);
}
function assertUniqueDestinations(files) {
  const seen = /* @__PURE__ */ new Map();
  for (const file of files) {
    const baseName = archiveBaseName(file);
    const key = baseName.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      throw new Error(`Pak \u6587\u4EF6\u6241\u5E73\u5316\u540E\u91CD\u540D\uFF0C\u65E0\u6CD5\u5B89\u5168\u5B89\u88C5\uFF1A${existing} \u4E0E ${normalizeArchivePath(file)}`);
    }
    seen.set(key, normalizeArchivePath(file));
  }
}
async function installPak(context, files) {
  const iostoreFiles = files.filter((file) => isIostoreFile(file, files));
  const selected = await chooseIostoreFiles(context, iostoreFiles);
  assertUniqueDestinations(selected);
  const instructions = [
    { type: "attribute", key: PAK_ATTRIBUTE, value: selected.map(archiveBaseName) },
    ...selected.map((file) => ({
      type: "copy",
      source: file,
      destination: archiveJoin(PAK_MODS_PATH, archiveBaseName(file))
    }))
  ];
  return { instructions, modType: MOD_TYPE_PAK };
}

// src/loadOrder/fomod.ts
function isPakModsDestination(destination) {
  const normalized = normalizeDeploymentPath(destination);
  const root = normalizeDeploymentPath(PAK_MODS_PATH);
  const isUnderRoot = normalized.startsWith(`${root}/`) || normalized.includes(`/${root}/`);
  return isUnderRoot && PAK_EXTENSIONS.includes(archiveExtName(normalized));
}
function extractFomodPakAttributes(context) {
  if (context.modTypeId !== MOD_TYPE_FOMOD && context.installerTypeId !== MOD_TYPE_FOMOD) return {};
  const pakFiles = context.instructions.filter((instruction) => instruction.type === "copy" && isPakModsDestination(instruction.destination)).map((instruction) => archiveBaseName(instruction.destination));
  return { [PAK_ATTRIBUTE]: [...new Set(pakFiles)] };
}
function registerFomodPakAttributeExtractor(contextValue) {
  const context = contextValue;
  context.registerPostInstallerAttributeExtractor(100, extractFomodPakAttributes);
}

// src/modTypes.ts
var MUTABLE_UE4SS_FILES = /* @__PURE__ */ new Set([
  "sandfall/binaries/win64/ue4ss-settings.ini",
  "sandfall/binaries/win64/ue4ss/ue4ss-settings.ini",
  "sandfall/binaries/win64/ue4ss/mods/mods.txt",
  "sandfall/binaries/win64/ue4ss/mods/mods.json"
]);
function isExpedition33(gameId) {
  return Number(gameId) === GAME_ID;
}
function filesFromLocalInfo(input) {
  if (Array.isArray(input)) return input.map(String);
  const value = input;
  return Array.isArray(value?.files) ? value.files.map(String) : [];
}
function applyMutableFilePolicies(result) {
  if (!result || !Array.isArray(result.instructions)) return result;
  return {
    ...result,
    instructions: result.instructions.map((instruction) => {
      if (!instruction || !MUTABLE_UE4SS_FILES.has(normalizeDeploymentPath(instruction.destination))) return instruction;
      return { ...instruction, verification: "exists", conflictPolicy: "overwrite" };
    })
  };
}
function register(context, typeId, priority, name, installerPriority, test, install) {
  context.registerModType(
    typeId,
    priority,
    isExpedition33,
    () => "{gamePath}",
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name }
  );
  context.registerInstaller(typeId, installerPriority, test, async (...args) => applyMutableFilePolicies(await install(...args)));
}
function registerClairObscurExpedition33ModTypes(context) {
  registerFomodInstaller(context, {
    gameId: GAME_ID,
    typeId: MOD_TYPE_FOMOD,
    priority: 100,
    name: "FOMOD Installer"
  });
  registerFomodPakAttributeExtractor(context);
  register(context, MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, "UE4SS Runtime", 1, testUe4ss, installUe4ss);
  register(context, MOD_TYPE_UE4SS_COMBO, MOD_TYPE_PRIORITY.combo, "UE4SS Script + LogicMod", 25, testUe4ssCombo, installUe4ssCombo);
  register(context, MOD_TYPE_LOGIC, MOD_TYPE_PRIORITY.logic, "UE4SS LogicMod", 30, testLogic, installLogic);
  register(context, MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, "UE5 IO Store Pak Mod", 35, testPak, (files) => installPak(context, files));
  register(context, MOD_TYPE_SCRIPT, MOD_TYPE_PRIORITY.script, "UE4SS Script Mod", 50, testScript, installScript);
  register(context, MOD_TYPE_DLL, MOD_TYPE_PRIORITY.dll, "UE4SS DLL Mod", 53, testDll, installDll);
  register(context, MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, "Root Game Folder Mod", 55, testRoot, installRoot);
  register(context, MOD_TYPE_CONTENT, MOD_TYPE_PRIORITY.content, "Content Folder Mod", 57, testContent, installContent);
  register(context, MOD_TYPE_BINARIES, MOD_TYPE_PRIORITY.binaries, "Binaries Fallback Mod", 60, testBinaries, (files) => installBinaries(context, files));
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
async function findGamePath2(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function getRequirementItems() {
  return [{
    key: "clair-obscur-expedition-33-ue4ss",
    name: "UE4SS for Clair Obscur: Expedition 33",
    modType: MOD_TYPE_UE4SS,
    modId: UE4SS_REQUIREMENT_MOD_ID,
    mod_id: UE4SS_REQUIREMENT_MOD_ID,
    openModDetailDialog: false,
    requirement: "enabled"
  }];
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath2(context) || "");
  const path = context.api.util.path;
  const win64Path = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH) : "";
  const hasUe4ss = Boolean(win64Path) && await fileExists(context, path.join(win64Path, UE4SS_DWMAPI)) && await fileExists(context, path.join(win64Path, "ue4ss", UE4SS_DLL));
  const requirements = hasUe4ss ? [] : getRequirementItems();
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
  registerGame(context, async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")));
  registerClairObscurExpedition33ModTypes(context);
  registerPakLoadOrder(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var src_default = main;
