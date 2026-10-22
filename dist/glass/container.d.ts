import * as React from 'react';
import type { GlassRenderer, GlassStyle } from '../theme-config.js';
import './glass.css';
/** The app's glass style (ThemeConfig `glass`, on `<html data-lab-glass>`), live. */
export declare function useGlassStyle(): GlassStyle;
/** The app's glass renderer (ThemeConfig `glassRenderer`, on `<html data-lab-glass-renderer>`), live. */
export declare function useGlassRenderer(): GlassRenderer;
type ContainerTag = 'div' | 'header' | 'footer' | 'nav' | 'section' | 'aside';
export type GlassContainerProps = React.HTMLAttributes<HTMLElement> & {
    /** Element to render; the container is the row itself and keeps your layout. */
    as?: ContainerTag;
    /**
     * Distance in px at which bubbles start to bend toward each other; they join at half of it.
     * Keep it below the gap between bubbles at rest so separate bubbles stay apart. Default 8.
     */
    spacing?: number;
    /** `pointer` (default) turns the light toward a mouse or pen; `static` keeps it at the top-left. */
    light?: 'pointer' | 'static';
    /**
     * Bubbles respond to a press like Apple's interactive glass: they swell, stretch toward a
     * dragging finger, glow from the touch point onto nearby bubbles and spring back. Default true;
     * off with reduced motion.
     */
    interactive?: boolean;
    /**
     * Small glass flips between light and dark to stay legible over what is behind it: a region
     * marked `data-lab-backdrop="dark|light"` (photos, video, maps) or the first solid background
     * colour. Glass taller than 72px never flips. Default true.
     */
    adaptive?: boolean;
};
/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. The app's ThemeConfig `glass` sets the style: `liquid` (moving
 * light, press response), `frosted` (still light, no press) or `solid` (opaque). Bubbles that come within `spacing` bend toward each other and
 * merge; a bubble that splits into several grows them out of itself; new and removed bubbles
 * materialize. Bubbles keep their layout, focus and semantics; only the paint moves here. Without
 * JavaScript, or in forced colors, every bubble paints its own glass as before.
 */
export declare const GlassContainer: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & {
    /** Element to render; the container is the row itself and keeps your layout. */
    as?: ContainerTag;
    /**
     * Distance in px at which bubbles start to bend toward each other; they join at half of it.
     * Keep it below the gap between bubbles at rest so separate bubbles stay apart. Default 8.
     */
    spacing?: number;
    /** `pointer` (default) turns the light toward a mouse or pen; `static` keeps it at the top-left. */
    light?: "pointer" | "static";
    /**
     * Bubbles respond to a press like Apple's interactive glass: they swell, stretch toward a
     * dragging finger, glow from the touch point onto nearby bubbles and spring back. Default true;
     * off with reduced motion.
     */
    interactive?: boolean;
    /**
     * Small glass flips between light and dark to stay legible over what is behind it: a region
     * marked `data-lab-backdrop="dark|light"` (photos, video, maps) or the first solid background
     * colour. Glass taller than 72px never flips. Default true.
     */
    adaptive?: boolean;
} & React.RefAttributes<HTMLElement>>;
/**
 * A GlassContainer unless one already encloses it, then a plain element. Kit rows (app bar,
 * toolbar, dock, search) use it so they share one material without ever nesting containers.
 */
export declare const GlassScope: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & {
    /** Element to render; the container is the row itself and keeps your layout. */
    as?: ContainerTag;
    /**
     * Distance in px at which bubbles start to bend toward each other; they join at half of it.
     * Keep it below the gap between bubbles at rest so separate bubbles stay apart. Default 8.
     */
    spacing?: number;
    /** `pointer` (default) turns the light toward a mouse or pen; `static` keeps it at the top-left. */
    light?: "pointer" | "static";
    /**
     * Bubbles respond to a press like Apple's interactive glass: they swell, stretch toward a
     * dragging finger, glow from the touch point onto nearby bubbles and spring back. Default true;
     * off with reduced motion.
     */
    interactive?: boolean;
    /**
     * Small glass flips between light and dark to stay legible over what is behind it: a region
     * marked `data-lab-backdrop="dark|light"` (photos, video, maps) or the first solid background
     * colour. Glass taller than 72px never flips. Default true.
     */
    adaptive?: boolean;
} & React.RefAttributes<HTMLElement>>;
export {};
//# sourceMappingURL=container.d.ts.map