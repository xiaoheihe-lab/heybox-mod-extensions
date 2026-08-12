import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getManifestOptionFileGroups } from '../src/manifest-options';
import { installSoundPatchMulti } from '../src/patch';

function createContext(onRequest?: (request: unknown) => unknown) {
  return {
    api: {
      util: {
        GameStoreHelper: {
          findByAppId: async () => undefined,
        },
        fs: {},
        path: { join },
        ui: {
          request: async (request: unknown) => onRequest?.(request),
        },
      },
    },
  } as any;
}

test('ignores a metadata-only manifest and continues normal patch installation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'helldivers2-manifest-test-'));
  const manifestPath = join(directory, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({
    Guid: 'ced1e9ef-75b3-4153-8b84-50e57e5aaa97',
    Name: 'Ultimatum 3D Reticle',
    Description: 'This is a mod that displays the projectile trajectory of the Ultimatum.',
    IconPath: 'icon.jpg',
  }));

  let requestCount = 0;
  try {
    const result = await installSoundPatchMulti(createContext(() => {
      requestCount += 1;
      throw new Error('metadata-only manifests must not request install options');
    }), [
      'Ultimatum/manifest.json',
      'Ultimatum/reticle.patch_0',
    ], {
      sourcePathByFile: { 'Ultimatum/manifest.json': manifestPath },
    });

    assert.equal(requestCount, 0);
    assert.deepEqual(result.instructions[0], {
      type: 'copy',
      source: 'Ultimatum/reticle.patch_0',
      destination: 'reticle.patch_0',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('ignores a manifest whose Options array is empty', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'helldivers2-manifest-test-'));
  const manifestPath = join(directory, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({ Guid: 'test-guid', Options: [] }));

  try {
    const result = await getManifestOptionFileGroups(createContext(() => {
      throw new Error('empty Options must not request install options');
    }), ['manifest.json'], {
      sourcePathByFile: { 'manifest.json': manifestPath },
    });

    assert.equal(result, null);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('requests install options only for a manifest with Guid and non-empty Options', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'helldivers2-manifest-test-'));
  const manifestPath = join(directory, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({
    Guid: 'test-guid',
    Name: 'Selectable mod',
    Options: [{ Name: 'Variant A', Include: 'VariantA' }],
  }));

  let requestCount = 0;
  try {
    const result = await getManifestOptionFileGroups(createContext(() => {
      requestCount += 1;
      return { confirmed: true, payload: { choiceIds: ['option:0'] } };
    }), [
      'Package/manifest.json',
      'Package/VariantA/reticle.patch_0',
    ], {
      sourcePathByFile: { 'Package/manifest.json': manifestPath },
    });

    assert.equal(requestCount, 1);
    assert.deepEqual(result, [['Package/VariantA/reticle.patch_0']]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
