import type { GlassShape } from './geometry.js';
import { type LensKind } from './refraction.js';
/**
 * The real glass of a control's lens: the moving part of a slider, a switch, a segmented control or
 * a tab bar, pressed or dragged (lens.css `.lab-lens`), as iOS 26.2 draws it (research/liquid-glass/
 * LENS-MEASURED.md). The twin of Flutter's `GlassLens`. Clear: never blurred, lifted or magnified;
 * the measured veil and shade (`lensMaterial`), the rim light, the shadow and the touch glow, all
 * eased in by the lens amount. Liquid glass also bends what is behind it by the measured profile
 * (`lensBend`) through an SVG backdrop filter where the browser can (`supportsRefraction`,
 * Chromium). Transparent glass and other browsers keep the clear lens unbent. Solid glass, reduced
 * transparency, more contrast and forced colours show no lens: owners keep their rest paint.
 *
 * The element must sit above what it should bend (the track, the labels).
 */
/** What a lens is under the current theme and system settings. */
export type LensMode = 'liquid' | 'transparent' | 'off';
/** The lens mode from `<html data-lab-glass>` and the user's transparency and contrast settings. */
export declare function lensMode(): LensMode;
/** Whether lenses bend what is behind them: liquid, with the theme's refraction on, in a browser
 * whose backdrop filters bend (Chromium). */
export declare function lensBends(): boolean;
/** One lens element's glass. `update` runs on every frame the lens moves; it touches only what changed. */
export declare class GlassLensLayer {
    private readonly el;
    private readonly kind;
    private filter;
    private readonly id;
    private measured;
    private observer;
    private last;
    /**
     * `measure`: the lens takes its size and corners from the element (a thumb's own box, which CSS
     * sizes), watched with a ResizeObserver. Otherwise every `update` passes the shape.
     */
    constructor(el: HTMLElement, kind: LensKind, measure?: boolean);
    private measure;
    /**
     * Shows the lens at `lens` (0 rest … 1 glass). `shape` is the lens's box in its own pixels (only
     * its size and radius count; owners place the element) unless the layer measures itself.
     */
    update(lens: number, shape?: GlassShape): void;
    /** The SVG backdrop filter: the measured bend per colour channel (LENS_DISPERSION), cut to the shape. */
    private refraction;
    private hide;
    private dropFilter;
    dispose(): void;
}
//# sourceMappingURL=lens-layer.d.ts.map