import type { IExtensionContext } from 'heybox-mod-api';

const STEAM_APP_ID = 553850;
const GAME_ID = STEAM_APP_ID;
const GAME_NAME = 'Helldivers 2';
const EXECUTABLE = 'bin/helldivers2.exe';

const DATA_ID = 'helldivers2-data';
const DATA_NAME = 'Game Data (.dl_bin)';
const DATA_PATH = 'data/game';
const DATA_EXT = '.dl_bin';

const STREAM_ID = 'helldivers2-stream';
const STREAM_NAME = 'Data Stream File (.stream)';
const STREAM_PATH = 'data';
const STREAM_EXT = '.stream';

const BINARIES_ID = 'helldivers2-binaries';
const BINARIES_NAME = 'Binaries (Engine Injector)';
const BINARIES_PATH = 'bin';

const PATCH_ID = 'helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE';
const PATCH_NAME = 'Data Patch (.patch0)';
const PATCH_PATH = 'data';
const PATCH_TOKEN_RE = /patch_(\d+)/i;
const PATCH_FILE_RE = /\.patch_(\d+)$/i;
const PATCH_FILES = [
  '9ba626afa44a3aa3.patch_0',
  '9ba626afa44a3aa3.patch_0.gpu_resources',
  '9ba626afa44a3aa3.patch_0.stream',
];
const PATCH_FILE_STEMS = ['9ba626afa44a3aa3'];
const PATCH_EXTS = ['.gpu_resources', '.stream'];
const PATCH_GPU_FILE = '9ba626afa44a3aa3.patch_0.gpu_resources';
const PATCH_METADATA_KEY = 'helldivers2PatchDeployments';

const SOUND_PATCH_ID = 'helldivers2-soundpatch';
const SOUND_PATCH_NAME = 'Data Sound Patch (.patch0)';
const SOUND_PATCH_EXTS = ['.patch_0'];

type Instruction = Record<string, unknown>;

type PatchDeployment = {
  originalArchivePath: string;
  originalFilename: string;
  tempFilename: string;
  deployedFilename: string;
  fileStart: string;
  fileEnd: string;
  isPatchFile?: boolean;
  patchNumber?: number;
};

function normalizeArchivePath(input: string): string {
  return String(input || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/^(\.\/)+/, '');
}

function isDirectoryEntry(file: string): boolean {
  return /[\\/]$/.test(String(file || ''));
}

function pathParts(input: string): string[] {
  return normalizeArchivePath(input).split('/').filter(Boolean);
}

function archiveBasename(input: string): string {
  const parts = pathParts(input);
  return parts[parts.length - 1] || '';
}

function archiveDirname(input: string): string {
  const parts = pathParts(input);
  parts.pop();
  return parts.join('/');
}

function archiveExtname(input: string): string {
  const name = archiveBasename(input);
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function parsePatchNumber(filename: string): number | null {
  const match = archiveBasename(filename).match(PATCH_FILE_RE);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parsePatchTokenNumber(filename: string): number | null {
  const match = PATCH_TOKEN_RE.exec(archiveBasename(filename));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function isPatchDataFile(file: string): boolean {
  return parsePatchNumber(file) !== null;
}

function getPatchFileStem(file: string): string | null {
  const match = archiveBasename(file).match(/^(.+)\.patch_\d+$/i);
  return match ? match[1].toLowerCase() : null;
}

function isGraphicsPatchStem(stem: string | null): boolean {
  return stem !== null && PATCH_FILE_STEMS.includes(stem);
}

function hasGraphicsGpuPatchFile(files: string[]): boolean {
  return files.some((file) => {
    const name = archiveBasename(file).toLowerCase();
    return PATCH_FILE_STEMS.some((stem) => new RegExp(`^${stem}\\.patch_\\d+\\.gpu_resources$`, 'i').test(name));
  });
}

function hasGraphicsPatchFile(files: string[]): boolean {
  return hasGraphicsGpuPatchFile(files) && files.some((file) => isGraphicsPatchStem(getPatchFileStem(file)));
}

function isPatchSidecarFile(file: string, allowedExts: string[]): boolean {
  const name = archiveBasename(file);
  return allowedExts.includes(archiveExtname(file)) && PATCH_TOKEN_RE.test(name);
}

function isPatchManagedFile(file: string, allowedExts: string[]): boolean {
  return isPatchDataFile(file) || isPatchSidecarFile(file, allowedExts);
}

function archiveJoin(...parts: string[]): string {
  return parts.map(normalizeArchivePath).filter(Boolean).join('/');
}

function isGameId(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID || String(gameId).toLowerCase() === 'helldivers2';
}

function hasFomodInstaller(files: string[]): boolean {
  return files.some((file) => {
    const parts = pathParts(file).map((part) => part.toLowerCase());
    return parts.length >= 2 && parts[parts.length - 1] === 'moduleconfig.xml' && parts[parts.length - 2] === 'fomod';
  });
}

function testerResult(supported: boolean) {
  return Promise.resolve({ supported, requiredFiles: [] });
}

function fileNameHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function sanitizeFilename(input: string): string {
  return String(input || 'file')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim() || 'file';
}

function getRootRelativeDestination(file: string, rootPath: string): string {
  const normalized = normalizeArchivePath(file);
  const root = normalizeArchivePath(rootPath);
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : archiveBasename(normalized);
}

function filterUnderRoot(files: string[], rootPath: string): string[] {
  const root = normalizeArchivePath(rootPath);
  return files.filter((file) => {
    const normalized = normalizeArchivePath(file);
    return !isDirectoryEntry(file) && (!root || normalized === root || normalized.startsWith(`${root}/`));
  });
}

function splitPatchFilename(filename: string): { fileStart: string; fileEnd: string } {
  const match = PATCH_TOKEN_RE.exec(filename);
  if (!match || match.index < 0) return { fileStart: filename, fileEnd: '' };
  return {
    fileStart: filename.slice(0, match.index),
    fileEnd: filename.slice(match.index + match[0].length),
  };
}

function buildPatchFilename(deployment: Pick<PatchDeployment, 'fileStart' | 'fileEnd'>, patchNumber: number): string {
  return `${deployment.fileStart}patch_${patchNumber}${deployment.fileEnd}`;
}

async function findGamePath(context: IExtensionContext): Promise<string> {
  const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
  return String(game?.gamePath || '');
}

async function isFile(context: IExtensionContext, filePath: string): Promise<boolean> {
  try {
    const stat = await context.api.util.fs.stat(filePath);
    return !!stat.isFile;
  } catch {
    return false;
  }
}

async function getNextPatchNumber(context: IExtensionContext): Promise<number> {
  const gamePath = await findGamePath(context);
  if (!gamePath) return 0;

  const dataPath = context.api.util.path.join(gamePath, PATCH_PATH);
  let entries: string[] = [];
  try {
    entries = await context.api.util.fs.readdir(dataPath);
  } catch {
    return 0;
  }

  const occupied = new Set<number>();
  for (const entry of entries) {
    const number = parsePatchNumber(entry);
    if (number === null) continue;
    const fullPath = context.api.util.path.join(dataPath, entry);
    if (!await isFile(context, fullPath)) continue;
    occupied.add(number);
  }

  let nextNumber = 0;
  while (occupied.has(nextNumber)) nextNumber += 1;
  return nextNumber;
}

function testDlbin(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === DATA_EXT);
  return testerResult(supported);
}

function installDlbin(files: string[]) {
  const modFile = files.find((file) => archiveExtname(file) === DATA_EXT);
  if (!modFile) return { instructions: [], modType: DATA_ID };

  const rootPath = archiveDirname(modFile);
  const instructions = filterUnderRoot(files, rootPath).map((file) => ({
    type: 'copy',
    source: file,
    destination: getRootRelativeDestination(file, rootPath),
  }));
  return { instructions, modType: DATA_ID };
}

function testPatch(files: string[], gameId: number | string) {
  return testerResult(isGameId(gameId) && hasGraphicsPatchFile(files));
}

function testSoundPatch(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => isPatchDataFile(file));
  return testerResult(supported);
}

function testStream(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => archiveExtname(file) === STREAM_EXT);
  return testerResult(supported);
}

async function chooseVariant(
  context: IExtensionContext,
  patchFile: string,
  candidates: string[]
): Promise<string> {
  if (candidates.length <= 1) return candidates[0] || '';

  const response = await context.api.util.ui.request({
    type: 'mod_choice',
    title: 'Choose Variant',
    content: `This mod has several variants for "${patchFile}". Choose the variant you wish to install.`,
    choices: candidates.map((candidate, index) => ({
      id: candidate,
      text: candidate,
      value: index === 0,
    })),
    confirm: { text: 'Confirm', type: 'primary' },
    cancel: { text: 'Cancel', type: 'cancel', visible: true },
  }, { timeoutMs: 10 * 60 * 1000 });

  if (!response?.confirmed) {
    throw new Error(`User cancelled variant selection for ${patchFile}`);
  }
  const payload = response.payload && typeof response.payload === 'object' ? response.payload as Record<string, unknown> : {};
  const choiceId = String(payload.choiceId ?? payload.value ?? payload.selected ?? '');
  if (candidates.includes(choiceId)) return choiceId;
  throw new Error(`Invalid variant selection for ${patchFile}`);
}

async function filterPatchVariants(
  context: IExtensionContext,
  files: string[],
  allowedExts: string[],
  requiredNames?: string[]
): Promise<string[]> {
  const requiredNameSet = requiredNames ? new Set(requiredNames) : null;
  const groups = files.reduce<Record<string, string[]>>((acc, file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return acc;
    if (requiredNameSet && !requiredNameSet.has(name)) return acc;
    acc[name] = acc[name] ? acc[name].concat(file) : [file];
    return acc;
  }, {});

  const selected = new Set<string>();
  for (const [name, candidates] of Object.entries(groups)) {
    selected.add(await chooseVariant(context, name, candidates));
  }

  return files.filter((file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return false;
    if (!requiredNameSet) return selected.has(file);
    return !requiredNameSet.has(name) || selected.has(file);
  });
}

function makePatchInstruction(file: string, patchNumber: number): { instruction: Instruction; deployment: PatchDeployment } {
  const filename = archiveBasename(file);
  const { fileStart, fileEnd } = splitPatchFilename(filename);
  const deployedFilename = buildPatchFilename({ fileStart, fileEnd }, patchNumber);
  const deployment: PatchDeployment = {
    originalArchivePath: normalizeArchivePath(file),
    originalFilename: filename,
    tempFilename: deployedFilename,
    deployedFilename,
    fileStart,
    fileEnd,
    isPatchFile: isPatchDataFile(filename),
    patchNumber,
  };
  return {
    instruction: {
      type: 'copy',
      source: file,
      destination: deployedFilename,
    },
    deployment,
  };
}

async function installPatchMulti(context: IExtensionContext, files: string[]) {
  const filtered = await filterPatchVariants(context, files, PATCH_EXTS, PATCH_FILES);
  const patchNumber = await getNextPatchNumber(context);
  const items = filtered.map((file) => makePatchInstruction(file, patchNumber));
  const instructions: Instruction[] = items.map((item) => item.instruction);
  instructions.push({
    type: 'attribute',
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment),
  });
  return { instructions, modType: PATCH_ID };
}

async function installSoundPatchMulti(context: IExtensionContext, files: string[]) {
  const filtered = await filterPatchVariants(context, files, SOUND_PATCH_EXTS);
  const patchNumber = await getNextPatchNumber(context);
  const items = filtered
    .filter((file) => !isDirectoryEntry(file))
    .map((file) => makePatchInstruction(file, patchNumber));
  const instructions: Instruction[] = items.map((item) => item.instruction);
  instructions.push({
    type: 'attribute',
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment),
  });
  return { instructions, modType: SOUND_PATCH_ID };
}

function installStream(files: string[]) {
  const modFile = files.find((file) => archiveExtname(file) === STREAM_EXT);
  if (!modFile) return { instructions: [], modType: STREAM_ID };

  const rootPath = archiveDirname(modFile);
  const instructions = files
    .filter((file) => !isDirectoryEntry(file))
    .map((file) => ({
      type: 'copy',
      source: file,
      destination: getRootRelativeDestination(file, rootPath),
    }));
  return { instructions, modType: STREAM_ID };
}

function getTargetPath(game: { gamePath?: string }, target: string): string {
  const gamePath = String(game?.gamePath || '{gamePath}').replace(/\\/g, '/').replace(/\/+$/, '');
  return `${gamePath}/${target}`;
}

function registerModType(context: IExtensionContext, typeId: string, priority: number, target: string, name: string): void {
  context.registerModType(
    typeId,
    priority,
    (gameId) => isGameId(gameId),
    (game) => getTargetPath(game, target),
    () => Promise.resolve(false),
    { name }
  );
}

function buildPatchNumberExtensions(): string[] {
  const out = ['.gpu_resources', '.stream'];
  for (let i = 0; i <= 99; i += 1) out.push(`.patch_${i}`);
  return out;
}

function basenameFromPath(filePath: string): string {
  return String(filePath || '').replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
}

function replacePathBasename(filePath: string, filename: string): string {
  return String(filePath || '').replace(/[^\\/]+$/, filename);
}

function getPatchDeployments(entry: any): PatchDeployment[] {
  return Array.isArray(entry?.metaInfo?.[PATCH_METADATA_KEY])
    ? entry.metaInfo[PATCH_METADATA_KEY] as PatchDeployment[]
    : [];
}

function hasPatchDeploymentMetadata(entry: any): boolean {
  return getPatchDeployments(entry).length > 0;
}

function isPatchDeploymentFile(deployment: PatchDeployment): boolean {
  if (deployment.isPatchFile === true) return true;
  if (deployment.isPatchFile === false) return false;
  return deployment.fileEnd === '' && parsePatchNumber(deployment.originalFilename || deployment.deployedFilename) !== null;
}

function hasMissingPatchDeployments(mutation: any): boolean {
  const entries: any[] = Array.isArray(mutation?.entries) ? mutation.entries : [];
  return entries.some((entry: any) => entry?.exists === false && hasPatchDeploymentMetadata(entry));
}

function maybeAdoptMissingPatchDeployment(mutation: any, entry: any): any | null {
  if (entry?.exists !== false) return entry;
  if (typeof mutation?.adoptDeployment !== 'function') return null;

  const candidates = (Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : []).filter((file: any) =>
    file?.managed !== true &&
    entry?.expectedHash &&
    file?.hash === entry.expectedHash
  );
  if (candidates.length !== 1) {
    mutation?.warn?.('Helldivers 2 patch normalize skipped a missing managed patch because no unique same-hash candidate was found.', {
      target: entry?.targetPath,
      candidates: candidates.length,
    });
    return null;
  }

  const candidate = candidates[0];
  mutation.adoptDeployment({
    modKey: entry.modKey,
    from: entry.targetPath,
    to: candidate.targetPath,
    expectedHash: entry.expectedHash,
  });
  return {
    ...entry,
    targetPath: candidate.targetPath,
    absolutePath: candidate.absolutePath || candidate.targetPath,
    exists: true,
  };
}

function getPatchSortNumber(entries: any[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const currentName = basenameFromPath(entry?.targetPath || entry?.absolutePath || '');
    const current = parsePatchNumber(currentName);
    if (current !== null) best = Math.min(best, current);
    for (const deployment of getPatchDeployments(entry)) {
      if (!isPatchDeploymentFile(deployment)) continue;
      if (typeof deployment.patchNumber === 'number') best = Math.min(best, deployment.patchNumber);
    }
  }
  return best;
}

function getUnmanagedPatchNumbers(mutation: any): Set<number> {
  const occupied = new Set<number>();
  const gameFiles: any[] = Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : [];
  for (const file of gameFiles) {
    if (file?.managed === true) continue;
    const number = parsePatchNumber(basenameFromPath(file?.targetPath || file?.absolutePath || ''));
    if (number !== null) occupied.add(number);
  }
  return occupied;
}

function getBlockedManagedPatchNumbers(mutation: any, normalizingModKeys: Set<string>): Set<number> {
  const occupied = new Set<number>();
  const entries: any[] = Array.isArray(mutation?.entries) ? mutation.entries : [];
  for (const entry of entries) {
    const modKey = String(entry?.modKey || '');
    if (normalizingModKeys.has(modKey)) continue;
    const number = parsePatchNumber(basenameFromPath(entry?.targetPath || entry?.absolutePath || ''));
    if (number !== null) occupied.add(number);
  }
  return occupied;
}

function samePatchShape(a: Pick<PatchDeployment, 'fileStart' | 'fileEnd'>, b: Pick<PatchDeployment, 'fileStart' | 'fileEnd'>): boolean {
  return a.fileStart.toLowerCase() === b.fileStart.toLowerCase() && a.fileEnd.toLowerCase() === b.fileEnd.toLowerCase();
}

function findPatchDeploymentForCurrentFile(deployments: PatchDeployment[], currentName: string): PatchDeployment | undefined {
  const direct = deployments.find((item) =>
    item.deployedFilename === currentName ||
    item.tempFilename === currentName ||
    item.originalFilename === currentName
  );
  if (direct) return direct;

  const currentShape = splitPatchFilename(currentName);
  return deployments.find((item) => samePatchShape(item, currentShape));
}

function updatePatchDeploymentMetadata(
  deployments: PatchDeployment[],
  deploymentToUpdate: PatchDeployment,
  deployedFilename: string,
  patchNumber: number
): PatchDeployment[] {
  return deployments.map((item) => {
    if (!samePatchShape(item, deploymentToUpdate)) return item;
    return {
      ...item,
      deployedFilename,
      patchNumber,
    };
  });
}

function normalizePatchDeployments(mutation: any): void {
  const entries: any[] = Array.isArray(mutation?.entries) ? mutation.entries : [];
  const patchEntries: any[] = entries
    .filter(hasPatchDeploymentMetadata)
    .map((entry) => maybeAdoptMissingPatchDeployment(mutation, entry))
    .filter(Boolean);

  const entriesByModKey: Record<string, any[]> = patchEntries.reduce((acc: Record<string, any[]>, entry: any) => {
    const key = String(entry.modKey || '');
    acc[key] = acc[key] ? acc[key].concat(entry) : [entry];
    return acc;
  }, {});

  const modKeys: string[] = Object.keys(entriesByModKey).sort((a, b) => {
    const diff = getPatchSortNumber(entriesByModKey[a]) - getPatchSortNumber(entriesByModKey[b]);
    return diff || a.localeCompare(b);
  });
  const assigned = new Map<string, number>();
  const normalizingModKeys = new Set(modKeys);
  const occupiedNumbers = new Set([
    ...getUnmanagedPatchNumbers(mutation),
    ...getBlockedManagedPatchNumbers(mutation, normalizingModKeys),
  ]);
  let nextNumber = 0;
  for (const modKey of modKeys) {
    while (occupiedNumbers.has(nextNumber)) nextNumber += 1;
    assigned.set(modKey, nextNumber);
    nextNumber += 1;
  }

  const moveRecords: Array<{
    modKey: string;
    from: string;
    to: string;
    deployedFilename: string;
    deployment: PatchDeployment;
    patchNumber: number;
    currentPatchNumber: number;
    expectedHash?: string;
  }> = [];
  const metadataStateByModKey = new Map<string, PatchDeployment[]>();

  for (const [modKey, modEntries] of Object.entries(entriesByModKey)) {
    const patchNumber = assigned.get(modKey);
    if (patchNumber === undefined) continue;
    const firstEntry = modEntries[0];
    const deployments = getPatchDeployments(firstEntry);
    metadataStateByModKey.set(modKey, deployments);

    for (const entry of modEntries) {
      const currentName = basenameFromPath(entry.targetPath);
      const deployment = findPatchDeploymentForCurrentFile(deployments, currentName);
      if (!deployment) continue;
      const nextFilename = buildPatchFilename(deployment, patchNumber);
      const nextTarget = replacePathBasename(entry.targetPath, nextFilename);
      if (!nextTarget || nextTarget === entry.targetPath) continue;
      moveRecords.push({
        modKey,
        from: entry.targetPath,
        to: nextTarget,
        deployedFilename: nextFilename,
        deployment,
        patchNumber,
        currentPatchNumber: parsePatchTokenNumber(currentName) ?? Number.MAX_SAFE_INTEGER,
        expectedHash: entry.expectedHash,
      });
    }
  }

  moveRecords.sort((a, b) =>
    (a.currentPatchNumber - b.currentPatchNumber) ||
    a.from.localeCompare(b.from) ||
    a.to.localeCompare(b.to)
  );
  for (const record of moveRecords) {
    console.log(`[Helldivers2PatchNormalize] move ${record.modKey}: ${record.from} -> ${record.to}`);
    mutation.moveDeployment({
      modKey: record.modKey,
      from: record.from,
      to: record.to,
      expectedHash: record.expectedHash,
    });
    const currentMetadata = metadataStateByModKey.get(record.modKey) || [];
    const nextMetadata = updatePatchDeploymentMetadata(
      currentMetadata,
      record.deployment,
      record.deployedFilename,
      record.patchNumber
    );
    metadataStateByModKey.set(record.modKey, nextMetadata);
    mutation.setModMetadata({
      modKey: record.modKey,
      patch: { [PATCH_METADATA_KEY]: nextMetadata },
    });
  }
}

function registerPatchNormalizeHooks(context: IExtensionContext): void {
  const buildOptions = (includeGameFileHashes: boolean) => ({
    includeManagedCurrentHashes: false,
    includeGameFileHashes,
    includeGameFiles: {
      directories: ['{gamePath}/data'],
      extensions: buildPatchNumberExtensions(),
    },
  });

  for (const modType of [PATCH_ID, SOUND_PATCH_ID]) {
    for (const phase of ['afterEnable', 'afterDisable', 'afterUninstall'] as const) {
      context.registerManagedDeploymentHook(phase, { modType }, async () => {
        let needsHashedAdoptPass = false;
        await context.api.vfs.runManagedDeploymentMutation(buildOptions(false), (mutation: any) => {
          if (hasMissingPatchDeployments(mutation)) {
            needsHashedAdoptPass = true;
            return;
          }
          normalizePatchDeployments(mutation);
        });

        if (!needsHashedAdoptPass) return;
        await context.api.vfs.runManagedDeploymentMutation(buildOptions(true), normalizePatchDeployments);
      });
    }
  }
}

async function main(context: IExtensionContext) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: EXECUTABLE,
    modPath: '.',
    modPathIsRelative: true,
    requiredFiles: [EXECUTABLE],
    queryPath: async () => {
      const game = await context.api.util.GameStoreHelper.findByAppId(STEAM_APP_ID);
      return game?.gamePath;
    },
    queryModPath: () => '.',
    requiresCleanup: true,
    environment: {
      SteamAPPId: String(STEAM_APP_ID),
    },
    details: {
      steamAppId: STEAM_APP_ID,
      ignoreConflicts: PATCH_FILES.map((file) => `**/${file}`),
    },
    setup: async () => {
      context.api.util.ui.notify({
        type: 'helldivers2_setup',
        display: 'toast',
        variant: 'warning',
        title: 'Special Instructions for Helldivers 2',
        content: 'Graphics patch mods are automatically renumbered by Heybox. Sound patch mods are not merged and may conflict like in Vortex.',
      });
    },
  });

  registerModType(context, PATCH_ID, 100, PATCH_PATH, PATCH_NAME);
  registerModType(context, SOUND_PATCH_ID, 90, PATCH_PATH, SOUND_PATCH_NAME);
  registerModType(context, DATA_ID, 80, DATA_PATH, DATA_NAME);
  registerModType(context, STREAM_ID, 70, STREAM_PATH, STREAM_NAME);
  registerModType(context, BINARIES_ID, 60, BINARIES_PATH, BINARIES_NAME);

  context.registerInstaller(PATCH_ID, 27, testPatch, (files) => installPatchMulti(context, files));
  context.registerInstaller(SOUND_PATCH_ID, 27, testSoundPatch, (files) => installSoundPatchMulti(context, files));
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);

  registerPatchNormalizeHooks(context);
  return true;
}

export default main;
