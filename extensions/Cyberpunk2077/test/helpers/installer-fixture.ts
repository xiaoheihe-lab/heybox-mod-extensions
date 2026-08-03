import assert from 'node:assert/strict'
import path from 'node:path'
import { installCyberpunkPackage } from '../../src/installers/pipeline'
import type { CyberpunkModType } from '../../src/constants'
import type { CopyInstruction } from '../../src/types'
import { fakeContext } from './context'

export const TEST_GAME_PATH = 'D:/Games/Cyberpunk 2077'
export const TEST_STAGING_PATH = 'D:/ModStaging/Cyberpunk2077Mod'

export interface ExpectedCopy {
  source: string
  destination: string
}

export interface InstallerFixture {
  name: string
  files: string[]
  fileContents?: Record<string, string>
  expectedModType: CyberpunkModType
  expectedCopies: ExpectedCopy[]
  expectedPromptCount?: number
  expectedPromptTitles?: string[]
}

export interface InstallerFailureFixture {
  name: string
  files: string[]
  expectedError: RegExp
  expectedNotificationTitle: string
}

export interface InstallerCancellationFixture {
  name: string
  files: string[]
  fileContents?: Record<string, string>
  expectedError: RegExp
  expectedPromptTitle: string
}

function slash(value: string): string {
  return value.replace(/\\/g, '/')
}

function sortedCopies(copies: ExpectedCopy[]): ExpectedCopy[] {
  return copies
    .map((copy) => ({ source: slash(copy.source), destination: slash(copy.destination) }))
    .sort((left, right) => `${left.source}\0${left.destination}`.localeCompare(`${right.source}\0${right.destination}`))
}

function assertSafeGameRelativeDestination(destination: string): void {
  assert.equal(destination, slash(destination), `destination must use archive-style separators: ${destination}`)
  assert.equal(path.posix.isAbsolute(destination), false, `destination must be relative: ${destination}`)
  assert.equal(path.win32.isAbsolute(destination), false, `destination must not contain a drive or UNC root: ${destination}`)
  assert.equal(destination.split('/').includes('..'), false, `destination must not traverse outside the game: ${destination}`)

  const gameRoot = path.win32.resolve(TEST_GAME_PATH)
  const finalPath = path.win32.resolve(gameRoot, destination.replace(/\//g, '\\'))
  assert.ok(
    finalPath.toLowerCase().startsWith(`${gameRoot.toLowerCase()}\\`),
    `destination must resolve below the game root: ${destination}`,
  )
  assert.equal(
    finalPath,
    path.win32.join(gameRoot, ...destination.split('/')),
    `SDK game-root path composition must preserve the expected path segments: ${destination}`,
  )
}

export async function assertInstallerFixture(fixture: InstallerFixture): Promise<void> {
  const stagedContents = Object.fromEntries(
    Object.entries(fixture.fileContents ?? {}).map(([source, content]) => [
      path.join(TEST_STAGING_PATH, slash(source)),
      content,
    ]),
  )
  const { context, requests } = fakeContext(stagedContents)
  const result = await installCyberpunkPackage(context, fixture.files, TEST_STAGING_PATH)
  const copies = result.instructions.filter((instruction): instruction is CopyInstruction => instruction.type === 'copy')

  assert.equal(result.modTypeId, fixture.expectedModType)
  assert.deepEqual(sortedCopies(copies), sortedCopies(fixture.expectedCopies))
  const expectedPromptCount = fixture.expectedPromptTitles?.length ?? fixture.expectedPromptCount ?? 0
  assert.equal(requests.length, expectedPromptCount)
  if (fixture.expectedPromptTitles) {
    assert.deepEqual(requests.map((request) => request.title), fixture.expectedPromptTitles)
  }

  const archiveSources = new Set(fixture.files.map((file) => slash(file).replace(/^\.\//, '')))
  for (const copy of copies) {
    assert.ok(archiveSources.has(slash(copy.source)), `copy source must refer to an archive-relative file: ${copy.source}`)
    assertSafeGameRelativeDestination(copy.destination)
  }
}

export async function assertInstallerFailureFixture(fixture: InstallerFailureFixture): Promise<void> {
  const { context, notifications, requests } = fakeContext()

  await assert.rejects(
    installCyberpunkPackage(context, fixture.files, TEST_STAGING_PATH),
    fixture.expectedError,
  )
  assert.equal(requests.length, 0, 'a blocked package must not enter the fallback confirmation flow')
  assert.equal(notifications.length, 1, 'a blocked package must emit exactly one safety notification')
  assert.equal(notifications[0].title, fixture.expectedNotificationTitle)
  assert.equal(notifications[0].variant, 'error')
}

export async function assertInstallerCancellationFixture(fixture: InstallerCancellationFixture): Promise<void> {
  const stagedContents = Object.fromEntries(
    Object.entries(fixture.fileContents ?? {}).map(([source, content]) => [
      path.join(TEST_STAGING_PATH, slash(source)),
      content,
    ]),
  )
  const { context, notifications, requests } = fakeContext(stagedContents, [], {
    requestResponse: { confirmed: false, requestId: 'test', action: 'cancel' },
  })

  await assert.rejects(
    installCyberpunkPackage(context, fixture.files, TEST_STAGING_PATH),
    fixture.expectedError,
  )
  assert.equal(requests.length, 1)
  assert.equal(requests[0].title, fixture.expectedPromptTitle)
  assert.equal(notifications.length, 0)
}
