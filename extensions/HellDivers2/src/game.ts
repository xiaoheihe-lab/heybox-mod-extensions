import type { IExtensionContext } from 'heybox-mod-api';
import { GAME_ID } from './constants';
import { pathParts } from './archive-utils';

export function isGameId(gameId: number | string): boolean {
  return Number(gameId) === GAME_ID || String(gameId).toLowerCase() === 'helldivers2';
}

export function hasFomodInstaller(files: string[]): boolean {
  return files.some((file) => {
    const parts = pathParts(file).map((part) => part.toLowerCase());
    return parts.length >= 2 && parts[parts.length - 1] === 'moduleconfig.xml' && parts[parts.length - 2] === 'fomod';
  });
}

export function testerResult(supported: boolean) {
  return Promise.resolve({ supported, requiredFiles: [] });
}

export function getTargetPath(game: { gamePath?: string }, target: string): string {
  const gamePath = String(game?.gamePath || '{gamePath}').replace(/\\/g, '/').replace(/\/+$/, '');
  return `${gamePath}/${target}`;
}

export function registerModType(context: IExtensionContext, typeId: string, priority: number, target: string, name: string): void {
  context.registerModType(
    typeId,
    priority,
    (gameId) => isGameId(gameId),
    (game) => getTargetPath(game, target),
    () => Promise.resolve(false),
    { name }
  );
}
