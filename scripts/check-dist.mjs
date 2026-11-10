#!/usr/bin/env node
/**
 * `dist/` is committed because consumers install this repo as a git dependency. Fail when the
 * fresh build differs from what is committed, so a tag can never ship stale output.
 */
import { execFileSync } from 'node:child_process'

// Include ignored files and expand untracked directories: every emitted artifact must be tracked.
const changed = execFileSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--ignored', '--', 'dist'],
  { encoding: 'utf8' },
).trim()
if (changed) {
  console.error('dist/ is out of date. Run `npm run build` and commit the result:\n' + changed)
  process.exit(1)
}
console.log('dist/ matches the source')
