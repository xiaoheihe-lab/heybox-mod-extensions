import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createInterface } from 'readline';

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) throw new Error('Could not find repo root (pnpm-workspace.yaml)');
    dir = parent;
  }
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function toKebabCase(str) {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function generatePackageName(dirname) {
  const kebab = toKebabCase(dirname);
  return `@heybox-mod-extensions/${kebab}`;
}

function validateDirname(dirname) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(dirname)) {
    throw new Error(
      'dirname 必须使用 PascalCase，仅包含英文字母和数字，并以大写字母开头，例如 SlayTheSpire2'
    );
  }
}

function validateAppId(appid) {
  if (!/^[1-9]\d*$/.test(appid)) {
    throw new Error('appid 必须是正整数，例如 2868840');
  }
}

function readExtensionPackage(extensionDir) {
  const pkgPath = join(extensionDir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function listExtensionDirs(repoRoot) {
  const extensionsDir = join(repoRoot, 'extensions');
  if (!existsSync(extensionsDir)) return [];
  return readdirSync(extensionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name,
      dir: join(extensionsDir, entry.name),
    }));
}

function assertUniqueExtension(repoRoot, dirname, appid) {
  for (const extension of listExtensionDirs(repoRoot)) {
    if (extension.name.toLowerCase() === dirname.toLowerCase()) {
      throw new Error(`extensions/${extension.name} 已存在，不能重复创建 dirname`);
    }

    const pkg = readExtensionPackage(extension.dir);
    if (String(pkg?.appid ?? '') === appid) {
      throw new Error(`appid ${appid} 已被 extensions/${extension.name} 使用，不能重复创建`);
    }
  }
}

function copyTemplate(repoRoot, dirname, appid) {
  const templateDir = join(repoRoot, 'internal', 'template');
  const targetDir = join(repoRoot, 'extensions', dirname);

  mkdirSync(targetDir, { recursive: true });

  const packageName = generatePackageName(dirname);

  const files = ['index.ts', 'package.json', 'tsconfig.json'];
  for (const file of files) {
    let content = readFileSync(join(templateDir, file), 'utf-8');
    content = content.replace(/\{\{NAME\}\}/g, packageName);
    content = content.replace(/\{\{APPID\}\}/g, appid);
    writeFileSync(join(targetDir, file), content, 'utf-8');
  }
}

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dirname' && i + 1 < args.length) {
      result.dirname = args[++i];
    } else if (args[i] === '--appid' && i + 1 < args.length) {
      result.appid = args[++i];
    }
  }
  return result;
}

async function main() {
  const repoRoot = findRepoRoot(process.cwd());
  const cli = parseArgs(process.argv.slice(2));
  let dirname = cli.dirname;
  let appid = cli.appid;

  if (!dirname) {
    dirname = await prompt('请输入 extension 目录名 (e.g. MyGame): ');
  }
  if (!dirname) {
    console.error('❌ 目录名不能为空');
    process.exit(1);
  }
  validateDirname(dirname);

  if (!appid) {
    appid = await prompt('请输入 appid: ');
  }
  if (!appid) {
    console.error('❌ appid 不能为空');
    process.exit(1);
  }
  validateAppId(appid);
  assertUniqueExtension(repoRoot, dirname, appid);

  const targetDir = join(repoRoot, 'extensions', dirname);
  if (existsSync(targetDir)) {
    console.error(`❌ extensions/${dirname} 已存在`);
    process.exit(1);
  }

  copyTemplate(repoRoot, dirname, appid);

  const packageName = generatePackageName(dirname);
  console.log('');
  console.log(`✅ 扩展已创建: extensions/${dirname}/`);
  console.log(`   name:   ${packageName}`);
  console.log(`   appid:  ${appid}`);
  console.log('');
  console.log('下一步:');
  console.log(`  cd extensions/${dirname}`);
  console.log('  pnpm install');
  console.log('  # 编辑 index.ts 编写游戏扩展逻辑');
  console.log('  pnpm build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
