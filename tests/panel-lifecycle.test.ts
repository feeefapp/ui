import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The package's Node runner has no DOM. This structural regression complements browser
// lifecycle checks: changing a wrapper/portal here silently destroys drafts on resize.
test('adaptive sheet keeps one presentation/body tree instead of swapping parents or portals', () => {
  const sheet = readFileSync(new URL('../src/containers/sheet.tsx', import.meta.url), 'utf8')
  const host = readFileSync(new URL('../src/presentation/in-place-host.tsx', import.meta.url), 'utf8')
  assert.match(sheet, /export function InPlaceSheet/)
  assert.match(sheet, /inPlace=\{inPlace\}/)
  assert.match(host, /<dialog/)
  assert.doesNotMatch(host, /createPortal|return null/)
  assert.match(host, /showModal\(/)
  assert.match(host, /\.close\(/)
})
