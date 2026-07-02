import type { IExtensionContext } from 'heybox-mod-api';
import { formatJSONPlainText } from '@heybox-mod-extensions/shared-utils/json';
import { INSTALL_CANCELLED_MESSAGE } from './constants';
import {
  archiveBasename,
  archiveDirname,
  archiveJoin,
  isDirectoryEntry,
  normalizeArchivePath,
  pathParts,
  uniqueFiles,
} from './archive-utils';
import type {
  InstallOptions,
  ManifestFile,
  ManifestOption,
  ManifestReadResult,
  ManifestSelectionPayload,
} from './types';

declare const require: (id: string) => any;

const nodeFs = require('fs');

export function findManifestFiles(files: string[], options?: InstallOptions): string[] {
  return uniqueFiles(files.concat(Object.keys(options?.sourcePathByFile || {})))
    .filter((file) => archiveBasename(file).toLowerCase() === 'manifest.json')
    .sort((a, b) => pathParts(a).length - pathParts(b).length || normalizeArchivePath(a).localeCompare(normalizeArchivePath(b)));
}

function findSourcePath(options: InstallOptions | undefined, archivePath: string): string {
  const sourcePathByFile = options?.sourcePathByFile || {};
  if (sourcePathByFile[archivePath]) return String(sourcePathByFile[archivePath]);
  const normalized = normalizeArchivePath(archivePath).toLowerCase();
  const match = Object.entries(sourcePathByFile).find(([key]) => normalizeArchivePath(key).toLowerCase() === normalized);
  return match ? String(match[1]) : '';
}

async function readManifestFile(context: IExtensionContext, files: string[], options?: InstallOptions): Promise<ManifestReadResult | null> {
  for (const manifestArchivePath of findManifestFiles(files, options)) {
    console.log('mainfest archivePath', manifestArchivePath);
    const sourcePath = findSourcePath(options, manifestArchivePath)
      || (options?.stagingPath ? context.api.util.path.join(options.stagingPath, manifestArchivePath) : '');
    console.log('mainfest sourcePath', sourcePath);
    if (!sourcePath) continue;

    try {
      const text = await nodeFs.promises.readFile(sourcePath, 'utf8');
      const normalizedText = formatJSONPlainText(text);
      console.log('mainfest text compact', normalizedText.replace(/\s+/g, ' ').trim());
      const manifest = JSON.parse(normalizedText) as ManifestFile;
      console.log('mainfest manifest', manifest);
      const guid = String(manifest?.Guid || '').trim();
      if (!guid || !Array.isArray(manifest?.Options)) continue;
      console.log('mainfest guid', guid);
      return {
        manifest,
        rootPath: archiveDirname(manifestArchivePath),
        archivePath: normalizeArchivePath(manifestArchivePath),
      };
    } catch (error) {
      console.warn('[Helldivers2ManifestOptions] failed to read manifest.json', manifestArchivePath, error);
    }
  }
  return null;
}

function getOptionName(option: ManifestOption, fallback: string): string {
  return String(option?.Name || fallback);
}

function buildManifestOptionChoices(manifest: ManifestFile): any[] {
  const options = Array.isArray(manifest.Options) ? manifest.Options : [];
  const choices: any[] = [];
  options.forEach((option, optionIndex) => {
    const optionId = `option:${optionIndex}`;
    const subOptions = Array.isArray(option.SubOptions) ? option.SubOptions.filter(Boolean) : [];
    if (subOptions.length > 0) {
      choices.push({
        id: optionId,
        text: getOptionName(option, `Option ${optionIndex + 1}`),
        description: String(option.Description || ''),
        disabled: true,
        level: 0,
        selectMode: 'none',
      });
      subOptions.forEach((subOption, subIndex) => {
        choices.push({
          id: `${optionId}:sub:${subIndex}`,
          text: getOptionName(subOption, `Sub Option ${subIndex + 1}`),
          description: String(subOption.Description || ''),
          level: 1,
          selectMode: 'radio',
          groupId: optionId,
          payload: {
            kind: 'suboption',
            option,
            subOption,
          } satisfies ManifestSelectionPayload,
        });
      });
      return;
    }

    choices.push({
      id: optionId,
      text: getOptionName(option, `Option ${optionIndex + 1}`),
      description: String(option.Description || ''),
      level: 0,
      selectMode: 'checkbox',
      payload: {
        kind: 'option',
        option,
      } satisfies ManifestSelectionPayload,
    });
  });
  return choices;
}

function logManifestOptions(manifestResult: ManifestReadResult, choices: any[]): void {
  console.log('[Helldivers2ManifestOptions] manifest', {
    archivePath: manifestResult.archivePath,
    rootPath: manifestResult.rootPath,
    guid: manifestResult.manifest.Guid,
    name: manifestResult.manifest.Name,
    description: manifestResult.manifest.Description,
    options: manifestResult.manifest.Options,
  });
  console.log('[Helldivers2ManifestOptions] generated choices', choices);
}

function getManifestSelectionPayloads(responsePayload: unknown, choices: any[]): ManifestSelectionPayload[] {
  const payload = responsePayload && typeof responsePayload === 'object' ? responsePayload as Record<string, unknown> : {};
  const returnedChoices = Array.isArray(payload.choices) ? payload.choices : [];
  const fromReturned = returnedChoices.filter((item): item is ManifestSelectionPayload =>
    !!item && typeof item === 'object' && ['option', 'suboption'].includes(String((item as any).kind || ''))
  );
  if (fromReturned.length > 0) return fromReturned;

  const choiceIds = Array.isArray(payload.choiceIds)
    ? payload.choiceIds.map((id) => String(id || ''))
    : [String(payload.choiceId || payload.value || payload.selected || '')];
  const byId = new Map(choices.map((choice) => [choice.id, choice.payload]));
  return choiceIds
    .map((id) => byId.get(id))
    .filter((item): item is ManifestSelectionPayload =>
      !!item && typeof item === 'object' && ['option', 'suboption'].includes(String((item as any).kind || ''))
    );
}

function coerceIncludePaths(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return values.map((item) => normalizeArchivePath(String(item || ''))).filter(Boolean);
}

function filesUnderInclude(files: string[], includePath: string, manifestRootPath: string): string[] {
  const include = archiveJoin(manifestRootPath, includePath).replace(/\/+$/, '');
  if (!include) return [];
  return files.filter((file) => {
    const normalized = normalizeArchivePath(file);
    return !isDirectoryEntry(file) && normalized.startsWith(`${include}/`);
  });
}

export async function getManifestOptionFileGroups(
  context: IExtensionContext,
  files: string[],
  options?: InstallOptions
): Promise<string[][] | null> {
  const manifestCandidates = findManifestFiles(files, options);
  if (manifestCandidates.length === 0) return null;

  const manifestResult = await readManifestFile(context, files, options);
  if (!manifestResult) {
    console.warn('[Helldivers2ManifestOptions] manifest candidates found but no valid option manifest', {
      manifestCandidates,
      hasSourcePathByFile: !!options?.sourcePathByFile,
      stagingPath: options?.stagingPath || '',
      sourcePathKeys: Object.keys(options?.sourcePathByFile || {}),
    });
    throw new Error('读取安装选项失败');
  }
  const { manifest, rootPath } = manifestResult;

  const choices = buildManifestOptionChoices(manifest);
  logManifestOptions(manifestResult, choices);
  if (choices.length === 0) {
    throw new Error('读取安装选项失败');
  }

  const response = await context.api.util.ui.request({
    type: 'helldivers2_manifest_options',
    title: String(manifest.Name || '选择安装内容'),
    content: '此mod包含多个内容，请选择要安装的内容',
    choiceMode: 'multiple',
    choices,
    confirm: { text: '安装选中内容', type: 'primary' },
    cancel: { text: '取消', type: 'cancel', visible: true },
  } as any, { timeoutMs: 10 * 60 * 1000 });

  if (!response?.confirmed) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
  }

  const selections = getManifestSelectionPayloads(response.payload, choices);
  if (selections.length === 0) {
    throw new Error(INSTALL_CANCELLED_MESSAGE);
  }

  const groups = selections
    .flatMap((selection) => {
      const subOptionIncludes = selection.kind === 'suboption' ? coerceIncludePaths(selection.subOption.Include) : [];
      const includePaths = selection.kind === 'suboption' && subOptionIncludes.length > 0
        ? subOptionIncludes
        : coerceIncludePaths(selection.option.Include);
      return includePaths.map((includePath) => uniqueFiles(filesUnderInclude(files, includePath, rootPath)));
    })
    .filter((group) => group.length > 0);
  if (groups.length === 0) {
    throw new Error('Selected Helldivers 2 manifest options did not include any installable files');
  }
  return groups;
}
