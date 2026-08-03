import { createRequire } from 'node:module'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const outdir = join(tmpdir(), `helldivers2-extension-test-${Date.now()}`)
const entry = fileURLToPath(new URL('./reshade.test.ts', import.meta.url))

mkdirSync(outdir, { recursive: true })
try {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: join(outdir, 'reshade.test.cjs'),
    external: ['heybox-mod-api'],
  })
  const result = spawnSync(process.execPath, ['--test', join(outdir, 'reshade.test.cjs')], { stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(outdir, { recursive: true, force: true })
}
