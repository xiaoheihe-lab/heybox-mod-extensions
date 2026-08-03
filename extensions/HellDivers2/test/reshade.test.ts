import assert from 'node:assert/strict';
import test from 'node:test';
import main from '../index';
import { GAME_ID, RESHADE_ID } from '../src/constants';
import { installReshade, testReshade } from '../src/reshade';

test('recognizes every non-FOMOD INI package for Helldivers 2', async () => {
  assert.deepEqual(await testReshade(['radical-reshade-preset-hd2.ini'], GAME_ID), {
    supported: true,
    requiredFiles: [],
  });
  assert.equal((await testReshade(['preset.ini'], 1)).supported, false);
  assert.equal((await testReshade(['reshade-shaders/Shaders/Colour.fx'], GAME_ID)).supported, false);
  assert.equal((await testReshade(['fomod/ModuleConfig.xml', 'preset.ini'], GAME_ID)).supported, false);
});

test('installs the first preset directory into bin without its wrapper directory', () => {
  const result = installReshade([
    'Wrapped/radical-reshade-preset-hd2.ini',
    'Wrapped/reshade-shaders/Shaders/RadiantGI.fx',
    'Wrapped/reshade-shaders/Textures/lut.png',
    'README.md',
  ]);

  assert.equal(result.modType, RESHADE_ID);
  assert.deepEqual(result.instructions, [
    { type: 'copy', source: 'Wrapped/radical-reshade-preset-hd2.ini', destination: 'radical-reshade-preset-hd2.ini' },
    { type: 'copy', source: 'Wrapped/reshade-shaders/Shaders/RadiantGI.fx', destination: 'reshade-shaders/Shaders/RadiantGI.fx' },
    { type: 'copy', source: 'Wrapped/reshade-shaders/Textures/lut.png', destination: 'reshade-shaders/Textures/lut.png' },
  ]);
});

test('uses only the first preset directory when an archive contains multiple presets', () => {
  const result = installReshade([
    'First/preset.ini',
    'First/reshade-shaders/Shaders/first.fx',
    'Second/other.ini',
    'Second/reshade-shaders/Shaders/second.fx',
  ]);

  assert.deepEqual(result.instructions, [
    { type: 'copy', source: 'First/preset.ini', destination: 'preset.ini' },
    { type: 'copy', source: 'First/reshade-shaders/Shaders/first.fx', destination: 'reshade-shaders/Shaders/first.fx' },
  ]);
});

test('installs only the first preset directory and its descendants', () => {
  const result = installReshade([
    'bin/ShaderToggler.addon64',
    'bin/ShaderToggler.ini',
    'Install Guide.txt',
  ]);

  assert.deepEqual(result.instructions, [
    { type: 'copy', source: 'bin/ShaderToggler.addon64', destination: 'ShaderToggler.addon64' },
    { type: 'copy', source: 'bin/ShaderToggler.ini', destination: 'ShaderToggler.ini' },
  ]);
});

test('registers ReShade after the existing Helldivers 2 installers', async () => {
  const installers: Array<{ id: string; priority: number }> = [];
  const modTypes: Array<{ id: string; priority: number; target: (game: { gamePath?: string }) => string }> = [];
  await main({
    registerGame: () => undefined,
    registerModType: (id: string, priority: number, _supported: unknown, target: (game: { gamePath?: string }) => string) => {
      modTypes.push({ id, priority, target });
    },
    registerInstaller: (id: string, priority: number) => installers.push({ id, priority }),
    registerManagedDeploymentHook: () => undefined,
    api: {},
  } as any);

  assert.deepEqual(installers.find((item) => item.id === RESHADE_ID), { id: RESHADE_ID, priority: 32 });
  assert.equal(Math.max(...installers.filter((item) => item.id !== RESHADE_ID).map((item) => item.priority)), 31);
  const reshadeType = modTypes.find((item) => item.id === RESHADE_ID);
  assert.equal(reshadeType?.target({ gamePath: 'D:/Games/Helldivers 2' }), 'D:/Games/Helldivers 2/bin');
});
