import { type CSSProperties } from 'react';
import './pixel-art.css';
type PixelTone = 'ink' | 'sage' | 'inverse' | 'muted';
type PixelVariant = 'voice' | 'wave' | 'orbit' | 'spark';
export type PixelArtworkProps = {
    variant?: PixelVariant;
    seed?: string;
    size?: number;
    tone?: PixelTone;
    animated?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Omit for decoration; provide a title when the graphic conveys information. */
    title?: string;
};
export declare function PixelArtwork({ variant, seed, size, tone, animated, className, style, title, }: PixelArtworkProps): import("react").JSX.Element;
export type PixelTextureProps = {
    variant?: 'corner' | 'grain' | 'wave';
    seed?: string;
    density?: 'sparse' | 'medium' | 'dense';
    tone?: PixelTone;
    animated?: boolean;
    className?: string;
    style?: CSSProperties;
};
/** Overlay inside a positioned, clipped surface. It inherits the surface's ink color. */
export declare function PixelTexture({ variant, seed, density, tone, animated, className, style, }: PixelTextureProps): import("react").JSX.Element;
export type PixelLoaderProps = {
    size?: number;
    label?: string;
    decorative?: boolean;
    className?: string;
};
/** A nine-pixel loading wave; use decorative when adjacent text already announces status. */
export declare function PixelLoader({ size, label, decorative, className, }: PixelLoaderProps): import("react").JSX.Element;
export type PixelShaderProps = {
    className?: string;
    density?: number;
    speed?: number;
    style?: CSSProperties;
};
/** The CPU renderer keeps Feeef's transparent pixel field consistent across browser GPU drivers. */
export declare function PixelShader({ className, density, speed, style, }: PixelShaderProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=pixel-art.d.ts.map