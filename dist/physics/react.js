'use client';
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { attachPan } from './gesture.js';
import { MotionValue, motionOf, onMotionChange, prefersReducedMotion } from './motion-value.js';
/** Live `motionOf()`: ThemeConfig `motion` made stricter by the reader's setting; `full` on the server. */
export function useMotion() {
    return useSyncExternalStore(onMotionChange, () => motionOf(), () => 'full');
}
/** Live `prefersReducedMotion()` (the reader's setting, or ThemeConfig `motion` reduced/none); false on the server. */
export function useReducedMotion() {
    return useSyncExternalStore(onMotionChange, prefersReducedMotion, () => false);
}
/** A motion value that lives as long as the component. `restDelta` is in the value's units. */
export function useMotionValue(initial, restDelta) {
    const ref = useRef(null);
    if (!ref.current)
        ref.current = new MotionValue(initial, restDelta);
    return ref.current;
}
/** Calls `paint` with every value (and once on mount), before the browser paints. */
export function useMotionPaint(value, paint) {
    const latest = useRef(paint);
    latest.current = paint;
    useLayoutEffect(() => {
        latest.current(value.get());
        return value.subscribe((v) => latest.current(v));
    }, [value]);
}
/**
 * Attaches a pan recognizer to `ref`. Options are read live, so callbacks may close over fresh
 * state. Set `touch-action` on the element (`pan-y` for an x pan, `pan-x` for a y pan) unless
 * the pan uses `touch: 'claim'`.
 */
export function usePan(ref, options, enabled = true) {
    const latest = useRef(options);
    latest.current = options;
    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled)
            return;
        return attachPan(element, () => latest.current);
    }, [ref, enabled]);
}
//# sourceMappingURL=react.js.map