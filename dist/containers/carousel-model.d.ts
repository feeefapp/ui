/**
 * Signed distance of a slide from the track's center, in slide steps (slide width + gap):
 * 0 = centered, ±1 = the neighbor's place. Physical (screen) axis.
 */
export declare function slideProgress(slideCenter: number, trackCenter: number, step: number): number;
/** Index of the slide closest to the center. */
export declare function centeredIndex(progress: readonly number[]): number;
/**
 * Where a flicked track settles: the scroll offset projected with momentum, snapped to the
 * nearest slide's offset. Never skips more than `maxSkip` slides from `current`.
 */
export declare function flickTarget(scroll: number, velocity: number, offsets: readonly number[], current: number, maxSkip?: number): number;
/** The built-in scroll transition for a slide at `progress`. */
export declare function slideEffect(effect: 'none' | 'scale' | 'fade' | 'parallax', progress: number): {
    transform: string;
    opacity: number;
};
//# sourceMappingURL=carousel-model.d.ts.map