import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MENU_MORPH,
  menuAlign,
  menuBubblePath,
  menuCloseFrame,
  menuFadeFrame,
  menuOpenFrame,
  menuRestFrame,
  type MenuBox,
} from '../src/menu/morph-model.ts'
import { physicalMenuSide, sidePanelFallback } from '../src/menu/placement.ts'

// The measured toolbar case: a 44px circle at the menu's top-right corner, a 250 × 209 menu.
const menu: MenuBox = { x: 0, y: 0, width: 250, height: 209 }
const trigger: MenuBox = { x: 206, y: 0, width: 44, height: 44 }
// An in-content button (83 × 54) the menu is centred on, opening down.
const button: MenuBox = { x: 83.5, y: 0, width: 83, height: 54 }

test('the trigger pinches first: narrower and taller', () => {
  const f = menuOpenFrame(MENU_MORPH.pinch * 0.9, button, 27, menu, 32.7)
  assert.ok(f.box.width < button.width && f.box.height > button.height)
})

test('opening overshoots width by 3–4 % near 0.21 s and settles by 0.45 s', () => {
  let peak = 0
  let peakAt = 0
  for (let t = 0; t <= 0.6; t += 1 / 240) {
    const f = menuOpenFrame(t, button, 27, menu, 32.7)
    if (f.box.width > peak) {
      peak = f.box.width
      peakAt = t
    }
  }
  const over = (peak - menu.width) / menu.width
  assert.ok(over > 0.015 && over < 0.04, `overshoot ${over}`)
  assert.ok(peakAt > 0.18 && peakAt < 0.27, `peak at ${peakAt}`)
  const late = menuOpenFrame(0.45, button, 27, menu, 32.7)
  assert.ok(Math.abs(late.box.width - menu.width) < 1)
  assert.ok(menuOpenFrame(0.5, button, 27, menu, 32.7).settled)
})

test('the bubble keeps the edge it grows from', () => {
  for (const t of [0.05, 0.1, 0.2, 0.3]) {
    const f = menuOpenFrame(t, trigger, 22, menu, 32.7)
    // Trailing + top aligned: the right edge stays near the trigger's right edge.
    assert.ok(Math.abs(f.box.x + f.box.width - 250) < 8, `right edge at ${t}`)
    assert.ok(Math.abs(f.box.y) < 8, `top edge at ${t}`)
  }
})

test('a blob first, the menu corner once it arrives; content sharpens with it', () => {
  const early = menuOpenFrame(0.06, button, 27, menu, 32.7)
  assert.ok(early.radius > 0.85 * (Math.min(early.box.width, early.box.height) / 2))
  assert.ok(early.contentBlur > 4 && early.contentOpacity < 0.7 && early.contentOpacity > 0.2)
  const mid = menuOpenFrame(0.22, button, 27, menu, 32.7)
  assert.ok(mid.contentOpacity > 0.85)
  const late = menuOpenFrame(0.35, button, 27, menu, 32.7)
  assert.ok(Math.abs(late.radius - 32.7) < 0.5)
  assert.ok(late.contentBlur < 1)
  const done = menuOpenFrame(1, button, 27, menu, 32.7)
  assert.deepEqual(done, menuRestFrame(menu, 32.7))
})

test('dismissal: content gone within 0.05 s, the bubble narrows past the trigger and lands', () => {
  const from = menuRestFrame(menu, 32.7)
  assert.ok(menuCloseFrame(0.05, from, button, 27).contentOpacity < 0.01)
  let narrowest = Infinity
  for (let t = 0; t <= MENU_MORPH.closeEnd; t += 1 / 240) {
    narrowest = Math.min(narrowest, menuCloseFrame(t, from, button, 27).box.width)
  }
  assert.ok(narrowest < button.width - 4, `narrowest ${narrowest}`)
  const h = menuCloseFrame(MENU_MORPH.closeHeight, from, button, 27)
  assert.ok(Math.abs(h.box.height - button.height) < 0.5)
  const end = menuCloseFrame(MENU_MORPH.closeEnd, from, button, 27)
  assert.ok(end.settled && end.materialOpacity === 0)
})

test('closing mid-open turns around from the frame on screen', () => {
  const mid = menuOpenFrame(0.1, button, 27, menu, 32.7)
  const start = menuCloseFrame(0, mid, button, 27)
  assert.ok(Math.abs(start.box.width - mid.box.width) < 1e-9)
  assert.ok(Math.abs(start.contentOpacity - mid.contentOpacity) < 1e-9)
})

test('reduced motion crossfades in place', () => {
  const half = menuFadeFrame(MENU_MORPH.fadeIn / 2, true, menu, 32.7)
  assert.deepEqual(half.box, menu)
  assert.ok(half.materialOpacity > 0.3 && half.materialOpacity < 0.7)
  assert.ok(menuFadeFrame(MENU_MORPH.fadeOut, false, menu, 32.7).materialOpacity === 0)
})

test('the bubble path is a superellipse at the box offset', () => {
  const path = menuBubblePath({ x: 10, y: 20, width: 100, height: 40 }, 12)
  assert.match(path, /^M22,20L98,20/)
  assert.ok(path.endsWith('Z'))
})

test('toolbar menus line up with the near edge, in-content menus centre', () => {
  assert.equal(menuAlign(false, 50, 0, 400), 'center')
  assert.equal(menuAlign(true, 30, 0, 400), 'start')
  assert.equal(menuAlign(true, 370, 0, 400), 'end')
  assert.equal(menuAlign(true, 30, 0, 400, true), 'end')
  assert.equal(menuAlign(true, 370, 0, 400, true), 'start')
})

test('a submenu that fits neither side drops below its row, never squeezed', () => {
  // A 390 px window: a 250 px menu at the top-left, its row 22…252, a 250 px submenu.
  const bounds = { left: 12, top: 12, right: 378, bottom: 832 }
  const row = { left: 22, top: 60, right: 252, bottom: 102 }
  const ltr = sidePanelFallback({ trigger: row, bounds, width: 250, gap: 4, side: 'right', rtl: false })
  assert.ok(ltr)
  // Radix keeps side right: x = row.right + sideOffset lines it up with the row's start edge.
  assert.equal(row.right + ltr.sideOffset, row.left)
  assert.equal(ltr.alignOffset, 42)
  // RTL: the row at the top-right, side left, lined up with the row's right edge.
  const rtlRow = { left: 138, top: 60, right: 368, bottom: 102 }
  const rtl = sidePanelFallback({ trigger: rtlRow, bounds, width: 250, gap: 4, side: 'left', rtl: true })
  assert.ok(rtl)
  const right = rtlRow.left - rtl.sideOffset
  assert.equal(right, rtlRow.right)
  assert.ok(right - 250 >= bounds.left)
  // A wide row at the far side: shifted inside the bounds.
  const wide = sidePanelFallback({
    trigger: { left: 200, top: 60, right: 370, bottom: 102 },
    bounds,
    width: 250,
    gap: 4,
    side: 'right',
    rtl: false,
  })
  assert.ok(wide)
  assert.equal(370 + wide.sideOffset + 250, bounds.right)
  // Room on one side: no fallback (Radix flips if needed).
  assert.equal(
    sidePanelFallback({ trigger: { left: 12, top: 60, right: 100, bottom: 102 }, bounds, width: 250, gap: 4, side: 'right', rtl: false }),
    null
  )
  assert.equal(physicalMenuSide('end', true), 'left')
  assert.equal(physicalMenuSide('start', false), 'left')
  assert.equal(physicalMenuSide('top', true), 'top')
})
