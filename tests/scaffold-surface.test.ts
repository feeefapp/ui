import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/workspace/scaffold.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/workspace/scaffold.css', import.meta.url), 'utf8')

test('Scaffold explicitly opts out of outer paint without inferring it from renderViewport', () => {
  assert.match(source, /contentSurface\?:\s*'card'\s*\|\s*'none'/)
  assert.match(source, /contentSurface\s*=\s*'card'/)
  const main = source.match(/<div\s+ref=\{main\}[\s\S]*?>/)?.[0] ?? ''
  assert.match(main, /className="lab-workspace-main"/)
  assert.match(main, /data-content-surface=\{glassSidebar \? 'none' : contentSurface\}/)
  assert.match(main, /tabIndex=\{-1\}/)
  assert.doesNotMatch(main, /renderViewport/)
})

test('surface-free Scaffold is structural and keeps the shell gap even without surrounding chrome', () => {
  const base = css.match(/\.lab-workspace-main \{([^}]+)\}/)?.[1] ?? ''
  assert.match(base, /display:\s*flex/)
  assert.match(base, /min-width:\s*0/)
  assert.match(base, /min-height:\s*0/)
  assert.match(base, /margin:\s*var\(--lab-shell-gap\)/)
  assert.match(base, /background:\s*var\(--lab-surface\)/)
  assert.match(base, /border:\s*1px solid var\(--lab-line\)/)
  assert.match(base, /border-radius:\s*var\(--lab-radius-panel\)/)

  const none = css.match(/\.lab-workspace-main\[data-content-surface='none'\] \{([^}]+)\}/)?.[1] ?? ''
  assert.match(none, /background:\s*transparent/)
  assert.match(none, /border:\s*0/)
  assert.match(none, /border-radius:\s*0/)
  assert.match(none, /box-shadow:\s*none/)
  assert.doesNotMatch(none, /margin|padding|outline/)
  assert.match(css, /\[data-framed='false'\] \.lab-workspace-main\[data-content-surface='card'\] \{\s*margin:\s*0/)
  assert.match(css, /:not\(\[data-side-mode='hidden'\]\) \.lab-workspace-main \{\s*margin-inline-start:\s*0/)
  assert.match(css, /\.lab-workspace-main:focus-visible \{\s*outline:\s*var\(--lab-focus-ring-width\) solid var\(--lab-focus-ring-color\)/)
})

test('surface-free Scaffold does not suppress independent Panel boundaries', () => {
  assert.doesNotMatch(css, /data-content-surface[^{}]*\.lab-(?:panel|presentation)/)
  const panelCss = readFileSync(new URL('../src/containers/panel.css', import.meta.url), 'utf8')
  const column = panelCss.match(/\.lab-presentation\[data-in-place='column'\] \{([^}]+)\}/)?.[1] ?? ''
  assert.match(column, /box-shadow:\s*inset[^;]*var\(--lab-line\)/)
})

test('glass navigation is the default and the main route removes its own inset', () => {
  assert.match(source, /glassSidebar = true/)
  assert.match(source, /contentPadding=\{glassSidebar \? 0 : undefined\}/)
  assert.match(source, /glassSidebar && visibleSide && <SidebarGlass/)
  assert.match(css, /\[data-glass-sidebar\] > \.lab-workspace-scaffold-row > \.lab-workspace-main \{\s*margin: 0/)
})

test('the sidebar tint inherits its container corners in every focus state', () => {
  const rules = [...css.matchAll(/\.lab-workspace-sidebar-glass(?:\[[^\]]+\])?::after\s*\{([^}]+)\}/g)]
  for (const property of ['border-radius', 'corner-shape']) {
    const values = rules.flatMap(([, declarations]) =>
      [...declarations.matchAll(new RegExp(`${property}:\\s*([^;]+);`, 'g'))].map(match => match[1].trim()),
    )
    assert.deepEqual([...new Set(values)], ['inherit'])
  }
})

test('nested docs code can hand vertical scrolling back to the article', () => {
  const materials = readFileSync(new URL('../docs/src/styles/materials.css', import.meta.url), 'utf8')
  const codeViewport = materials.match(/\.docs-code\[data-layout='box'\] > \.lab-scroll-area > \.lab-scroll-viewport\s*\{([^}]+)\}/)?.[1]
  assert.match(codeViewport ?? '', /overscroll-behavior-y:\s*auto/)
})
