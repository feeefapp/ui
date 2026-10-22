import * as React from 'react';
import './glass.css';
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
};
/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. Bubbles that come within `spacing` bend toward each other and
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
} & React.RefAttributes<HTMLElement>>;
export {};
//# sourceMappingURL=container.d.ts.map