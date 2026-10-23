/** The segmented pill vectors shared by tests/segmented.test.ts and the Dart twin's test. */
import {
  segmentIndexAt,
  segmentedDragCenter,
  segmentedPillWidth,
  segmentedSnapIndex,
  segmentedStretch,
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

export function segmentedFixture() {
  return {
    tracks: TRACKS.map(({ name, spans }) => ({
      name,
      spans,
      indexAt: POINTS.map((x) => [x, segmentIndexAt(x, spans)]),
      dragCenter: POINTS.flatMap((x) => GRABS.map((grab) => [x, grab, round(segmentedDragCenter(x, grab, spans))])),
      pillWidth: POINTS.map((x) => [x, round(segmentedPillWidth(x, spans))]),
      snap: CENTERS.flatMap((c) => VELOCITIES.map((v) => [c, v, segmentedSnapIndex(c, v, spans)])),
    })),
    stretch: VELOCITIES.map((v) => [v, round(segmentedStretch(v))]),
  }
}
