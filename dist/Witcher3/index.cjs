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
  CONTENT_MOD_TYPE: () => CONTENT_MOD_TYPE,
  DLC_MOD_TYPE: () => DLC_MOD_TYPE,
  EXECUTABLES: () => EXECUTABLES,
  GAME_ID: () => GAME_ID,
  GAME_NAME: () => GAME_NAME,
  MENU_MOD_TYPE: () => MENU_MOD_TYPE,
  MIXED_MOD_TYPE: () => MIXED_MOD_TYPE,
  MODS_MOD_TYPE: () => MODS_MOD_TYPE,
  ROOT_MOD_TYPE: () => ROOT_MOD_TYPE,
  SCRIPT_MERGER_DIRECTORY: () => SCRIPT_MERGER_DIRECTORY,
  SCRIPT_MERGER_FILENAME: () => SCRIPT_MERGER_FILENAME,
  SCRIPT_MERGER_INSTALLER_ID: () => SCRIPT_MERGER_INSTALLER_ID,
  SCRIPT_MERGER_MOD_TYPE: () => SCRIPT_MERGER_MOD_TYPE,
  SCRIPT_MERGER_REQUIREMENT_MOD_ID: () => SCRIPT_MERGER_REQUIREMENT_MOD_ID,
  STORE_IDS: () => STORE_IDS,
  __testing: () => __testing,
  default: () => main
});
module.exports = __toCommonJS(index_exports);

// src/loadOrder.ts
var import_node_fs = __toESM(require("node:fs"));
var import_node_os = __toESM(require("node:os"));
var import_node_path2 = __toESM(require("node:path"));

// src/ini.ts
var iniKey = (section, key) => `${section.toLowerCase()}\0${key.toLowerCase()}`;
function iniValues(text) {
  const values = /* @__PURE__ */ new Map();
  let section = "";
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line);
    if (header) {
      section = header[1].trim();
      continue;
    }
    const pair = /^\s*([^;#=\s][^=]*)=(.*)$/.exec(line);
    if (pair) {
      const key = pair[1].trim();
      values.set(iniKey(section, key), { section, key, value: pair[2].trim() });
    }
  }
  return values;
}
function patchIni(text, changes) {
  const pending = new Map([...changes].map((value) => [iniKey(value.section, value.key), value]));
  const output = [];
  const written = /* @__PURE__ */ new Set();
  let section = "";
  const flush = () => {
    for (const [id, value] of pending) if (value.section.toLowerCase() === section.toLowerCase()) {
      if (value.value !== null && !written.has(id)) output.push(`${value.key}=${value.value}`);
      pending.delete(id);
    }
  };
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line);
    if (header) {
      flush();
      section = header[1].trim();
    }
    const pair = /^\s*([^;#=\s][^=]*)=(.*)$/.exec(line);
    const id = pair && iniKey(section, pair[1].trim());
    const value = id ? pending.get(id) : void 0;
    if (!value) output.push(line);
    else {
      if (value.value !== null) output.push(`${pair[1]}=${value.value}`);
      written.add(id);
    }
  }
  flush();
  for (const value of pending.values()) {
    if (value.value === null) continue;
    if (section.toLowerCase() !== value.section.toLowerCase()) {
      output.push("", `[${value.section}]`);
      section = value.section;
    }
    output.push(`${value.key}=${value.value}`);
  }
  return output.join("\r\n").replace(/(?:\r\n)+$/, "") + "\r\n";
}

// src/files.ts
var import_promises = __toESM(require("node:fs/promises"));
var import_node_path = __toESM(require("node:path"));
var import_node_crypto = require("node:crypto");
async function readText(file) {
  if (!file) return void 0;
  try {
    const data = await import_promises.default.readFile(file);
    if (data[0] === 255 && data[1] === 254) return data.subarray(2).toString("utf16le");
    if (data[0] === 254 && data[1] === 255) return data.subarray(2).swap16().toString("utf16le");
    return data.toString("utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
}
async function atomicWrite(file, text) {
  await import_promises.default.mkdir(import_node_path.default.dirname(file), { recursive: true });
  const temporary = `${file}.${(0, import_node_crypto.randomUUID)()}.tmp`;
  try {
    await import_promises.default.writeFile(temporary, text, "utf8");
    await import_promises.default.rename(temporary, file);
  } finally {
    await import_promises.default.rm(temporary, { force: true });
  }
}

// src/constants.ts
var GAME_ID = 292030;
var STORE_IDS = [292030, 499450];
var GAME_NAME = "The Witcher 3: Wild Hunt";
var EXECUTABLES = [
  "bin/x64/witcher3.exe",
  "bin/x64_DX12/witcher3.exe"
];
var ROOT_MOD_TYPE = `${GAME_ID}-root`;
var MODS_MOD_TYPE = `${GAME_ID}-mods`;
var CONTENT_MOD_TYPE = `${GAME_ID}-content`;
var DLC_MOD_TYPE = `${GAME_ID}-dlc`;
var MENU_MOD_TYPE = `${GAME_ID}-menu`;
var MIXED_MOD_TYPE = `${GAME_ID}-mixed`;
var SCRIPT_MERGER_MOD_TYPE = `${GAME_ID}-script-merger`;
var SCRIPT_MERGER_FILENAME = "WitcherScriptMerger.exe";
var SCRIPT_MERGER_DIRECTORY = "WitcherScriptMerger";
var SCRIPT_MERGER_REQUIREMENT_MOD_ID = void 0;

// src/loadOrder.ts
var LOAD_ORDER_PROVIDER_ID = "witcher3-mods";
var MOD_NAMES_ATTRIBUTE = "witcher3ModNames";
var MODS_SETTINGS_FILENAME = "mods.settings";
var managedModTypes = [MODS_MOD_TYPE, CONTENT_MOD_TYPE, MENU_MOD_TYPE, MIXED_MOD_TYPE];
var invalidName = /[\u0000-\u001f\[\]]/;
function normalizeName(value) {
  return String(value || "").trim();
}
function nameKey(value) {
  return value.toLocaleLowerCase("en-US");
}
function isValidModName(value) {
  return Boolean(value) && !invalidName.test(value) && !value.includes("/") && !value.includes("\\");
}
function isLockedModName(value) {
  return nameKey(value).startsWith("mod0000_");
}
function getDocumentsRoots() {
  const configured = String(process.env.WITCHER3_DOCUMENTS_ROOT || "").trim();
  const roots = [
    configured,
    process.env.OneDrive ? import_node_path2.default.join(process.env.OneDrive, "Documents") : "",
    process.env.OneDriveCommercial ? import_node_path2.default.join(process.env.OneDriveCommercial, "Documents") : "",
    process.env.USERPROFILE ? import_node_path2.default.join(process.env.USERPROFILE, "Documents") : "",
    import_node_path2.default.join(import_node_os.default.homedir(), "Documents")
  ];
  return Array.from(new Set(roots.filter(Boolean).map((root) => import_node_path2.default.resolve(root))));
}
function getModsSettingsCandidates() {
  return getDocumentsRoots().map((root) => import_node_path2.default.join(root, "The Witcher 3", MODS_SETTINGS_FILENAME));
}
async function resolveModsSettingsPath() {
  const candidates = getModsSettingsCandidates();
  if (String(process.env.WITCHER3_DOCUMENTS_ROOT || "").trim()) return candidates[0];
  for (const candidate of candidates) {
    try {
      if ((await import_node_fs.default.promises.stat(candidate)).isFile()) return candidate;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return candidates[0];
}
function parseSettings(text) {
  const sections = [];
  let current;
  for (const rawLine of String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const header = /^\[([^\]]+)\]$/.exec(line);
    if (header) {
      const name = normalizeName(header[1]);
      if (!isValidModName(name)) {
        current = void 0;
        continue;
      }
      current = { name };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const pair = /^([^=]+)=(.*)$/.exec(line);
    if (!pair) continue;
    const key = pair[1].trim().toLowerCase();
    const value = pair[2].trim();
    if (key === "enabled") current.enabled = value !== "0" && value.toLowerCase() !== "false";
    if (key === "priority" && /^-?\d+$/.test(value)) current.priority = Number(value);
  }
  return sections;
}
async function readSettings() {
  const filePath = await resolveModsSettingsPath();
  try {
    return { sections: parseSettings(await import_node_fs.default.promises.readFile(filePath, "utf8")) };
  } catch (error) {
    if (error?.code === "ENOENT") return { sections: [] };
    throw error;
  }
}
async function getGameModDirectories(gamePath) {
  const result = /* @__PURE__ */ new Map();
  try {
    const values = await import_node_fs.default.promises.readdir(import_node_path2.default.join(gamePath, "Mods"), { withFileTypes: true });
    for (const value of values) if (value.isDirectory() && isValidModName(value.name)) result.set(nameKey(value.name), value.name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return result;
}
function getMetadataNames(mod) {
  const candidates = [mod.metaInfo?.[MOD_NAMES_ATTRIBUTE], mod.metaInfo?.modComponents];
  for (const value of candidates) {
    if (Array.isArray(value)) {
      const names = value.map(normalizeName).filter(isValidModName);
      if (names.length > 0) return Array.from(new Set(names.map((name) => nameKey(name)))).map((key) => {
        const original = names.find((name) => nameKey(name) === key);
        return original || key;
      });
    }
  }
  const direct = normalizeName(mod.metaInfo?.[MOD_NAMES_ATTRIBUTE] || mod.metaInfo?.modName);
  return isValidModName(direct) ? [direct] : [];
}
function modDisplayName(mod, modName) {
  const source = normalizeName(mod.metaInfo?.name || mod.metaInfo?.title);
  return source && nameKey(source) !== nameKey(modName) ? `${modName}\uFF08\u6765\u81EA ${source}\uFF09` : modName;
}
function isWitcherLoadOrderModRelevant(mod) {
  if (!managedModTypes.includes(String(mod.modType || ""))) return false;
  return getMetadataNames(mod).length > 0;
}
function sortBySavedOrder(entries2, savedOrder) {
  const savedIndex = new Map(savedOrder.map((id, index) => [id, index]));
  const appendIndex = savedOrder.length;
  return entries2.sort((left, right) => {
    const leftLocked = Boolean(left.data?.locked);
    const rightLocked = Boolean(right.data?.locked);
    if (leftLocked !== rightLocked) return leftLocked ? -1 : 1;
    const leftIndex = savedIndex.get(left.id) ?? appendIndex;
    const rightIndex = savedIndex.get(right.id) ?? appendIndex;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.name.localeCompare(right.name, "en") || left.id.localeCompare(right.id);
  });
}
async function deserializeWitcherLoadOrder(context) {
  const settings = await readSettings();
  const directories = await getGameModDirectories(context.gamePath);
  const managedByName = /* @__PURE__ */ new Map();
  const managedEntries = [];
  for (const mod of context.mods) {
    if (!isWitcherLoadOrderModRelevant(mod)) continue;
    for (const modName of getMetadataNames(mod)) {
      const key = nameKey(modName);
      if (managedByName.has(key)) continue;
      managedByName.set(key, mod);
      managedEntries.push({
        id: `${mod.modKey}:${key}`,
        ownerModKey: mod.modKey,
        name: modDisplayName(mod, modName),
        enabled: mod.enabled,
        ...isLockedModName(modName) ? { locked: true } : {},
        data: { modName, locked: isLockedModName(modName) }
      });
    }
  }
  const byName = new Map(managedEntries.map((entry) => [nameKey(String(entry.data.modName)), entry]));
  const settingsOrder = [];
  const seen = /* @__PURE__ */ new Set();
  const sections = settings.sections.map((section, index) => ({ section, index })).sort((left, right) => (left.section.priority ?? Number.MAX_SAFE_INTEGER) - (right.section.priority ?? Number.MAX_SAFE_INTEGER) || left.index - right.index).map(({ section }) => section);
  for (const section of sections) {
    const key = nameKey(section.name);
    if (seen.has(key) || !directories.has(key) && !byName.has(key)) continue;
    seen.add(key);
    const managed = byName.get(key);
    if (managed) {
      settingsOrder.push(managed);
      continue;
    }
    settingsOrder.push({
      id: `external:${key}`,
      ownerModKey: "",
      external: true,
      ...isLockedModName(section.name) ? { locked: true } : {},
      name: section.name,
      enabled: section.enabled !== false,
      data: { modName: section.name, external: true, locked: isLockedModName(section.name) }
    });
  }
  for (const [key, name] of directories) {
    if (seen.has(key) || byName.has(key)) continue;
    seen.add(key);
    settingsOrder.push({
      id: `external:${key}`,
      ownerModKey: "",
      external: true,
      name,
      enabled: true,
      ...isLockedModName(name) ? { locked: true } : {},
      data: { modName: name, external: true, locked: isLockedModName(name) }
    });
  }
  const missingManaged = managedEntries.filter((entry) => !seen.has(nameKey(String(entry.data.modName))));
  const entries2 = [...settingsOrder, ...missingManaged];
  const status = context.deploymentStatus;
  const order = status && status !== "clean" && context.savedOrder.length > 0 ? context.savedOrder : entries2.map((entry) => entry.id);
  return sortBySavedOrder(entries2, order);
}
function validateWitcherLoadOrder(_previous, current) {
  const names = /* @__PURE__ */ new Set();
  let firstUnlocked = false;
  for (const entry of current) {
    const data = entry.data || {};
    const modName = normalizeName(data.modName);
    if (!isValidModName(modName)) throw new Error(`Invalid Witcher 3 mod name: ${modName}`);
    const key = nameKey(modName);
    if (names.has(key)) throw new Error(`Duplicate Witcher 3 mod name: ${modName}`);
    names.add(key);
    if (data.locked && firstUnlocked) throw new Error("Script Merger output must stay at the top of the load order");
    if (!data.locked) firstUnlocked = true;
  }
}
async function serializeWitcherLoadOrder(entries2) {
  const filePath = await resolveModsSettingsPath();
  const before = await readText(filePath) || "";
  const changes = entries2.flatMap((entry, index) => {
    const name = normalizeName(entry.data.modName);
    return [{ section: name, key: "Enabled", value: entry.enabled ? "1" : "0" }, { section: name, key: "Priority", value: String(index + 1) }];
  });
  await atomicWrite(filePath, patchIni(before, changes));
}
function registerWitcherLoadOrder(context, options) {
  context.registerPostInstallerAttributeExtractor(100, (input) => {
    const { modTypeId, instructions, gamePath } = input;
    if (!managedModTypes.includes(String(modTypeId))) return {};
    const names = /* @__PURE__ */ new Map();
    for (const instruction of instructions) {
      if (instruction.type !== "copy") continue;
      let destination = String(instruction.destination || "").replace(/\\/g, "/");
      if (import_node_path2.default.win32.isAbsolute(destination) || import_node_path2.default.posix.isAbsolute(destination)) {
        if (!gamePath) continue;
        const paths = /^[a-z]:[\\/]|^[/\\]{2}/i.test(gamePath) ? import_node_path2.default.win32 : import_node_path2.default.posix;
        destination = paths.relative(gamePath, destination).replace(/\\/g, "/");
        if (import_node_path2.default.win32.isAbsolute(destination) || import_node_path2.default.posix.isAbsolute(destination)) continue;
      }
      const parts = destination.split("/").filter(Boolean);
      if (parts.some((part) => part === "." || part === "..")) continue;
      if (parts.length < 2 || nameKey(parts[0]) !== "mods" || !isValidModName(parts[1])) continue;
      names.set(nameKey(parts[1]), parts[1]);
    }
    return names.size > 0 ? { [MOD_NAMES_ATTRIBUTE]: Array.from(names.values()) } : {};
  });
  const registration = {
    id: LOAD_ORDER_PROVIDER_ID,
    gameId: GAME_ID,
    title: "Witcher 3 Mod \u52A0\u8F7D\u987A\u5E8F",
    usageInstructions: [
      "\u8D8A\u9760\u524D\u7684 Mod \u4F18\u5148\u7EA7\u8D8A\u9AD8\uFF1B\u811A\u672C\u51B2\u7A81\u4ECD\u9700\u901A\u8FC7 Script Merger \u5904\u7406\u3002",
      "Script Merger \u751F\u6210\u7684 mod0000_ \u5408\u5E76\u7ED3\u679C\u4F1A\u56FA\u5B9A\u5728\u6700\u524D\u9762\u3002",
      "\u7981\u7528\u7684 Mod \u4ECD\u4FDD\u7559\u4F4D\u7F6E\uFF0C\u4FDD\u5B58\u540E\u4F1A\u540C\u6B65\u5230 Documents\\The Witcher 3\\mods.settings\u3002"
    ],
    modTypes: managedModTypes,
    allowExternalEntries: true,
    isModRelevant: isWitcherLoadOrderModRelevant,
    deserializeLoadOrder: async (input) => {
      const entries2 = await deserializeWitcherLoadOrder(input);
      const merged = options?.mergedOutputs ? await options.mergedOutputs(input.gamePath) : [];
      for (const entry of entries2) {
        const data = entry.data;
        const output = merged.find((item) => !item.missing && nameKey(item.name) === nameKey(data.modName));
        if (output) {
          Object.assign(entry, { locked: true });
          data.locked = true;
          entry.name = `${data.modName}\uFF08\u5408\u5E76\uFF1A${output.sources.join("\u3001")}\uFF09`;
        }
      }
      return sortBySavedOrder(entries2, entries2.map((entry) => entry.id));
    },
    validate: validateWitcherLoadOrder,
    serializeLoadOrder: serializeWitcherLoadOrder
  };
  context.registerLoadOrder(registration);
  context.registerExtensionAction(GAME_ID, "deployWitcherLoadOrder", () => context.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID));
}

// src/scriptMerger.ts
var import_node_path5 = __toESM(require("node:path"));
var import_node_crypto2 = require("node:crypto");

// src/mergeInventory.ts
var import_promises2 = __toESM(require("node:fs/promises"));
var import_node_path3 = __toESM(require("node:path"));
var textOf = (value) => String(typeof value === "object" ? value?._ || "" : value || "").trim();
var validModFolder = (name) => Boolean(name) && !/[\\/:\[\]\u0000-\u001f]/.test(name) && name !== "." && name !== "..";
async function readMergeInventory(context, gamePath) {
  const text = await readText(import_node_path3.default.join(gamePath, SCRIPT_MERGER_DIRECTORY, "MergeInventory.xml"));
  if (!text) return [];
  const inventory = await context.api.util.fileParseApi.parseXmlToObject(text);
  if (!Object.prototype.hasOwnProperty.call(inventory, "MergeInventory")) throw new Error("Script Merger \u7684 MergeInventory.xml \u683C\u5F0F\u65E0\u6548");
  const outputs = /* @__PURE__ */ new Map();
  for (const item of inventory.MergeInventory.Merge || []) {
    const name = textOf(item.MergedModName?.[0]);
    if (!validModFolder(name)) throw new Error("Script Merger \u5408\u5E76\u6E05\u5355\u5305\u542B\u65E0\u6548\u76EE\u5F55\u540D");
    const existing = outputs.get(name.toLowerCase());
    const sources = (item.IncludedMod || []).map(textOf).filter(validModFolder);
    if (existing) existing.sources = [.../* @__PURE__ */ new Set([...existing.sources, ...sources])];
    else {
      let present = false;
      try {
        present = (await import_promises2.default.stat(import_node_path3.default.join(gamePath, "Mods", name))).isDirectory();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      outputs.set(name.toLowerCase(), { name, sources: [...new Set(sources)], missing: !present });
    }
  }
  return [...outputs.values()];
}

// src/edition.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));
function isRemastered(gamePath) {
  const exists = (relative) => import_node_fs2.default.existsSync(import_node_path4.default.join(gamePath, relative));
  return !exists("bin/x64/witcher3.exe") && (exists("bin/x64_DX12/witcher3.exe") || exists("dlc-tombstones") || exists("bin/config/base/freecamera.ini"));
}
async function gameWarnings(gamePath, modNames) {
  if (!isRemastered(gamePath)) return [];
  const warnings = [];
  const text = await readText(import_node_path4.default.join(import_node_path4.default.dirname(await resolveModsSettingsPath()), "dx12user.settings"));
  if (text === void 0) warnings.push("\u8BF7\u5148\u8FD0\u884C\u4E00\u6B21\u6E38\u620F\u4EE5\u751F\u6210\u8BBE\u7F6E\u6587\u4EF6");
  else {
    const values = iniValues(text);
    if (["Enabled", "EnabledLocal"].some((key) => /^(false|0)$/i.test(values.get(iniKey("ContentManager/Mods", key))?.value || ""))) {
      warnings.push("\u6E38\u620F\u5185\u5DF2\u5173\u95ED Mod \u6216\u672C\u5730 Mod\uFF0C\u8BF7\u5728\u6E38\u620F\u8BBE\u7F6E\u4E2D\u5F00\u542F");
    }
  }
  const longNames = modNames.filter((name) => name.length > 63);
  if (longNames.length) warnings.push(`Mod \u6587\u4EF6\u5939\u540D\u79F0\u8D85\u8FC7 63 \u4E2A\u5B57\u7B26\uFF0C\u6E38\u620F\u53EF\u80FD\u5FFD\u7565\uFF1A${longNames.join("\u3001")}`);
  return warnings;
}

// src/scriptMerger.ts
var REQUIRED_MODS_CODE = "EXTENSION_REQUIRED_MODS_MISSING";
function needsScriptMerger(instructions) {
  return instructions.some((instruction) => {
    if (instruction.type !== "copy" && instruction.type !== "generatefile") return false;
    const destination = String(instruction.destination || "").replace(/\\/g, "/");
    return /^Mods\/[^/]+\/content\/scripts\/.+\.ws$/i.test(destination);
  });
}
function createScriptMergerSupport(context, resolveGamePath, modId = SCRIPT_MERGER_REQUIREMENT_MOD_ID) {
  const requirementConfigured = !!modId && /^[1-9]\d*$/.test(modId) && Number.isSafeInteger(Number(modId));
  const getRequirementItems = () => requirementConfigured ? [{
    key: "witcher3-script-merger",
    name: "Witcher 3 Script Merger",
    modId,
    mod_id: modId,
    modType: SCRIPT_MERGER_MOD_TYPE,
    openModDetailDialog: false,
    requirement: "enabled"
  }] : [];
  const getStatus = async (gamePath) => {
    const resolvedGamePath = String(gamePath || await resolveGamePath() || "");
    const executablePath = resolvedGamePath ? context.api.util.path.join(resolvedGamePath, SCRIPT_MERGER_DIRECTORY, SCRIPT_MERGER_FILENAME) : "";
    let installed = false;
    if (executablePath) {
      try {
        installed = Boolean((await context.api.util.fs.stat(executablePath))?.isFile);
      } catch {
      }
    }
    return {
      installed,
      gamePath: resolvedGamePath,
      executablePath,
      requirementConfigured,
      requirements: installed ? [] : getRequirementItems()
    };
  };
  const getRequiredMods = async (gamePath) => {
    const status = await getStatus(gamePath);
    if (status.installed || !requirementConfigured) return status;
    return {
      ...status,
      code: REQUIRED_MODS_CODE,
      requirement: { code: REQUIRED_MODS_CODE, gameId: GAME_ID, gamePath: status.gamePath, requirements: status.requirements }
    };
  };
  const guardInstaller = (install) => async (files, destination, options) => {
    const result = await install(files, destination, options);
    if (result.instructions.some((instruction) => instruction.type === "attribute" && instruction.key === "witcher3ScriptStyle" && instruction.value === "annotation")) return result;
    if (!requirementConfigured || !needsScriptMerger(result.instructions)) return result;
    const status = await getStatus();
    if (status.installed) return result;
    throw Object.assign(new Error("\u8BF7\u5148\u5B89\u88C5\u5E76\u542F\u7528 Script Merger\uFF0C\u518D\u542F\u7528\u5305\u542B\u811A\u672C\u7684\u5DEB\u5E08 3 Mod\u3002"), {
      code: REQUIRED_MODS_CODE,
      result: { code: REQUIRED_MODS_CODE, gameId: GAME_ID, gamePath: status.gamePath, requirements: status.requirements }
    });
  };
  const getLocalModFeatures = () => getRequirementItems().map((item) => ({
    modId: Number(item.modId),
    marked: true,
    mark: { type: "prerequisite", label: "\u524D\u7F6E\u6A21\u7EC4" }
  }));
  const registerTool = (api) => {
    const stateFile = (gamePath) => import_node_path5.default.join(gamePath, SCRIPT_MERGER_DIRECTORY, ".heybox-merge-state.json");
    const fingerprint = async (input) => (0, import_node_crypto2.createHash)("sha256").update(JSON.stringify({
      mods: input.mods.filter((mod) => mod.enabled && mod.modType !== SCRIPT_MERGER_MOD_TYPE).map((mod) => [mod.modKey, mod.versionId, mod.metaInfo.witcher3ModNames, mod.metaInfo.witcher3ScriptStyle]).sort(),
      order: await readText(await resolveModsSettingsPath()) || ""
    })).digest("hex");
    const configure = async (gamePath) => {
      const file = import_node_path5.default.join(gamePath, SCRIPT_MERGER_DIRECTORY, `${SCRIPT_MERGER_FILENAME}.config`);
      const text = await readText(file);
      const config = text ? await api.api.util.fileParseApi.parseXmlToObject(text) : { configuration: {} };
      config.configuration ||= {};
      config.configuration.appSettings ||= [{}];
      config.configuration.appSettings[0].add ||= [];
      const items = config.configuration.appSettings[0].add;
      for (const [key, value] of Object.entries({
        GameDirectory: gamePath,
        VanillaScriptsDirectory: import_node_path5.default.join(gamePath, "content", "content0", "scripts"),
        ModsDirectory: import_node_path5.default.join(gamePath, "Mods")
      })) {
        const item = items.find((item2) => item2.$?.key === key);
        if (item) item.$.value = value;
        else items.push({ $: { key, value } });
      }
      await atomicWrite(file, await api.api.util.fileParseApi.buildXmlFromObject(config));
    };
    api.registerModTool({
      id: "witcher3-script-merger",
      title: "Script Merger",
      executable: async (input) => {
        const status = await getStatus(input.gamePath);
        if (!status.installed) throw new Error("\u8BF7\u5148\u5B89\u88C5\u5E76\u542F\u7528 Script Merger \u524D\u7F6E\u6A21\u7EC4\u3002");
        return { path: status.executablePath, cwd: import_node_path5.default.dirname(status.executablePath) };
      },
      beforeRun: async (input) => {
        if (!(await getStatus(input.gamePath)).installed) throw new Error("\u8BF7\u5148\u5B89\u88C5\u5E76\u542F\u7528 Script Merger \u524D\u7F6E\u6A21\u7EC4\u3002");
        await api.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID);
        await configure(input.gamePath);
      },
      afterRun: async (input) => {
        await api.api.loadOrder.deploy(LOAD_ORDER_PROVIDER_ID);
        if (input.exitCode === 0) {
          await atomicWrite(stateFile(input.gamePath), JSON.stringify({ fingerprint: await fingerprint(input), lastRunAt: (/* @__PURE__ */ new Date()).toISOString() }));
        }
      },
      status: async (input) => {
        const status = await getStatus(input.gamePath);
        let outputs = [];
        let inventoryError = "";
        try {
          outputs = await readMergeInventory(api, input.gamePath);
        } catch (error) {
          inventoryError = String(error.message);
        }
        const overrideCount = input.mods.filter((mod) => mod.enabled && Array.isArray(mod.metaInfo.witcher3ModNames) && mod.metaInfo.witcher3ModNames.length > 0 && mod.metaInfo.witcher3ScriptStyle !== "none" && mod.metaInfo.witcher3ScriptStyle !== "annotation").length;
        let lastRun = {};
        try {
          lastRun = JSON.parse(await readText(stateFile(input.gamePath)) || "{}");
        } catch {
        }
        const changed = lastRun.fingerprint !== await fingerprint(input);
        const needsMerge = Boolean(inventoryError || outputs.some((item) => item.missing) || changed && (outputs.length > 0 || overrideCount > 1));
        const warnings = await gameWarnings(input.gamePath, input.mods.filter((mod) => mod.enabled).flatMap((mod) => Array.isArray(mod.metaInfo.witcher3ModNames) ? mod.metaInfo.witcher3ModNames.map(String) : []));
        return {
          installed: status.installed,
          needsMerge,
          attention: needsMerge || !status.installed || warnings.length > 0,
          message: [inventoryError || (!status.installed ? "\u5C1A\u672A\u5B89\u88C5 Script Merger" : needsMerge ? "Mod \u6216\u987A\u5E8F\u5DF2\u53D8\u5316\uFF0C\u5EFA\u8BAE\u91CD\u65B0\u68C0\u67E5\u811A\u672C\u5408\u5E76" : "\u53EF\u6253\u5F00\u5DE5\u5177\u68C0\u67E5\u811A\u672C\u51B2\u7A81"), ...warnings].join("\uFF1B"),
          outputs,
          lastRunAt: lastRun.lastRunAt
        };
      }
    });
    const savedRoot = (gamePath) => import_node_path5.default.join(gamePath, ".heybox-witcher3", "script-merger");
    const stateNames = [`${SCRIPT_MERGER_FILENAME}.config`, "MergeInventory.xml", ".heybox-merge-state.json"];
    const saveState = async (input) => {
      const gamePath = String(input.gamePath || "");
      for (const name of stateNames) {
        const text = await readText(import_node_path5.default.join(gamePath, SCRIPT_MERGER_DIRECTORY, name));
        if (text !== void 0) await atomicWrite(import_node_path5.default.join(savedRoot(gamePath), name), text);
      }
    };
    const restoreState = async (input) => {
      const gamePath = String(input.gamePath || "");
      for (const name of stateNames) {
        const text = await readText(import_node_path5.default.join(savedRoot(gamePath), name));
        if (text !== void 0) await atomicWrite(import_node_path5.default.join(gamePath, SCRIPT_MERGER_DIRECTORY, name), text);
      }
    };
    for (const phase of ["beforeEnable", "beforeDisable", "beforeUninstall"]) {
      api.registerManagedDeploymentHook(phase, { modType: SCRIPT_MERGER_MOD_TYPE }, saveState);
    }
    for (const phase of ["afterEnable", "afterDisable", "afterUninstall"]) {
      api.registerManagedDeploymentHook(phase, { modType: SCRIPT_MERGER_MOD_TYPE }, async (input) => {
        await restoreState(input);
        if (phase === "afterEnable") await configure(String(input.gamePath || ""));
      });
    }
  };
  return { getStatus, getRequiredMods, guardInstaller, getLocalModFeatures, registerTool };
}

// src/runtime.ts
function runtime(context) {
  const result = context;
  if (typeof result.registerFileMerge !== "function" || typeof result.registerModTool !== "function") {
    throw new Error("\u5DEB\u5E083\u9002\u914D\u5668\u9700\u8981\u652F\u6301\u6587\u4EF6\u5408\u5E76\u548C Mod \u5DE5\u5177\u7684\u65B0\u7248\u672C Mod Manager\u3002");
  }
  return result;
}

// src/menuMerge.ts
var import_node_path6 = __toESM(require("node:path"));
var MATRIX_PATH = "bin/config/r4game/user_config_matrix/pc";
var nativeXml = ["audio", "display", "gameplay", "gamma", "graphics", "graphicsdx11", "hdr", "hidden", "hud", "input", "localization"];
var documentSettings = ["input.settings", "user.settings", "dx12user.settings"];
function isNativeMenuXml(target) {
  const normalized = target.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(`${MATRIX_PATH}/`) && nativeXml.includes(import_node_path6.default.posix.basename(normalized, ".xml")) && normalized.endsWith(".xml");
}
async function orderedSources(context) {
  const settings = iniValues(await readText(await resolveModsSettingsPath()) || "");
  const priority = (source) => {
    const names = source.metaInfo.witcher3ModNames;
    if (!Array.isArray(names)) return Number.MAX_SAFE_INTEGER;
    return Math.min(...names.map((name) => Number(settings.get(iniKey(String(name), "Priority"))?.value || Number.MAX_SAFE_INTEGER)));
  };
  return context.files.map((source, index) => ({ source, index })).sort((a, b) => priority(b.source) - priority(a.source) || a.index - b.index).map((item) => item.source);
}
async function mergeMenuXml(context, api) {
  const parser = api.api.util.fileParseApi;
  let base = await readText(context.baseFile);
  const sources = await orderedSources(context);
  if (base === void 0 && sources.length > 0) {
    const response = await api.api.util.ui.request({
      type: "generic",
      title: "\u7F3A\u5C11\u5DEB\u5E083\u539F\u59CB\u83DC\u5355\u914D\u7F6E",
      content: `\u6E38\u620F\u4E2D\u4E0D\u5B58\u5728 ${import_node_path6.default.basename(context.targetPath)}\u3002\u662F\u5426\u4F7F\u7528 Mod \u63D0\u4F9B\u7684\u914D\u7F6E\uFF1F`,
      confirm: { text: "\u4F7F\u7528 Mod \u914D\u7F6E" },
      cancel: { text: "\u53D6\u6D88\u5B89\u88C5" }
    });
    if (!response.confirmed) throw new Error("\u672A\u4F7F\u7528\u7F3A\u5C11\u539F\u59CB\u6587\u4EF6\u7684\u83DC\u5355\u914D\u7F6E");
    base = await readText(sources[0].path);
  }
  if (base === void 0) return { data: "" };
  const output = await parser.parseXmlToObject(base);
  if (!Array.isArray(output.UserConfig?.Group)) throw new Error(`\u65E0\u6548\u83DC\u5355 XML\uFF1A${import_node_path6.default.basename(context.targetPath)}`);
  for (const source of sources) {
    const mod = await parser.parseXmlToObject(await readText(source.path) || "");
    if (!Array.isArray(mod.UserConfig?.Group)) throw new Error("Mod \u83DC\u5355 XML \u7F3A\u5C11 UserConfig/Group");
    for (const group of mod.UserConfig.Group) {
      const existing = output.UserConfig.Group.find((item) => item.$?.id === group.$?.id);
      if (!existing) {
        output.UserConfig.Group.push(group);
        continue;
      }
      const vars = group.VisibleVars?.[0]?.Var || [];
      existing.VisibleVars ||= [{}];
      existing.VisibleVars[0].Var ||= [];
      const current = existing.VisibleVars[0].Var;
      for (const variable of vars) {
        const index = current.findIndex((item) => item.$?.id === variable.$?.id);
        if (index < 0) current.push(variable);
        else Object.assign(current[index], variable);
      }
    }
  }
  return { data: await parser.buildXmlFromObject(output) };
}
async function mergeMenuSettings(context) {
  const original = await readText(context.baseFile);
  if (original === void 0 && context.files.length > 0) {
    throw new Error(`\u7F3A\u5C11 ${import_node_path6.default.basename(context.targetPath)}\uFF0C\u8BF7\u5148\u8FD0\u884C\u4E00\u6B21\u6E38\u620F\u751F\u6210\u8BBE\u7F6E\uFF0C\u518D\u542F\u7528\u83DC\u5355 Mod\u3002`);
  }
  const base = original || "";
  const previous = await readText(context.previousFile);
  const live = await readText(context.liveFile);
  const overrides = new Map((Array.isArray(context.state?.overrides) ? context.state.overrides : []).map((value) => [iniKey(value.section, value.key), value]));
  if (previous !== void 0 && live !== void 0) {
    const oldValues = iniValues(previous), newValues = iniValues(live);
    for (const id of /* @__PURE__ */ new Set([...oldValues.keys(), ...newValues.keys()])) {
      const before = oldValues.get(id), after = newValues.get(id);
      if (before?.value !== after?.value) overrides.set(id, after || { ...before, value: null });
    }
  }
  const baseData = patchIni(base, overrides.values());
  let data = baseData;
  for (const source of await orderedSources(context)) data = patchIni(data, iniValues(await readText(source.path) || "").values());
  data = patchIni(data, overrides.values());
  const switches = [...iniValues(live || base).values()].filter((value) => value.section.toLowerCase() === "contentmanager/mods");
  data = patchIni(data, switches);
  return { data, baseData, state: { overrides: [...overrides.values()] } };
}
function registerMenuMergers(context) {
  context.registerFileMerge({
    id: "witcher3-menu-xml",
    test: (target, gamePath) => isNativeMenuXml(target) && !(isRemastered(gamePath) && import_node_path6.default.basename(target).toLowerCase() === "graphicsdx11.xml"),
    merge: (input) => mergeMenuXml(input, context)
  });
  context.registerFileMerge({
    id: "witcher3-menu-settings",
    test: async (target) => {
      const root = import_node_path6.default.dirname(await resolveModsSettingsPath());
      return import_node_path6.default.dirname(import_node_path6.default.resolve(target)).toLowerCase() === root.toLowerCase() && documentSettings.includes(import_node_path6.default.basename(target).toLowerCase());
    },
    merge: mergeMenuSettings
  });
}

// src/scriptStyle.ts
var import_node_path7 = __toESM(require("node:path"));
async function scriptStyle(files, staging, options) {
  const scripts = files.filter((file) => /\.ws$/i.test(file));
  if (!scripts.length) return "none";
  for (const file of scripts) {
    const mapped = options?.sourcePathByFile;
    let text;
    try {
      text = await readText(mapped?.[file] || (staging ? import_node_path7.default.join(staging, file) : void 0));
    } catch {
      return "override";
    }
    if (text === void 0 || !/@(?:wrapMethod|replaceMethod|addMethod|addField)\b/.test(text)) return "override";
  }
  return "annotation";
}

// index.ts
var import_node_path8 = __toESM(require("node:path"));
var import_node_crypto3 = require("node:crypto");
var SCRIPT_MERGER_INSTALLER_ID = SCRIPT_MERGER_MOD_TYPE;
var MODS_PATH = "Mods";
var DLC_PATH = "DLC";
var MENU_PATH = "bin/config/r4game/user_config_matrix/pc";
var PART_SUFFIX = ".part.txt";
function normalizePath(source) {
  let value = String(source).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!value || value.startsWith("/") || /^[a-z]:\//i.test(value)) throw new Error(`Unsafe archive path: ${source}`);
  const segments = value.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === ".." || segment.includes(":") || /[\u0000-\u001f]/.test(segment))) {
    throw new Error(`Unsafe archive path: ${source}`);
  }
  return segments.join("/");
}
function entries(files) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const source of files) {
    const relative = normalizePath(source);
    if (!relative || source.endsWith("/") || source.endsWith("\\")) continue;
    const key = relative.toLowerCase();
    if (seen.has(key)) throw new Error(`Conflicting archive paths: ${source}`);
    seen.add(key);
    result.push({ source, relative, segments: relative.split("/") });
  }
  return result;
}
function indexOfSegment(entry, name) {
  return entry.segments.findIndex((segment) => segment.toLowerCase() === name);
}
function hasSegment(list, name) {
  return list.some((entry) => indexOfSegment(entry, name) >= 0);
}
function hasMenuConfig(list) {
  const expected = MENU_PATH.split("/");
  return list.some((entry) => {
    const lower = entry.segments.map((segment) => segment.toLowerCase());
    const start = lower.findIndex((segment, index) => segment === expected[0] && lower.slice(index, index + expected.length).join("/") === MENU_PATH);
    return start >= 0;
  });
}
function hasPrefixedContent(list, prefix) {
  return list.some((entry) => {
    const content = indexOfSegment(entry, "content");
    return content > 0 && entry.segments[content - 1].toLowerCase().startsWith(prefix);
  });
}
function hasScriptMerger(list) {
  return list.some((entry) => entry.segments[entry.segments.length - 1].toLowerCase() === SCRIPT_MERGER_FILENAME.toLowerCase());
}
function isBackupEntry(entry) {
  return entry.segments.some((segment) => segment.toLowerCase().includes("backup"));
}
function hasPartFile(list) {
  return list.some((entry) => entry.relative.toLowerCase().endsWith(PART_SUFFIX));
}
function stripTo(entry, marker) {
  const index = indexOfSegment(entry, marker);
  return index >= 0 ? entry.segments.slice(index) : entry.segments;
}
function deriveModName(list) {
  for (const entry of list) {
    const content = indexOfSegment(entry, "content");
    if (content > 0) {
      const candidate = entry.segments[content - 1];
      if (/^mod/i.test(candidate)) return candidate;
    }
  }
  const top = list[0]?.segments[0];
  return top && !["mods", "dlc", "bin", "content"].includes(top.toLowerCase()) ? top : "mod";
}
function copy(source, destination, mutable = false) {
  return { type: "copy", source, destination, ...mutable ? { verification: "exists" } : {} };
}
function installMods(list) {
  const marker = list.find((entry) => indexOfSegment(entry, "mods") >= 0);
  const markerIndex = marker ? indexOfSegment(marker, "mods") : -1;
  const prefix = markerIndex > 0 ? marker.segments.slice(0, markerIndex).map((segment) => segment.toLowerCase()) : [];
  const instructions = list.flatMap((entry) => {
    if (prefix.length > 0 && entry.segments.slice(0, prefix.length).map((segment) => segment.toLowerCase()).join("/") !== prefix.join("/")) return [];
    const destination = prefix.length > 0 ? entry.segments.slice(prefix.length).join("/") : entry.relative;
    return destination ? [copy(entry.source, destination)] : [];
  });
  if (instructions.length === 0) throw new Error("No Witcher 3 Mods files found");
  return { instructions, modType: MODS_MOD_TYPE };
}
function installContent(list, fallbackName) {
  const modName = fallbackName || deriveModName(list);
  const instructions = list.flatMap((entry) => {
    const contentIndex = indexOfSegment(entry, "content");
    if (contentIndex < 0 || contentIndex > 0 && !entry.segments[contentIndex - 1].toLowerCase().startsWith("mod")) return [];
    const contentPath = entry.segments.slice(contentIndex).join("/");
    return [copy(entry.source, `${MODS_PATH}/${contentIndex > 0 ? entry.segments[contentIndex - 1] : modName}/${contentPath}`)];
  });
  if (instructions.length === 0) throw new Error("No Witcher 3 content files found");
  return { instructions, modType: CONTENT_MOD_TYPE };
}
function installDlc(list) {
  const instructions = list.flatMap((entry) => {
    const index = indexOfSegment(entry, "dlc");
    if (index >= 0) return [copy(entry.source, stripTo(entry, "dlc").join("/"))];
    const content = indexOfSegment(entry, "content");
    return content > 0 && entry.segments[content - 1].toLowerCase().startsWith("dlc") ? [copy(entry.source, `${DLC_PATH}/${entry.segments.slice(content - 1).join("/")}`)] : [];
  });
  if (instructions.length === 0) throw new Error("No Witcher 3 DLC files found");
  return { instructions, modType: DLC_MOD_TYPE };
}
function installMenu(list, fallbackName) {
  const modName = fallbackName || deriveModName(list);
  const menuRoot = MENU_PATH.toLowerCase().split("/");
  const inputFiles = list.filter((entry) => {
    const lower = entry.segments.map((segment) => segment.toLowerCase());
    return lower.some((_segment, index) => lower.slice(index, index + menuRoot.length).join("/") === MENU_PATH);
  });
  const selectedInput = /* @__PURE__ */ new Map();
  for (const entry of inputFiles) {
    const filename = entry.segments[entry.segments.length - 1].toLowerCase();
    const existing = selectedInput.get(filename);
    if (!existing || isBackupEntry(existing) && !isBackupEntry(entry)) selectedInput.set(filename, entry);
  }
  const inputSet = new Set(inputFiles.map((entry) => entry.source));
  const instructions = Array.from(selectedInput.values()).map((entry) => {
    const lower = entry.segments.map((segment) => segment.toLowerCase());
    const menuIndex = lower.findIndex((_segment, index) => lower.slice(index, index + menuRoot.length).join("/") === MENU_PATH);
    return copy(entry.source, entry.segments.slice(menuIndex).join("/"), true);
  });
  for (const entry of list) {
    if (inputSet.has(entry.source)) continue;
    const modsIndex = indexOfSegment(entry, "mods");
    if (modsIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, "mods").join("/")));
      continue;
    }
    const dlcIndex = indexOfSegment(entry, "dlc");
    if (dlcIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, "dlc").join("/")));
      continue;
    }
    const binIndex = indexOfSegment(entry, "bin");
    if (binIndex >= 0) {
      instructions.push(copy(entry.source, stripTo(entry, "bin").join("/")));
      continue;
    }
    const contentIndex = indexOfSegment(entry, "content");
    if (contentIndex >= 0 || entry.relative.toLowerCase().endsWith(PART_SUFFIX)) {
      const name = contentIndex > 0 && /^mod/i.test(entry.segments[contentIndex - 1]) ? entry.segments[contentIndex - 1] : modName;
      instructions.push(copy(entry.source, `${MODS_PATH}/${name}/${contentIndex >= 0 ? entry.segments.slice(contentIndex).join("/") : entry.segments.at(-1)}`));
    }
  }
  if (instructions.length === 0) throw new Error("No Witcher 3 menu files found");
  return { instructions, modType: MENU_MOD_TYPE };
}
function installMixed(list) {
  const instructions = list.flatMap((entry) => {
    if (entry.segments.length === 0) return [];
    const modsIndex = indexOfSegment(entry, "mods");
    if (modsIndex >= 0) return [copy(entry.source, stripTo(entry, "mods").join("/"))];
    const dlcIndex = indexOfSegment(entry, "dlc");
    if (dlcIndex >= 0) return [copy(entry.source, stripTo(entry, "dlc").join("/"))];
    const contentIndex = indexOfSegment(entry, "content");
    if (contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith("mod")) {
      return [copy(entry.source, `${MODS_PATH}/${entry.segments.slice(contentIndex - 1).join("/")}`)];
    }
    if (contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith("dlc")) {
      return [copy(entry.source, `${DLC_PATH}/${entry.segments.slice(contentIndex - 1).join("/")}`)];
    }
    const binIndex = indexOfSegment(entry, "bin");
    if (binIndex >= 0) return [copy(entry.source, entry.segments.slice(binIndex).join("/"))];
    return [copy(entry.source, entry.relative)];
  });
  if (instructions.length === 0) throw new Error("No Witcher 3 mixed files found");
  return { instructions, modType: MIXED_MOD_TYPE };
}
function installRoot(list) {
  const instructions = list.map((entry) => copy(entry.source, entry.relative));
  return { instructions, modType: ROOT_MOD_TYPE };
}
function supported(gameId) {
  return STORE_IDS.some((id) => String(id) === String(gameId));
}
function testWith(predicate) {
  return (files, gameId) => {
    if (!supported(gameId)) return { supported: false, requiredFiles: [] };
    try {
      return { supported: predicate(entries(files)), requiredFiles: [] };
    } catch {
      return { supported: false, requiredFiles: [] };
    }
  };
}
var testScriptMerger = testWith(hasScriptMerger);
var testMixed = testWith((list) => !hasMenuConfig(list) && (hasSegment(list, "mods") && hasSegment(list, "dlc") || hasPrefixedContent(list, "mod") && hasPrefixedContent(list, "dlc")));
var testDlc = testWith((list) => (hasSegment(list, "dlc") || hasPrefixedContent(list, "dlc")) && !hasSegment(list, "mods") && !hasPrefixedContent(list, "mod"));
var testMenu = testWith((list) => hasMenuConfig(list) || hasPartFile(list));
var testContent = testWith((list) => list.some((entry) => {
  const contentIndex = indexOfSegment(entry, "content");
  return contentIndex === 0 || contentIndex > 0 && entry.segments[contentIndex - 1].toLowerCase().startsWith("mod");
}));
var testMods = testWith((list) => hasSegment(list, "mods") && !hasSegment(list, "dlc"));
var testRoot = testWith((list) => hasSegment(list, "mods") || hasSegment(list, "dlc") || list.some((entry) => indexOfSegment(entry, "content") >= 0) || list.some((entry) => entry.relative.toLowerCase().startsWith("bin/")));
function installScriptMerger(list) {
  const executables = list.filter((entry) => entry.segments.at(-1)?.toLowerCase() === SCRIPT_MERGER_FILENAME.toLowerCase());
  if (executables.length !== 1) throw new Error("Script Merger archive must contain exactly one WitcherScriptMerger.exe");
  const root = executables[0].segments.slice(0, -1);
  const instructions = list.flatMap((entry) => {
    if (!root.every((segment, index) => entry.segments[index]?.toLowerCase() === segment.toLowerCase())) return [];
    const relative = entry.segments.slice(root.length).join("/");
    if (/^(?:MergeInventory\.xml|\.heybox-merge-state\.json)$/i.test(relative)) return [];
    const mutable = /\.(?:config|xml|ini|json|log)$/i.test(relative);
    return [copy(entry.source, `${SCRIPT_MERGER_DIRECTORY}/${relative}`, mutable)];
  });
  return { instructions, modType: SCRIPT_MERGER_MOD_TYPE };
}
function registerType(context, id, typePriority, installerPriority, name, test, install) {
  context.registerModType(id, typePriority, supported, () => "{gamePath}", test, { name });
  context.registerInstaller(id, installerPriority, test, install);
}
async function findGame(context) {
  return (await context.api.util.GameStoreHelper.findByAppId(STORE_IDS))?.gamePath;
}
function uniqueModName(options) {
  const identity = options?.mod;
  if (!identity?.modKey) return void 0;
  return `mod${String(identity.name || "Content").replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 45) || "Content"}_${(0, import_node_crypto3.createHash)("sha256").update(identity.modKey).digest("hex").slice(0, 8)}`;
}
function main(context) {
  const extended = runtime(context);
  let selectedGamePath;
  const resolveGamePath = async () => selectedGamePath || findGame(context);
  const scriptMerger = createScriptMergerSupport(context, resolveGamePath);
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    executable: EXECUTABLES[0],
    queryPath: async () => {
      selectedGamePath = await findGame(context);
      return selectedGamePath;
    },
    setup: async (discovery) => {
      selectedGamePath = discovery.path || discovery.gamePath || await resolveGamePath();
      return scriptMerger.getRequiredMods(selectedGamePath);
    },
    localModFeatures: scriptMerger.getLocalModFeatures(),
    requiredFiles: [],
    environment: { SteamAPPId: String(GAME_ID) },
    details: {
      steamAppId: GAME_ID,
      nexusGameDomainName: "witcher3",
      customOpenModsPath: MODS_PATH
    }
  });
  registerMenuMergers(extended);
  const prepare = (install) => scriptMerger.guardInstaller(async (files, staging, options) => {
    const result = await install(files, staging, options);
    const style = await scriptStyle(files, staging, options);
    const documents = import_node_path8.default.dirname(await resolveModsSettingsPath());
    const instructions = [];
    const fragments = /* @__PURE__ */ new Map();
    for (const instruction of result.instructions) {
      const basename = import_node_path8.default.posix.basename(String(instruction.destination).replace(/\\/g, "/")).toLowerCase();
      if (basename.endsWith(PART_SUFFIX)) {
        const setting = basename.slice(0, -PART_SUFFIX.length);
        if (setting === "user.settings" && isRemastered(await resolveGamePath() || "")) continue;
        if (documentSettings.includes(setting)) {
          const target = import_node_path8.default.join(documents, setting);
          const sources = fragments.get(target) || [];
          sources.push(instruction);
          fragments.set(target, sources);
        }
      } else instructions.push(isNativeMenuXml(instruction.destination) ? { ...instruction, verification: "exists", conflictPolicy: "overwrite" } : instruction);
    }
    for (const [destination, sources] of fragments) {
      if (sources.length === 1) instructions.push({ ...sources[0], destination, verification: "exists", conflictPolicy: "overwrite" });
      else {
        const contents = await Promise.all(sources.map(async (source) => {
          const paths = options?.sourcePathByFile;
          const text = await readText(paths?.[source.source] || (staging ? import_node_path8.default.join(staging, source.source) : void 0));
          if (text === void 0) throw new Error(`\u65E0\u6CD5\u8BFB\u53D6\u83DC\u5355\u914D\u7F6E\u7247\u6BB5\uFF1A${source.source}`);
          return text;
        }));
        instructions.push({ type: "generatefile", destination, data: contents.join("\r\n"), verification: "exists", conflictPolicy: "overwrite" });
      }
    }
    return { ...result, instructions: [...instructions, { type: "attribute", key: "witcher3ScriptStyle", value: style }] };
  });
  registerType(context, MIXED_MOD_TYPE, 100, 25, "Witcher 3 Mixed Mod", testMixed, prepare((files) => installMixed(entries(files))));
  registerType(context, DLC_MOD_TYPE, 90, 60, "Witcher 3 DLC", testDlc, prepare((files) => installDlc(entries(files))));
  registerType(context, MENU_MOD_TYPE, 80, 20, "Witcher 3 Menu Mod", testMenu, prepare((files, _staging, options) => installMenu(entries(files), uniqueModName(options))));
  registerType(context, CONTENT_MOD_TYPE, 70, 50, "Witcher 3 Content Mod", testContent, prepare((files, _staging, options) => {
    return installContent(entries(files), uniqueModName(options));
  }));
  registerType(context, MODS_MOD_TYPE, 60, 30, "Witcher 3 Mod", testMods, prepare((files) => installMods(entries(files))));
  registerType(context, ROOT_MOD_TYPE, 10, 1e3, "Witcher 3 Root Files", testRoot, prepare((files) => installRoot(entries(files))));
  registerType(context, SCRIPT_MERGER_MOD_TYPE, 120, 15, "Witcher 3 Script Merger", testScriptMerger, (files) => installScriptMerger(entries(files)));
  context.registerExtensionAction(GAME_ID, "getScriptMergerStatus", () => scriptMerger.getStatus());
  context.registerExtensionAction(GAME_ID, "getExtensionRequiredMods", () => scriptMerger.getRequiredMods());
  registerWitcherLoadOrder(context, { mergedOutputs: (gamePath) => readMergeInventory(extended, gamePath) });
  scriptMerger.registerTool(extended);
  return true;
}
var __testing = {
  entries,
  testScriptMerger,
  testMixed,
  testDlc,
  testMenu,
  testContent,
  testMods,
  testRoot,
  installMixed,
  installDlc,
  installMenu,
  installContent,
  installMods,
  installRoot,
  installScriptMerger
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CONTENT_MOD_TYPE,
  DLC_MOD_TYPE,
  EXECUTABLES,
  GAME_ID,
  GAME_NAME,
  MENU_MOD_TYPE,
  MIXED_MOD_TYPE,
  MODS_MOD_TYPE,
  ROOT_MOD_TYPE,
  SCRIPT_MERGER_DIRECTORY,
  SCRIPT_MERGER_FILENAME,
  SCRIPT_MERGER_INSTALLER_ID,
  SCRIPT_MERGER_MOD_TYPE,
  SCRIPT_MERGER_REQUIREMENT_MOD_ID,
  STORE_IDS,
  __testing
});
