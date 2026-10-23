import { type RefObject } from 'react';
import { type PanOptions } from './gesture.js';
import { MotionValue } from './motion-value.js';
import type { Motion } from '../theme-config.js';
/** Live `motionOf()`: ThemeConfig `motion` made stricter by the reader's setting; `full` on the server. */
export declare function useMotion(): Motion;
/** Live `prefersReducedMotion()` (the reader's setting, or ThemeConfig `motion` reduced/none); false on the server. */
export declare function useReducedMotion(): boolean;
/** A motion value that lives as long as the component. `restDelta` is in the value's units. */
export declare function useMotionValue(initial: number, restDelta?: number): MotionValue;
/** Calls `paint` with every value (and once on mount), before the browser paints. */
export declare function useMotionPaint(value: MotionValue, paint: (value: number) => void): void;
/**
 * Attaches a pan recognizer to `ref`. Options are read live, so callbacks may close over fresh
 * state. Set `touch-action` on the element (`pan-y` for an x pan, `pan-x` for a y pan) unless
 * the pan uses `touch: 'claim'`.
 */
export declare function usePan(ref: RefObject<HTMLElement | null>, options: PanOptions, enabled?: boolean): void;
//# sourceMappingURL=react.d.ts.map