import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { UI_MESSAGES } from '../src/messages'
import { translateLab } from '../src/i18n-core'
import { temporalPresets, validateTemporal } from '../src/filters/temporal'
import { temporalSummary } from '../src/filters/temporal-format'

const src = new URL('../src/', import.meta.url).pathname

function sources(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) ? [readFileSync(path, 'utf8')] : []
  })
}

test('ar and fr carry exactly the English keys', () => {
  const en = Object.keys(UI_MESSAGES.en!).sort()
  for (const code of ['ar', 'fr']) {
    assert.deepEqual(Object.keys(UI_MESSAGES[code]!).sort(), en, `${code} keys differ from en`)
  }
})

test('every literal t("lab.…") key in the kit exists', () => {
  const used = new Set<string>()
  for (const text of sources(src)) {
    for (const match of text.matchAll(/\bt\(\s*'(lab\.[A-Za-z0-9_.]+)'/g)) used.add(match[1]!)
  }
  assert.deepEqual([...used].filter((key) => !(key in UI_MESSAGES.en!)), [])
})

test('date presets, summaries and errors follow the translator', () => {
  const ar = (key: string, params?: Record<string, string | number | Date>) =>
    translateLab(UI_MESSAGES.ar!, 'ar', key, params)
  const now = new Date(2026, 9, 29, 12)
  const labels = temporalPresets('dateRange', now, ar).map((preset) => preset.label)
  assert.ok(labels.includes('اليوم'))
  assert.equal(temporalSummary({ type: 'dateRange' }, null, 'ar', now, ar), 'الكل')
  assert.equal(validateTemporal({ type: 'date' }, 'nope', ar), 'أدخل تاريخًا أو وقتًا صالحًا.')
  // Without a translator the helpers keep their English text.
  assert.equal(temporalPresets('date', now)[0]!.label, 'Today')
  assert.equal(validateTemporal({ type: 'date' }, 'nope'), 'Enter a valid date or time.')
})
