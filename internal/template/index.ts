import type { IExtensionContext } from 'heybox-mod-api';

const GAME_ID = Number('{{APPID}}');
const EXECUTABLE = '';
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = 'Mod';
const MOD_PATH = 'mods';
const MOD_TYPE_PRIORITY = 100;

interface GameSpec {
  id: number;
}

const spec = {
  game: {
    id: GAME_ID,
    executable: EXECUTABLE,
    modPath: MOD_PATH,
    requiredFiles: [],
  },
  modType: {
    id: MOD_ID,
    name: MOD_NAME,
    priority: MOD_TYPE_PRIORITY,
    targetPath: `{gamePath}/${MOD_PATH}`,
  },
};

async function basicTester() {
  return true;
}

async function basicInstaller() {
  return {
    instructions: [],
  };
}

async function applyGame(context: IExtensionContext, gameSpec: { game: GameSpec }) {
  // registerGame(context, gameSpec);
  // registerModType(context, '', '', '', '', '');
  // registerInstaller(context, '', basicTester, basicInstaller);
}

async function main(context: IExtensionContext) {
  await applyGame(context, spec);
  return true;
}

export default main;
