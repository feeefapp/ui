'use client';
import { useContext, useEffect, useId, useLayoutEffect } from 'react';
import { GlassContext } from './context.js';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
/**
 * Joins the nearest GlassContainer with the element in `ref`, so the container paints its glass.
 * Returns whether a container is present; mark the element `data-glass-member` when it is, which
 * turns off its own paint once the container is ready. `id` defaults to a per-component id.
 */
export function useGlassMember(ref, id, options = {}) {
    const context = useContext(GlassContext);
    const glass = options.enabled === false ? null : context;
    const autoId = useId();
    const key = id ?? autoId;
    const { union, motion } = options;
    useIsomorphicLayoutEffect(() => {
        if (!glass || !ref.current)
            return;
        return glass.register(key, ref.current, { union, motion });
    }, [glass, key, union, motion]);
    // Content changes can resize the bubble without a resize the container would notice in time.
    useIsomorphicLayoutEffect(() => glass?.requestMeasure());
    return glass !== null;
}
//# sourceMappingURL=member.js.map