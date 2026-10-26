/**
 * Writes flutter/test/fixtures/menu.json from the web kit's menu model and the glass origin rules,
 * so the Dart twin is tested against the same numbers. Run from ui/: npx tsx flutter/tool/generate_menu_fixture.ts
 */
import { writeFileSync } from 'node:fs'
import { SPRINGS, solveSpring } from '../../src/physics/spring'
import { menuAlign, menuContentCloseFrame, menuContentOpenFrame } from '../../src/menu/morph-model'
import { glassOrigin, planGlassTransition } from '../../src/glass/transitions'
import { GLASS_MENU, glassKindBlur, glassMenuMaterial } from '../../src/glass/material'
import type { Motion } from '../../src/theme-config'

const times = [0, 0.01, 0.024, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.6, 1]
const motions: Motion[] = ['full', 'reduced', 'none']
const midway = menuContentOpenFrame(0.1)

const button = { x: 206, y: 0, width: 44, height: 44 }
const menu = { x: 0, y: 0, width: 250, height: 209, radius: 32.7 }

const fixture = {
  springs: (['menu', 'menuDismiss'] as const).map((name) => ({
    name,
    samples: times.map((t) => {
      const s = solveSpring(SPRINGS[name], 0, 1)(t)
      return [t, s.position, s.velocity]
    }),
  })),
  content: motions.map((motion) => ({
    motion,
    open: times.map((t) => ({ t, frame: menuContentOpenFrame(t, motion) })),
    close: times.map((t) => ({ t, frame: menuContentCloseFrame(t, midway, motion) })),
  })),
  midway,
  origin: [
    { origin: button, glass: { x: 202, y: -4, width: 52, height: 52 } },
    { origin: button, glass: { x: 0, y: -4, width: 260, height: 52 } },
    { origin: button, glass: null },
    { origin: { x: 10, y: 10, width: 4, height: 30 }, glass: null },
  ].map((c) => ({ ...c, rect: glassOrigin(c.origin, c.glass) })),
  plan: {
    birth: planGlassTransition(new Map([['other', { ...button, x: 300 }]]), new Map([['other', { ...button, x: 300 }], ['menu', menu]]), 8, new Map([['menu', button]])),
    death: planGlassTransition(new Map([['menu', menu]]), new Map(), 8, new Map([['menu', button]])),
  },
  material: {
    menu: GLASS_MENU,
    light: glassMenuMaterial('light'),
    dark: glassMenuMaterial('dark'),
    blur: [10, 44, 300].map((side) => [side, glassKindBlur('menu', side, 0.5, false)]),
  },
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
