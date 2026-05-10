import { build } from 'esbuild';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, basename } from 'path';
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

function readExtensionName(projectDir) {
  return basename(projectDir);
}

async function buildProject(projectDir, repoRoot, { local = false } = {}) {
  const appid = readAppId(projectDir);
  const entryPoint = join(projectDir, 'index.ts');

  let outfile, label;
  if (local) {
    const extName = readExtensionName(projectDir);
    const extDistDir = join(repoRoot, 'extensions', extName, 'dist');
    mkdirSync(extDistDir, { recursive: true });
    outfile = join(extDistDir, `${appid}.js`);
    label = `extensions/${extName}/dist/${appid}.js`;
  } else {
    outfile = join(repoRoot, 'dist', `${appid}.cjs`);
    label = `dist/${appid}.cjs`;
  }

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    external: ['path'],
  });
  console.log(`[build] ${projectDir} → ${label}`);
}

async function main() {
  const args = process.argv.slice(2);
  const local = args.includes('--local');
  const arg = args.filter(a => a !== '--local')[0];
  const repoRoot = findRepoRoot(process.cwd());

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
