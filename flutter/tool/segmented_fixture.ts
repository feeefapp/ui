/** The segmented pill vectors shared by tests/segmented.test.ts and the Dart twin's test. */
import {
  segmentIndexAt,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedAutoScrollSpeed,
  segmentedRevealOffset,
  segmentedSnapIndex,
  type SegmentSpan,
} from '../../src/primitives/segmented-model'

const round = (value: number) => Math.round(value * 1e6) / 1e6

// Tracks as the control lays them out: a 2px inset, options 2px apart.
const TRACKS: { name: string; spans: SegmentSpan[] }[] = [
  {
    name: 'equal',
    spans: [
      { start: 2, width: 60 },
      { start: 64, width: 60 },
      { start: 126, width: 60 },
    ],
  },
  {
    name: 'uneven',
    spans: [
      { start: 2, width: 52 },
      { start: 56, width: 110 },
      { start: 168, width: 74 },
      { start: 244, width: 90 },
    ],
  },
  {
    // Right to left: option order runs from the right edge leftwards.
    name: 'rtl',
    spans: [
      { start: 244, width: 90 },
      { start: 168, width: 74 },
      { start: 56, width: 110 },
      { start: 2, width: 52 },
    ],
  },
  {
    name: 'disabled',
    spans: [
      { start: 2, width: 70 },
      { start: 74, width: 70, disabled: true },
      { start: 146, width: 70 },
    ],
  },
]
const POINTS = [-40, -10, 0, 2, 20, 31, 32, 60, 63, 94, 100, 140, 155, 200, 230, 280, 334, 340, 360, 400]
const GRABS = [0, -14, 9]
const VELOCITIES = [0, 120, -120, 600, -600, 1500, -1500, 4000, -4000]
const CENTERS = [10, 32, 60, 94, 120, 156, 200, 289]

// Scrolling: viewports (start, end) and pointers for the auto-scroll ramp, then reveals of an
// option [start, end] in a view `viewport` wide scrolled to `offset` of at most `max`.
const VIEWS = [
  [0, 320],
  [0, 90],
  [12, 212],
  [0, 0],
]
const AUTO_POINTERS = [-30, 0, 5, 13.3, 20, 39.9, 40, 60, 100, 160, 200, 280, 300, 315, 320, 360]
const REVEALS = [
  // offset, max, viewport, start, end
  [0, 400, 320, 2, 60],
  [0, 400, 320, 280, 340],
  [0, 400, 320, 300, 380],
  [120, 400, 320, 100, 150],
  [120, 400, 320, 10, 60],
  [200, 400, 320, 650, 720],
  [400, 400, 320, 640, 718],
  [0, 0, 320, 2, 60],
  [50, 400, 100, 60, 180],
  [300, 400, 320, 350, 380],
]

export function segmentedFixture() {
  return {
    autoScroll: VIEWS.flatMap(([a, b]) => AUTO_POINTERS.map((x) => [x, a, b, round(segmentedAutoScrollSpeed(x, a, b))])),
    reveal: REVEALS.map((r) => [...r, round(segmentedRevealOffset(r[0], r[1], r[2], r[3], r[4]))]),
    tracks: TRACKS.map(({ name, spans }) => ({
      name,
      spans,
      indexAt: POINTS.map((x) => [x, segmentIndexAt(x, spans)]),
      dragCenter: POINTS.flatMap((x) => GRABS.map((grab) => [x, grab, round(segmentedDragCenter(x, grab, spans))])),
      pillWidth: POINTS.map((x) => [x, round(segmentedPillWidth(x, spans))]),
      snap: CENTERS.flatMap((c) => VELOCITIES.map((v) => [c, v, segmentedSnapIndex(c, v, spans)])),
    })),
  }
}
