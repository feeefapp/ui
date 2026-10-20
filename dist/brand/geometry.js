const finite = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const coordinate = (value) => Number(value.toFixed(3));
export const FO_CORNER_EXPONENT = 2 ** 1.5;
/** CSS superellipse(1.5) has exponent 2 ** 1.5, not the circular exponent 2.
 * Sample its equation rather than stretching circular border-radius arcs.
 * At typical control sizes the 32 segments per corner have subpixel error.
 */
export function foSuperellipsePath(width, height, radii, inset = 0, exponent = FO_CORNER_EXPONENT) {
    const power = 2 / Math.max(1, Number.isFinite(exponent) ? exponent : FO_CORNER_EXPONENT);
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
    const right = x + w;
    const bottom = y + h;
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const commands = [`M${coordinate(x + topLeft.x)},${coordinate(y)}`];
    const line = (px, py) => commands.push(`L${coordinate(px)},${coordinate(py)}`);
    const arc = (cx, cy, radius, quadrant) => {
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