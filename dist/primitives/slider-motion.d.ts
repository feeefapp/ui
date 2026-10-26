import { type RefObject } from 'react';
/** Where the pointer is, in the control's own px: `x` from its inline start, `y` from its top. */
export type SliderPointer = {
    x: number;
    y: number;
};
/**
 * One spring clock for fill, thumb travel and the thumb's glass lens; never rerenders the owner.
 * While `pressed` the thumb turns into a lens (`lens-model.ts`): it grows by `LENS_THUMB_SCALE`,
 * becomes real glass over the track (`GlassLensLayer`, magnifying it for liquid glass), stretches
 * with its speed, shows the touch glow at the pointer (`pointer()`) and springs back on
 * release, on the segmented pill's springs. Reduced motion and a disabled control skip all of it.
 */
export declare function useSliderMotion(host: RefObject<HTMLDivElement | null>, target: number, tracking: boolean, pressed: boolean, thin: boolean, disabled: boolean, 
/** Lets a dragged switch thumb rubber-band past its ends instead of clamping to 0–1. */
overshoot?: boolean): {
    /** Moves the touch glow to the pointer (the control's own px, `x` from its inline start). */
    pointer(point: SliderPointer): void;
};
//# sourceMappingURL=slider-motion.d.ts.map