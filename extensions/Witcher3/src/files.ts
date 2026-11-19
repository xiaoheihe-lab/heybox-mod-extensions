import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export async function readText(file?: string): Promise<string | undefined> {
  if (!file) return undefined
  try {
    const data = await fs.readFile(file)
    if (data[0] === 0xff && data[1] === 0xfe) return data.subarray(2).toString('utf16le')
    if (data[0] === 0xfe && data[1] === 0xff) return data.subarray(2).swap16().toString('utf16le')
    return data.toString('utf8').replace(/^\uFEFF/, '')
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error }
}

export async function atomicWrite(file: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  try { await fs.writeFile(temporary, text, 'utf8'); await fs.rename(temporary, file) }
  finally { await fs.rm(temporary, { force: true }) }
}
