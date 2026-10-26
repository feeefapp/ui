const finite = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const coordinate = (value) => Number(value.toFixed(3));
/** The exponent of a fully smoothed corner: CSS `superellipse(1.5)` is 2 ** 1.5 (a circle is 2). */
export const FO_CORNER_EXPONENT = 2 ** 1.5;
/**
 * Where corner smoothing starts to fade, as a share of the largest radius a box can take (half its
 * shorter side). Below it a corner keeps the full continuous curve; from it to the full radius the
 * smoothing eases to 0, so a circle-sized corner is a circular arc.
 */
export const CORNER_SMOOTHING_FADE = 0.75;
/** Smoothing for a corner filling `fill` of the box's largest radius (1 = half the shorter side). */
function smoothingAt(fill) {
    if (!(fill > CORNER_SMOOTHING_FADE))
        return 1;
    const u = Math.min(1, (fill - CORNER_SMOOTHING_FADE) / (1 - CORNER_SMOOTHING_FADE));
    return 1 - u * u * (3 - 2 * u);
}
/**
 * Clamped continuous corners (Apple's continuous corners, Figma's clamped corner smoothing): how
 * much a corner of `radius` on a `width` × `height` box is smoothed, from 1 (the kit's
 * superellipse(1.5)) to 0 (a circular arc). Full smoothing while the radius is at most
 * CORNER_SMOOTHING_FADE (0.75) of half the shorter side, then a smoothstep down to 0 at half the
 * shorter side: a 44 × 44 bubble at r 22 is a circle, a 44-tall bar at r 22 a true capsule, and a
 * 300 × 200 card at r 16 keeps the full continuous corner. The Flutter twin is `cornerSmoothing`
 * in brand/geometry.dart (vectors in flutter/test/fixtures/corners.json).
 */
export function cornerSmoothing(radius, width, height) {
    const half = Math.min(finite(width), finite(height)) / 2;
    if (!(half > 0))
        return 0;
    return smoothingAt(finite(radius) / half);
}
/** The CSS `superellipse(k)` parameter for a smoothing (k = 1 + smoothing / 2: 1 is round, 1.5 the kit's). */
export function cornerShapeParameter(smoothing) {
    return 1 + Math.min(1, Math.max(0, smoothing)) / 2;
}
/** The superellipse exponent a corner draws with: 2 ** k, from 2 (circle) to 2 ** 1.5. */
export function cornerExponentFor(radius, width, height) {
    return 2 ** cornerShapeParameter(cornerSmoothing(radius, width, height));
}
/** CSS superellipse(k) has exponent 2 ** k: sample its equation rather than stretching circular
 * border-radius arcs. Without `exponent`, every corner takes its clamped exponent
 * (`cornerSmoothing`, measured on the box after the inset and the CSS overlap scaling); a given
 * exponent applies to all four. At typical control sizes the 32 segments per corner have subpixel
 * error.
 */
export function foSuperellipsePath(width, height, radii, inset = 0, exponent) {
    const x = finite(inset);
    const y = x;
    const w = Math.max(0, finite(width) - x * 2);
    const h = Math.max(0, finite(height) - y * 2);
    const corners = radii.map((radius) => ({
        x: Math.max(0, finite(radius.x) - x),
        y: Math.max(0, finite(radius.y) - y),
    }));
    // CSS scales all radii together when any pair would overlap an edge.
    const pairs = [
        [w, corners[0].x + corners[1].x],
        [w, corners[3].x + corners[2].x],
        [h, corners[0].y + corners[3].y],
        [h, corners[1].y + corners[2].y],
    ];
    const scale = Math.min(1, ...pairs.map(([edge, total]) => (total > 0 ? edge / total : 1)));
    corners.forEach((radius) => {
        radius.x *= scale;
        radius.y *= scale;
    });
    const fixed = exponent === undefined ? undefined : 2 / Math.max(1, Number.isFinite(exponent) ? exponent : FO_CORNER_EXPONENT);
    // An elliptical corner fades by the axis closer to its full size.
    const powerOf = (radius) => fixed ?? 2 / 2 ** cornerShapeParameter(smoothingAt(Math.max(w > 0 ? radius.x / (w / 2) : Infinity, h > 0 ? radius.y / (h / 2) : Infinity)));
    const right = x + w;
    const bottom = y + h;
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const commands = [`M${coordinate(x + topLeft.x)},${coordinate(y)}`];
    const line = (px, py) => commands.push(`L${coordinate(px)},${coordinate(py)}`);
    const arc = (cx, cy, radius, quadrant) => {
        const power = powerOf(radius);
        for (let step = 1; step <= 32; step++) {
            const angle = (quadrant + step / 32) * (Math.PI / 2);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            line(cx + radius.x * Math.sign(cos) * Math.abs(cos) ** power, cy + radius.y * Math.sign(sin) * Math.abs(sin) ** power);
        }
    };
    line(right - topRight.x, y);
    arc(right - topRight.x, y + topRight.y, topRight, 3);
    line(right, bottom - bottomRight.y);
    arc(right - bottomRight.x, bottom - bottomRight.y, bottomRight, 0);
    line(x + bottomLeft.x, bottom);
    arc(x + bottomLeft.x, bottom - bottomLeft.y, bottomLeft, 1);
    line(x, y + topLeft.y);
    arc(x + topLeft.x, y + topLeft.y, topLeft, 2);
    return `${commands.join('')}Z`;
}
/** Uniform continuous corner path retained for other Feeef brand helpers. */
export function foContinuousEdge(width, height, radius, inset = 0) {
    const corner = { x: radius, y: radius };
    return foSuperellipsePath(width, height, [corner, corner, corner, corner], inset);
}
//# sourceMappingURL=geometry.js.map