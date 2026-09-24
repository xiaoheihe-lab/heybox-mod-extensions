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

// extensions/Wuchang/src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => main
});
module.exports = __toCommonJS(index_exports);

// utils/fomod-utils/src/security/paths.ts
var DRIVE_OR_UNC = /^(?:[a-z]:|\\\\|\/\/)/i;
function normalizeArchivePath(input, allowEmpty = false) {
  const raw = String(input ?? "").replace(/\\/g, "/").trim();
  if (!raw) {
    if (allowEmpty) return "";
    throw new Error("FOMOD path is empty");
  }
  if (raw.startsWith("/") || DRIVE_OR_UNC.test(raw) || raw.includes("\0")) {
    throw new Error(`Unsafe FOMOD path: ${raw}`);
  }
  const parts = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new Error(`FOMOD path traversal is not allowed: ${raw}`);
    parts.push(part);
  }
  if (parts.length === 0 && !allowEmpty) throw new Error(`Invalid FOMOD path: ${raw}`);
  return parts.join("/");
}
function joinArchivePath(...parts) {
  return normalizeArchivePath(parts.filter((part) => String(part ?? "").trim()).join("/"), true);
}
function findFomodRoot(files) {
  const matches = files.map((source) => ({ source, normalized: normalizeArchivePath(source) })).filter(({ normalized }) => {
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length !== 2 && parts.length !== 3) return false;
    return parts[parts.length - 2]?.toLowerCase() === "fomod" && parts[parts.length - 1]?.toLowerCase() === "moduleconfig.xml";
  });
  if (matches.length === 0) return null;
  const unique = new Map(matches.map((entry2) => [entry2.normalized.toLowerCase(), entry2]));
  if (unique.size !== 1) throw new Error("FOMOD package contains multiple ModuleConfig.xml files");
  const entry = [...unique.values()][0];
  const suffixLength = "fomod/moduleconfig.xml".length;
  return {
    configPath: entry.source,
    root: entry.normalized.slice(0, Math.max(0, entry.normalized.length - suffixLength)).replace(/\/$/, "")
  };
}

// utils/fomod-utils/src/security/xml.ts
var MAX_XML_BYTES = 2 * 1024 * 1024;
var MAX_OPTIONS = 2e3;
function assertSafeXml(xml) {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) throw new Error("FOMOD ModuleConfig.xml exceeds 2 MiB");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("FOMOD DTD and ENTITY declarations are not supported");
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
  if (!match) return;
  const error = new Error(`Unsupported FOMOD feature: ${match[1]}`);
  error.code = "FOMOD_UNSUPPORTED_FEATURE";
  throw error;
}

// utils/fomod-utils/src/parser/xml-helpers.ts
function list(value) {
  if (value === void 0 || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
function first(value) {
  return list(value)[0];
}
function attr(node, name, fallback = "") {
  return String(node?.$?.[name] ?? fallback);
}
function text(node, fallback = "") {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return String(node?._ ?? fallback).trim();
}
function boolAttr(node, name) {
  return attr(node, name, "false").toLowerCase() === "true";
}

// utils/fomod-utils/src/parser/module-config.ts
var OPTION_TYPES = /* @__PURE__ */ new Set(["Required", "Recommended", "Optional", "NotUsable", "CouldBeUsable"]);
var GROUP_TYPES = /* @__PURE__ */ new Set(["SelectAny", "SelectAll", "SelectExactlyOne", "SelectAtMostOne", "SelectAtLeastOne"]);
var fileOrder = 0;
function parseOrder(value) {
  const order = String(value || "Explicit");
  return order === "Ascending" || order === "Descending" ? order : "Explicit";
}
function ordered(items, order) {
  if (order === "Explicit") return items;
  const direction = order === "Ascending" ? 1 : -1;
  return [...items].sort((a, b) => direction * a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
}
function parseDependency(node) {
  if (!node) return { kind: "all", children: [] };
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
  for (const item of list(node.dependencies)) children.push(parseDependency(item));
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
  if (direct) return { defaultType: optionType(attr(direct, "name")), patterns: [] };
  const dependencyType = first(node?.dependencyType);
  if (!dependencyType) return { defaultType: "Optional", patterns: [] };
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
  for (const flag of list(first(node.conditionFlags)?.flag)) flags[attr(flag, "name")] = text(flag);
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
  if (!dependency) return;
  if (dependency.kind === "file" && dependency.path) output.add(dependency.path);
  for (const child of dependency.children || []) collectDependencyPaths(child, output);
}
function parseModuleConfig(parsed) {
  fileOrder = 0;
  const config = first(parsed.config);
  if (!config) throw new Error("FOMOD ModuleConfig.xml does not contain a config root");
  const stepsRoot = first(config.installSteps);
  const steps = list(stepsRoot?.installStep).map((step, index) => parseStep(step, index));
  const optionCount = steps.reduce((sum, step) => sum + step.groups.reduce((n, group) => n + group.options.length, 0), 0);
  if (optionCount > MAX_OPTIONS) throw new Error(`FOMOD contains too many options: ${optionCount}`);
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
        for (const pattern of option.type.patterns) collectDependencyPaths(pattern.dependency, paths);
      }
    }
  }
  for (const pattern of model.conditionalFiles) collectDependencyPaths(pattern.dependency, paths);
  model.allFileDependencyPaths = [...paths];
  return model;
}

// utils/fomod-utils/src/parser/info.ts
function parseInfoXml(parsed) {
  const root = first(parsed.fomod || parsed.Fomod || parsed.fomodInfo || Object.values(parsed)[0]);
  if (!root || typeof root !== "object") return {};
  return {
    name: text(first(root.Name || root.name)) || void 0,
    author: text(first(root.Author || root.author)) || void 0,
    version: text(first(root.Version || root.version)) || void 0,
    website: text(first(root.Website || root.website)) || void 0
  };
}

// utils/fomod-utils/src/installer/errors.ts
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
  if (error instanceof FomodError) return error;
  const value = error;
  return new FomodError(String(value?.code || fallbackCode), String(value?.message || value || "FOMOD installation failed"), value?.details);
}

// utils/fomod-utils/src/evaluator/dependencies.ts
function evaluateDependency(dependency, state) {
  if (!dependency) return true;
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
    if (evaluateDependency(pattern.dependency, state)) return pattern.type;
  }
  return descriptor.defaultType;
}

// utils/fomod-utils/src/evaluator/selection.ts
function defaultSelections(group, optionTypes2) {
  const usable = group.options.filter((option) => optionTypes2[option.id] !== "NotUsable");
  const required = usable.filter((option) => optionTypes2[option.id] === "Required").map((option) => option.id);
  if (group.type === "SelectAll") return usable.map((option) => option.id);
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
      if (optionTypes2[option.id] === "Required" && !valid.includes(option.id)) valid.push(option.id);
    }
    const usableCount = group.options.filter((option) => optionTypes2[option.id] !== "NotUsable").length;
    if (group.type === "SelectExactlyOne" && valid.length !== 1) throw new Error(`${group.name}: select exactly one option`);
    if (group.type === "SelectAtMostOne" && valid.length > 1) throw new Error(`${group.name}: select at most one option`);
    if (group.type === "SelectAtLeastOne" && valid.length < 1 && usableCount > 0) throw new Error(`${group.name}: select at least one option`);
    if (group.type === "SelectAll" && valid.length !== usableCount) throw new Error(`${group.name}: all usable options are required`);
    result[group.id] = valid;
  }
  return result;
}

// utils/fomod-utils/src/installer/files.ts
function expandFileItems(items, archiveFiles, packageRoot) {
  const byLower = new Map(archiveFiles.map((source) => [source.replace(/\\/g, "/").toLowerCase(), source]));
  const mappings = [];
  for (const item of items) {
    const sourceBase = joinArchivePath(packageRoot, item.source);
    if (item.kind === "file") {
      const actual = byLower.get(sourceBase.toLowerCase());
      if (!actual) throw new Error(`FOMOD source file does not exist: ${item.source}`);
      const destination = item.destination || item.source.split("/").pop() || "";
      mappings.push({ source: actual, destination: normalizeArchivePath(destination), priority: item.priority, order: item.order });
      continue;
    }
    const prefix2 = `${sourceBase.toLowerCase().replace(/\/$/, "")}/`;
    const folderFiles = archiveFiles.filter((source) => source.replace(/\\/g, "/").toLowerCase().startsWith(prefix2));
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
  for (const mapping of mappings) finalByDestination.set(mapping.destination.toLowerCase(), mapping);
  return [...finalByDestination.values()].sort((a, b) => a.priority - b.priority || a.order - b.order).map((mapping) => ({
    type: "copy",
    source: mapping.source,
    destination: mapping.destination,
    verification: "exists",
    conflictPolicy: "overwrite"
  }));
}

// utils/fomod-utils/src/installer/images.ts
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif"
};
async function loadImageDataUrl(imagePath, packageRoot, stagingPath, pathApi, fsApi) {
  if (!imagePath) return void 0;
  try {
    const relative2 = joinArchivePath(packageRoot, normalizeArchivePath(imagePath));
    const ext = relative2.split(".").pop()?.toLowerCase() || "";
    const mime = MIME_BY_EXT[ext];
    if (!mime) return void 0;
    const content = await fsApi.readFileAsync(pathApi.join(stagingPath, relative2));
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (buffer.length > MAX_IMAGE_BYTES) return void 0;
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return void 0;
  }
}

// utils/fomod-utils/src/installer/run.ts
function flattenSelections(selections) {
  return new Set(Object.values(selections).flat());
}
function replayState(model, selections, files, throughStepIndex = model.steps.length - 1) {
  const state = { flags: {}, files };
  const selected = flattenSelections(selections);
  for (const step of model.steps.slice(0, throughStepIndex + 1)) {
    for (const group of step.groups) {
      for (const option of group.options) {
        if (selected.has(option.id)) Object.assign(state.flags, option.flags);
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
    if (!evaluateDependency(model.moduleDependencies, state)) return false;
    for (const step of model.steps) {
      if (!evaluateDependency(step.visible, state)) {
        if ((stored.selections[step.id] || []).length > 0) return false;
        continue;
      }
      const knownIds = new Set(step.groups.flatMap((group) => group.options.map((option) => option.id)));
      if ((stored.selections[step.id] || []).some((id) => !knownIds.has(id))) return false;
      validateStepSelections(step, stored.selections[step.id] || [], optionTypes(step, state));
      const selected = new Set(stored.selections[step.id] || []);
      for (const group of step.groups) {
        for (const option of group.options) {
          if (selected.has(option.id)) Object.assign(state.flags, option.flags);
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
          if (includeOption || file.alwaysInstall || file.installIfUsable && type !== "NotUsable") output.push(file);
        }
      }
    }
  }
  for (const conditional of model.conditionalFiles) {
    if (evaluateDependency(conditional.dependency, state)) output.push(...conditional.files);
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
  if (canReuse) selections = Object.fromEntries(Object.entries(stored.selections).map(([key, value]) => [key, [...value]]));
  let sessionId;
  if (!canReuse || options.forceInteractive) {
    sessionId = `fomod:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const moduleImageDataUrl = await loadImageDataUrl(options.model.moduleImage, options.packageRoot, options.stagingPath, options.pathApi, options.fsApi);
    let cursor = 0;
    try {
      while (cursor < options.model.steps.length) {
        const state2 = replayState(options.model, selections, files, cursor - 1);
        if (!evaluateDependency(options.model.moduleDependencies, state2)) throw new FomodError("FOMOD_INVALID_CONFIG", "FOMOD module dependencies are not satisfied");
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
          canGoBack: options.model.steps.slice(0, cursor).some(
            (candidate, index) => evaluateDependency(candidate.visible, replayState(options.model, selections, files, index - 1))
          ),
          isLastStep: options.model.steps.slice(cursor + 1).every((candidate) => !evaluateDependency(candidate.visible, projectedState)),
          groups: await buildUiGroups(step, new Set(existing), types, options)
        });
        if (response.action === "cancel") throw new FomodError("FOMOD_INSTALL_CANCELLED", "FOMOD installation was cancelled");
        if (response.action === "back") {
          delete selections[step.id];
          let previous = cursor - 1;
          while (previous > 0) {
            const candidate = options.model.steps[previous];
            const candidateState = replayState(options.model, selections, files, previous - 1);
            if (evaluateDependency(candidate.visible, candidateState)) break;
            delete selections[candidate.id];
            previous -= 1;
          }
          cursor = Math.max(0, previous);
          continue;
        }
        const validated = validateStepSelections(step, response.selectedOptionIds || [], types);
        selections[step.id] = Object.values(validated).flat();
        for (const later of options.model.steps.slice(cursor + 1)) delete selections[later.id];
        cursor += 1;
      }
    } catch (error) {
      await options.api.closeSession({ sessionId, status: error?.code === "FOMOD_INSTALL_CANCELLED" ? "cancelled" : "failed", message: String(error?.message || error) });
      throw error;
    }
  }
  const finalState = replayState(options.model, selections, files);
  for (const option of selectedOptions(options.model, selections)) Object.assign(finalState.flags, option.flags);
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
  if (sessionId) await options.api.closeSession({ sessionId, status: "completed" });
  return { instructions, state };
}

// utils/fomod-utils/src/installer/register.ts
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
    if (!located) throw new FomodError("FOMOD_INVALID_CONFIG", "FOMOD ModuleConfig.xml was not found");
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

// extensions/Wuchang/src/archive.ts
function normalizePath(value) {
  return value.replace(/\\/g, "/").split("/").filter((part) => part && part !== ".").join("/");
}
var base = (p) => p.split("/").pop() || "";
var parent = (p) => p.split("/").slice(0, -1).join("/");
var under = (p, root) => !root || p.toLowerCase().startsWith(`${root.toLowerCase()}/`);
var relative = (p, root) => root ? p.slice(root.length + 1) : p;
var join = (...parts) => parts.filter(Boolean).join("/");
function entries(files) {
  const rows = [...new Set(files)].map((source) => ({ source, path: normalizePath(source), directory: /[\\/]$/.test(source) })).filter((row) => row.path.length > 0);
  for (const row of rows) row.directory ||= rows.some((other) => under(other.path, row.path));
  return rows;
}
var payload = (rows) => rows.filter((e) => !e.directory);
var named = (rows, name) => rows.find((e) => !e.directory && base(e.path).toLowerCase() === name.toLowerCase());
var hasExt = (rows, ext) => payload(rows).some((e) => e.path.toLowerCase().endsWith(ext));
var isFomod = (rows) => payload(rows).some((e) => /(^|\/)fomod\/moduleconfig\.xml$/i.test(e.path));
function validateInstructions(instructions) {
  const seen = /* @__PURE__ */ new Map();
  return instructions.filter((i) => {
    if (!i.destination) return true;
    i.destination = normalizePath(i.destination);
    const key = i.destination.toLowerCase();
    if (seen.has(key)) {
      if (seen.get(key) === i.source && i.type === "copy") return false;
      throw new Error(`Multiple files target ${i.destination}`);
    }
    seen.set(key, i.source);
    if (/\/binaries\/(win64|wingdk)\/(?:ue4ss\/)?ue4ss-settings\.ini$/i.test(key) || /\/binaries\/(win64|wingdk)\/ue4ss\/mods\/mods\.(txt|json)$/i.test(key)) {
      i.verification = "exists";
      i.conflictPolicy = "overwrite";
    }
    return true;
  });
}
function copyTree(rows, root, target) {
  return payload(rows).filter((e) => under(e.path, root)).map((e) => ({
    type: "copy",
    source: e.source,
    destination: join(target, relative(e.path, root))
  }));
}

// extensions/Wuchang/src/constants.ts
var GAME_ID = 2277560;
var GAME_NAME = "WUCHANG: Fallen Feathers";
var GAME_FOLDER = "Project_Plague";
var EXECUTABLE = "Project_Plague.exe";
var PAK_PATH = `${GAME_FOLDER}/Content/Paks/~mods`;
var LOGIC_PATH = `${GAME_FOLDER}/Content/Paks/LogicMods`;
var PAK_ATTRIBUTE = "wuchangPakFiles";
var LOAD_ORDER_ID = "wuchang-pak";
var UE4SS_REQUIREMENT_MOD_ID = "123673";
var typeId = (kind) => `${GAME_ID}-${kind}`;
var binariesPath = (layout) => `${GAME_FOLDER}/Binaries/${layout}`;
var scriptsPath = (layout) => `${binariesPath(layout)}/ue4ss/Mods`;

// extensions/Wuchang/src/environment.ts
async function exists(context, path) {
  try {
    return Boolean((await context.api.util.fs.stat(path))?.isFile);
  } catch {
    return false;
  }
}
async function findGamePath(context) {
  return (await context.api.util.GameStoreHelper.findByAppId(GAME_ID))?.gamePath;
}
async function detectLayout(context, gamePath) {
  return gamePath && await exists(context, context.api.util.path.join(gamePath, "gamelaunchhelper.exe")) ? "WinGDK" : "Win64";
}
async function getExtensionRequiredMods(context, gamePath) {
  const resolved = gamePath || await findGamePath(context) || "";
  const layout = await detectLayout(context, resolved);
  const root = context.api.util.path.join(resolved, binariesPath(layout));
  const installed = Boolean(resolved) && await exists(context, context.api.util.path.join(root, "dwmapi.dll")) && await exists(context, context.api.util.path.join(root, "ue4ss", "UE4SS.dll"));
  const requirements = installed ? [] : [{
    key: "wuchang-ue4ss",
    name: "UE4SS for WUCHANG: Fallen Feathers",
    modType: typeId("ue4ss"),
    modId: UE4SS_REQUIREMENT_MOD_ID,
    mod_id: UE4SS_REQUIREMENT_MOD_ID,
    requirement: "enabled",
    openModDetailDialog: false,
    sourceUrl: "https://github.com/UE4SS-RE/RE-UE4SS/releases",
    url: "https://github.com/UE4SS-RE/RE-UE4SS/releases"
  }];
  return {
    installed,
    gamePath: resolved,
    requirements,
    ...!installed ? { code: "EXTENSION_REQUIRED_MODS_MISSING", requirement: { code: "EXTENSION_REQUIRED_MODS_MISSING", requirements } } : {}
  };
}

// extensions/Wuchang/src/installers.ts
function uniqueAnchor(rows, name) {
  const found = payload(rows).filter((e) => base(e.path).toLowerCase() === name.toLowerCase());
  if (found.length > 1) throw new Error(`Ambiguous package: multiple ${name} files`);
  return found[0];
}
function rootDirectory(rows, name) {
  const found = rows.filter((e) => e.directory && base(e.path).toLowerCase() === name.toLowerCase());
  if (found.length > 1) throw new Error(`Ambiguous package: multiple ${name} directories`);
  return found[0];
}
function loader(rows) {
  const dll = uniqueAnchor(rows, "dwmapi.dll");
  if (!dll) return void 0;
  const root = parent(dll.path);
  return payload(rows).some((e) => e.path.toLowerCase() === join(root, "ue4ss/UE4SS.dll").toLowerCase()) ? dll : void 0;
}
function modAnchor(rows, folder, ext) {
  const anchor = rootDirectory(rows, folder);
  return anchor && payload(rows).some((e) => under(e.path, anchor.path) && e.path.toLowerCase().endsWith(ext)) ? anchor : void 0;
}
function ue4ssModsRoots(rows) {
  const roots = /* @__PURE__ */ new Map();
  for (const entry of payload(rows)) {
    const parts = entry.path.split("/");
    for (let i = 0; i < parts.length - 3; i++) {
      if (parts[i].toLowerCase() === "ue4ss" && parts[i + 1].toLowerCase() === "mods") {
        const root = parts.slice(0, i + 2).join("/");
        roots.set(root.toLowerCase(), root);
        break;
      }
    }
  }
  return [...roots.values()];
}
function hasUe4ssMods(rows) {
  const roots = ue4ssModsRoots(rows);
  return roots.length > 0 && !payload(rows).some((e) => /\.pak$/i.test(e.path) && !roots.some((root) => under(e.path, root)));
}
function comboAnchor(rows) {
  const root = rootDirectory(rows, GAME_FOLDER);
  const children = root ? rows.filter((e) => under(e.path, root.path)) : [];
  return hasExt(children, ".pak") && hasExt(children, ".lua") ? root : void 0;
}
function logicAnchor(rows) {
  const root = rootDirectory(rows, "LogicMods");
  return root && hasExt(rows.filter((e) => under(e.path, root.path)), ".pak") ? root : void 0;
}
function enabler(rows) {
  const dll = uniqueAnchor(rows, "dsound.dll");
  return dll && named(rows.filter((e) => under(e.path, parent(dll.path))), "sig.lua") ? dll : void 0;
}
function isUnsupportedUserData(rows) {
  return payload(rows).some((e) => /^(engine|scalability|input|game)\.ini$/i.test(base(e.path)) || /\.sav$/i.test(e.path));
}
var GROUPS = [
  { kind: "ue4ss", name: "UE4SS for WUCHANG", priority: 1, match: (r) => Boolean(loader(r)) },
  { kind: "mod-enabler", name: "Mod Enabler", priority: 2, match: (r) => Boolean(enabler(r)) },
  { kind: "ue4ss-mods", name: "UE4SS Mods Folder", priority: 3, match: hasUe4ssMods },
  { kind: "combo", name: "UE4SS Script + LogicMod", priority: 25, match: (r) => Boolean(comboAnchor(r)) },
  { kind: "logic", name: "UE4SS LogicMod", priority: 27, match: (r) => Boolean(logicAnchor(r)) },
  { kind: "pak", name: "UE5 Sortable Pak Mod", priority: 29, match: (r) => hasExt(r, ".pak") },
  { kind: "script", name: "UE4SS Script Mod", priority: 33, match: (r) => Boolean(modAnchor(r, "Scripts", ".lua")) },
  { kind: "dll", name: "UE4SS DLL Mod", priority: 35, match: (r) => Boolean(modAnchor(r, "dlls", ".dll")) },
  { kind: "root", name: "Root Game Folder", priority: 37, match: (r) => Boolean(rootDirectory(r, GAME_FOLDER)) },
  { kind: "content", name: "Content Folder", priority: 39, match: (r) => Boolean(rootDirectory(r, "Content")) },
  { kind: "binaries", name: "Binaries (Engine Injector)", priority: 45, match: (r) => payload(r).length > 0 && !hasExt(r, ".pak") && !isUnsupportedUserData(r) }
];
function testGroup(kind, files, gameId) {
  if (Number(gameId) !== GAME_ID) return { supported: false };
  const rows = entries(files);
  if (isFomod(rows)) return { supported: false };
  try {
    return { supported: Boolean(GROUPS.find((g) => g.kind === kind)?.match(rows)) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Ambiguous package:")) return { supported: true };
    throw error;
  }
}
async function choosePaks(context, rows) {
  if (rows.length <= 1) return rows;
  const choices = rows.map((e, i) => ({ id: `pak-${i}`, text: e.path, value: true, payload: { file: e.source } }));
  const response = await context.api.util.ui.request({
    type: "wuchang_pak_selection",
    title: "\u9009\u62E9\u8981\u5B89\u88C5\u7684 Pak \u6587\u4EF6",
    content: "\u5305\u5185\u542B\u591A\u4E2A Pak\uFF0C\u9ED8\u8BA4\u5168\u90E8\u9009\u4E2D\uFF1B\u82E5\u4E3A\u4E92\u65A5\u7248\u672C\uFF0C\u8BF7\u4EC5\u9009\u62E9\u9700\u8981\u7684\u6587\u4EF6\u3002",
    choiceMode: "multiple",
    choices,
    selectedChoiceIds: choices.map((c) => c.id),
    confirm: { text: "\u5B89\u88C5\u9009\u4E2D\u7684 Pak", visible: true, type: "primary" },
    cancel: { text: "\u53D6\u6D88", visible: true, type: "cancel" }
  }, { timeoutMs: 6e5 });
  if (!response?.confirmed) throw new Error("Wuchang mod installation cancelled");
  const data = response.payload;
  const selected = data?.choices ?? data?.selectedChoices ?? data?.choiceIds ?? data?.selectedChoiceIds;
  if (!Array.isArray(selected)) throw new Error("No Pak files selected");
  const ids = new Set(selected.map((c) => typeof c === "string" ? c : c?.id));
  const result = rows.filter((_, i) => ids.has(choices[i].id));
  if (!result.length) throw new Error("No Pak files selected");
  return result;
}
async function installGroup(context, kind, files, layout, stagingPath = "") {
  const rows = entries(files);
  if (isFomod(rows) || !GROUPS.find((g) => g.kind === kind)?.match(rows)) throw new Error(`Unsupported Wuchang ${kind} package`);
  let instructions;
  const bin = binariesPath(layout);
  switch (kind) {
    case "ue4ss":
      instructions = copyTree(rows, parent(loader(rows).path), bin);
      break;
    case "mod-enabler":
      instructions = copyTree(rows, parent(enabler(rows).path), bin);
      break;
    case "ue4ss-mods":
      instructions = ue4ssModsRoots(rows).flatMap((root) => copyTree(rows, root, scriptsPath(layout)));
      break;
    case "combo":
    case "root": {
      const root = rootDirectory(rows, GAME_FOLDER);
      instructions = copyTree(rows, root.path, GAME_FOLDER);
      break;
    }
    case "content":
      instructions = copyTree(rows, rootDirectory(rows, "Content").path, `${GAME_FOLDER}/Content`);
      break;
    case "logic":
      instructions = copyTree(rows, logicAnchor(rows).path, LOGIC_PATH);
      break;
    case "script":
    case "dll": {
      const marker = kind === "script" ? "Scripts" : "dlls";
      const anchor = modAnchor(rows, marker, kind === "script" ? ".lua" : ".dll");
      const root = parent(anchor.path);
      const fallback = base(stagingPath.replace(/\\/g, "/").replace(/\/+$/, "")).replace(/\.installing$/i, "").replace(/\.(zip|7z|rar)$/i, "");
      const folder = base(root) || context.api.util.sanitizeFilename(fallback, "WuchangMod");
      const target = join(scriptsPath(layout), folder);
      instructions = copyTree(rows, root, target);
      if (!payload(rows).some((e) => e.path.toLowerCase() === join(root, "enabled.txt").toLowerCase())) {
        instructions.push({ type: "generatefile", destination: join(target, "enabled.txt"), data: "" });
      }
      break;
    }
    case "pak": {
      const selected = await choosePaks(context, payload(rows).filter((e) => /\.pak$/i.test(e.path)));
      instructions = selected.map((e) => ({ type: "copy", source: e.source, destination: join(PAK_PATH, base(e.path)) }));
      instructions.push({ type: "attribute", key: PAK_ATTRIBUTE, value: selected.map((e) => base(e.path)) });
      break;
    }
    case "binaries":
      instructions = copyTree(rows, "", bin);
      break;
  }
  return { modType: typeId(kind), instructions: validateInstructions(instructions) };
}

// extensions/Wuchang/src/loadOrder.ts
function deserialize(context) {
  const indices = new Map(context.savedOrder.map((id, i) => [id, i]));
  return context.mods.filter((mod) => mod.modType === typeId("pak")).map((mod) => ({
    id: mod.modKey,
    ownerModKey: mod.modKey,
    name: String(mod.metaInfo?.name || mod.modKey),
    enabled: mod.enabled
  })).sort((a, b) => (indices.get(a.id) ?? indices.size) - (indices.get(b.id) ?? indices.size) || a.id.localeCompare(b.id));
}
function prefix(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 26 ** 3) throw new Error("Pak load order exceeds three-letter capacity");
  return [Math.floor(index / 676), Math.floor(index / 26) % 26, index % 26].map((n) => String.fromCharCode(65 + n)).join("");
}
function plan(mutation, order) {
  const indices = new Map(order.map((e, i) => [e.ownerModKey, i]));
  for (const e of mutation.entries) {
    const index = indices.get(e.modKey);
    const source = normalizePath(e.targetPath);
    if (index === void 0 || !under(source, PAK_PATH) || !/\.pak$/i.test(source)) continue;
    if (e.exists === false) {
      mutation.warn("Pak file missing", { targetPath: e.targetPath });
      continue;
    }
    const folder = `${prefix(index)}-${Array.from(e.modKey).map((c) => c.codePointAt(0).toString(16)).join("-")}`;
    const to = join(PAK_PATH, folder, base(source));
    if (to.toLowerCase() === source.toLowerCase()) continue;
    mutation.moveDeployment({ modKey: e.modKey, from: e.targetPath, to, expectedHash: e.expectedHash });
  }
}
function registerLoadOrder(context) {
  context.registerLoadOrder({
    id: LOAD_ORDER_ID,
    gameId: GAME_ID,
    title: "Pak \u52A0\u8F7D\u987A\u5E8F",
    modTypes: [typeId("pak")],
    usageInstructions: ["\u8D8A\u9760\u540E\u7684 Pak \u52A0\u8F7D\u4F18\u5148\u7EA7\u8D8A\u9AD8\u3002\u7981\u7528\u7684 Mod \u4FDD\u7559\u6392\u5E8F\u4F4D\u7F6E\u3002"],
    isModRelevant: (mod) => mod.modType === typeId("pak"),
    deserializeLoadOrder: deserialize,
    serializeLoadOrder: async (order) => {
      const result = await context.api.vfs.runManagedDeploymentMutation({ modType: typeId("pak") }, (mutation) => plan(mutation, order));
      if (!result.ok) throw new Error(result.warnings.map((w) => w.message).join("; ") || "Pak load order deployment failed");
    }
  });
  context.registerExtensionAction(GAME_ID, "deployPakLoadOrder", () => context.api.loadOrder.deploy(LOAD_ORDER_ID));
}

// extensions/Wuchang/src/index.ts
async function main(context) {
  let setupPath = "";
  const resolvePath = async () => setupPath || await findGamePath(context) || "";
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: "WUCHANG",
    executable: EXECUTABLE,
    queryPath: () => findGamePath(context),
    requiredFiles: [GAME_FOLDER],
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, nexusGameDomainName: "wuchangfallenfeathers", customOpenModsPath: PAK_PATH, supportsSymlinks: false },
    setup: async (discovery) => {
      setupPath = discovery?.path || discovery?.gamePath || await findGamePath(context) || "";
      return getExtensionRequiredMods(context, setupPath);
    }
  });
  for (const [index, group] of GROUPS.entries()) {
    const test = (files, gameId) => testGroup(group.kind, files, gameId);
    context.registerModType(
      typeId(group.kind),
      1200 - index * 10,
      (id) => Number(id) === GAME_ID,
      () => "{gamePath}",
      (input) => {
        const files = Array.isArray(input) ? input : input?.files || [];
        return test(files, GAME_ID).supported;
      },
      { name: group.name }
    );
    context.registerInstaller(typeId(group.kind), group.priority, test, async (files, stagingPath) => installGroup(context, group.kind, files, await detectLayout(context, await resolvePath()), stagingPath));
  }
  context.registerModType(
    typeId("pakalt"),
    100,
    (id) => Number(id) === GAME_ID,
    () => `{gamePath}/${GAME_FOLDER}/Content/Paks`,
    () => false,
    { name: 'UE5 Paks (no "~mods")' }
  );
  const fomodContext = Object.create(context);
  fomodContext.registerInstaller = (id, priority, test, install) => {
    context.registerInstaller(id, priority, test, async (...args) => {
      const result = await install(...args);
      const instructions = result.instructions.map((i) => i.destination ? { ...i, destination: join(PAK_PATH, i.destination) } : i);
      return { ...result, instructions: validateInstructions(instructions) };
    });
  };
  registerFomodInstaller(fomodContext, { gameId: GAME_ID, typeId: typeId("fomod"), priority: 100, name: "FOMOD Installer" });
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", async () => getExtensionRequiredMods(context, await resolvePath()));
  registerLoadOrder(context);
  return true;
}
