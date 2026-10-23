/**
 * Writes flutter/test/fixtures/segmented.json from the web kit's segmented pill model, so the Dart
 * twin is tested against the same numbers (tests/segmented.test.ts checks the file is current).
 * Run from ui/: npx tsx flutter/tool/generate_segmented_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { segmentedFixture } from './segmented_fixture'

writeFileSync(
  new URL('../test/fixtures/segmented.json', import.meta.url),
  `${JSON.stringify(segmentedFixture(), null, 2)}\n`
)
