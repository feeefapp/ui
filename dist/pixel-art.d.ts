import { type CSSProperties } from 'react';
import './pixel-art.css';
type PixelTone = 'ink' | 'sage' | 'inverse' | 'muted';
type PixelVariant = 'voice' | 'wave' | 'orbit' | 'spark';
export type PixelArtworkProps = {
    /** Motif: `voice` (multicolor fingerprint), `wave` (2:1 band), `orbit` (ring) or `spark` (star). */
    variant?: PixelVariant;
    /** Stable string that picks the arrangement; the same seed always draws the same art. */
    seed?: string;
    /** Width in pixels. Height follows the motif's aspect ratio. */
    size?: number;
    /** Ink for `wave`, `orbit` and `spark`. `voice` uses its own seeded palette. */
    tone?: PixelTone;
    /** Adds a slow breathing animation. Stays still under reduced motion. */
    animated?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Omit for decoration; provide a title when the graphic conveys information. */
    title?: string;
};
/** Seeded pixel artwork for identity: avatars, empty states, cards. Decorative unless `title` is set. */
export declare function PixelArtwork({ variant, seed, size, tone, animated, className, style, title, }: PixelArtworkProps): import("react").JSX.Element;
export type PixelTextureProps = {
    /** Where pixels gather: `corner` toward the top end, `grain` across the field, `wave` along a band. */
    variant?: 'corner' | 'grain' | 'wave';
    /** Stable string that picks the arrangement, such as a record id. */
    seed?: string;
    /** How many squares are drawn. Opacity is set separately with `--pixel-texture-opacity`. */
    density?: 'sparse' | 'medium' | 'dense';
    /** Ink color. Omit it to inherit the surface's `currentColor`. */
    tone?: PixelTone;
    /** Adds a slow opacity pulse. Stays still under reduced motion. */
    animated?: boolean;
    className?: string;
    style?: CSSProperties;
};
/**
 * Decorative pixel paint for a surface. Absolutely positioned to fill its nearest positioned
 * ancestor, `aria-hidden` and pointer-transparent. It inherits the surface's ink color.
 */
export declare function PixelTexture({ variant, seed, density, tone, animated, className, style, }: PixelTextureProps): import("react").JSX.Element;
export type PixelLoaderProps = {
    /** Width and height in pixels. */
    size?: number;
    /** Accessible status text. Defaults to the localized "Loading…". */
    label?: string;
    /** Hides the loader from assistive technology when nearby text already announces the work. */
    decorative?: boolean;
    /** Shows progress instead of the wave: 0 … 1 lights the squares one by one in wave order (a pull-to-refresh pulling toward its threshold). */
    progress?: number;
    className?: string;
};
/** How lit square `index` is (0 … 1) at `progress` (0 … 1): one square per ninth, in wave order. */
export declare function pixelLoaderCell(index: number, progress: number): number;
/** A nine-pixel loading wave; use decorative when adjacent text already announces status. */
export declare function PixelLoader({ size, label, decorative, progress, className, }: PixelLoaderProps): import("react").JSX.Element;
export type PixelShaderProps = {
    /** Sizes and places the canvas. Copied to the drawing canvas when it starts. */
    className?: string;
    /** Strength of the pixel band, about 0.5 to 1.35 (higher values are capped). */
    density?: number;
    /** Animation speed multiplier. */
    speed?: number;
    /** Inline size and position. Copied to the drawing canvas when it starts. */
    style?: CSSProperties;
};
/**
 * Animated, transparent pixel field on a canvas, painted with ordered dithering in the theme's
 * `--lab-pixel-ink`. Runs at up to 18 fps, pauses off screen and in hidden tabs, and draws one still
 * frame under reduced motion. The CPU renderer keeps it consistent across browser GPU drivers.
 */
export declare function PixelShader({ className, density, speed, style, }: PixelShaderProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=pixel-art.d.ts.map