#!/usr/bin/env node
/**
 * Builds `dist/` from `src/`: tsc emits JS + declarations, then relative imports get explicit
 * `.js` / `/index.js` specifiers (webpack/Next.js treat `"type": "module"` packages as fully
 * specified) and stylesheets are copied next to the modules that import them.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const dist = join(root, 'dist')

rmSync(dist, { recursive: true, force: true })
execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')], {
  stdio: 'inherit',
})

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

for (const file of walk(src).filter((f) => f.endsWith('.css'))) {
  cpSync(file, join(dist, relative(src, file)))
}

/** `./ui` → `./ui.js`, `./scroll` → `./scroll/index.js`; CSS and explicit extensions stay. */
function specify(from, spec) {
  if (!spec.startsWith('.') || /\.(js|css|json)$/.test(spec)) return spec
  const base = resolve(dirname(from), spec)
  if (existsSync(`${base}.js`)) return `${spec}.js`
  if (existsSync(join(base, 'index.js'))) return `${spec}/index.js`
  throw new Error(`${relative(root, from)}: cannot resolve "${spec}"`)
}

for (const file of walk(dist).filter((f) => /\.(js|d\.ts)$/.test(f))) {
  const text = readFileSync(file, 'utf8')
  const next = text.replace(
    /((?:import|export)[^'"]*?from\s*|import\s*\(\s*|import\s+)(['"])(\.[^'"]+)\2/g,
    (_, lead, quote, spec) => `${lead}${quote}${specify(file, spec)}${quote}`,
  )
  if (next !== text) writeFileSync(file, next)
}

console.log(`Built ${relative(process.cwd(), dist) || 'dist'}`)
