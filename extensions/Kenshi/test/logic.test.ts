import assert from 'node:assert/strict'
import { GAME_ID, installKenshiMod, testKenshiMod } from '../index'

async function main() {
  assert.equal((await testKenshiMod(['CoolMod/CoolMod.mod'], GAME_ID)).supported, true)
  assert.equal((await testKenshiMod(['CoolMod/readme.txt'], GAME_ID)).supported, false)
  assert.equal((await testKenshiMod(['CoolMod/CoolMod.mod'], 294100)).supported, false)
  assert.equal((await testKenshiMod(['A/A.mod', 'B/B.mod'], GAME_ID)).supported, false)

  assert.deepEqual(installKenshiMod([
    'CoolMod/CoolMod.mod',
    'CoolMod/readme.txt',
    'CoolMod/assets/icon.png',
  ]).instructions, [
    { type: 'copy', source: 'CoolMod/CoolMod.mod', destination: 'CoolMod/CoolMod.mod' },
    { type: 'copy', source: 'CoolMod/readme.txt', destination: 'CoolMod/readme.txt' },
    { type: 'copy', source: 'CoolMod/assets/icon.png', destination: 'CoolMod/assets/icon.png' },
  ])

  assert.deepEqual(installKenshiMod([
    '123456789/RealModName.mod',
    '123456789/meshes/body.mesh',
    '123456789/textures/body.dds',
  ]).instructions, [
    { type: 'copy', source: '123456789/RealModName.mod', destination: 'RealModName/RealModName.mod' },
    { type: 'copy', source: '123456789/meshes/body.mesh', destination: 'RealModName/meshes/body.mesh' },
    { type: 'copy', source: '123456789/textures/body.dds', destination: 'RealModName/textures/body.dds' },
  ])

  assert.deepEqual(installKenshiMod([
    'Wrapper/Deep/RealModName.mod',
    'Wrapper/Deep/assets/item.png',
    'Wrapper/outside.txt',
  ]).instructions, [
    { type: 'copy', source: 'Wrapper/Deep/RealModName.mod', destination: 'RealModName/RealModName.mod' },
    { type: 'copy', source: 'Wrapper/Deep/assets/item.png', destination: 'RealModName/assets/item.png' },
  ])

  assert.deepEqual(installKenshiMod([
    'Bad:Name/Bad:Name.mod',
  ]).instructions, [
    { type: 'copy', source: 'Bad:Name/Bad:Name.mod', destination: 'Bad_Name/Bad:Name.mod' },
  ])

  assert.throws(() => installKenshiMod(['A/A.mod', 'B/B.mod']), /multiple \.mod files/)
}

void main()
