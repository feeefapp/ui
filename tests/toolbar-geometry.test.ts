import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const css = readFileSync(new URL('../src/toolbar.css', import.meta.url), 'utf8')

test('bare toolbar choices have the same square footprint as toolbar icon buttons', () => {
  assert.match(css, /\.lab-toolbar-group \.lab-choice\[data-bare\][^{]*\{[^}]*inline-size: var\(--lab-toolbar-control\)/)
  assert.match(css, /\.lab-toolbar-group \.lab-choice\[data-bare\][^{]*\{[^}]*block-size: var\(--lab-toolbar-control\)/)
})

test('toolbar appearance uses a single geometry even if a consumer passes a legacy small size', () => {
  assert.match(css, /\.lab-toolbar-group \.lab-control\[data-control-appearance='toolbar'\][^{]*\{[^}]*--lab-control-size: var\(--lab-toolbar-control\)/)
  assert.match(css, /\.lab-toolbar-group \.lab-control\[data-control-appearance='toolbar'\][^{]*> svg[^}]*width: 20px/)
})
