// @ts-nocheck
import type { IExtensionContext } from 'heybox-mod-api';

const fs = require('fs');
const path = require('path');

const GAME_ID = 3709430;
const GAME_NAME = "Witch's Apocalyptic Journey";
const EXECUTABLE = "Witch's Apocalyptic Journey.exe";
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = 'Mod';
const MOD_PATH = path.join("Witch's Apocalyptic Journey_Data", 'Mods');
const MOD_TYPE_PRIORITY = 100;
const INSTALLER_PRIORITY = 100;
const MOD_CONFIG_FILE = 'modconfig.json';

type FileEntry = {
  source: string;
  normalized: string;
  segments: string[];
};

type ModRootInfo = {
  config: FileEntry;
  rootSegments: string[];
};

function normalizeArchivePath(file: string): string | null {
  const normalized = String(file || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .trim();

  if (!normalized || normalized.endsWith('/')) return null;
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null;

  const segments = normalized.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return null;

  return segments.join('/');
}

function normalizeFiles(files: string[]): FileEntry[] {
  return files
    .map(file => {
      const normalized = normalizeArchivePath(file);
      if (!normalized) return null;
      return {
        source: normalized,
        normalized,
        segments: normalized.split('/'),
      };
    })
    .filter(Boolean);
}

function isModConfig(entry: FileEntry): boolean {
  return entry.segments[entry.segments.length - 1]?.toLowerCase() === MOD_CONFIG_FILE;
}

function findModRoot(files: string[]): ModRootInfo | null {
  const config = normalizeFiles(files).find(isModConfig);
  if (!config) return null;

  return {
    config,
    rootSegments: config.segments.slice(0, -1),
  };
}

function readModName(stagingPath: string, configPath: string): string {
  if (!stagingPath || typeof stagingPath !== 'string') {
    throw new Error('WitchsApocalypticJourney installer requires stagingPath to read ModConfig.json');
  }

  const configFullPath = path.join(stagingPath, configPath);
  const config = JSON.parse(fs.readFileSync(configFullPath, 'utf8'));
  if (typeof config?.ModName !== 'string' || !config.ModName.trim()) {
    throw new Error('ModConfig.json must contain a non-empty ModName field');
  }
  const modName = config.ModName.trim();
  if (/[<>:"/\\|?*\x00-\x1F]/.test(modName) || /[. ]$/.test(modName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(modName)) {
    throw new Error(`ModConfig.json ModName is not a valid Windows folder name: ${modName}`);
  }
  return modName;
}

function getRelativeToModRoot(entry: FileEntry, rootSegments: string[]): string[] | null {
  if (entry.segments.length <= rootSegments.length) return null;

  for (let i = 0; i < rootSegments.length; i++) {
    if (entry.segments[i] !== rootSegments[i]) return null;
  }

  return entry.segments.slice(rootSegments.length);
}

async function findGame(context: IExtensionContext): Promise<string | undefined> {
  const game = await context.api.util.GameStoreHelper.findByAppId(GAME_ID);
  return game?.gamePath;
}

function testMod(files: string[], gameId: number | string) {
  return {
    supported: Number(gameId) === GAME_ID && !!findModRoot(files),
  };
}

function installMod(files: string[], stagingPath: string) {
  const modRoot = findModRoot(files);
  if (!modRoot) {
    return { modTypeId: MOD_ID, instructions: [] };
  }

  const modName = readModName(stagingPath, modRoot.config.source);
  const instructions = normalizeFiles(files)
    .map(entry => {
      const relativeSegments = getRelativeToModRoot(entry, modRoot.rootSegments);
      if (!relativeSegments) return null;
      return {
        type: 'copy',
        source: entry.source,
        destination: path.join(modName, ...relativeSegments),
      };
    })
    .filter(Boolean);

  return {
    modTypeId: MOD_ID,
    instructions,
  };
}

async function main(context: IExtensionContext) {
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME,
    executable: () => EXECUTABLE,
    queryPath: () => findGame(context),
    modPath: MOD_PATH,
    modPathIsRelative: true,
    requiredFiles: [],
  });

  context.registerModType(
    MOD_ID,
    MOD_TYPE_PRIORITY,
    (gameId: number | string) => Number(gameId) === GAME_ID,
    () => `{gamePath}/${MOD_PATH}`,
    () => Promise.resolve(false),
    { name: MOD_NAME }
  );

  context.registerInstaller(MOD_ID, INSTALLER_PRIORITY, testMod, installMod);
}

export default main;
