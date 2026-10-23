'use client';
import { createContext } from 'react';
/** The nearest GlassContainer, or null when a bubble paints its own glass. */
export const GlassContext = createContext(null);
/** Disjoint live paint source inherited by floating glass (not by the source's children). */
export const GlassBackdropContext = createContext(undefined);
//# sourceMappingURL=context.js.map