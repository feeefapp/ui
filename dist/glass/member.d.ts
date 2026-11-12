import { type RefObject } from 'react';
import { type GlassMemberOptions } from './context.js';
/**
 * Joins the nearest GlassContainer with the element in `ref`, so the container paints its glass.
 * Returns whether a container is present; mark the element `data-glass-member` when it is, which
 * turns off its own paint once the container is ready. `id` defaults to a per-component id.
 */
export declare function useGlassMember(ref: RefObject<HTMLElement | null>, id?: string, options?: GlassMemberOptions & {
    /** False keeps the element out of the container (it paints itself or isn't glass). */
    enabled?: boolean;
}): boolean;
//# sourceMappingURL=member.d.ts.map