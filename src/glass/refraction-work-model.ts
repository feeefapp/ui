import type { RefractionProfile } from './refraction'
import type { GlassShape } from './geometry'
import { liveDisplacementMap, rgbaBmpBytes } from './refraction'

/** Geometry in material coordinates; the key identifies its exact optical configuration. */
export type RefractionWorkRequest = {
  key: string
  width: number
  height: number
  shapes: readonly GlassShape[]
  spacing: number
  glintWidth?: number
  regularity?: number
  profile: RefractionProfile
}
/** Exact opaque Firefox map encoded as a BMP, ready for a Blob URL and image decoding. */
export type RefractionWorkResult = { key: string; scale: number; bytes: ArrayBuffer }
export type RefractionWorkerMessage = { id: number; request: RefractionWorkRequest }
export type RefractionWorkerReply =
  | { id: number; result: RefractionWorkResult }
  | { id: number; error: string }

/** The worker and its CSP/unsupported-browser fallback use this same pixel calculation. */
export function buildRefractionBitmap(request: RefractionWorkRequest): RefractionWorkResult {
  const pixels = liveDisplacementMap(request.width, request.height, [request.shapes], request.spacing, request.profile, request.glintWidth, request.regularity)
  // Firefox clips the live element to the current CSS outline. An opaque map keeps an older
  // decoded lens from imposing its previous silhouette while the next shape is prepared.
  for (let pixel = 3; pixel < pixels.data.length; pixel += 4) pixels.data[pixel] = 255
  const bytes = rgbaBmpBytes(pixels.width, pixels.height, pixels.data)
  return { key: request.key, scale: pixels.scale, bytes: bytes.buffer as ArrayBuffer }
}
