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

/** The nearest GlassContainer, or null when a bubble paints its own glass. */
export const GlassContext = createContext<GlassRegistry | null>(null)

/** Disjoint live paint source inherited by floating glass (not by the source's children). */
export const GlassBackdropContext = createContext<string | undefined>(undefined)
