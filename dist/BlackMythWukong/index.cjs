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
var GAME_ID = 2358720;
var GAME_NAME = "Black Myth: Wukong";
var GAME_SHORT_NAME = "Black Myth Wukong";
var EXECUTABLE = "b1.exe";
var STEAM_APP_ID = "2358720";
var NEXUS_GAME_DOMAIN = "blackmythwukong";
var GAME_FOLDER = "b1";
var WIN64_PATH = "b1/Binaries/Win64";
var UE4SS_RUNTIME_PATH = `${WIN64_PATH}/ue4ss`;
var UE4SS_MODS_PATH = `${UE4SS_RUNTIME_PATH}/Mods`;
var PAK_MODS_PATH = "b1/Content/Paks/~mods";
var LOGIC_MODS_PATH = "b1/Content/Paks/LogicMods";
var UE4SS_DWMAPI = "dwmapi.dll";
var UE4SS_DLL = "UE4SS.dll";
var SIGNATURE_BYPASS_DLL = "dsound.dll";
var SIGNATURE_BYPASS_SCRIPT = "sig.lua";
var UE4SS_REQUIREMENT_MOD_ID = "8096";
var SIGNATURE_BYPASS_REQUIREMENT_MOD_ID = "8099";
var MOD_TYPE_FOMOD = `${GAME_ID}-fomod`;
var MOD_TYPE_UE4SS_COMBO = `${GAME_ID}-ue4ss-combo`;
var MOD_TYPE_LOGIC = `${GAME_ID}-logic-mod`;
var MOD_TYPE_PAK = `${GAME_ID}-pak`;
var MOD_TYPE_UE4SS = `${GAME_ID}-ue4ss`;
var MOD_TYPE_SIGNATURE_BYPASS = `${GAME_ID}-signature-bypass`;
var MOD_TYPE_SCRIPT = `${GAME_ID}-ue4ss-script`;
var MOD_TYPE_DLL = `${GAME_ID}-ue4ss-dll`;
var MOD_TYPE_ROOT = `${GAME_ID}-root`;
var MOD_TYPE_PRIORITY = {
  ue4ss: 950,
  combo: 900,
  logic: 850,
  pak: 800,
  signatureBypass: 700,
  script: 650,
  dll: 600,
  root: 500
};
var PAK_LOAD_ORDER_PROVIDER_ID = "black-myth-wukong-pak";
var PAK_EXTENSION = ".pak";
var PAK_ATTRIBUTE = "blackMythWukongPakFiles";

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
function archiveExtName(filePath) {
  const base = archiveBaseName(filePath);
  const index = base.lastIndexOf(".");
  return index >= 0 ? base.slice(index).toLowerCase() : "";
}
function archiveJoin(...parts) {
  return parts.flatMap((part) => splitArchivePath(part)).join("/");
}
function removeLeadingSegments(filePath, count) {
  return splitArchivePath(filePath).slice(count).join("/");
}
function isUnderSegments(filePath, parent) {
  const parts = splitArchivePath(filePath);
  return parent.every((segment, index) => parts[index]?.toLowerCase() === segment.toLowerCase());
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
function findExplicitDirectory(files, name, under) {
  const lower = name.toLowerCase();
  for (const file of files) {
    const parts = splitArchivePath(file);
    if (parts[parts.length - 1]?.toLowerCase() !== lower) continue;
    if (under && !under.every((segment, index) => parts[index]?.toLowerCase() === segment.toLowerCase())) continue;
    if (isDirectoryEntry(file, files)) return parts;
  }
  return null;
}
function fallbackFolderId(stagingPath, fallback = "BlackMythWukongMod") {
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
    throw new Error(`Pak Load Order \u8D85\u51FA\u4E09\u4F4D\u524D\u7F00\u5BB9\u91CF\uFF1A${index}`);
  }
  const first2 = Math.floor(index / (26 * 26));
  const second = Math.floor(index / 26) % 26;
  const third = index % 26;
  return [first2, second, third].map((value) => String.fromCharCode(65 + value)).join("");
}
function safeFolderId(modKey) {
  const normalized = String(modKey || "").replace(/[^0-9A-Za-z._-]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) throw new Error("Pak Load Order \u6761\u76EE\u7F3A\u5C11\u6709\u6548 modKey");
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
      mutation.warn("Pak Load Order \u8DF3\u8FC7\u7F3A\u5931\u7684 VFS \u90E8\u7F72\u6587\u4EF6", {
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
      const message = result.warnings?.map((warning) => String(warning?.message || "")).filter(Boolean).join("\uFF1B");
      throw new Error(message || "Pak Load Order \u90E8\u7F72\u5931\u8D25");
    }
  }
}

// src/loadOrder/provider.ts
function modDisplayName(mod) {
  const metaInfo = mod.metaInfo || {};
  const name = String(metaInfo.customFileName || metaInfo.logicalFileName || metaInfo.name || metaInfo.title || mod.modKey);
  const pakFiles = Array.isArray(metaInfo[PAK_ATTRIBUTE]) ? metaInfo[PAK_ATTRIBUTE] : [];
  return pakFiles.length > 1 ? `${name}\uFF08${pakFiles.length} \u4E2A Pak\uFF09` : name;
}
function isPakLoadOrderModRelevant(mod) {
  const modType = String(mod.modType || "");
  if (modType === MOD_TYPE_PAK) return true;
  const pakFiles = mod.metaInfo && Array.isArray(mod.metaInfo[PAK_ATTRIBUTE]) ? mod.metaInfo[PAK_ATTRIBUTE] : [];
  return modType === MOD_TYPE_FOMOD && pakFiles.length > 0;
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
    title: "Pak \u52A0\u8F7D\u987A\u5E8F",
    usageInstructions: [
      "\u8D8A\u9760\u540E\u7684 Pak \u52A0\u8F7D\u4F18\u5148\u7EA7\u8D8A\u9AD8\u3002",
      "\u7981\u7528\u7684 Pak \u4ECD\u4FDD\u7559\u539F\u4F4D\u7F6E\uFF0C\u91CD\u65B0\u542F\u7528\u540E\u7EE7\u7EED\u4F7F\u7528\u8BE5\u987A\u5E8F\u3002"
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

// src/installers/prerequisites.ts
function findArchiveFile(files, name) {
  const lower = name.toLowerCase();
  return files.find((file) => archiveBaseName(file).toLowerCase() === lower && isArchiveFile(file, files));
}
function findAnchoredPackage(files, anchorName, requiredName) {
  const anchorLower = anchorName.toLowerCase();
  const requiredLower = requiredName.toLowerCase();
  for (const anchorFile of files) {
    if (archiveBaseName(anchorFile).toLowerCase() !== anchorLower || !isArchiveFile(anchorFile, files)) continue;
    const rootSegments = splitArchivePath(anchorFile).slice(0, -1);
    const hasRequiredFile = files.some((file) => isArchiveFile(file, files) && archiveBaseName(file).toLowerCase() === requiredLower && isUnderSegments(file, rootSegments));
    if (hasRequiredFile) return { anchorFile, rootSegments };
  }
  return null;
}
function findUe4ssAnchor(files) {
  const anchorFile = findArchiveFile(files, UE4SS_DWMAPI);
  return anchorFile ? { anchorFile, rootSegments: splitArchivePath(anchorFile).slice(0, -1) } : null;
}
function findSignatureBypassAnchor(files) {
  return findAnchoredPackage(files, SIGNATURE_BYPASS_DLL, SIGNATURE_BYPASS_SCRIPT);
}
function testUe4ss(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findUe4ssAnchor(files) !== null && findArchiveFile(files, UE4SS_DLL) !== void 0);
}
function testSignatureBypass(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findSignatureBypassAnchor(files) !== null);
}
function installAnchoredPackage(files, anchor, modType) {
  const instructions = anchor ? files.filter((file) => isArchiveFile(file, files) && isUnderSegments(file, anchor.rootSegments)).map((file) => ({
    type: "copy",
    source: file,
    destination: archiveJoin(WIN64_PATH, removeLeadingSegments(file, anchor.rootSegments.length))
  })) : [];
  return { instructions, modType };
}
function installUe4ss(files) {
  return installAnchoredPackage(files, findUe4ssAnchor(files), MOD_TYPE_UE4SS);
}
function installSignatureBypass(files) {
  return installAnchoredPackage(files, findSignatureBypassAnchor(files), MOD_TYPE_SIGNATURE_BYPASS);
}

// src/installers/root.ts
function findGameRootAnchor(files) {
  return findExplicitDirectory(files, GAME_FOLDER);
}
function testRoot(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findGameRootAnchor(files) !== null);
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
function installUe4ssMod(files, stagingPath, marker, extension, modType, generateEnabledFile) {
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
  if (generateEnabledFile && !hasEnabledFile) {
    instructions.push({
      type: "generatefile",
      data: "",
      destination: archiveJoin(UE4SS_MODS_PATH, folderId, "enabled.txt")
    });
  }
  return { instructions, modType };
}
function installScript(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "Scripts", ".lua", MOD_TYPE_SCRIPT, false);
}
function installDll(files, stagingPath) {
  return installUe4ssMod(files, stagingPath, "dlls", ".dll", MOD_TYPE_DLL, true);
}

// src/installers/unreal.ts
var INSTALL_CANCELLED = "Black Myth: Wukong mod installation cancelled by user";
function findComboAnchor(files) {
  const gameRoot = findExplicitDirectory(files, GAME_FOLDER);
  if (!gameRoot) return null;
  const hasPak = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION && isUnderSegments(file, gameRoot));
  const hasLua = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === ".lua" && isUnderSegments(file, gameRoot));
  const binaries = findExplicitDirectory(files, "Binaries", gameRoot);
  return hasPak && (hasLua || binaries !== null) ? gameRoot : null;
}
function findLogicAnchor(files) {
  const logic = findExplicitDirectory(files, "LogicMods");
  if (!logic) return null;
  const hasPak = files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION && isUnderSegments(file, logic));
  return hasPak ? logic : null;
}
function testUe4ssCombo(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findComboAnchor(files) !== null);
}
function testLogic(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && findLogicAnchor(files) !== null);
}
function testPak(files, gameId) {
  return testResult(isTargetGame(gameId) && !isFomodPackage2(files) && files.some((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION));
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
  const single = value.choiceId ?? value.value ?? value.selected;
  return single ? [String(single)] : [];
}
function getSelectedPakFiles(payload, choices) {
  if (!payload || typeof payload !== "object") return [];
  const value = payload;
  const selectedChoices = value.choices ?? value.selectedChoices;
  const byId = new Map(choices.map((choice) => [choice.id, choice.payload.file]));
  const allowedFiles = new Map(choices.map((choice) => [normalizeArchivePath(choice.payload.file), choice.payload.file]));
  if (Array.isArray(selectedChoices)) {
    const selected = selectedChoices.map((choice) => {
      if (typeof choice === "string") return byId.get(choice) ?? allowedFiles.get(normalizeArchivePath(choice));
      if (!choice || typeof choice !== "object") return void 0;
      const item = choice;
      const id = typeof item.id === "string" ? item.id : void 0;
      if (id && byId.has(id)) return byId.get(id);
      const itemPayload = item.payload && typeof item.payload === "object" ? item.payload : void 0;
      const file = typeof itemPayload?.file === "string" ? itemPayload.file : typeof item.file === "string" ? item.file : void 0;
      return file ? allowedFiles.get(normalizeArchivePath(file)) : void 0;
    }).filter((file) => Boolean(file));
    return [...new Set(selected)];
  }
  return getSelectedChoiceIds(payload).map((id) => byId.get(id)).filter((file) => Boolean(file));
}
async function choosePakFiles(context, pakFiles) {
  if (pakFiles.length <= 1) return [...pakFiles];
  const baseNameCounts = /* @__PURE__ */ new Map();
  for (const file of pakFiles) {
    const key = archiveBaseName(file).toLowerCase();
    baseNameCounts.set(key, (baseNameCounts.get(key) || 0) + 1);
  }
  const choices = pakFiles.map((file, index) => {
    const id = `pak-${index}`;
    const baseName = archiveBaseName(file);
    return {
      id,
      text: baseNameCounts.get(baseName.toLowerCase()) === 1 ? baseName : normalizeArchivePath(file),
      description: normalizeArchivePath(file),
      value: true,
      payload: { file }
    };
  });
  const response = await context.api.util.ui.request({
    type: "black_myth_wukong_pak_selection",
    title: "\u9009\u62E9\u8981\u5B89\u88C5\u7684 Pak \u6587\u4EF6",
    content: `\u538B\u7F29\u5305\u5305\u542B ${pakFiles.length} \u4E2A Pak \u6587\u4EF6\u3002\u9ED8\u8BA4\u5168\u90E8\u5B89\u88C5\uFF0C\u53EF\u53D6\u6D88\u4E0D\u9700\u8981\u7684\u6587\u4EF6\u3002`,
    choiceMode: "multiple",
    selectedChoiceIds: choices.map((choice) => choice.id),
    choices,
    confirm: { text: "\u5B89\u88C5\u9009\u4E2D\u7684 Pak", type: "primary", visible: true },
    cancel: { text: "\u53D6\u6D88", type: "cancel", visible: true }
  }, { timeoutMs: 10 * 60 * 1e3 });
  if (!response?.confirmed) throw new Error(INSTALL_CANCELLED);
  const selected = getSelectedPakFiles(response.payload, choices);
  if (selected.length === 0) throw new Error(INSTALL_CANCELLED);
  return selected;
}
function assertUniquePakDestinations(files) {
  const seen = /* @__PURE__ */ new Map();
  for (const file of files) {
    const baseName = archiveBaseName(file);
    const key = baseName.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      throw new Error(`Pak \u6587\u4EF6\u6241\u5E73\u5316\u540E\u91CD\u540D\uFF0C\u65E0\u6CD5\u5B89\u5168\u5B89\u88C5\uFF1A${existing}\uFF1B${normalizeArchivePath(file)}`);
    }
    seen.set(key, normalizeArchivePath(file));
  }
}
async function installPak(context, files) {
  const pakFiles = files.filter((file) => isArchiveFile(file, files) && archiveExtName(file) === PAK_EXTENSION);
  const selected = await choosePakFiles(context, pakFiles);
  assertUniquePakDestinations(selected);
  const instructions = [
    {
      type: "attribute",
      key: PAK_ATTRIBUTE,
      value: selected.map((file) => archiveBaseName(file))
    },
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
  return isUnderRoot && archiveExtName(normalized) === PAK_EXTENSION;
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
  "b1/binaries/win64/ue4ss-settings.ini",
  "b1/binaries/win64/ue4ss/ue4ss-settings.ini",
  "b1/binaries/win64/ue4ss/mods/mods.txt",
  "b1/binaries/win64/ue4ss/mods/mods.json"
]);
function isBlackMythWukong(gameId) {
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
    isBlackMythWukong,
    () => "{gamePath}",
    (input) => test(filesFromLocalInfo(input), GAME_ID).supported,
    { name }
  );
  context.registerInstaller(typeId, installerPriority, test, async (...args) => applyMutableFilePolicies(await install(...args)));
}
function registerBlackMythWukongModTypes(context) {
  registerFomodInstaller(context, {
    gameId: GAME_ID,
    typeId: MOD_TYPE_FOMOD,
    priority: 100,
    name: "FOMOD Installer"
  });
  registerFomodPakAttributeExtractor(context);
  register(context, MOD_TYPE_UE4SS_COMBO, MOD_TYPE_PRIORITY.combo, "UE4SS Script + LogicMod", 25, testUe4ssCombo, installUe4ssCombo);
  register(context, MOD_TYPE_LOGIC, MOD_TYPE_PRIORITY.logic, "UE4SS LogicMod", 30, testLogic, installLogic);
  register(context, MOD_TYPE_PAK, MOD_TYPE_PRIORITY.pak, "UE5 Sortable Pak Mod", 35, testPak, (files) => installPak(context, files));
  register(context, MOD_TYPE_UE4SS, MOD_TYPE_PRIORITY.ue4ss, "UE4SS for Black Myth: Wukong", 1, testUe4ss, installUe4ss);
  register(context, MOD_TYPE_SIGNATURE_BYPASS, MOD_TYPE_PRIORITY.signatureBypass, "Signature Bypass", 45, testSignatureBypass, installSignatureBypass);
  register(context, MOD_TYPE_SCRIPT, MOD_TYPE_PRIORITY.script, "UE4SS Script Mod", 50, testScript, installScript);
  register(context, MOD_TYPE_DLL, MOD_TYPE_PRIORITY.dll, "UE4SS DLL Mod", 53, testDll, installDll);
  register(context, MOD_TYPE_ROOT, MOD_TYPE_PRIORITY.root, "Root Game Folder Mod", 55, testRoot, installRoot);
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
async function directoryExists(context, filePath) {
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return Boolean(stat?.isDirectory);
  } catch {
    return false;
  }
}
async function findFileRecursively(context, rootPath, targetName, maxDepth = 8, maxEntries = 4096) {
  if (!await directoryExists(context, rootPath)) return false;
  const path = context.api.util.path;
  const target = targetName.toLowerCase();
  const queue = [{ path: rootPath, depth: 0 }];
  let visited = 0;
  while (queue.length > 0 && visited < maxEntries) {
    const current = queue.shift();
    let children;
    try {
      children = await context.api.util.fs.readdir(current.path);
    } catch {
      continue;
    }
    for (const child of children) {
      visited += 1;
      if (visited > maxEntries) break;
      const childPath = path.join(current.path, child);
      let stat;
      try {
        stat = await context.api.util.fs.stat(childPath);
      } catch {
        continue;
      }
      if (stat?.isFile && String(child).toLowerCase() === target) return true;
      if (stat?.isDirectory && current.depth < maxDepth) queue.push({ path: childPath, depth: current.depth + 1 });
    }
  }
  return false;
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}
function requirement(key, name, modId, modType) {
  return {
    key,
    name,
    modId,
    mod_id: modId,
    modType,
    openModDetailDialog: false,
    requirement: "enabled"
  };
}
function getRequirementItems() {
  return [
    requirement("black-myth-wukong-ue4ss", "UE4SS for Black Myth: Wukong", UE4SS_REQUIREMENT_MOD_ID, MOD_TYPE_UE4SS),
    requirement(
      "black-myth-wukong-signature-bypass",
      "Signature Bypass",
      SIGNATURE_BYPASS_REQUIREMENT_MOD_ID,
      MOD_TYPE_SIGNATURE_BYPASS
    )
  ];
}
async function getRequirementStatus(context, gamePath) {
  const resolvedGamePath = String(gamePath || await findGamePath(context) || "");
  const path = context.api.util.path;
  const win64Path = resolvedGamePath ? path.join(resolvedGamePath, WIN64_PATH) : "";
  const dwmapiPath = win64Path ? path.join(win64Path, UE4SS_DWMAPI) : "";
  const nestedUe4ssPath = win64Path ? path.join(win64Path, "ue4ss", UE4SS_DLL) : "";
  const signatureDllPath = win64Path ? path.join(win64Path, SIGNATURE_BYPASS_DLL) : "";
  const hasUe4ss = Boolean(resolvedGamePath) && await fileExists(context, dwmapiPath) && await fileExists(context, nestedUe4ssPath);
  const hasSignatureBypass = Boolean(resolvedGamePath) && await fileExists(context, signatureDllPath) && await findFileRecursively(context, win64Path, SIGNATURE_BYPASS_SCRIPT);
  const items = getRequirementItems();
  const requirements = [];
  if (!hasUe4ss) requirements.push(items[0]);
  if (!hasSignatureBypass) requirements.push(items[1]);
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
    shortName: GAME_SHORT_NAME,
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [EXECUTABLE, GAME_FOLDER],
    setup: async (discovery) => getExtensionRequiredMods(context, String(discovery?.path || "")),
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
  registerBlackMythWukongModTypes(context);
  registerPakLoadOrder(context);
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => getExtensionRequiredMods(context));
  return true;
}
var src_default = main;
