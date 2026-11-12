/** Ordered 8×8 dithering, inspired by the Wave reference; transparent CPU paint avoids GPU driver artifacts. */
export declare function installFoPixelFallback(original: HTMLCanvasElement, options?: {
    density?: number;
    speed?: number;
}): () => void;
//# sourceMappingURL=pixel-fallback.d.ts.map