import * as React from 'react';
import type { GlassStyle } from '../theme-config.js';
import './glass.css';
/** The app's glass style (ThemeConfig `glass`, on `<html data-lab-glass>`), live. */
export declare function useGlassStyle(): GlassStyle;
/**
 * The app's glass material options (ThemeConfig `glassTint`, `glassBlur`, `glassRefraction`, on
 * `<html>` as `--lab-glass-tint`, `data-lab-glass-blur` and `data-lab-glass-refraction`), live.
 */
export declare function useGlassOptions(): {
    tint: number;
    blur: boolean;
    refraction: boolean;
};
type ContainerTag = 'div' | 'header' | 'footer' | 'nav' | 'section' | 'aside';
export type GlassContainerProps = React.HTMLAttributes<HTMLElement> & {
    /** Element to render; the container is the row itself and keeps your layout. */
    as?: ContainerTag;
    /**
     * Distance in px at which bubbles start to bend toward each other; they join at half of it.
     * Keep it below the gap between bubbles at rest so separate bubbles stay apart. Default 8.
     */
    spacing?: number;
    /**
     * Corner profile of the glass: `superellipse` (default) is the kit's clamped continuous corner,
     * so circle- and capsule-sized bubbles are circles and capsules and larger glass keeps the
     * continuous curve; `round` draws circular corners at every radius.
     */
    cornerShape?: 'superellipse' | 'round';
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
    /** Reflective bevel width in CSS px, 0–100; default 1. Small bubbles cap it to fit. */
    highlightWidth?: number;
    /** `surface` uses a convex bevel; `rim` (default) uses the thin, symmetric screenshot-fitted highlight. */
    highlightProfile?: 'surface' | 'rim';
    /** Local material tint, 0 clear–1 tinted (clear lifts what is behind it, clipping light content to white like iOS); omitted inherits ThemeConfig glassTint. */
    tint?: number;
    /** Surface highlight opacity multiplier, 0–10; default 1. */
    highlightStrength?: number;
    /** Backdrop bend multiplier, 0–10; default 1. Values above 1 allow stronger lens distortion. Still respects the theme’s refraction setting. */
    refractionStrength?: number;
    /** `gentle` avoids edge reversal; `measured` (default) restores the screenshot-fitted mirrored lens band. */
    refractionProfile?: 'gentle' | 'measured';
    /** ID of a separate background-only element to sample live for Firefox refraction. Must not contain this container. */
    backdropSource?: string;
};
/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. The app's ThemeConfig `glass` sets the style: `liquid` (moving
 * light, press response), `still` (fixed light, no press) or `solid` (opaque); `glassTint`,
 * `glassBlur` and `glassRefraction` set the material. Bubbles that come within `spacing` bend toward each other and
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
    /**
     * Corner profile of the glass: `superellipse` (default) is the kit's clamped continuous corner,
     * so circle- and capsule-sized bubbles are circles and capsules and larger glass keeps the
     * continuous curve; `round` draws circular corners at every radius.
     */
    cornerShape?: "superellipse" | "round";
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
    /** Reflective bevel width in CSS px, 0–100; default 1. Small bubbles cap it to fit. */
    highlightWidth?: number;
    /** `surface` uses a convex bevel; `rim` (default) uses the thin, symmetric screenshot-fitted highlight. */
    highlightProfile?: "surface" | "rim";
    /** Local material tint, 0 clear–1 tinted (clear lifts what is behind it, clipping light content to white like iOS); omitted inherits ThemeConfig glassTint. */
    tint?: number;
    /** Surface highlight opacity multiplier, 0–10; default 1. */
    highlightStrength?: number;
    /** Backdrop bend multiplier, 0–10; default 1. Values above 1 allow stronger lens distortion. Still respects the theme’s refraction setting. */
    refractionStrength?: number;
    /** `gentle` avoids edge reversal; `measured` (default) restores the screenshot-fitted mirrored lens band. */
    refractionProfile?: "gentle" | "measured";
    /** ID of a separate background-only element to sample live for Firefox refraction. Must not contain this container. */
    backdropSource?: string;
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
    /**
     * Corner profile of the glass: `superellipse` (default) is the kit's clamped continuous corner,
     * so circle- and capsule-sized bubbles are circles and capsules and larger glass keeps the
     * continuous curve; `round` draws circular corners at every radius.
     */
    cornerShape?: "superellipse" | "round";
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
    /** Reflective bevel width in CSS px, 0–100; default 1. Small bubbles cap it to fit. */
    highlightWidth?: number;
    /** `surface` uses a convex bevel; `rim` (default) uses the thin, symmetric screenshot-fitted highlight. */
    highlightProfile?: "surface" | "rim";
    /** Local material tint, 0 clear–1 tinted (clear lifts what is behind it, clipping light content to white like iOS); omitted inherits ThemeConfig glassTint. */
    tint?: number;
    /** Surface highlight opacity multiplier, 0–10; default 1. */
    highlightStrength?: number;
    /** Backdrop bend multiplier, 0–10; default 1. Values above 1 allow stronger lens distortion. Still respects the theme’s refraction setting. */
    refractionStrength?: number;
    /** `gentle` avoids edge reversal; `measured` (default) restores the screenshot-fitted mirrored lens band. */
    refractionProfile?: "gentle" | "measured";
    /** ID of a separate background-only element to sample live for Firefox refraction. Must not contain this container. */
    backdropSource?: string;
} & React.RefAttributes<HTMLElement>>;
/**
 * Glass bars floating over scrolling content (a ScrollArea's app bar and dock, a TabView's tab
 * bar): their labels sit on moving content, so every glass inside is at least `GLASS_BAR_TINT`
 * tinted and blurred with the measured blur, whatever the theme's `glassTint` and `glassBlur`
 * (glass elsewhere keeps them), as iOS bars are. Wraps its children in a layout-neutral element.
 */
export declare function GlassBar({ children, className }: {
    children: React.ReactNode;
    className?: string;
}): React.JSX.Element;
export {};
//# sourceMappingURL=container.d.ts.map