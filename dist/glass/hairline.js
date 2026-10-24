import { prepareUnionDistance, unionLoops } from './geometry.js';
import { GLASS_HAIRLINE } from './material.js';
/** Contour cell (px) of the walk; points are then settled exactly on the outline. */
const STEP = 2;
export function hairlineBands(shapes, spacing) {
    const ring = [];
    const sliver = [];
    if (!shapes.length)
        return { ring, sliver };
    const distance = prepareUnionDistance(shapes, spacing);
    const { width } = GLASS_HAIRLINE.ring;
    const { shift, inset } = GLASS_HAIRLINE.sliver;
    for (const loop of unionLoops(shapes, spacing, STEP)) {
        const outline = [];
        const ringOuter = [];
        const sliverOuter = [];
        let reach = 0;
        for (const [x0, y0] of loop) {
            // Settle the contour point on the zero level along the gradient (marching squares interpolate).
            let x = x0;
            let y = y0;
            let nx = 0;
            let ny = 0;
            for (let i = 0; i < 2; i++) {
                nx = distance(x + 0.25, y) - distance(x - 0.25, y);
                ny = distance(x, y + 0.25) - distance(x, y - 0.25);
                const length = Math.hypot(nx, ny) || 1;
                nx /= length;
                ny /= length;
                const d = distance(x, y);
                x -= nx * d;
                y -= ny * d;
            }
            // The outline moved left / right and pulled in: how far it still reaches past this point.
            const right = -(distance(x - shift, y) + inset);
            const left = -(distance(x + shift, y) + inset);
            const t = Math.max(0, right, left);
            reach = Math.max(reach, t);
            outline.push([x, y]);
            ringOuter.push([x + nx * width, y + ny * width]);
            sliverOuter.push([x + nx * t, y + ny * t]);
        }
        if (outline.length < 3 || !outline.every(([px, py]) => Number.isFinite(px) && Number.isFinite(py)))
            continue;
        ring.push(ringOuter, outline);
        if (reach > 0.01)
            sliver.push(sliverOuter, outline);
    }
    return { ring, sliver };
}
/** Loops as one SVG path, moved by (`dx`, `dy`); fill it even-odd. Empty when there are none. */
export function bandPath(loops, dx = 0, dy = 0) {
    return loops
        .map((points) => `M${points.map(([x, y]) => `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`).join('L')}Z`)
        .join('');
}
//# sourceMappingURL=hairline.js.map