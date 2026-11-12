/** Seeded pixel noise shared by PixelTexture and artwork, pure (the Flutter twin ports it). */
export type Pixel = {
    x: number;
    y: number;
    opacity: number;
    color?: string;
};
/** FNV-1a hash of a seed string. */
export declare function seedNumber(value: string): number;
/** Deterministic random numbers in [0, 1) for a seed (mulberry32). */
export declare function randomSequence(value: string): () => number;
/**
 * Squares of a PixelTexture (viewBox 256 × 96, 2px squares on a 4px grid) for a seed. `corner`
 * gathers toward the top end, `wave` along a band, `grain` everywhere.
 */
export declare function texturePixels(variant: 'corner' | 'grain' | 'wave', seed: string, density: string): Pixel[];
//# sourceMappingURL=pixel-noise.d.ts.map