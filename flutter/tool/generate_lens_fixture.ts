/**
 * Writes flutter/test/fixtures/lens.json from the web kit's glass lens model, so the Dart twin is
 * tested against the same numbers (tests/lens.test.ts checks the file is current).
 * Run from ui/: npx tsx flutter/tool/generate_lens_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { lensFixture } from './lens_fixture'

writeFileSync(
  new URL('../test/fixtures/lens.json', import.meta.url),
  `${JSON.stringify(lensFixture(), null, 2)}\n`
)
