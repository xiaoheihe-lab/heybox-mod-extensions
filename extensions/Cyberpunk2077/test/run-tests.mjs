import { createRequire } from 'node:module'
import { readdirSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')

const testRoot = fileURLToPath(new URL('.', import.meta.url))
const outdir = join(tmpdir(), `cyberpunk2077-extension-test-${Date.now()}`)
mkdirSync(outdir, { recursive: true })

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name)
      return entry.isDirectory() ? findTests(fullPath) : [fullPath]
    })
    .filter((file) => file.endsWith('.test.ts'))
    .sort()
}

let testExitCode = 0
try {
  const testFiles = findTests(testRoot)
  if (testFiles.length === 0) throw new Error('No Cyberpunk 2077 test files were found.')

  await build({
    entryPoints: testFiles,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir,
    outbase: testRoot,
    entryNames: '[dir]/[name]',
    outExtension: { '.js': '.cjs' },
    external: ['heybox-mod-api'],
  })

  const compiledTests = testFiles.map((file) => resolve(
    outdir,
    relative(testRoot, file).slice(0, -extname(file).length) + '.cjs',
  ))
  const result = spawnSync(process.execPath, ['--test', ...compiledTests], { stdio: 'inherit' })
  if (result.error) throw result.error
  testExitCode = result.status ?? 1
} finally {
  rmSync(outdir, { recursive: true, force: true })
}

process.exitCode = testExitCode
