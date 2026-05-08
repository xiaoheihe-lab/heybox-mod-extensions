import { build } from 'esbuild';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) throw new Error('Could not find repo root (pnpm-workspace.yaml)');
    dir = parent;
  }
}

function readAppId(projectDir) {
  const pkgPath = join(projectDir, 'package.json');
  if (!existsSync(pkgPath)) throw new Error(`No package.json found in ${projectDir}`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  if (!pkg.appid) throw new Error(`No "appid" field in ${pkgPath}`);
  return pkg.appid;
}

async function buildProject(projectDir, repoRoot) {
  const appid = readAppId(projectDir);
  const entryPoint = join(projectDir, 'index.ts');
  const outfile = join(repoRoot, 'dist', `${appid}.cjs`);

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    external: ['path'],
  });
  console.log(`[build] ${projectDir} → dist/${appid}.cjs`);
}

async function main() {
  const arg = process.argv[2];
  const repoRoot = findRepoRoot(process.cwd());

  if (arg === '.') {
    await buildProject(process.cwd(), repoRoot);
  } else if (arg) {
    const projectDir = join(repoRoot, 'extensions', arg);
    if (!existsSync(join(projectDir, 'package.json'))) {
      console.error(`Extension "${arg}" not found (checked: ${projectDir})`);
      process.exit(1);
    }
    await buildProject(projectDir, repoRoot);
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
