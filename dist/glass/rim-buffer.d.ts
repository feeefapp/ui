import type { GlassRect } from './geometry.js';
type Size = {
    width: number;
    height: number;
};
/** Backing size in physical pixels; retain a bucket until it is over twice the active bucket. */
export declare function rimBufferCapacity(active: number, current?: number): number;
/** Pixels from the previous image that a new exact-sized putImageData will not overwrite. */
export declare function obsoleteRimRegions(previous: Size, active: Size): GlassRect[];
export {};
//# sourceMappingURL=rim-buffer.d.ts.map