import { type RefObject } from 'react';
/**
 * One spring clock for fill, thumb travel and the thumb's glass lens; never rerenders the owner.
 * While `pressed` the thumb turns into a lens (`lens-model.ts`): it grows by `LENS_THUMB_SCALE`,
 * becomes glass over the track (`GlassLensLayer`), stretches with its speed and
 * springs back on release, on the segmented pill's springs. Reduced motion and a disabled control skip all of it.
 */
export declare function useSliderMotion(host: RefObject<HTMLDivElement | null>, target: number, tracking: boolean, pressed: boolean, thin: boolean, disabled: boolean, 
/** Lets a dragged switch thumb rubber-band past its ends instead of clamping to 0–1. */
overshoot?: boolean, 
/** The thumb's lens: a slider's or a switch's (they bend and edge differently on iOS). */
lens?: 'thumb' | 'switch'): void;
//# sourceMappingURL=slider-motion.d.ts.map