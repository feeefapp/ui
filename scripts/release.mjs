#!/usr/bin/env node
/**
 * Cuts a release: `npm run release -- <patch|minor|major|x.y.z>`.
 * Typechecks, tests and builds, then commits `dist/` with the version bump and tags `vX.Y.Z`.
 * Push with `git push --follow-tags`, then bump consumers to `github:feeefapp/ui#vX.Y.Z`.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' })
const read = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()

const bump = process.argv[2]
if (!bump) {
  console.error('Usage: npm run release -- <patch|minor|major|x.y.z>')
  process.exit(1)
}
if (read('git', ['status', '--porcelain', '--', 'src', 'tests', 'scripts', 'package.json'])) {
  console.error('Commit or stash source changes first.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const version =
  bump === 'major'
    ? `${major + 1}.0.0`
    : bump === 'minor'
      ? `${major}.${minor + 1}.0`
      : bump === 'patch'
        ? `${major}.${minor}.${patch + 1}`
        : bump
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version "${version}"`)
  process.exit(1)
}

run('npm', ['run', 'typecheck'])
run('npm', ['test'])
run('npm', ['run', 'build'])
pkg.version = version
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
run('git', ['add', 'package.json', 'dist'])
run('git', ['commit', '-m', `release: v${version}`])
run('git', ['tag', '-a', `v${version}`, '-m', `v${version}`])
console.log(`\nTagged v${version}. Push with: git push --follow-tags`)
