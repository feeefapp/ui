import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** What the docs know about releases: the package version, unreleased commits, released tags. */
export interface DocsVersions {
  current: string
  /** Commits on top of the newest tag: the docs then describe unreleased work. */
  ahead: number
  releases: { version: string; date: string }[]
}

const ID = 'virtual:feeef-versions'
const RESOLVED = '\0' + ID

const git = (root: string, ...args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/**
 * Exposes `virtual:feeef-versions`, read from package.json and the repository's `v*` tags at build
 * time. Without git (a bare source copy) it knows only the package version.
 */
export function versionsPlugin(root: string): Plugin {
  const build = (): DocsVersions => {
    const current = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string
    try {
      const releases = git(root, 'for-each-ref', '--sort=-version:refname', '--format=%(refname:short) %(creatordate:short)', 'refs/tags/v*')
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [tag, date] = line.split(' ')
          return { version: tag.replace(/^v/, ''), date }
        })
      const latest = releases[0] ? `v${releases[0].version}` : null
      const ahead = latest ? Number(git(root, 'rev-list', '--count', `${latest}..HEAD`)) : 0
      return { current, ahead, releases }
    } catch {
      return { current, ahead: 0, releases: [] }
    }
  }
  return {
    name: 'feeef-versions',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(build())}` : undefined),
  }
}
