import type { GlassShape } from './geometry.js';
/**
 * The real glass of a control's lens: the moving part of a slider, a switch, a segmented control or
 * a tab bar, pressed or dragged (lens.css `.lab-lens`). The twin of Flutter's `GlassLens`: the
 * backdrop at clear glass's tint (`lensMaterial`: saturation and lift eased in by the lens amount),
 * never blurred, the rim light, the exterior hairline and the touch glow. Liquid glass bends at the
 * rim and magnifies what it covers through an SVG backdrop filter where the browser can
 * (`supportsRefraction`, Chromium); elsewhere, and for transparent glass, the lens is a plain clear
 * lens (CSS filters). Solid glass, reduced transparency, more contrast and forced colours show no
 * lens: owners keep their rest paint.
 *
 * The element must sit above what it should bend (the track, the labels).
 */
/** What a lens is under the current theme and system settings. */
export type LensMode = 'liquid' | 'transparent' | 'off';
/** The lens mode from `<html data-lab-glass>` and the user's transparency and contrast settings. */
export declare function lensMode(): LensMode;
/** Whether lenses magnify for real: liquid, with the theme's refraction on, in a browser whose
 * backdrop filters bend (Chromium). Where they don't, a control may fake the enlargement itself. */
export declare function lensMagnifies(): boolean;
/** One lens element's glass. `update` runs on every frame the lens moves; it touches only what changed. */
export declare class GlassLensLayer {
    private readonly el;
    private filter;
    private readonly id;
    private measured;
    private observer;
    private last;
    /**
     * `measure`: the lens takes its size and corners from the element (a thumb's own box, which CSS
     * sizes), watched with a ResizeObserver. Otherwise every `update` passes the shape.
     */
    constructor(el: HTMLElement, measure?: boolean);
    private measure;
    /**
     * Shows the lens at `lens` (0 rest … 1 glass), magnifying by `magnify` at full lens (liquid glass
     * only; pass `LENS_MAGNIFY` or 0). `shape` is the lens's box in its own pixels (only its size and
     * radius count; owners place the element) unless the layer measures itself.
     */
    update(lens: number, magnify: number, shape?: GlassShape): void;
    /** The SVG backdrop filter: bend and magnify, saturate, lift, the edge, cut to the shape. */
    private refraction;
    private hide;
    private dropFilter;
    dispose(): void;
}
//# sourceMappingURL=lens-layer.d.ts.map