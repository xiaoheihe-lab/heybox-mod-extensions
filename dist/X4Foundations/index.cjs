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

// extensions/X4Foundations/index.ts
var index_exports = {};
__export(index_exports, {
  EXTENSION_ATTRIBUTE: () => EXTENSION_ATTRIBUTE,
  GAME_ID: () => GAME_ID,
  MOD_PATH: () => MOD_PATH,
  MOD_TYPE_ID: () => MOD_TYPE_ID,
  default: () => index_default,
  installX4Mod: () => installX4Mod,
  normalizeArchivePath: () => normalizeArchivePath,
  testX4Mod: () => testX4Mod
});
module.exports = __toCommonJS(index_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var GAME_ID = 392160;
var MOD_TYPE_ID = "x4-extension";
var MOD_PATH = "extensions";
var EXTENSION_ATTRIBUTE = "x4Extensions";
var EXECUTABLE = "X4.exe";
var CONTENT_FILE = "content.xml";
function validateSegment(segment) {
  if (!segment || segment === "." || segment === ".." || /[<>:"/\\|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment) || /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(segment)) {
    throw new Error(`\u5B89\u88C5\u5305\u5305\u542B\u4E0D\u5B89\u5168\u7684\u8DEF\u5F84\u540D\u79F0\uFF1A${segment}`);
  }
}
function normalizeArchivePath(source) {
  let value = String(source).replace(/\\/g, "/");
  if (value.startsWith("/") || /^[a-z]:/i.test(value)) {
    throw new Error(`\u5B89\u88C5\u5305\u4E0D\u5141\u8BB8\u4F7F\u7528\u7EDD\u5BF9\u8DEF\u5F84\uFF1A${source}`);
  }
  value = value.replace(/^(\.\/)+/, "").replace(/\/+$/, "");
  for (const segment of value.split("/")) validateSegment(segment);
  return value;
}
function isIgnored(relative) {
  return relative.split("/").some((part) => [".git", ".svn", ".hg", "__macosx"].includes(part.toLowerCase())) || [".ds_store", "thumbs.db", "desktop.ini", ".gitignore", ".gitattributes"].includes(import_path.default.posix.basename(relative).toLowerCase()) || import_path.default.posix.basename(relative).startsWith("._");
}
function normalizeFiles(files) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const source of files) {
    const relative = normalizeArchivePath(source);
    if (/[\/]$/.test(source) || isIgnored(relative)) continue;
    const key = relative.toLowerCase();
    if (seen.has(key)) throw new Error(`\u5B89\u88C5\u5305\u5B58\u5728\u91CD\u590D\u6216\u5927\u5C0F\u5199\u51B2\u7A81\u7684\u6587\u4EF6\uFF1A${source}`);
    seen.add(key);
    result.push({ source, relative });
  }
  return result;
}
function isContentFile(relative) {
  return import_path.default.posix.basename(relative).toLowerCase() === CONTENT_FILE;
}
function isUnderRoot(relative, root) {
  return !root || relative.toLowerCase().startsWith(`${root.toLowerCase()}/`);
}
function sourcePath(file, stagingPath, options) {
  const mapped = options?.sourcePathByFile?.[file.source];
  if (mapped) return mapped;
  if (!stagingPath) throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u6269\u5C55\u6E05\u5355\uFF1A\u5BA2\u6237\u7AEF\u672A\u63D0\u4F9B\u5B89\u88C5\u6682\u5B58\u76EE\u5F55\u6216\u6E90\u6587\u4EF6\u6620\u5C04\u3002");
  return import_path.default.join(stagingPath, ...file.relative.split("/"));
}
async function readContent(context, filename) {
  try {
    const text = await import_fs.default.promises.readFile(filename, "utf8");
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("\u4E0D\u652F\u6301\u5305\u542B DTD \u6216\u5B9E\u4F53\u58F0\u660E\u7684\u6269\u5C55\u6E05\u5355");
    const parsed = await context.api.util.fileParseApi.parseXmlToObject(text);
    const id = parsed?.content?.$?.id;
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("content.xml \u5FC5\u987B\u5305\u542B\u975E\u7A7A\u7684 content id\uFF0C\u7528\u6237\u542F\u7528\u72B6\u6001\u6587\u4EF6\u4E0D\u80FD\u4F5C\u4E3A\u6269\u5C55\u5B89\u88C5");
    }
    if (/^ego_dlc_/i.test(id.trim())) throw new Error("\u4E0D\u5141\u8BB8\u5B89\u88C5\u6216\u8986\u76D6\u5B98\u65B9 DLC");
    return id.trim();
  } catch (error) {
    throw new Error(`\u65E0\u6CD5\u8BFB\u53D6\u6269\u5C55\u6E05\u5355 ${filename}\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
}
async function testX4Mod(files, gameId) {
  return {
    supported: Number(gameId) === GAME_ID && files.some((file) => !/[\/]$/.test(file) && /(^|[\/])content.xml$/i.test(file)),
    requiredFiles: []
  };
}
async function discoverExtensions(context, files, stagingPath, options) {
  if (files.some((file) => file.relative.split("/").some((part) => part.toLowerCase() === "fomod"))) {
    throw new Error("\u9996\u7248\u4E0D\u652F\u6301 FOMOD \u9009\u62E9\u5B89\u88C5\uFF0C\u8BF7\u4E0B\u8F7D\u5DF2\u9009\u597D\u7EC4\u4EF6\u7684\u666E\u901A\u6269\u5C55\u5305\u3002");
  }
  const manifests = files.filter((file) => isContentFile(file.relative));
  if (!manifests.length) throw new Error("\u5B89\u88C5\u5305\u4E2D\u6CA1\u6709\u627E\u5230 X4 \u6269\u5C55\u6E05\u5355 content.xml\u3002");
  const extensions = [];
  for (const manifest of manifests) {
    const dirname = import_path.default.posix.dirname(manifest.relative);
    const root = dirname === "." ? "" : dirname;
    if (root.split("/").some((part) => ["optional", "options"].includes(part.toLowerCase()))) {
      throw new Error("\u5B89\u88C5\u5305\u5305\u542B\u53EF\u9009\u7EC4\u4EF6\uFF0C\u8BF7\u5148\u9009\u62E9\u9700\u8981\u7684\u7248\u672C\uFF0C\u4E0D\u80FD\u540C\u65F6\u81EA\u52A8\u5B89\u88C5\u6240\u6709\u9009\u9879\u3002");
    }
    if (extensions.some((extension) => isUnderRoot(root.toLowerCase(), extension.root.toLowerCase()) || isUnderRoot(extension.root.toLowerCase(), root.toLowerCase()))) {
      throw new Error("\u5B89\u88C5\u5305\u4E2D\u7684\u6269\u5C55\u6E05\u5355\u76F8\u4E92\u5D4C\u5957\uFF0C\u8BF7\u6574\u7406\u4E3A\u5E76\u5217\u7684\u72EC\u7ACB\u6269\u5C55\u76EE\u5F55\u3002");
    }
    const id = await readContent(context, sourcePath(manifest, stagingPath, options));
    const folder = root ? import_path.default.posix.basename(root) : id;
    validateSegment(folder);
    if (/^ego_dlc_/i.test(folder)) throw new Error("\u4E0D\u5141\u8BB8\u4EE5\u5B98\u65B9 DLC \u76EE\u5F55\u4F5C\u4E3A\u5B89\u88C5\u76EE\u6807\u3002");
    if (extensions.some((extension) => extension.id.toLowerCase() === id.toLowerCase() || extension.folder.toLowerCase() === folder.toLowerCase())) {
      throw new Error(`\u5B89\u88C5\u5305\u5305\u542B\u91CD\u590D\u7684\u6269\u5C55 ID \u6216\u76EE\u6807\u76EE\u5F55\uFF1A${id} / ${folder}`);
    }
    extensions.push({ id, folder, root });
  }
  return extensions;
}
async function findGamePath(context) {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  if (!game?.gamePath || !import_fs.default.existsSync(import_path.default.join(game.gamePath, EXECUTABLE))) return void 0;
  return game.gamePath;
}
async function installX4Mod(context, files, stagingPath, options) {
  const entries = normalizeFiles(files);
  const extensions = await discoverExtensions(context, entries, stagingPath, options);
  const instructions = [];
  const destinations = /* @__PURE__ */ new Set();
  for (const extension of extensions) {
    for (const file of entries) {
      if (!isUnderRoot(file.relative, extension.root)) continue;
      const inside = extension.root ? file.relative.slice(extension.root.length + 1) : file.relative;
      const destination = import_path.default.posix.join(extension.folder, inside);
      const key = destination.toLowerCase();
      if (destinations.has(key)) throw new Error(`\u591A\u4E2A\u6587\u4EF6\u6307\u5411\u540C\u4E00\u5B89\u88C5\u4F4D\u7F6E\uFF1A${destination}`);
      destinations.add(key);
      instructions.push({ type: "copy", source: file.source, destination });
    }
  }
  for (const destination of destinations) {
    const segments = destination.split("/");
    for (let end = 1; end < segments.length; end += 1) {
      if (destinations.has(segments.slice(0, end).join("/"))) {
        throw new Error("\u5B89\u88C5\u5305\u5B58\u5728\u6587\u4EF6\u4E0E\u6587\u4EF6\u5939\u540C\u540D\u51B2\u7A81\uFF0C\u65E0\u6CD5\u5B89\u5168\u90E8\u7F72\u3002");
      }
    }
  }
  const gamePath = await findGamePath(context);
  if (!gamePath) throw new Error("\u672A\u627E\u5230 X4 \u6E38\u620F\u76EE\u5F55\uFF0C\u8BF7\u5148\u5728\u5C0F\u9ED1\u76D2\u4E2D\u5B8C\u6210\u6E38\u620F\u53D1\u73B0\u3002");
  await checkExistingExtensions(context, gamePath, extensions, instructions.filter((item) => item.type === "copy"));
  instructions.push({ type: "attribute", key: EXTENSION_ATTRIBUTE, value: extensions.map(({ id, folder }) => ({ id, folder })) });
  return { instructions, modType: MOD_TYPE_ID };
}
async function statIfExists(filename) {
  try {
    return await import_fs.default.promises.lstat(filename);
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw new Error(`\u65E0\u6CD5\u68C0\u67E5\u5B89\u88C5\u76EE\u6807 ${filename}\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
}
async function managedFiles(context) {
  const result = /* @__PURE__ */ new Set();
  const vfs = context.api.vfs;
  if (!vfs?.runManagedDeploymentMutation) return result;
  try {
    await vfs.runManagedDeploymentMutation({ modType: MOD_TYPE_ID }, (mutation) => {
      for (const entry of mutation.entries || []) {
        if (entry.exists !== false && typeof entry.absolutePath === "string" && import_path.default.isAbsolute(entry.absolutePath)) {
          result.add(import_path.default.resolve(entry.absolutePath).toLowerCase());
        }
      }
    });
    return result;
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
async function assertNoLinks(root, relative) {
  let current = root;
  const parts = relative.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = import_path.default.join(current, parts[index]);
    const stat = await statIfExists(current);
    if (!stat) return;
    if (stat.isSymbolicLink()) throw new Error(`\u5B89\u88C5\u76EE\u6807\u5305\u542B\u7B26\u53F7\u94FE\u63A5\u6216\u76EE\u5F55\u8054\u63A5\uFF0C\u4E0D\u80FD\u5B89\u5168\u90E8\u7F72\uFF1A${current}`);
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`\u5B89\u88C5\u76EE\u6807\u7684\u4E0A\u7EA7\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6\u5939\uFF1A${current}`);
  }
}
async function checkExistingExtensions(context, gamePath, extensions, copies) {
  const root = import_path.default.join(gamePath, MOD_PATH);
  const stat = await statIfExists(root);
  if (!stat) return;
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("\u6E38\u620F extensions \u8DEF\u5F84\u4E0D\u662F\u666E\u901A\u76EE\u5F55\uFF0C\u65E0\u6CD5\u5B89\u5168\u5B89\u88C5\u3002");
  let owned;
  const isOwned = async (filename) => {
    owned ??= await managedFiles(context);
    return owned.has(import_path.default.resolve(filename).toLowerCase());
  };
  for (const directory of await import_fs.default.promises.readdir(root, { withFileTypes: true })) {
    const sameFolder = extensions.some((extension) => extension.folder.toLowerCase() === directory.name.toLowerCase());
    if (directory.isSymbolicLink() && sameFolder) throw new Error(`\u76EE\u6807\u6269\u5C55\u76EE\u5F55\u662F\u94FE\u63A5\uFF0C\u65E0\u6CD5\u5B89\u5168\u5B89\u88C5\uFF1A${directory.name}`);
    if (!directory.isDirectory()) {
      if (sameFolder) throw new Error(`\u6269\u5C55\u76EE\u5F55\u4E0E\u73B0\u6709\u6587\u4EF6\u51B2\u7A81\uFF1A${directory.name}`);
      continue;
    }
    const manifest = import_path.default.join(root, directory.name, CONTENT_FILE);
    const manifestStat = await statIfExists(manifest);
    let matchingId = false;
    if (manifestStat?.isSymbolicLink()) {
      if (sameFolder) throw new Error(`\u73B0\u6709\u6269\u5C55\u6E05\u5355\u662F\u94FE\u63A5\uFF1A${manifest}`);
      continue;
    }
    if (manifestStat?.isFile()) {
      try {
        const text = await import_fs.default.promises.readFile(manifest, "utf8");
        if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("\u6E05\u5355\u5305\u542B\u4E0D\u652F\u6301\u7684 XML \u58F0\u660E");
        const parsed = await context.api.util.fileParseApi.parseXmlToObject(text);
        const id = parsed?.content?.$?.id;
        matchingId = typeof id === "string" && extensions.some((extension) => extension.id.toLowerCase() === id.trim().toLowerCase());
      } catch {
        throw new Error(`\u65E0\u6CD5\u68C0\u67E5\u73B0\u6709\u6269\u5C55\u6E05\u5355\uFF0C\u8BF7\u5148\u68C0\u67E5\u8BE5\u6587\u4EF6\uFF1A${manifest}`);
      }
    }
    if (matchingId && !sameFolder) throw new Error(`\u5176\u4ED6\u76EE\u5F55\u5DF2\u5B89\u88C5\u76F8\u540C ID \u7684\u6269\u5C55\uFF0C\u8BF7\u5148\u5904\u7406\u91CD\u590D\u5B89\u88C5\uFF1A${directory.name}`);
    if (sameFolder && !await isOwned(manifest)) throw new Error(`\u76EE\u6807\u76EE\u5F55\u5C5E\u4E8E\u624B\u52A8\u5B89\u88C5\u6216\u672A\u6258\u7BA1\u7684\u6269\u5C55\uFF0C\u4E0D\u80FD\u8986\u76D6\uFF1A${directory.name}`);
  }
  for (const copy of copies) {
    await assertNoLinks(root, copy.destination);
    const filename = import_path.default.join(root, ...copy.destination.split("/"));
    const target = await statIfExists(filename);
    if (!target) continue;
    if (!target.isFile() || !await isOwned(filename)) throw new Error(`\u76EE\u6807\u5B58\u5728\u672A\u6258\u7BA1\u6587\u4EF6\uFF0C\u4E0D\u80FD\u8986\u76D6\uFF1A${copy.destination}`);
  }
}
async function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: "X4: Foundations",
    shortName: "X4",
    executable: EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    modPath: MOD_PATH,
    modPathIsRelative: true,
    queryPath: () => findGamePath(context),
    queryModPath: () => MOD_PATH,
    mergeMods: true,
    requiresCleanup: true,
    environment: { SteamAPPId: String(GAME_ID) },
    details: { steamAppId: GAME_ID, customOpenModsPath: MOD_PATH, supportsSymlinks: false }
  });
  context.registerModType(
    MOD_TYPE_ID,
    25,
    (gameId) => Number(gameId) === GAME_ID,
    () => import_path.default.join("{gamePath}", MOD_PATH),
    () => Promise.resolve(false),
    { name: "X4 \u539F\u751F\u6269\u5C55" }
  );
  context.registerInstaller(MOD_TYPE_ID, 25, testX4Mod, (files, stagingPathOrOptions, maybeOptions) => {
    const stagingPath = typeof stagingPathOrOptions === "string" ? stagingPathOrOptions : void 0;
    const options = typeof stagingPathOrOptions === "string" ? maybeOptions : stagingPathOrOptions ?? maybeOptions;
    return installX4Mod(context, files, stagingPath, options);
  });
  return true;
}
var index_default = main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EXTENSION_ATTRIBUTE,
  GAME_ID,
  MOD_PATH,
  MOD_TYPE_ID,
  installX4Mod,
  normalizeArchivePath,
  testX4Mod
});
