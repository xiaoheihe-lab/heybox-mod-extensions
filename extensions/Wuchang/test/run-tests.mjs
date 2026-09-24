import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const output = mkdtempSync(join(tmpdir(), 'wuchang-test-'))
try {
  const outfile = join(output, 'tests.cjs')
  await build({ entryPoints: [fileURLToPath(new URL('./logic.test.ts', import.meta.url))], bundle: true, platform: 'node', format: 'cjs', outfile })
  await import(pathToFileURL(outfile).href)
} finally { rmSync(output, { recursive: true, force: true }) }
