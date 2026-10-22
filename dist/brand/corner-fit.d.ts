/**
 * How a CSS corner radius relates to the superellipse it stands for (system.css `--lab-corner-fit`):
 * 1 where `corner-shape: superellipse(1.5)` works, 0.76 where the browser draws quarter circles and
 * the kit shrinks radii to look the same. Code that draws a true superellipse from a computed
 * radius divides by this; code that hands a radius back to CSS keeps it as computed.
 */
export declare function cornerFit(): number;
//# sourceMappingURL=corner-fit.d.ts.map