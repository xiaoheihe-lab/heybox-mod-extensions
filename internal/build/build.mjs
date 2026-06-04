import { build } from 'esbuild';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) throw new Error('Could not find repo root (pnpm-workspace.yaml)');
    dir = parent;
  }
}

function readPackageJson(projectDir) {
  const pkgPath = join(projectDir, 'package.json');
  if (!existsSync(pkgPath)) throw new Error(`No package.json found in ${projectDir}`);
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function readManifestJson(projectDir) {
  const manifestPath = join(projectDir, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`No manifest.json found in ${projectDir}`);
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function validateAppId(appid, sourcePath) {
  if (!/^[1-9]\d*$/.test(String(appid))) {
    throw new Error(`Invalid "appid" in ${sourcePath}: expected a positive integer string`);
  }
}

function validateApiVersion(apiVersion, sourcePath) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(apiVersion)) {
    throw new Error(`Invalid "api_version" from ${sourcePath}: expected an exact semver version, for example 1.6.0-alpha1`);
  }
}

function readAppId(projectDir) {
  const manifestPath = join(projectDir, 'manifest.json');
  const manifest = readManifestJson(projectDir);
  if (!manifest.appid) throw new Error(`No "appid" field in ${manifestPath}`);
  validateAppId(manifest.appid, manifestPath);
  return String(manifest.appid);
}

function readApiVersion(projectDir) {
  const manifestPath = join(projectDir, 'manifest.json');
  const pkgPath = join(projectDir, 'package.json');
  const manifest = readManifestJson(projectDir);
  const pkg = readPackageJson(projectDir);
  const apiVersion = manifest.api_version
    ?? pkg.dependencies?.['heybox-mod-api']
    ?? pkg.devDependencies?.['heybox-mod-api']
    ?? pkg.peerDependencies?.['heybox-mod-api'];

  if (typeof apiVersion !== 'string' || apiVersion.length === 0) {
    throw new Error(`No "api_version" in ${manifestPath}, and no heybox-mod-api version found in ${pkgPath}`);
  }
  validateApiVersion(apiVersion, manifest.api_version ? manifestPath : pkgPath);

  return apiVersion;
}

function readOutputManifest(projectDir) {
  const manifest = readManifestJson(projectDir);
  return {
    ...manifest,
    appid: readAppId(projectDir),
    api_version: readApiVersion(projectDir),
  };
}

function readExtensionName(projectDir) {
  return basename(projectDir);
}

function listExtensionProjects(repoRoot) {
  const extensionsDir = join(repoRoot, 'extensions');
  if (!existsSync(extensionsDir)) return [];

  return readdirSync(extensionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(extensionsDir, entry.name))
    .filter(projectDir => existsSync(join(projectDir, 'package.json')));
}

function assertUniqueAppIds(repoRoot) {
  const byAppId = new Map();

  for (const projectDir of listExtensionProjects(repoRoot)) {
    const appid = readAppId(projectDir);
    const extensionName = readExtensionName(projectDir);
    const existing = byAppId.get(appid) ?? [];
    existing.push(extensionName);
    byAppId.set(appid, existing);
  }

  const duplicates = [...byAppId.entries()]
    .filter(([, extensionNames]) => extensionNames.length > 1)
    .map(([appid, extensionNames]) => `${appid}: ${extensionNames.join(', ')}`);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate appid detected. Refusing to build:\n${duplicates.join('\n')}`);
  }
}

async function buildProject(projectDir, repoRoot, { local = false } = {}) {
  const outputManifest = readOutputManifest(projectDir);
  const rootEntryPoint = join(projectDir, 'index.ts');
  const srcEntryPoint = join(projectDir, 'src', 'index.ts');
  const entryPoint = existsSync(rootEntryPoint) ? rootEntryPoint : srcEntryPoint;
  const extName = readExtensionName(projectDir);

  if (!existsSync(entryPoint)) {
    throw new Error(`No extension entry found in ${projectDir}; expected index.ts or src/index.ts`);
  }

  let outdir, outfile, label;
  if (local) {
    outdir = join(repoRoot, 'extensions', extName, 'dist', extName);
    outfile = join(outdir, 'index.cjs');
    label = `extensions/${extName}/dist/${extName}/index.cjs`;
  } else {
    outdir = join(repoRoot, 'dist', extName);
    outfile = join(outdir, 'index.cjs');
    label = `dist/${extName}/index.cjs`;
  }
  mkdirSync(outdir, { recursive: true });

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    external: ['path'],
  });
  writeFileSync(join(outdir, 'manifest.json'), `${JSON.stringify(outputManifest, null, 2)}\n`, 'utf-8');
  console.log(`[build] ${projectDir} → ${label}`);
}

async function main() {
  const args = process.argv.slice(2);
  const local = args.includes('--local');
  const arg = args.filter(a => a !== '--local')[0];
  const repoRoot = findRepoRoot(process.cwd());
  assertUniqueAppIds(repoRoot);

  if (arg === '.') {
    await buildProject(process.cwd(), repoRoot, { local });
  } else if (arg) {
    const projectDir = join(repoRoot, 'extensions', arg);
    if (!existsSync(join(projectDir, 'package.json'))) {
      console.error(`Extension "${arg}" not found (checked: ${projectDir})`);
      process.exit(1);
    }
    await buildProject(projectDir, repoRoot, { local });
  } else if (local) {
    console.error('--local flag requires an extension name argument');
    process.exit(1);
  } else {
    const extensionsDir = join(repoRoot, 'extensions');
    if (!existsSync(extensionsDir)) {
      console.error('No extensions/ directory found');
      process.exit(1);
    }
    const entries = readdirSync(extensionsDir, { withFileTypes: true });
    let built = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectDir = join(extensionsDir, entry.name);
      if (existsSync(join(projectDir, 'package.json'))) {
        await buildProject(projectDir, repoRoot);
        built++;
      }
    }
    if (built === 0) console.log('[build] No extensions found to build');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
