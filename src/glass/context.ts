'use client'

import { createContext } from 'react'

/**
 * How a bubble's glass follows its layout: `spring` animates every change (default); `follow`
 * tracks the element exactly, for bubbles that animate their own size (dock, search).
 */
export type GlassMotion = 'spring' | 'follow'

export type GlassMemberOptions = {
  /** Bubbles sharing a union name draw as one shape spanning all of them, even when apart. */
  union?: string
  motion?: GlassMotion
}

export type GlassRegistry = {
  /** Adds a bubble to the container's material. Returns the function that removes it. */
  register(id: string, element: HTMLElement, options: GlassMemberOptions): () => void
  /** Re-measures before the next paint (bubbles call it after every render). */
  requestMeasure(): void
}

/** Inside a GlassBar: the tint it raised its glass to (blur is always on there); null outside one. */
export const GlassBarContext = createContext<{ tint: number } | null>(null)

/** The nearest GlassContainer, or null when a bubble paints its own glass. */
export const GlassContext = createContext<GlassRegistry | null>(null)
