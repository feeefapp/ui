import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  METRIC_VARIABLE_NAMES,
  THEME_DEFAULTS,
  darkModePrimary,
  metricVariables,
  themeAttributes,
  parseHexColor,
  readableTextOn,
} from '../src/theme-config.ts'

test('defaults render the Lab look', () => {
  assert.deepEqual(themeAttributes(), {
    'data-lab-palette': THEME_DEFAULTS.palette,
    'data-lab-density': THEME_DEFAULTS.density,
    'data-lab-glass': THEME_DEFAULTS.glass,
    'data-lab-glass-blur': 'off',
    'data-lab-glass-refraction': 'on',
    style: { '--lab-radius-scale': '1', '--lab-glass-tint': '0.5' },
  })
})

test('config maps to root attributes and the radius variable', () => {
  assert.deepEqual(
    themeAttributes({ palette: 'mono', density: 'compact', radius: 0.4, glass: 'solid', glassTint: 0.8, glassBlur: true, glassRefraction: false }),
    {
      'data-lab-palette': 'mono',
      'data-lab-density': 'compact',
      'data-lab-glass': 'solid',
      'data-lab-glass-blur': 'on',
      'data-lab-glass-refraction': 'off',
      style: { '--lab-radius-scale': '0.4', '--lab-glass-tint': '0.8' },
    }
  )
})

test('radius is clamped and non-numbers fall back to the default', () => {
  assert.equal(themeAttributes({ radius: -1 }).style['--lab-radius-scale' as never], '0')
  assert.equal(themeAttributes({ radius: 9 }).style['--lab-radius-scale' as never], '1.5')
  assert.equal(themeAttributes({ radius: Number.NaN }).style['--lab-radius-scale' as never], '1')
})

test('explicitly undefined options fall back to the defaults', () => {
  // Provider forwards unset options as `undefined`; they must not override the defaults.
  assert.deepEqual(
    themeAttributes({
      palette: undefined,
      density: undefined,
      radius: undefined,
      glass: undefined,
      glassTint: undefined,
      glassBlur: undefined,
      glassRefraction: undefined,
    }),
    {
      'data-lab-palette': THEME_DEFAULTS.palette,
      'data-lab-density': THEME_DEFAULTS.density,
      'data-lab-glass': THEME_DEFAULTS.glass,
      'data-lab-glass-blur': 'off',
      'data-lab-glass-refraction': 'on',
      style: { '--lab-radius-scale': '1', '--lab-glass-tint': '0.5' },
    }
  )
})

test('glass tint is clamped to 0–1 and non-numbers fall back to the default', () => {
  const tint = (glassTint: number) => (themeAttributes({ glassTint }).style as Record<string, string>)['--lab-glass-tint']
  assert.equal(tint(-0.3), '0')
  assert.equal(tint(4), '1')
  assert.equal(tint(Number.NaN), '0.5')
  assert.equal(tint(0.25), '0.25')
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

test('metrics become px variables on <html>, only for valid set values', () => {
  const style = themeAttributes({
    metrics: {
      controlHeight: { small: 28, regular: 40 },
      controlFont: { large: 18 },
      fieldHeight: { regular: 48 },
      toolbarItem: 48,
      switchSize: { width: 51, height: 31 },
      thumbSize: { height: 27 },
      listRadius: 20,
      focusRingWidth: 3,
      toolbarGap: Number.NaN,
      listInset: -4,
    },
  }).style as Record<string, string>
  assert.equal(style['--lab-control-small'], '28px')
  assert.equal(style['--lab-control-height'], '40px')
  assert.equal(style['--lab-control-large'], undefined)
  assert.equal(style['--lab-control-font-large'], '18px')
  assert.equal(style['--lab-field-height'], '48px')
  assert.equal(style['--lab-toolbar-item'], '48px')
  assert.equal(style['--lab-switch-width'], '51px')
  assert.equal(style['--lab-switch-height'], '31px')
  assert.equal(style['--lab-thumb-height'], '27px')
  assert.equal(style['--lab-thumb-width'], undefined)
  assert.equal(style['--lab-list-corner'], '20px')
  assert.equal(style['--lab-focus-ring-width'], '3px')
  assert.equal(style['--lab-toolbar-gap'], undefined, 'not finite')
  assert.equal(style['--lab-list-inset'], undefined, 'negative')
})

test('every metric variable is a kit size token declared for the default density', () => {
  assert.deepEqual(metricVariables(), {})
  assert.equal(new Set(METRIC_VARIABLE_NAMES).size, METRIC_VARIABLE_NAMES.length)
  const css = readFileSync(new URL('../src/system.css', import.meta.url), 'utf8')
  const base = css.slice(css.indexOf('html[data-lab-theme] {'), css.indexOf('@supports not (corner-shape'))
  for (const name of METRIC_VARIABLE_NAMES) assert.match(base, new RegExp(`${name}:`), name)
})

test('metrics override the workspace sidebar and rail widths', () => {
  assert.deepEqual(metricVariables({ sidebarWidth: 250, railWidth: 66, shellGap: 6 }), {
    '--lab-sidebar-width': '250px',
    '--lab-navigation-rail-width': '66px',
    '--lab-shell-gap': '6px',
  })
})
