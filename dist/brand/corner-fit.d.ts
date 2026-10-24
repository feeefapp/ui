/**
 * How a CSS corner radius relates to the continuous corner it stands for (system.css
 * `--lab-corner-fit`): 1 where `corner-shape` works, 0.76 where the browser draws quarter circles
 * and the kit shrinks fully smoothed radii to look the same. The fit fades with the corner's
 * smoothing (`cornerSmoothing`): a capsule or circle radius is never shrunk. Code that draws a true
 * continuous corner from a computed CSS radius maps it back with `trueCornerRadius`; code that
 * hands a radius to CSS uses `cssCornerRadius`.
 */
export declare function cornerFit(): number;
/** The CSS border-radius that draws a continuous corner of `radius` on a `width` × `height` box. */
export declare function cssCornerRadius(radius: number, width: number, height: number, fit?: number): number;
/**
 * The continuous corner radius a computed CSS border-radius stands for (the inverse of
 * `cssCornerRadius`, which is monotonic in the radius): the radius itself where corner-shape works
 * and for capsules and circles, up to radius / fit for fully smoothed corners.
 */
export declare function trueCornerRadius(css: number, width: number, height: number, fit?: number): number;
/** The CSS `corner-shape` for a corner of `radius` on a `width` × `height` box (`round` at full radius). */
export declare function cssCornerShape(radius: number, width: number, height: number): string;
//# sourceMappingURL=corner-fit.d.ts.map