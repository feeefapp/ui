import type { GlassRect } from './geometry'

type Size = { width: number; height: number }

/** Backing size in physical pixels; retain a bucket until it is over twice the active bucket. */
export function rimBufferCapacity(active: number, current = 0) {
  const rounded = Math.max(64, Math.ceil(active / 64) * 64)
  return current < rounded || current > rounded * 2 ? rounded : current
}

/** Pixels from the previous image that a new exact-sized putImageData will not overwrite. */
export function obsoleteRimRegions(previous: Size, active: Size): GlassRect[] {
  const regions: GlassRect[] = []
  if (previous.width > active.width) regions.push({
    x: active.width, y: 0, width: previous.width - active.width, height: previous.height,
  })
  if (previous.height > active.height) regions.push({
    x: 0, y: active.height, width: Math.min(previous.width, active.width), height: previous.height - active.height,
  })
  return regions
}
