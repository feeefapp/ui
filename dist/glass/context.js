'use client';
import { createContext } from 'react';
/** Inside a GlassBar: the tint it raised its glass to (blur is always on there); null outside one. */
export const GlassBarContext = createContext(null);
/** The nearest GlassContainer, or null when a bubble paints its own glass. */
export const GlassContext = createContext(null);
//# sourceMappingURL=context.js.map