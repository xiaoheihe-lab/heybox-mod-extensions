import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Explicit opt-in local cross-repository validation. No clone, install or CI dependency.
const sdkRoot = process.argv[2]
if (!sdkRoot || !path.isAbsolute(sdkRoot)) throw new Error('Usage: node test/run-sdk-integration.mjs <absolute SDK root>')
const require = createRequire(import.meta.url)
const { build } = require('../../../internal/build/node_modules/esbuild')
const sdkRequire = createRequire(path.join(sdkRoot, 'package.json'))
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'witcher-sdk-integration-'))
try {
  const outfile = path.join(temporary, 'fixture.cjs')
  await build({
    entryPoints: [fileURLToPath(new URL('./sdk-lifecycle.fixture.mjs', import.meta.url))],
    outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
    alias: { 'fixture-sdk': path.join(sdkRoot, 'src') },
    plugins: [{ name: 'bundle-unrar-esm', setup(builder) {
      builder.onResolve({ filter: /^node-unrar-js(?:\/.*)?$/ }, args => ({ path: sdkRequire.resolve(args.path) }))
    } }],
    banner: { js: `var require = require('node:module').createRequire(${JSON.stringify(path.join(sdkRoot, 'package.json'))});` },
  })
  const module = await import(pathToFileURL(outfile).href)
  await module.default.run(fileURLToPath(new URL('../../../dist/Witcher3/index.cjs', import.meta.url)), temporary)
} finally { await fs.rm(temporary, { recursive: true, force: true }) }
