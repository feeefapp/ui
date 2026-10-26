/**
 * Writes flutter/test/fixtures/brand.json from the web kit's brand modules, so the Dart twins are
 * tested against the same numbers and strings. Run from ui/:
 * npx tsx flutter/tool/generate_brand_fixture.ts
 *
 * - avatar-fingerprint.ts: avatarKey, voiceFingerprint (keys, rotation, palette, every pixel).
 * - pixel-art.tsx: PixelArtwork rendered to static SVG markup (its `artworkPixels` is private).
 * - brand/logo.tsx: the static wordmark's strokes, from its rendered markup.
 * - brand/animated-logo.ts: the SVG string, its SMIL animations (parsed from the markup) and their
 *   values at sample times. SMIL `calcMode="spline"` is evaluated here by bisection, the same
 *   method as the Dart twin, so the frames compare at 1e-9.
 */
import { register } from 'node:module'
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'

// pixel-art.tsx imports its stylesheet; Node can't load CSS, so stub it.
register(
  'data:text/javascript,' +
    encodeURIComponent(
      `export async function load(url, context, next) {
        if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
        return next(url, context)
      }`
    )
)

const { renderToStaticMarkup } = await import('react-dom/server')
const { avatarKey, voiceFingerprint } = await import('../../src/avatar-fingerprint')
const { PixelArtwork } = await import('../../src/pixel-art')
const { FoAnimatedLogo } = await import('../../src/brand/logo')
const { FO_ANIMATED_LOGO_SVG } = await import('../../src/brand/animated-logo')

// ---- avatar fingerprint ------------------------------------------------------------------------
// `{"$date": iso}` stands for a Date (rebuilt as DateTime in Dart).
const revive = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(revive)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.$date === 'string') return new Date(record.$date)
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, revive(v)]))
  }
  return value
}
const avatarData: unknown[] = [
  'feeef',
  '',
  'voice_7f2a',
  'voice_31c9',
  'voice_b04e',
  'Amina',
  'أمينة',
  'emoji 🎙️ voice',
  'quote " and \\ backslash',
  'control \u0001\n\t\r\b\f end',
  'lone \ud800 surrogate \udc00',
  0,
  1,
  -2.5,
  0.1,
  1 / 3,
  1e21,
  1.5e-7,
  123456.789,
  2 ** 53,
  1e300,
  true,
  false,
  null,
  [],
  {},
  [1, 'two', null, true, [3.5]],
  { b: 2, a: 1, c: { z: [1, 2], y: 'x' } },
  { id: 'voice_7f2a', name: 'Amina', style: 'Warm, conversational', tags: ['ar', 'fr'] },
  { 10: 'ten', 2: 'two', a: 'a', B: 'B' },
  { when: { $date: '2026-10-22T08:30:00.123Z' } },
  { $date: '1999-01-02T03:04:05.000Z' },
]
const avatar = avatarData.flatMap((data) =>
  [0, 1, 7].map((salt) => {
    const value = revive(data)
    const print = voiceFingerprint(value, salt)
    return {
      data,
      salt,
      avatarKey: avatarKey(value),
      key: print.key,
      rotation: print.rotation,
      colors: print.colors,
      pixels: print.pixels.map((p) => [p.x, p.y, print.colors.indexOf(p.color), p.opacity]),
    }
  })
)
const numbers = [0, -0, 1, -1, 0.1, -2.5, 1 / 3, 1e21, 1e-7, 1.5e-7, 0.000001, 123456.789, 2 ** 53, 1e300, 5e-324, 1.7976931348623157e308, 4.35, 100, 1e20].map(
  (value) => ({ value, js: String(value) })
)

// ---- pixel artwork -----------------------------------------------------------------------------
const rects = (markup: string) =>
  [...markup.matchAll(/<rect ([^>]*?)\/?>/g)].map((m) => {
    const attr = (name: string) => m[1].match(new RegExp(`(?:^| )${name}="([^"]*)"`))?.[1]
    return { x: Number(attr('x')), y: Number(attr('y')), opacity: Number(attr('opacity')), fill: attr('fill') ?? null }
  })
const artwork = (['voice', 'wave', 'orbit', 'spark'] as const).flatMap((variant) =>
  ['feeef', 'voice_7f2a', 'order-1042', '', 'أمينة'].map((seed) => {
    const markup = renderToStaticMarkup(createElement(PixelArtwork, { variant, seed, size: 64 }))
    const viewBox = markup.match(/viewBox="0 0 (\d+) (\d+)"/)!
    return { variant, seed, width: Number(viewBox[1]), height: Number(viewBox[2]), pixels: rects(markup) }
  })
)

// ---- static wordmark ---------------------------------------------------------------------------
const logoMarkup = renderToStaticMarkup(createElement(FoAnimatedLogo, {}))
const logo = {
  viewBox: logoMarkup.match(/viewBox="([^"]*)"/)![1],
  strokes: [...logoMarkup.matchAll(/<path ([^>]*?)\/?>/g)].map((m) => {
    const attr = (name: string) => m[1].match(new RegExp(`(?:^| )${name}="([^"]*)"`))?.[1]
    const style = attr('style') ?? ''
    const ink = style.includes('--lab-brand-1') ? 'brand1' : style.includes('--lab-brand-2') ? 'brand2' : 'current'
    return { d: attr('d'), ink, dash: Number(attr('stroke-dasharray')), width: Number(attr('stroke-width')) }
  }),
}

// ---- animated wordmark -------------------------------------------------------------------------
const animations = [...FO_ANIMATED_LOGO_SVG.matchAll(/<(animate|animateTransform) ([^>]*)>/g)].map((m) => {
  const attr = (name: string) => m[2].match(new RegExp(`(?:^| )${name}="([^"]*)"`))![1]
  const numbers = (value: string) => value.split(/[ ,]+/).map(Number)
  return {
    attribute: attr('attributeName'),
    from: numbers(attr('from')),
    to: numbers(attr('to')),
    begin: Number.parseFloat(attr('begin')),
    dur: Number.parseFloat(attr('dur')),
    spline: numbers(attr('keySplines')),
  }
})
function ease([x1, y1, x2, y2]: number[], p: number) {
  if (p <= 0) return 0
  if (p >= 1) return 1
  const bezier = (a: number, b: number, s: number) => {
    const r = 1 - s
    return 3 * r * r * s * a + 3 * r * s * s * b + s * s * s
  }
  let lo = 0
  let hi = 1
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    if (bezier(x1, x2, mid) < p) lo = mid
    else hi = mid
  }
  return bezier(y1, y2, (lo + hi) / 2)
}
const times = [0, 0.1, 0.333, 0.4, 0.8, 1.0, 1.2, 1.3, 1.5, 1.7, 2.0, 2.2, 2.5, 2.8, 3.0, 3.5, 10]
const frames = times.map((time) => ({
  time,
  // Only valid at or after `begin` (the static base value is checked separately in Dart).
  values: animations.map((a) => {
    if (time < a.begin) return null
    const p = a.dur <= 0 ? 1 : Math.min(1, Math.max(0, (time - a.begin) / a.dur))
    const e = ease(a.spline, p)
    return a.from.map((from, i) => from + (a.to[i] - from) * e)
  }),
}))

writeFileSync(
  new URL('../test/fixtures/brand.json', import.meta.url),
  JSON.stringify({ avatar, numbers, artwork, logo, animatedLogo: { svg: FO_ANIMATED_LOGO_SVG, animations, frames } }, null, 1) + '\n'
)
console.log(`brand.json: ${avatar.length} fingerprints, ${artwork.length} artworks, ${frames.length} frames`)
