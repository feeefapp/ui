import { FO_CORNER_EXPONENT, cornerExponentFor, foSuperellipsePath } from '../brand/geometry.js';
const finite = (value) => (Number.isFinite(value) ? value : 0);
/** Corner radius a shape actually draws with: never more than half its shorter side. */
export function clampRadius(shape) {
    return Math.max(0, Math.min(finite(shape.radius), shape.width / 2, shape.height / 2));
}
const NORM_STEPS = 512;
const NORM = Float64Array.from({ length: NORM_STEPS + 1 }, (_, i) => (1 + (i / NORM_STEPS) ** FO_CORNER_EXPONENT) ** (1 / FO_CORNER_EXPONENT));
/** The exponent a shape's corners draw with: its own, or the kit's clamped continuous corner. */
export function shapeExponent(shape) {
    return shape.cornerExponent ?? cornerExponentFor(clampRadius(shape), shape.width, shape.height);
}
/**
 * Signed distance from a point to a rounded box with superellipse corners (the kit's clamped
 * continuous corner, `shapeExponent`): negative inside, zero on the outline. The zero level
 * is exactly the curve `foSuperellipsePath` draws; away from it the value is a close
 * approximation, which is all a smooth union needs.
 */
export function shapeDistance(px, py, shape, exponent = shapeExponent(shape)) {
    const r = clampRadius(shape);
    const hx = shape.width / 2;
    const hy = shape.height / 2;
    return roundedBoxDistance(px, py, shape.x + hx, shape.y + hy, hx, hy, r, exponent);
}
function roundedBoxDistance(px, py, cx, cy, hx, hy, r, exponent) {
    const qx = Math.abs(px - cx) - hx + r;
    const qy = Math.abs(py - cy) - hy + r;
    return cornerDistance(qx, qy, r, exponent);
}
function cornerDistance(qx, qy, r, exponent) {
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    let outside;
    if (ox === 0 || oy === 0)
        outside = ox + oy;
    else if (exponent === 2)
        outside = Math.sqrt(ox * ox + oy * oy);
    else if (exponent === FO_CORNER_EXPONENT) {
        // (a^n + b^n)^(1/n) = max · (1 + (min/max)^n)^(1/n), read from a table: this runs per pixel.
        const high = Math.max(ox, oy);
        const t = (Math.min(ox, oy) / high) * NORM_STEPS;
        const index = Math.min(NORM_STEPS - 1, Math.floor(t));
        outside = high * (NORM[index] + (NORM[index + 1] - NORM[index]) * (t - index));
    }
    else
        outside = (ox ** exponent + oy ** exponent) ** (1 / exponent);
    return outside + Math.min(Math.max(qx, qy), 0) - r;
}
/**
 * Smooth minimum (quadratic). Two distances closer than `k` blend: outlines start to bend toward
 * each other when the gap between shapes drops below `k` and join when it drops below `k / 2`.
 * `k <= 0` is the plain union.
 */
export function smoothMin(a, b, k) {
    if (!(k > 0))
        return Math.min(a, b);
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - (h * h * k) / 4;
}
/** Share of `spacing` two touching shapes blend with (measured on rendered Liquid Glass). */
export const GLASS_MERGE_BASE = 0.65;
/** How much the blend widens per unit of gap / spacing, up to the full `spacing`. */
export const GLASS_MERGE_GAP = 0.65;
/**
 * Blend width for two shapes `gap` px apart in a container with `spacing`: the full spacing while
 * they approach (so they start to bend at `spacing` and join at half of it, like Apple's
 * GlassEffectContainer), then narrower as they close in, so the neck between touching shapes
 * stays slim instead of swelling into one blob.
 */
export function mergeWidth(gap, spacing) {
    if (!(spacing > 0))
        return 0;
    return spacing * Math.min(1, GLASS_MERGE_BASE + (GLASS_MERGE_GAP * Math.max(0, gap)) / spacing);
}
const widths = new WeakMap();
/** Each shape's blend width against the shapes before it (its nearest one), cached per array. */
function blendWidths(shapes, spacing) {
    const cached = widths.get(shapes);
    if (cached && cached.spacing === spacing && cached.k.length === shapes.length)
        return cached.k;
    const k = shapes.map((shape, i) => {
        if (i === 0)
            return 0;
        let gap = Infinity;
        for (let j = 0; j < i; j++)
            gap = Math.min(gap, rectGap(shape, shapes[j]));
        return mergeWidth(gap, spacing);
    });
    widths.set(shapes, { spacing, k });
    return k;
}
/** Distance to the union of `shapes`, blended by `spacing` (see `mergeWidth`). */
export function unionDistance(px, py, shapes, spacing) {
    const k = shapes.length > 1 ? blendWidths(shapes, spacing) : null;
    let d = Infinity;
    for (let i = 0; i < shapes.length; i++) {
        const s = shapeDistance(px, py, shapes[i]);
        d = d === Infinity ? s : smoothMin(d, s, k[i]);
    }
    return d;
}
/**
 * Prepare one immutable geometry frame for repeated pixel/normal sampling. Uses the same
 * distance and blend arithmetic as unionDistance, with member centres, clamped radii and
 * blend widths resolved once instead of on every sample. Rebuild after changing a shape.
 */
export function prepareUnionDistance(shapes, spacing) {
    const boxes = shapes.map(shape => {
        const hx = shape.width / 2;
        const hy = shape.height / 2;
        return { cx: shape.x + hx, cy: shape.y + hy, hx, hy, radius: clampRadius(shape), exponent: shapeExponent(shape) };
    });
    const widths = blendWidths(shapes, spacing);
    const distance = (px, py) => {
        let d = Infinity;
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            const qx = Math.abs(px - box.cx) - box.hx + box.radius;
            const qy = Math.abs(py - box.cy) - box.hy + box.radius;
            // Distance to the unrounded box is a lower bound. A farther member cannot change a
            // smooth minimum once it lies beyond the current distance plus the blend width.
            if (Math.max(qx, qy) - box.radius >= d + widths[i] + 1e-8)
                continue;
            const next = cornerDistance(qx, qy, box.radius, box.exponent);
            d = d === Infinity ? next : smoothMin(d, next, widths[i]);
        }
        return d;
    };
    return distance;
}
/** Gap between two boxes (0 when they touch or overlap). */
export function rectGap(a, b) {
    const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
    const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
    return Math.hypot(dx, dy);
}
/** Groups shapes that are close enough to blend (gap below `spacing`), in input order. */
export function glassClusters(shapes, spacing) {
    const parent = shapes.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < shapes.length; i++)
        for (let j = i + 1; j < shapes.length; j++)
            if (rectGap(shapes[i], shapes[j]) < spacing)
                parent[find(j)] = find(i);
    const groups = new Map();
    shapes.forEach((shape, i) => {
        const root = find(i);
        if (!groups.has(root))
            groups.set(root, []);
        groups.get(root).push(shape);
    });
    return [...groups.values()];
}
/** Bounding box of several rects. */
export function boundsOf(rects) {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.width));
    const bottom = Math.max(...rects.map((r) => r.y + r.height));
    return { x, y, width: right - x, height: bottom - y };
}
/**
 * Conservative bounds of the blended surface, including the growth outside member boxes.
 * A smooth minimum can move the zero contour outwards by k / 4 even when both members fit
 * inside the same rectangle. Repeating the same monotone blend on the distance lower bound
 * bounds that growth for any number of members without summing an unnecessarily large pad.
 */
export function unionBounds(shapes, spacing) {
    if (!shapes.length)
        return { x: 0, y: 0, width: 0, height: 0 };
    const box = boundsOf(shapes);
    let growth = 0;
    for (const width of blendWidths(shapes, spacing))
        growth = -smoothMin(-growth, 0, width);
    return {
        x: box.x - growth,
        y: box.y - growth,
        width: box.width + growth * 2,
        height: box.height + growth * 2,
    };
}
const round = (value) => Math.round(value * 100) / 100;
/** Moves every point of an SVG path made of `M`/`L` commands by `dx`, `dy`. */
export function translatePath(d, dx, dy) {
    return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${round(Number(x) + dx)},${round(Number(y) + dy)}`);
}
/** The exact outline of one shape, as the kit draws it elsewhere (SVG path, absolute coordinates). */
export function shapePath(shape) {
    const r = clampRadius(shape);
    const corner = { x: r, y: r };
    return translatePath(foSuperellipsePath(shape.width, shape.height, [corner, corner, corner, corner], 0, shape.cornerExponent), shape.x, shape.y);
}
/**
 * Closed outlines of the blended union of `shapes` (marching squares on a `cell`-sized grid with
 * linear interpolation). Every loop keeps the inside on its left, so outer outlines and holes
 * wind opposite ways and fill correctly with the nonzero rule.
 */
export function unionLoops(shapes, spacing, cell = 2) {
    if (!shapes.length)
        return [];
    const box = unionBounds(shapes, spacing);
    const distance = prepareUnionDistance(shapes, spacing);
    const pad = cell * 2;
    const ox = box.x - pad;
    const oy = box.y - pad;
    const nx = Math.max(1, Math.ceil((box.width + pad * 2) / cell));
    const ny = Math.max(1, Math.ceil((box.height + pad * 2) / cell));
    const field = new Float64Array((nx + 1) * (ny + 1));
    const at = (i, j) => field[j * (nx + 1) + i];
    for (let j = 0; j <= ny; j++)
        for (let i = 0; i <= nx; i++) {
            const value = distance(ox + i * cell, oy + j * cell);
            field[j * (nx + 1) + i] = value === 0 ? 1e-9 : value;
        }
    const points = new Map();
    const point = (key, ax, ay, av, bx, by, bv) => {
        if (!points.has(key)) {
            const t = av / (av - bv);
            points.set(key, [round(ox + (ax + (bx - ax) * t) * cell), round(oy + (ay + (by - ay) * t) * cell)]);
        }
        return key;
    };
    const links = new Map();
    const link = (a, b) => {
        if (!links.has(a))
            links.set(a, []);
        if (!links.has(b))
            links.set(b, []);
        links.get(a).push(b);
        links.get(b).push(a);
    };
    for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
            const tl = at(i, j);
            const tr = at(i + 1, j);
            const br = at(i + 1, j + 1);
            const bl = at(i, j + 1);
            const top = tl < 0 !== tr < 0 ? point(`h${i},${j}`, i, j, tl, i + 1, j, tr) : null;
            const bottom = bl < 0 !== br < 0 ? point(`h${i},${j + 1}`, i, j + 1, bl, i + 1, j + 1, br) : null;
            const left = tl < 0 !== bl < 0 ? point(`v${i},${j}`, i, j, tl, i, j + 1, bl) : null;
            const right = tr < 0 !== br < 0 ? point(`v${i + 1},${j}`, i + 1, j, tr, i + 1, j + 1, br) : null;
            const edges = [top, right, bottom, left].filter((edge) => edge !== null);
            if (edges.length === 2)
                link(edges[0], edges[1]);
            else if (edges.length === 4) {
                // Saddle: decide by the centre whether the inside corners connect through it.
                const centre = distance(ox + (i + 0.5) * cell, oy + (j + 0.5) * cell) < 0;
                if (tl < 0 === centre) {
                    link(top, right);
                    link(bottom, left);
                }
                else {
                    link(left, top);
                    link(right, bottom);
                }
            }
        }
    const loops = [];
    const seen = new Set();
    for (const start of links.keys()) {
        if (seen.has(start))
            continue;
        const loop = [];
        let previous = '';
        let current = start;
        while (!seen.has(current)) {
            seen.add(current);
            loop.push(points.get(current));
            const next = links.get(current).find((key) => key !== previous && !seen.has(key));
            if (!next)
                break;
            previous = current;
            current = next;
        }
        // Crossings that land on a grid vertex appear twice; drop the repeats.
        const unique = loop.filter(([x, y], index) => {
            const [px, py] = loop[(index + loop.length - 1) % loop.length];
            return Math.abs(x - px) > 1e-3 || Math.abs(y - py) > 1e-3;
        });
        if (unique.length < 3)
            continue;
        // Keep the inside on the left: sample just left of the longest of the first few segments.
        let best = 0;
        let bestLength = 0;
        for (let k = 0; k < Math.min(unique.length, 8); k++) {
            const [ax, ay] = unique[k];
            const [bx, by] = unique[(k + 1) % unique.length];
            const length = Math.hypot(bx - ax, by - ay);
            if (length > bestLength)
                [best, bestLength] = [k, length];
        }
        const [ax, ay] = unique[best];
        const [bx, by] = unique[(best + 1) % unique.length];
        const sx = (ax + bx) / 2 + ((by - ay) / bestLength) * cell * 0.4;
        const sy = (ay + by) / 2 - ((bx - ax) / bestLength) * cell * 0.4;
        if (distance(sx, sy) > 0)
            unique.reverse();
        loops.push(unique);
    }
    return loops;
}
/** Signed area of a loop (screen coordinates, y down): positive for clockwise. */
export function loopArea(loop) {
    let area = 0;
    for (let i = 0; i < loop.length; i++) {
        const [ax, ay] = loop[i];
        const [bx, by] = loop[(i + 1) % loop.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const loopPath = (loop) => `M${loop.map(([x, y]) => `${x},${y}`).join('L')}Z`;
/** One cluster's outline: the exact shape when alone, the blended union when several. */
export function clusterPath(shapes, spacing, cell = 2) {
    if (shapes.length === 1)
        return shapePath(shapes[0]);
    return unionLoops(shapes, spacing, cell).map(loopPath).join('');
}
/** Outline of every cluster, one SVG path per cluster. */
export function glassPaths(shapes, spacing, cell = 2) {
    return glassClusters(shapes.filter((s) => s.width > 0.5 && s.height > 0.5), spacing).map((cluster) => {
        // Keep single-member CSS border-radius boxes exact. Merged surfaces can protrude beyond
        // every member: use their actual contour, plus room for its anti-aliased edge, for all
        // paint buffers. Raw member bounds clipped that fringe during collisions and morphs.
        if (cluster.length === 1)
            return { shapes: cluster, bounds: boundsOf(cluster), d: shapePath(cluster[0]) };
        const loops = unionLoops(cluster, spacing, cell);
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        for (const loop of loops)
            for (const [x, y] of loop) {
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x);
                bottom = Math.max(bottom, y);
            }
        const fringe = 1;
        const bounds = loops.length
            ? { x: left - fringe, y: top - fringe, width: right - left + fringe * 2, height: bottom - top + fringe * 2 }
            : unionBounds(cluster, spacing);
        return { shapes: cluster, bounds, d: loops.map(loopPath).join('') };
    });
}
/** The frame of a container from its screen box and its own layout size (`offsetWidth/Height`). */
export function hostFrame(box, layoutWidth, layoutHeight) {
    const scaleX = layoutWidth > 0 && box.width > 0 ? box.width / layoutWidth : 1;
    const scaleY = layoutHeight > 0 && box.height > 0 ? box.height / layoutHeight : 1;
    return { left: box.left, top: box.top, scaleX, scaleY };
}
/** A screen point in the container's own pixels. */
export function toLocalPoint(frame, x, y) {
    return { x: (x - frame.left) / frame.scaleX, y: (y - frame.top) / frame.scaleY };
}
/** A container-local point on screen. */
export function toScreenPoint(frame, x, y) {
    return { x: frame.left + x * frame.scaleX, y: frame.top + y * frame.scaleY };
}
/** A screen box (getBoundingClientRect) in the container's own pixels. */
export function toLocalRect(frame, box) {
    const { x, y } = toLocalPoint(frame, box.left, box.top);
    return { x, y, width: box.width / frame.scaleX, height: box.height / frame.scaleY };
}
/** An axis a clip leaves open reaches this far (px) both ways. */
const OPEN = 1e7;
/** Which axes an element clips its descendants on, from its computed style, and the box it clips to. */
export function clipAxes(style) {
    // `display: contents` has no box; overflow doesn't apply to inline boxes.
    if (style.display === 'contents' || style.display === 'inline')
        return { x: false, y: false, box: 'padding' };
    const paint = /\b(paint|strict|content)\b/.test(style.contain ?? '');
    const shape = !!style.clipPath && style.clipPath !== 'none';
    const x = paint || shape || style.overflowX !== 'visible';
    const y = paint || shape || style.overflowY !== 'visible';
    return { x, y, box: shape && !paint && style.overflowX === 'visible' && style.overflowY === 'visible' ? 'border' : 'padding' };
}
/** A clipping box with the axes it doesn't clip opened up. */
export function openClip(box, axes) {
    return {
        x: axes.x ? box.x : -OPEN,
        y: axes.y ? box.y : -OPEN,
        width: axes.x ? box.width : OPEN * 2,
        height: axes.y ? box.height : OPEN * 2,
    };
}
/**
 * The part of the container a bubble's glass may paint in: the intersection of its clipping
 * ancestors' boxes (overflow, clip-path, contain: paint), in the container's pixels. Undefined
 * when nothing clips it; an empty rect when it is scrolled or clipped out of view.
 */
export function memberClip(clips) {
    if (!clips.length)
        return undefined;
    let left = -Infinity;
    let top = -Infinity;
    let right = Infinity;
    let bottom = Infinity;
    for (const clip of clips) {
        left = Math.max(left, clip.x);
        top = Math.max(top, clip.y);
        right = Math.min(right, clip.x + clip.width);
        bottom = Math.min(bottom, clip.y + clip.height);
    }
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
/** True when two rects share some area (touching edges don't). */
export function rectsOverlap(a, b) {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
/** True when `outer` contains `inner`. */
export function rectCovers(outer, inner) {
    return outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.width >= inner.x + inner.width && outer.y + outer.height >= inner.y + inner.height;
}
/**
 * A path of `M`/`L`/`Z` polygons cut to `clip` (Sutherland–Hodgman per loop): the scissored
 * outline, straight at the clip edge. Winding is kept, so holes still fill correctly.
 */
export function scissorPath(d, clip) {
    const right = clip.x + clip.width;
    const bottom = clip.y + clip.height;
    const edges = [
        [(p) => p[0] >= clip.x, (a, b) => [clip.x, a[1] + ((b[1] - a[1]) * (clip.x - a[0])) / (b[0] - a[0])]],
        [(p) => p[0] <= right, (a, b) => [right, a[1] + ((b[1] - a[1]) * (right - a[0])) / (b[0] - a[0])]],
        [(p) => p[1] >= clip.y, (a, b) => [a[0] + ((b[0] - a[0]) * (clip.y - a[1])) / (b[1] - a[1]), clip.y]],
        [(p) => p[1] <= bottom, (a, b) => [a[0] + ((b[0] - a[0]) * (bottom - a[1])) / (b[1] - a[1]), bottom]],
    ];
    const number = '(-?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)';
    let out = '';
    for (const loop of d.split('M').slice(1)) {
        let points = [...loop.matchAll(new RegExp(`${number},${number}`, 'g'))].map((m) => [Number(m[1]), Number(m[2])]);
        for (const [inside, cross] of edges) {
            if (points.length < 3)
                break;
            const next = [];
            for (let i = 0; i < points.length; i++) {
                const a = points[(i + points.length - 1) % points.length];
                const b = points[i];
                if (inside(b)) {
                    if (!inside(a))
                        next.push(cross(a, b));
                    next.push(b);
                }
                else if (inside(a))
                    next.push(cross(a, b));
            }
            points = next;
        }
        if (points.length >= 3)
            out += loopPath(points.map(([x, y]) => [round(x), round(y)]));
    }
    return out;
}
/** CSS `clip-path: inset(…)` cutting an element laid out at `box` to `clip`; '' when it doesn't cut. */
export function clipInset(box, clip) {
    if (!clip || rectCovers(clip, box))
        return '';
    const side = (value, size) => round(Math.min(size, Math.max(0, value)));
    const top = side(clip.y - box.y, box.height);
    const left = side(clip.x - box.x, box.width);
    const bottom = side(box.y + box.height - (clip.y + clip.height), box.height);
    const right = side(box.x + box.width - (clip.x + clip.width), box.width);
    return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}
/**
 * `glassPaths` for bubbles that may sit in clipped views: `clips[i]` is shape i's visible rect
 * (`memberClip`; undefined = unclipped). Only bubbles sharing a clip blend (glass inside a scroll
 * view never merges with glass outside it); every cluster keeps its whole outline `d` (rim,
 * refraction) plus `visible`, the outline cut straight at its clip (backdrop, glow, shadow cut-out),
 * and a cluster wholly outside its clip draws nothing. A clipped-out bubble stays in its cluster
 * while it is within `spacing` of the visible part, so the neck toward it is cut, not dropped.
 */
export function clippedGlassPaths(shapes, clips, spacing, cell = 2) {
    const groups = new Map();
    shapes.forEach((shape, i) => {
        const clip = clips[i];
        const reach = { x: shape.x - spacing, y: shape.y - spacing, width: shape.width + spacing * 2, height: shape.height + spacing * 2 };
        if (clip && !rectsOverlap(clip, reach))
            return;
        const key = clip ? [clip.x, clip.y, clip.width, clip.height].map((v) => v.toFixed(2)).join(',') : '';
        if (!groups.has(key))
            groups.set(key, { clip, shapes: [] });
        groups.get(key).shapes.push(shape);
    });
    return [...groups.values()].flatMap(({ clip, shapes: members }) => glassPaths(members, spacing, cell).flatMap((path) => {
        if (!clip)
            return [{ ...path, visible: path.d }];
        if (!rectsOverlap(clip, path.bounds))
            return [];
        return [{ ...path, clip, visible: rectCovers(clip, path.bounds) ? path.d : scissorPath(path.d, clip) }];
    }));
}
//# sourceMappingURL=geometry.js.map