import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../scripts/check-dist.mjs', import.meta.url))

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'ui-check-dist-'))
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root })
    mkdirSync(join(root, 'dist', 'containers'), { recursive: true })
    writeFileSync(join(root, 'dist', 'index.js'), 'export {}\n')
    execFileSync('git', ['add', 'dist/index.js'], { cwd: root })
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '--quiet', '-m', 'fixture'], { cwd: root })
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function check(root: string) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
}

test('check-dist accepts committed output and rejects changed tracked output', () => {
  fixture((root) => {
    assert.equal(check(root).status, 0)
    writeFileSync(join(root, 'dist', 'index.js'), 'export const changed = true\n')
    assert.equal(check(root).status, 1)
  })
})

test('check-dist rejects new build artifacts even when dist is ignored', () => {
  for (const ignored of [true, false]) {
    fixture((root) => {
      if (ignored) writeFileSync(join(root, '.gitignore'), 'dist/\n')
      for (const name of ['panel-host.js', 'panel-host.d.ts', 'panel-host.css']) {
        writeFileSync(join(root, 'dist', 'containers', name), '/* generated */\n')
      }
      const result = check(root)
      assert.equal(result.status, 1, `new ${ignored ? 'ignored' : 'untracked'} output must not pass`)
      assert.match(result.stderr, /dist\/ is out of date/)
      assert.match(result.stderr, /panel-host\.(?:js|d\.ts|css)/)
    })
  }
})
