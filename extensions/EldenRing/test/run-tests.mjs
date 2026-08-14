import { createRequire } from 'node:module'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')

const outdir = join(tmpdir(), `elden-ring-extension-test-${Date.now()}`)
mkdirSync(outdir, { recursive: true })

try {
  const outfile = join(outdir, 'logic.test.cjs')
  await build({
    entryPoints: [fileURLToPath(new URL('./logic.test.ts', import.meta.url))],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    external: ['heybox-mod-api'],
  })
  await import(pathToFileURL(outfile).href)
} finally {
  rmSync(outdir, { recursive: true, force: true })
}
