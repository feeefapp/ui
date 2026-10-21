import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LAB_THEME_DEFAULTS, labThemeAttributes } from '../src/theme-config.ts'

test('defaults render the Lab look', () => {
  assert.deepEqual(labThemeAttributes(), {
    'data-lab-palette': LAB_THEME_DEFAULTS.palette,
    'data-lab-density': LAB_THEME_DEFAULTS.density,
    style: { '--lab-radius-scale': '1' },
  })
})

test('config maps to root attributes and the radius variable', () => {
  assert.deepEqual(labThemeAttributes({ palette: 'mono', density: 'compact', radius: 0.4 }), {
    'data-lab-palette': 'mono',
    'data-lab-density': 'compact',
    style: { '--lab-radius-scale': '0.4' },
  })
})

test('radius is clamped and non-numbers fall back to the default', () => {
  assert.equal(labThemeAttributes({ radius: -1 }).style['--lab-radius-scale' as never], '0')
  assert.equal(labThemeAttributes({ radius: 9 }).style['--lab-radius-scale' as never], '1.5')
  assert.equal(labThemeAttributes({ radius: Number.NaN }).style['--lab-radius-scale' as never], '1')
})
