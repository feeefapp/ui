/**
 * Writes flutter/test/fixtures/menu.json from the web kit's menu morph model, so the Dart twin is
 * tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_menu_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { SPRINGS, solveSpring } from '../../src/physics/spring'
import {
  menuAlign,
  menuCloseFrame,
  menuFadeFrame,
  menuOpenFrame,
  menuRestFrame,
  type MenuBox,
} from '../../src/menu/morph-model'

const menu: MenuBox = { x: 0, y: 0, width: 250, height: 209 }
const cases: { name: string; from: MenuBox; fromRadius: number; to: MenuBox; toRadius: number }[] = [
  // A toolbar circle at the menu's top-right corner (trailing + top aligned).
  { name: 'toolbar', from: { x: 206, y: 0, width: 44, height: 44 }, fromRadius: 22, to: menu, toRadius: 32.7 },
  // An in-content button the menu is centred on, opening down.
  { name: 'content-down', from: { x: 83.5, y: 0, width: 83, height: 54 }, fromRadius: 27, to: menu, toRadius: 32.7 },
  // Opening up: bottom aligned.
  { name: 'content-up', from: { x: 83.5, y: 155, width: 83, height: 54 }, fromRadius: 27, to: menu, toRadius: 32.7 },
  // A select field the menu covers.
  { name: 'field', from: { x: 0, y: 0, width: 300, height: 56 }, fromRadius: 12, to: { x: 0, y: 0, width: 300, height: 120 }, toRadius: 32 },
]
const times = [0, 0.01, 0.024, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.6, 1]

const fixture = {
  springs: (['menu', 'menuDismiss'] as const).map((name) => ({
    name,
    samples: times.map((t) => {
      const s = solveSpring(SPRINGS[name], 0, 1)(t)
      return [t, s.position, s.velocity]
    }),
  })),
  open: cases.map((c) => ({
    ...c,
    frames: times.map((t) => ({ t, frame: menuOpenFrame(t, c.from, c.fromRadius, c.to, c.toRadius) })),
  })),
  close: cases.map((c) => {
    const midway = menuOpenFrame(0.12, c.from, c.fromRadius, c.to, c.toRadius)
    const rest = menuRestFrame(c.to, c.toRadius)
    return {
      ...c,
      fromRest: times.map((t) => ({ t, frame: menuCloseFrame(t, rest, c.from, c.fromRadius) })),
      fromMidway: { start: midway, frames: times.map((t) => ({ t, frame: menuCloseFrame(t, midway, c.from, c.fromRadius) })) },
    }
  }),
  fade: times.flatMap((t) => [true, false].map((opening) => ({ t, opening, frame: menuFadeFrame(t, opening, menu, 32.7) }))),
  align: [
    [false, 50, 0, 400, false],
    [true, 30, 0, 400, false],
    [true, 370, 0, 400, false],
    [true, 30, 0, 400, true],
    [true, 370, 0, 400, true],
    [true, 200, 0, 400, false],
  ].map(([toolbar, center, left, right, rtl]) => ({
    toolbar,
    center,
    left,
    right,
    rtl,
    align: menuAlign(toolbar as boolean, center as number, left as number, right as number, rtl as boolean),
  })),
}

writeFileSync(new URL('../test/fixtures/menu.json', import.meta.url), `${JSON.stringify(fixture, null, 1)}\n`)
console.log('wrote flutter/test/fixtures/menu.json')
