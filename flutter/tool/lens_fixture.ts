/** The glass lens vectors shared by tests/lens.test.ts and the Dart twin's test. */
import {
  CONTENT_PRESS_SCALE,
  LENS_PILL_LIFT,
  LENS_STRETCH_TIME,
  LENS_TAB_SCALE,
  LENS_THUMB_SCALE,
  SWITCH_DECELERATION,
  SWITCH_OVERDRAG,
  SWITCH_SLOP,
  lensStretch,
  switchDragPosition,
  switchSnap,
  touchOutset,
} from '../../src/primitives/lens-model'

const round = (value: number) => Math.round(value * 1e6) / 1e6

const VELOCITIES = [0, 120, -120, 600, -600, 1500, -1500, 4000, -4000, 1e6]
const STARTS = [0, 1]
const DRAGS = [-80, -30, -8, -2, 0, 3, 12, 13, 14, 26, 40, 90]
const TRAVELS = [0, 20, 26]
const POSITIONS = [-0.1, 0, 0.2, 0.45, 0.5, 0.55, 0.8, 1, 1.1]
const SPEEDS = [0, 1, -1, 3, -3, 8, -8, 20, -20]
const SIZES = [0, 16, 24, 28, 30, 36, 44, 52]
const TARGETS = [44, 38]

export function lensFixture() {
  return {
    constants: {
      lensThumbScale: LENS_THUMB_SCALE,
      lensStretchTime: LENS_STRETCH_TIME,
      switchOverdrag: SWITCH_OVERDRAG,
      switchDeceleration: SWITCH_DECELERATION,
      switchSlopMouse: SWITCH_SLOP.mouse,
      switchSlopTouch: SWITCH_SLOP.touch,
      contentPressScale: CONTENT_PRESS_SCALE,
      lensPillLiftX: LENS_PILL_LIFT.x,
      lensPillLiftY: LENS_PILL_LIFT.y,
      lensTabScale: LENS_TAB_SCALE,
    },
    stretch: VELOCITIES.map((v) => [v, round(lensStretch(v))]),
    dragPosition: TRAVELS.flatMap((travel) =>
      STARTS.flatMap((start) => DRAGS.map((dx) => [start, dx, travel, round(switchDragPosition(start, dx, travel))]))
    ),
    snap: POSITIONS.flatMap((p) => SPEEDS.map((v) => [p, v, switchSnap(p, v)])),
    outset: SIZES.flatMap((size) => TARGETS.map((target) => [size, target, round(touchOutset(size, target))])),
  }
}
