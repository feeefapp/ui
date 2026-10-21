/** Pure ladder helpers (no React, no CSS) so they can be unit tested. */
/**
 * Quality ladder: one control that moves between curated models, cheapest first.
 * Web port of marchant `tools/ai/widgets/model_ladder_selector.dart`.
 */
export type LadderStop = {
  access?: 'free' | 'pro'
  modelId: string
  /** Tier word shown large, e.g. "Fast", "Pro". Replaced by a positional tier when it copies the name or id. */
  label: string
  modelName: string
  /** Optional one-liner shown in the model list. */
  description?: string | null
  /** Typical price per run, when known. Never estimated on the client. */
  priceUsd?: number | null
}

/** A ladder as the Lab API serves it (Cloud collection, or a priced catalog fallback). */
export type LabLadder = {
  id: string
  name: string
  source: 'cloud' | 'catalog'
  stops: {
    access?: 'free' | 'pro'
    modelId: string
    label: string
    modelName: string
    description: string | null
  }[]
  defaultIndex: number
}

/** Size and aspect of the canvas the selected model will render. */
export type AspectReadout = { size: string; aspect: string; widthOverHeight: number }

export type LadderCopy = {
  quality: string
  reset: string
  fast: string
  balanced: string
  best: string
  pickModel: string
  searchModels: string
  noMatches: string
  back: string
  typical: (price: string) => string
}

export const LADDER_COPY: LadderCopy = {
  quality: 'Quality',
  reset: 'Reset to default',
  fast: 'Fast',
  balanced: 'Balanced',
  best: 'Best',
  pickModel: 'Choose a model',
  searchModels: 'Search models…',
  noMatches: 'No models match.',
  back: 'Back to quality',
  typical: (price) => `Usually about ${price}`,
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Tier word for a stop; a label that copies the name or id becomes Fast / Balanced / Best. */
export function visibleLabel(stop: LadderStop, index: number, count: number, copy = LADDER_COPY) {
  const label = stop.label.trim()
  if (label && label !== stop.modelName.trim() && label !== stop.modelId.trim()) return label
  if (count <= 1 || index >= count - 1) return copy.best
  if (index <= 0) return copy.fast
  return copy.balanced
}

/** Human name for a list row; falls back to the tier when the catalog copied the id. */
export function displayName(stop: LadderStop, index: number, count: number, copy = LADDER_COPY) {
  const name = stop.modelName.trim()
  const id = stop.modelId.trim()
  if (name && name !== id) return name
  const label = stop.label.trim()
  if (label && label !== id && label !== name) return label
  const tier = visibleLabel(stop, index, count, copy)
  return tier === id && id ? id : tier
}

/** The ladder's middle rung is the balanced default, as in marchant. */
export const middleIndex = (count: number) => Math.max(0, Math.floor((count - 1) / 2))

/** Heat of the top rung: 0 until the thumb passes the second-to-last stop, 1 on the last. */
export const heatAt = (position: number, count: number) =>
  count <= 1 ? 1 : clamp(position - (count - 2), 0, 1)

/** USD with enough precision for cents-level AI prices. */
export const formatUsd = (value: number) =>
  value <= 0
    ? '$0'
    : value < 0.01
      ? '<$0.01'
      : value < 0.1
        ? `$${value.toFixed(3)}`
        : `$${value.toFixed(2)}`
export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const FIRE_CELL = 5
export const FIRE_PALETTE = ['#3b0a04', '#a32008', '#ff4d0a', '#ff9a1f', '#ffd54a', '#fff6c4']
/** Cheap deterministic noise in [0, 1) for one cell and frame. */
export const fireNoise = (x: number, y: number, frame: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + frame * 74.7) * 43758.5453
  return s - Math.floor(s)
}
/** Palette index for a cell, or -1 when it stays dark. `rise` is 0 at the top edge, 1 at the bottom. */
export function fireCell(col: number, row: number, rows: number, frame: number) {
  const rise = rows <= 1 ? 1 : row / (rows - 1)
  const n = fireNoise(col, row, frame)
  const v = rise * rise * (0.55 + 0.45 * n) + 0.12 * n
  if (v < 0.18) return -1
  return clamp(Math.floor(v * FIRE_PALETTE.length), 0, FIRE_PALETTE.length - 1)
}
