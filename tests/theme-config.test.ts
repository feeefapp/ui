import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  THEME_DEFAULTS,
  darkModePrimary,
  themeAttributes,
  parseHexColor,
  readableTextOn,
} from '../src/theme-config.ts'

test('defaults render the Lab look', () => {
  assert.deepEqual(themeAttributes(), {
    'data-lab-palette': THEME_DEFAULTS.palette,
    'data-lab-density': THEME_DEFAULTS.density,
    'data-lab-glass': THEME_DEFAULTS.glass,
    'data-lab-glass-renderer': THEME_DEFAULTS.glassRenderer,
    style: { '--lab-radius-scale': '1' },
  })
})

test('config maps to root attributes and the radius variable', () => {
  assert.deepEqual(themeAttributes({ palette: 'mono', density: 'compact', radius: 0.4, glass: 'solid', glassRenderer: 'canvas' }), {
    'data-lab-palette': 'mono',
    'data-lab-density': 'compact',
    'data-lab-glass': 'solid',
    'data-lab-glass-renderer': 'canvas',
    style: { '--lab-radius-scale': '0.4' },
  })
})

test('radius is clamped and non-numbers fall back to the default', () => {
  assert.equal(themeAttributes({ radius: -1 }).style['--lab-radius-scale' as never], '0')
  assert.equal(themeAttributes({ radius: 9 }).style['--lab-radius-scale' as never], '1.5')
  assert.equal(themeAttributes({ radius: Number.NaN }).style['--lab-radius-scale' as never], '1')
})

test('explicitly undefined options fall back to the defaults', () => {
  // Provider forwards unset options as `undefined`; they must not override the defaults.
  assert.deepEqual(themeAttributes({ palette: undefined, density: undefined, radius: undefined, glass: undefined, glassRenderer: undefined }), {
    'data-lab-palette': THEME_DEFAULTS.palette,
    'data-lab-density': THEME_DEFAULTS.density,
    'data-lab-glass': THEME_DEFAULTS.glass,
    'data-lab-glass-renderer': THEME_DEFAULTS.glassRenderer,
    style: { '--lab-radius-scale': '1' },
  })
})

test('thin density maps to the root attribute', () => {
  assert.equal(themeAttributes({ density: 'thin' })['data-lab-density'], 'thin')
})

test('a hex primary sets the seed variables and the attribute; anything else is ignored', () => {
  const attrs = themeAttributes({ primary: '#2563EB' })
  assert.equal(attrs['data-lab-primary'], '')
  assert.equal((attrs.style as Record<string, string>)['--lab-seed'], '#2563eb')
  assert.equal((attrs.style as Record<string, string>)['--lab-seed-on'], '#ffffff')
  for (const bad of ['blue', 'rgb(0,0,255)', '#12345', '#ggg', '']) {
    const ignored = themeAttributes({ primary: bad })
    assert.equal(ignored['data-lab-primary'], undefined, bad)
    assert.equal((ignored.style as Record<string, string>)['--lab-seed'], undefined, bad)
  }
})

test('text on primary picks the higher-contrast of near-black and white', () => {
  assert.equal(readableTextOn(parseHexColor('#72ce5d')!), '#111411', 'Feeef green takes dark text')
  assert.equal(readableTextOn(parseHexColor('#ffd60a')!), '#111411', 'yellow takes dark text')
  assert.equal(readableTextOn(parseHexColor('#1d4ed8')!), '#ffffff', 'deep blue takes white')
  assert.equal(readableTextOn(parseHexColor('#0a0a0a')!), '#ffffff')
  assert.deepEqual(parseHexColor('#abc'), [0xaa, 0xbb, 0xcc])
})

test('dark mode lifts the primary toward white, which can flip its text color', () => {
  const blue = parseHexColor('#1d4ed8')!
  assert.deepEqual(darkModePrimary([0, 0, 0]), [77, 77, 77])
  assert.equal(readableTextOn(darkModePrimary(blue)), '#111411')
})
