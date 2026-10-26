import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MENU_MORPH,
  menuAlign,
  menuCloseDuration,
  menuContentCloseFrame,
  menuContentOpenFrame,
} from '../src/menu/morph-model.ts'
import { physicalMenuSide, sidePanelFallback } from '../src/menu/placement.ts'
import { SPRINGS, solveSpring } from '../src/physics/spring.ts'

test('rows sit in the glass from the first frame, faint and blurred, and sharpen as it arrives', () => {
  const first = menuContentOpenFrame(0)
  assert.ok(Math.abs(first.opacity - MENU_MORPH.contentOpacity) < 1e-9)
  assert.equal(first.blur, MENU_MORPH.contentBlur)
  let last = first
  for (let t = 0; t <= MENU_MORPH.sharpBy; t += 1 / 120) {
    const f = menuContentOpenFrame(t)
    assert.ok(f.opacity >= last.opacity - 1e-9 && f.blur <= last.blur + 1e-9)
    last = f
  }
  assert.equal(menuContentOpenFrame(MENU_MORPH.contrastBy).opacity, 1)
  const done = menuContentOpenFrame(MENU_MORPH.sharpBy)
  assert.ok(done.settled && done.blur === 0)
})

test('closing, the rows go first, from where they are', () => {
  const midway = menuContentOpenFrame(0.1)
  const gone = menuContentCloseFrame(MENU_MORPH.closeContent, midway)
  assert.ok(gone.settled && gone.opacity === 0 && gone.blur === MENU_MORPH.contentBlur)
  assert.ok(menuContentCloseFrame(MENU_MORPH.closeContent / 2, midway).opacity < midway.opacity)
})

test('the menu stays mounted until its glass has landed back in the button', () => {
  // SPRINGS.menuDismiss is within half a pixel of the button over 250 px by closeEnd.
  const at = solveSpring(SPRINGS.menuDismiss, 0, 1)(MENU_MORPH.closeEnd)
  assert.ok(Math.abs(1 - at.position) * 250 <= 0.5)
  assert.equal(menuCloseDuration(), MENU_MORPH.closeEnd)
})

test('reduced motion crossfades the rows; motion none shows the end state at once', () => {
  const half = menuContentOpenFrame(MENU_MORPH.fadeIn / 2, 'reduced')
  assert.ok(half.opacity > 0.4 && half.opacity < 0.6 && half.blur === 0)
  assert.ok(menuContentCloseFrame(MENU_MORPH.fadeOut, { opacity: 1, blur: 0, settled: true }, 'reduced').opacity === 0)
  const open = menuContentOpenFrame(0, 'none')
  assert.ok(open.settled && open.opacity === 1)
  const closed = menuContentCloseFrame(0, { opacity: 1, blur: 0, settled: true }, 'none')
  assert.ok(closed.settled && closed.opacity === 0)
  assert.equal(menuCloseDuration('none'), 0)
  assert.equal(menuCloseDuration('reduced'), MENU_MORPH.fadeOut)
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
