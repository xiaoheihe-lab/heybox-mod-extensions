import type { IExtensionContext } from 'heybox-mod-api';
import {
  INSTALL_CANCELLED_MESSAGE,
  PATCH_EXTS,
  PATCH_FILE_RE,
  PATCH_FILE_STEMS,
  PATCH_FILES,
  PATCH_ID,
  PATCH_METADATA_KEY,
  PATCH_PATH,
  PATCH_TOKEN_RE,
  SOUND_PATCH_EXTS,
  SOUND_PATCH_ID,
  STEAM_APP_ID,
} from './constants';
import {
  archiveBasename,
  archiveExtname,
  basenameFromPath,
  isDirectoryEntry,
  normalizeArchivePath,
  replacePathBasename,
} from './archive-utils';
import { hasFomodInstaller, isGameId, testerResult } from './game';
import { getManifestOptionFileGroups } from './manifest-options';
import type { InstallOptions, Instruction, PatchDeployment } from './types';

export function parsePatchNumber(filename: string): number | null {
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

export function isPatchDataFile(file: string): boolean {
  return parsePatchNumber(file) !== null;
}

function getPatchFileStem(file: string): string | null {
  const match = archiveBasename(file).match(/^(.+)\.patch_\d+$/i);
  return match ? match[1].toLowerCase() : null;
}

function isGraphicsPatchStem(stem: string | null): boolean {
  return stem !== null && PATCH_FILE_STEMS.includes(stem);
}

function hasGraphicsPatchSidecarFile(files: string[]): boolean {
  return files.some((file) => {
    const name = archiveBasename(file).toLowerCase();
    return PATCH_FILE_STEMS.some((stem) => new RegExp(`^${stem}\\.patch_\\d+\\.(gpu_resources|stream)$`, 'i').test(name));
  });
}

function hasGraphicsPatchFile(files: string[]): boolean {
  return hasGraphicsPatchSidecarFile(files) && files.some((file) => isGraphicsPatchStem(getPatchFileStem(file)));
}

function isPatchSidecarFile(file: string, allowedExts: string[]): boolean {
  const name = archiveBasename(file);
  return allowedExts.includes(archiveExtname(file)) && PATCH_TOKEN_RE.test(name);
}

function isPatchManagedFile(file: string, allowedExts: string[]): boolean {
  return isPatchDataFile(file) || isPatchSidecarFile(file, allowedExts);
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

function normalizePatchGroup(input: string): string {
  return String(input || '').toLowerCase();
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

async function readOccupiedPatchNumbers(context: IExtensionContext, fileStart: string): Promise<Set<number>> {
  const gamePath = await findGamePath(context);
  const occupied = new Set<number>();
  if (!gamePath) return occupied;

  const dataPath = context.api.util.path.join(gamePath, PATCH_PATH);
  let entries: string[] = [];
  try {
    entries = await context.api.util.fs.readdir(dataPath);
  } catch {
    return occupied;
  }

  const expectedGroup = normalizePatchGroup(fileStart);
  for (const entry of entries) {
    const number = parsePatchNumber(entry);
    if (number === null) continue;
    const currentGroup = normalizePatchGroup(splitPatchFilename(entry).fileStart);
    if (currentGroup !== expectedGroup) continue;
    const fullPath = context.api.util.path.join(dataPath, entry);
    if (!await isFile(context, fullPath)) continue;
    occupied.add(number);
  }

  return occupied;
}

class PatchNumberAllocator {
  private readonly occupiedByGroup = new Map<string, Set<number>>();

  constructor(private readonly context: IExtensionContext) {}

  async allocate(fileStart: string): Promise<number> {
    const group = normalizePatchGroup(fileStart);
    if (!this.occupiedByGroup.has(group)) {
      this.occupiedByGroup.set(group, await readOccupiedPatchNumbers(this.context, fileStart));
    }
    const occupied = this.occupiedByGroup.get(group) || new Set<number>();
    let nextNumber = 0;
    while (occupied.has(nextNumber)) nextNumber += 1;
    occupied.add(nextNumber);
    this.occupiedByGroup.set(group, occupied);
    return nextNumber;
  }
}

export function testPatch(files: string[], gameId: number | string) {
  return testerResult(isGameId(gameId) && hasGraphicsPatchFile(files));
}

export function testSoundPatch(files: string[], gameId: number | string) {
  const supported = isGameId(gameId) && !hasFomodInstaller(files) && files.some((file) => isPatchDataFile(file));
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
    title: '选择安装内容',
    content: '此mod包含多个内容，请选择要安装的内容',
    choices: candidates.map((candidate, index) => ({
      id: candidate,
      text: candidate,
      value: index === 0,
    })),
    confirm: { text: '确定', type: 'primary' },
    cancel: { text: '取消', type: 'cancel', visible: true },
  }, { timeoutMs: 10 * 60 * 1000 });

  if (!response?.confirmed) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
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

function selectPatchManagedFiles(files: string[], allowedExts: string[], requiredNames?: string[]): string[] {
  const requiredNameSet = requiredNames ? new Set(requiredNames) : null;
  return files.filter((file) => {
    const name = archiveBasename(file);
    if (!isPatchManagedFile(file, allowedExts)) return false;
    return !requiredNameSet || requiredNameSet.has(name);
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

async function makePatchItems(
  context: IExtensionContext,
  files: string[],
  allocator = new PatchNumberAllocator(context)
): Promise<Array<{ instruction: Instruction; deployment: PatchDeployment }>> {
  const patchNumbers = new Map<string, number>();
  const items: Array<{ instruction: Instruction; deployment: PatchDeployment }> = [];
  for (const file of files) {
    const filename = archiveBasename(file);
    const { fileStart } = splitPatchFilename(filename);
    const group = normalizePatchGroup(fileStart);
    if (!patchNumbers.has(group)) {
      patchNumbers.set(group, await allocator.allocate(fileStart));
    }
    items.push(makePatchInstruction(file, patchNumbers.get(group) || 0));
  }
  return items;
}

async function makePatchItemsFromGroups(
  context: IExtensionContext,
  groups: string[][],
  allowedExts: string[],
  requiredNames?: string[]
): Promise<Array<{ instruction: Instruction; deployment: PatchDeployment }>> {
  const allocator = new PatchNumberAllocator(context);
  const allItems: Array<{ instruction: Instruction; deployment: PatchDeployment }> = [];
  for (const group of groups) {
    const selected = selectPatchManagedFiles(group, allowedExts, requiredNames);
    const items = await makePatchItems(context, selected, allocator);
    allItems.push(...items);
  }
  return allItems;
}

export async function installPatchMulti(context: IExtensionContext, files: string[], options?: InstallOptions) {
  const optionGroups = await getManifestOptionFileGroups(context, files, options);
  const items = optionGroups
    ? await makePatchItemsFromGroups(context, optionGroups, PATCH_EXTS, PATCH_FILES)
    : await makePatchItems(context, await filterPatchVariants(context, files, PATCH_EXTS, PATCH_FILES));
  const instructions: Instruction[] = items.map((item) => item.instruction);
  instructions.push({
    type: 'attribute',
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment),
  });
  return { instructions, modType: PATCH_ID };
}

export async function installSoundPatchMulti(context: IExtensionContext, files: string[], options?: InstallOptions) {
  const optionGroups = await getManifestOptionFileGroups(context, files, options);
  const items = optionGroups
    ? await makePatchItemsFromGroups(context, optionGroups, SOUND_PATCH_EXTS)
    : await makePatchItems(context, (await filterPatchVariants(context, files, SOUND_PATCH_EXTS)).filter((file) => !isDirectoryEntry(file)));
  const instructions: Instruction[] = items.map((item) => item.instruction);
  instructions.push({
    type: 'attribute',
    key: PATCH_METADATA_KEY,
    value: items.map((item) => item.deployment),
  });
  return { instructions, modType: SOUND_PATCH_ID };
}

function buildPatchNumberExtensions(): string[] {
  const out = ['.gpu_resources', '.stream'];
  for (let i = 0; i <= 99; i += 1) out.push(`.patch_${i}`);
  return out;
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

function getPatchSortNumber(entries: any[], group: string): number {
  let best = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const currentName = basenameFromPath(entry?.targetPath || entry?.absolutePath || '');
    const currentShape = splitPatchFilename(currentName);
    if (normalizePatchGroup(currentShape.fileStart) !== group) continue;
    const current = parsePatchNumber(currentName);
    if (current !== null) best = Math.min(best, current);
    for (const deployment of getPatchDeployments(entry)) {
      if (!isPatchDeploymentFile(deployment)) continue;
      if (normalizePatchGroup(deployment.fileStart) !== group) continue;
      if (typeof deployment.patchNumber === 'number') best = Math.min(best, deployment.patchNumber);
    }
  }
  return best;
}

function getUnmanagedPatchNumbers(mutation: any, group: string): Set<number> {
  const occupied = new Set<number>();
  const gameFiles: any[] = Array.isArray(mutation?.gameFiles) ? mutation.gameFiles : [];
  for (const file of gameFiles) {
    if (file?.managed === true) continue;
    const name = basenameFromPath(file?.targetPath || file?.absolutePath || '');
    const number = parsePatchNumber(name);
    if (number === null) continue;
    if (normalizePatchGroup(splitPatchFilename(name).fileStart) !== group) continue;
    occupied.add(number);
  }
  return occupied;
}

function getBlockedManagedPatchNumbers(mutation: any, normalizingModKeys: Set<string>, group: string): Set<number> {
  const occupied = new Set<number>();
  const entries: any[] = Array.isArray(mutation?.entries) ? mutation.entries : [];
  for (const entry of entries) {
    const modKey = String(entry?.modKey || '');
    if (normalizingModKeys.has(modKey)) continue;
    const name = basenameFromPath(entry?.targetPath || entry?.absolutePath || '');
    const number = parsePatchNumber(name);
    if (number === null) continue;
    if (normalizePatchGroup(splitPatchFilename(name).fileStart) !== group) continue;
    occupied.add(number);
  }
  return occupied;
}

function samePatchShape(a: Pick<PatchDeployment, 'fileStart' | 'fileEnd'>, b: Pick<PatchDeployment, 'fileStart' | 'fileEnd'>): boolean {
  return normalizePatchGroup(a.fileStart) === normalizePatchGroup(b.fileStart) && a.fileEnd.toLowerCase() === b.fileEnd.toLowerCase();
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
  const recordsByGroup: Record<string, Array<{
    entry: any;
    modKey: string;
    deployment: PatchDeployment;
    currentName: string;
    currentPatchNumber: number;
  }>> = {};

  for (const entry of patchEntries) {
    const modKey = String(entry.modKey || '');
    const deployments = getPatchDeployments(entry);
    if (!metadataStateByModKey.has(modKey)) metadataStateByModKey.set(modKey, deployments);
    const currentName = basenameFromPath(entry.targetPath);
    const deployment = findPatchDeploymentForCurrentFile(deployments, currentName);
    if (!deployment) continue;
    const group = normalizePatchGroup(deployment.fileStart);
    if (!group) continue;
    const record = {
      entry,
      modKey,
      deployment,
      currentName,
      currentPatchNumber: parsePatchTokenNumber(currentName) ?? Number.MAX_SAFE_INTEGER,
    };
    recordsByGroup[group] = recordsByGroup[group] ? recordsByGroup[group].concat(record) : [record];
  }

  for (const [group, groupRecords] of Object.entries(recordsByGroup)) {
    const entriesByModKey: Record<string, any[]> = groupRecords.reduce((acc: Record<string, any[]>, record) => {
      acc[record.modKey] = acc[record.modKey] ? acc[record.modKey].concat(record.entry) : [record.entry];
      return acc;
    }, {});
    const modKeys: string[] = Object.keys(entriesByModKey).sort((a, b) => {
      const diff = getPatchSortNumber(entriesByModKey[a], group) - getPatchSortNumber(entriesByModKey[b], group);
      return diff || a.localeCompare(b);
    });
    const normalizingModKeys = new Set(modKeys);
    const occupiedNumbers = new Set([
      ...getUnmanagedPatchNumbers(mutation, group),
      ...getBlockedManagedPatchNumbers(mutation, normalizingModKeys, group),
    ]);
    const assigned = new Map<string, number>();
    let nextNumber = 0;
    for (const modKey of modKeys) {
      while (occupiedNumbers.has(nextNumber)) nextNumber += 1;
      assigned.set(modKey, nextNumber);
      nextNumber += 1;
    }

    for (const record of groupRecords) {
      const patchNumber = assigned.get(record.modKey);
      if (patchNumber === undefined) continue;
      const nextFilename = buildPatchFilename(record.deployment, patchNumber);
      const nextTarget = replacePathBasename(record.entry.targetPath, nextFilename);
      if (!nextTarget || nextTarget === record.entry.targetPath) continue;
      moveRecords.push({
        modKey: record.modKey,
        from: record.entry.targetPath,
        to: nextTarget,
        deployedFilename: nextFilename,
        deployment: record.deployment,
        patchNumber,
        currentPatchNumber: record.currentPatchNumber,
        expectedHash: record.entry.expectedHash,
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

export function registerPatchNormalizeHooks(context: IExtensionContext): void {
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
