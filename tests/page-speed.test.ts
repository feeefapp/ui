/**
 * Page-speed guards (DESIGN.md "Page speed"): the kit must not ship whole font files, inline
 * binary images, or load animations that cannot run on the compositor.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { FO_FONTS_CSS } from '../src/brand/fonts.ts'

const SRC = new URL('../src', import.meta.url).pathname

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path, ext) : ext.test(name) ? [path] : []
  })
}

test('fonts are WOFF2 subsets with unicode-range and swap', () => {
  const faces = FO_FONTS_CSS.match(/@font-face\s*\{[^}]*\}/g) ?? []
  assert.ok(faces.length > 0)
  for (const face of faces) {
    assert.match(face, /format\('woff2'\)/)
    assert.match(face, /unicode-range:/)
    assert.match(face, /font-display: swap/)
  }
})

test('no data: image over 4 KB in kit source', () => {
  for (const file of files(SRC, /\.(css|tsx?)$/)) {
    for (const [, b64] of readFileSync(file, 'utf8').matchAll(/data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)/g)) {
      assert.ok(b64!.length <= 4096 * 1.37, `${file} inlines a ${Math.round(b64!.length / 1.37 / 1024)} KB image`)
    }
  }
})

test('keyframes animate no paint-bound properties (filter on small swaps only)', () => {
  const allowed = new Set(['lab-swap-in', 'lab-swap-out']) // 16–24px icon swaps
  for (const file of files(SRC, /\.css$/)) {
    for (const [, name, body] of readFileSync(file, 'utf8').matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      if (allowed.has(name!)) continue
      assert.doesNotMatch(body!, /(^|[\s;{])(filter|box-shadow|width|height|top|left)\s*:/, `${file} @keyframes ${name}`)
    }
  }
})

test('Image is lazy by default; priority makes it the eager high-priority LCP image', () => {
  const src = readFileSync(join(SRC, 'primitives/fields.tsx'), 'utf8')
  const image = src.slice(src.indexOf('export const Image'))
  assert.match(image, /decoding="async"/)
  assert.match(image, /loading=\{priority \? 'eager' : 'lazy'\}/)
  assert.match(image, /fetchPriority=\{priority \? 'high' : undefined\}/)
  // Defaults first: callers may still override them.
  assert.ok(image.indexOf('decoding=') < image.indexOf('{...props}'))
})
