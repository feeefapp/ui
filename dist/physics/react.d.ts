import { type RefObject } from 'react';
import { type LabPanOptions } from './gesture.js';
import { LabMotionValue } from './motion-value.js';
/** Live `prefers-reduced-motion`; false on the server. */
export declare function useLabReducedMotion(): boolean;
/** A motion value that lives as long as the component. `restDelta` is in the value's units. */
export declare function useLabMotionValue(initial: number, restDelta?: number): LabMotionValue;
/** Calls `paint` with every value (and once on mount), before the browser paints. */
export declare function useLabMotionPaint(value: LabMotionValue, paint: (value: number) => void): void;
/**
 * Attaches a pan recognizer to `ref`. Options are read live, so callbacks may close over fresh
 * state. Set `touch-action` on the element (`pan-y` for an x pan, `pan-x` for a y pan) unless
 * the pan uses `touch: 'claim'`.
 */
export declare function useLabPan(ref: RefObject<HTMLElement | null>, options: LabPanOptions, enabled?: boolean): void;
//# sourceMappingURL=react.d.ts.map