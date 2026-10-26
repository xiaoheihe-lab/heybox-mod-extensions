import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const temporary = mkdtempSync(join(tmpdir(), 'x4-tests-'))
try {
  const outfile = join(temporary, 'logic.test.cjs')
  await build({
    entryPoints: [fileURLToPath(new URL('./logic.test.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', outfile,
    external: ['heybox-mod-api'],
  })
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
