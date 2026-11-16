import { createRequire } from 'node:module'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const outdir = join(tmpdir(), `witcher3-extension-test-${Date.now()}`)
mkdirSync(outdir, { recursive: true })
const originalDocumentsRoot = process.env.WITCHER3_DOCUMENTS_ROOT
process.env.WITCHER3_DOCUMENTS_ROOT = join(outdir, 'documents')
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
  const module = await import(pathToFileURL(outfile).href)
  await module.default.completion
} finally {
  if (originalDocumentsRoot === undefined) delete process.env.WITCHER3_DOCUMENTS_ROOT
  else process.env.WITCHER3_DOCUMENTS_ROOT = originalDocumentsRoot
  rmSync(outdir, { recursive: true, force: true })
}
