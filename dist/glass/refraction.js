import { prepareUnionDistance, prepareUnionSide, unionBounds } from './geometry.js';
import { DEFAULT_GLASS_LIGHT } from './light.js';
import { edgeMask } from './material.js';
/** Bezel width (px) of large glass: where the bend fades to nothing. */
export const GLASS_BEZEL = 27;
/** Largest shift (px), at the very edge of large glass. */
export const GLASS_REFRACTION = 47;
/** Exponent of the bend's fall-off across the bezel. */
export const GLASS_BEZEL_POWER = 4;
/** Glass whose shorter side reaches this (px) bends fully; smaller glass scales bezel and shift. */
export const GLASS_LARGE_SIDE = 88;
/** How fast smaller glass shrinks its bezel: scale = (side / GLASS_LARGE_SIDE) ^ this. */
export const GLASS_SIZE_EXPONENT = 0.78;
/** Bezel and shift scale for glass whose shorter side is `side` px (1 for large glass). */
export function refractionScale(side) {
    if (!(side > 0))
        return 0;
    return Math.min(1, side / GLASS_LARGE_SIDE) ** GLASS_SIZE_EXPONENT;
}
/**
 * Bend at one point from its signed distance `d` (negative inside) and the outward normal
 * (`nx`, `ny`, unit length): a shift toward the inside that is strongest at the edge and fades to
 * zero across the bezel. Returns -1…1 per axis, as a share of the largest shift.
 */
export function refractionAt(d, nx, ny, bezel = GLASS_BEZEL) {
    if (d >= 0 || bezel <= 0)
        return { x: 0, y: 0 };
    const t = Math.min(1, -d / bezel);
    if (t >= 1)
        return { x: 0, y: 0 };
    const bend = (1 - t) ** GLASS_BEZEL_POWER;
    return { x: -nx * bend, y: -ny * bend };
}
/**
 * RGBA displacement map for `width` × `height` px (material coordinates) holding the blended
 * outlines of `clusters`. Red/green carry the shift (neutral in the flat middle) as a share of
 * `scale / 2` px, the value to pass to `feDisplacementMap`; blue is the edge mask
 * (`material.ts` `edgeMask`, lit by the default light so the map stays independent of the
 * pointer), averaged over each map pixel; alpha is the glass shape itself
 * (anti-aliased), so the filter can clip its own output: Chromium ignores an element's clip-path
 * for `backdrop-filter: url()`. Each cluster bends by its own size (its smallest shape).
 */
/**
 * The gentle lens (the opt-in non-mirroring profile): for the quartic bezel,
 * max |d(shift)/d(depth)| = 4 × shift / bezel, kept below one so the sampled background cannot
 * reverse direction along an edge. Flutter's `gentleRefractionShift` matches.
 */
export function gentleRefractionShift(side, bezel = GLASS_BEZEL) {
    const size = refractionScale(side);
    const band = Math.min(bezel * size, side / 2);
    return Math.max(0, Math.min(GLASS_REFRACTION * size, band * 0.8 / GLASS_BEZEL_POWER));
}
export function displacementMap(width, height, clusters, spacing, bezel = undefined, profile = 'regular') {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    return sampleDisplacementMap(w, h, w, h, clusters, spacing, bezel ?? (profile === 'regular' ? 20 : GLASS_BEZEL), profile);
}
/** Maximum raster work per live map, independent of browser zoom or the host's area. */
export const GLASS_LIVE_MAP_PIXELS = 32768;
/**
 * A bounded map for both moving and settled glass. Sampling always uses material coordinates:
 * lowering raster density changes neither the bezel nor the returned displacement scale in CSS
 * pixels. The caller stretches this image to the logical width/height. One density policy for
 * motion and rest avoids a visible change of lens when a gesture finishes.
 */
export function liveDisplacementMap(width, height, clusters, spacing, profile = 'regular', glintWidth = 0, regularity = 1) {
    const logicalWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
    const logicalHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
    const density = Math.min(1, Math.sqrt(GLASS_LIVE_MAP_PIXELS / logicalWidth / logicalHeight));
    // Both axes start from one density. Clamp also covers an unusually thin, very long host where
    // the minimum one-pixel short side otherwise makes the total exceed the work budget.
    const w = Math.max(1, Math.min(GLASS_LIVE_MAP_PIXELS, Math.floor(logicalWidth * density)));
    const h = Math.max(1, Math.min(Math.floor(GLASS_LIVE_MAP_PIXELS / w), Math.floor(logicalHeight * density)));
    return sampleDisplacementMap(logicalWidth, logicalHeight, w, h, clusters, spacing, profile === 'regular' ? 20 : GLASS_BEZEL, profile, glintWidth, regularity);
}
function sampleDisplacementMap(logicalWidth, logicalHeight, w, h, clusters, spacing, bezel, profile, glintWidth = 0, regularity = 1) {
    const pixelWidth = logicalWidth / w;
    const pixelHeight = logicalHeight / h;
    const coverageWidth = Math.max(pixelWidth, pixelHeight);
    // Pack the optional lighting field below the displacement map in one decoded image.
    // R/G store the weighted normal, B its weight. Rotating the light then costs one
    // filter matrix update, without another distance walk or bitmap upload.
    const plane = w * h * 4;
    const data = new Uint8ClampedArray(glintWidth > 0 ? plane * 2 : plane);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;
        data[i + 1] = 128;
        if (i >= plane)
            data[i + 3] = 255;
    }
    function regularOptics(side) {
        const clearScale = Math.min(1, side / 40);
        return {
            band: bezel * clearScale * (1 - regularity) + Math.min(bezel, side / 4) * regularity,
            shift: 50 * clearScale * (1 - regularity) + Math.min(60, side / 2) * regularity,
        };
    }
    const optics = clusters.map(shapes => {
        const sides = shapes.map(s => Math.min(s.width, s.height));
        if (profile === 'regular')
            return regularOptics(Math.max(0, ...sides));
        const side = shapes.length ? Math.min(...sides) : 0;
        const size = refractionScale(side);
        return {
            band: Math.min(bezel * size, side / 2),
            shift: profile === 'measured' ? GLASS_REFRACTION * size : gentleRefractionShift(side, bezel),
        };
    });
    const largest = Math.max(0, ...optics.map(o => o.shift));
    clusters.forEach((shapes, index) => {
        if (!shapes.length)
            return;
        const { band, shift } = optics[index];
        const firstSide = Math.min(shapes[0].width, shapes[0].height);
        const localSide = profile === 'regular' && shapes.some(s => Math.min(s.width, s.height) !== firstSide)
            ? prepareUnionSide(shapes, spacing) : null;
        // This cluster's shift as a share of the map's (the largest cluster's) shift.
        const share = largest > 0 ? shift / largest : 0;
        // A blended contour can extend outside all member boxes. Its map must cover the same
        // expanded surface as the clip and reflection, including the antialiased outer samples.
        const bounds = unionBounds(shapes, spacing);
        const x0 = Math.max(0, Math.floor(bounds.x / pixelWidth) - 1);
        const y0 = Math.max(0, Math.floor(bounds.y / pixelHeight) - 1);
        const x1 = Math.min(w, Math.ceil((bounds.x + bounds.width) / pixelWidth) + 1);
        const y1 = Math.min(h, Math.ceil((bounds.y + bounds.height) / pixelHeight) + 1);
        if (x1 <= x0 || y1 <= y0)
            return;
        const distance = prepareUnionDistance(shapes, spacing);
        const stride = x1 - x0 + 2;
        // At one pixel per CSS pixel, the unchanged +/-1 normal stencil lands on neighbouring
        // samples. Evaluate each distance once, with a one-pixel halo; fractional/coarse maps
        // retain direct sampling so this never changes the stencil or displacement bytes.
        const field = pixelWidth === 1 && pixelHeight === 1 ? new Float64Array(stride * (y1 - y0 + 2)) : null;
        if (field)
            for (let y = y0 - 1; y <= y1; y++)
                for (let x = x0 - 1; x <= x1; x++) {
                    field[(y - y0 + 1) * stride + x - x0 + 1] = distance(x + 0.5, y + 0.5);
                }
        // Circular/superellipse SDFs and their smooth minimum are 1-Lipschitz. A tile entirely
        // outside the silhouette or inside the flat centre needs no per-pixel distance/normal
        // work. Keep a small safety margin for interpolation of the superellipse norm table.
        const tile = 8;
        const canCull = shapes.every(shape => shape.cornerExponent === undefined || shape.cornerExponent >= 2);
        const reachInside = Math.max(band, 4 * glintWidth);
        const neutralDepth = Math.max(reachInside, coverageWidth / 2);
        for (let row = y0; row < y1; row += tile)
            for (let column = x0; column < x1; column += tile) {
                const bottom = Math.min(y1, row + tile);
                const right = Math.min(x1, column + tile);
                if (canCull) {
                    const cx = (column + right) * pixelWidth / 2;
                    const cy = (row + bottom) * pixelHeight / 2;
                    const reach = Math.hypot((right - column - 1) * pixelWidth, (bottom - row - 1) * pixelHeight) * 0.505 + 1e-8;
                    const centre = distance(cx, cy);
                    if (centre - reach >= coverageWidth / 2)
                        continue;
                    if (centre + reach <= -neutralDepth) {
                        for (let y = row; y < bottom; y++)
                            for (let x = column; x < right; x++)
                                data[(y * w + x) * 4 + 3] = 255;
                        continue;
                    }
                }
                for (let y = row; y < bottom; y++)
                    for (let x = column; x < right; x++) {
                        const px = (x + 0.5) * pixelWidth;
                        const py = (y + 0.5) * pixelHeight;
                        const fieldIndex = (y - y0 + 1) * stride + x - x0 + 1;
                        const d = field ? field[fieldIndex] : distance(px, py);
                        const i = (y * w + x) * 4;
                        // Clusters' boxes can overlap: only ever add coverage.
                        data[i + 3] = Math.max(data[i + 3], Math.round(Math.min(1, Math.max(0, 0.5 - d / coverageWidth)) * 255));
                        if (d >= coverageWidth / 2 || d <= -reachInside)
                            continue;
                        const gx = field ? field[fieldIndex + 1] - field[fieldIndex - 1] : distance(px + 1, py) - distance(px - 1, py);
                        const gy = field ? field[fieldIndex + stride] - field[fieldIndex - stride] : distance(px, py + 1) - distance(px, py - 1);
                        const length = Math.hypot(gx, gy) || 1;
                        if (glintWidth > 0) {
                            const z = Math.max(0, -d) / glintWidth;
                            const weight = (Math.max(0, 1 - z) + 0.21 * Math.max(0, 1 - z / 4)) / 1.21;
                            data[plane + i] = Math.round(128 + 127 * weight * gx / length);
                            data[plane + i + 1] = Math.round(128 + 127 * weight * gy / length);
                            data[plane + i + 2] = Math.round(255 * weight);
                        }
                        else {
                            const cosine = (gx * DEFAULT_GLASS_LIGHT.x + gy * DEFAULT_GLASS_LIGHT.y) / length;
                            // The mask is ~1 px wide: average it across a coarse map pixel so its weight survives.
                            let edge = 0;
                            for (let k = 0; k < 4; k++)
                                edge += edgeMask(-d + ((k + 0.5) / 4 - 0.5) * coverageWidth, cosine);
                            data[i + 2] = Math.max(data[i + 2], Math.round((edge / 4) * 255));
                        }
                        const local = localSide ? regularOptics(localSide(px, py)) : null;
                        const localShare = local && largest > 0 ? local.shift / largest : share;
                        const shoulder = Math.max(0, 1 - Math.max(-d, 0.001) / (local?.band ?? band));
                        const shortening = profile === 'regular' && shapes.length > 1 ? Math.sqrt(Math.min(1, length / 2)) : 1;
                        const amount = profile === 'regular'
                            ? 1 - Math.sqrt(1 - shoulder * shoulder)
                            : shoulder ** GLASS_BEZEL_POWER;
                        data[i] = Math.round(128 - (gx / length) * amount * localShare * shortening * 127);
                        data[i + 1] = Math.round(128 - (gy / length) * amount * localShare * shortening * 127);
                    }
            }
    });
    return { width: w, height: glintWidth > 0 ? h * 2 : h, data, scale: 2 * largest };
}
/**
 * How control lenses bend what is behind them. The shift (px, positive = the pixel shows the backdrop
 * from further inside) at depth `d` px from the outline:
 * - pill (the selection of a segmented control or a tab bar, lifted out of its rest pill by
 *   `LENS_PILL_LIFT`): a dome bevel, flat face, as the open liquid-glass renderers fit iOS 27
 *   (whynotmake.it liquid_glass_renderer, liquid_glass_easy): over a bevel of `height` px (at most a
 *   quarter of the shorter side) the shift is `amount · (1 - √(1 - x²))`, `x = 1 - d / bevel`
 *   (`amount` at most half the shorter side): the rim shows a compressed, mirrored band from deep
 *   inside, the face stays put. Under it a floor keeps the lens from ever showing past its rest pill
 *   (the track's edge and what is past it): with `gap` = how far the lens reaches past its rest pill
 *   there and `G = gap + margin`, the shift is at least `G · (1 - d / (reach · G))²`.
 * - thumb (slider): inward, 7.1 px over the outer 1 px, then `7.1 · (1 - (d - 1) / 6.5)^2.2` to
 *   nothing at 7.5 px; its outer `soft` px are softened (`LENS_SOFT`). Measured on iOS 26.2 (§2).
 * - switch: iOS 26.2's measured lip (§2, the segmented pill's profile at two thirds): a 0.6 px inward
 *   rim of `rim` px, then outward (it shows the backdrop from outside its edge, so lines crowd toward
 *   the rim) rising 1 px per px to `peak` px at `at` px deep, then fading as `exp(-(d - at) / decay)`,
 *   leaning away from the centre (`radial`: the direction is the outline's normal plus `radial` × the
 *   offset from the centre over the half size), and its whole middle zoomed out (`zoom`: it shows the
 *   backdrop `zoom` × the offset from the centre further out, so it looks about 13 % smaller across).
 * All are the same in light and dark appearance.
 */
export const LENS_BEND = {
    pill: { height: 20, amount: 60, margin: 1, reach: 2.5 },
    thumb: { peak: 7.1, at: 1, reach: 6.5, power: 2.2, soft: 5 },
    switch: { rim: 4.02, rimWidth: 0.6, peak: 2.881, at: 5, decay: 10.5, radial: 1.5, zoom: { x: 0.04, y: 0 } },
};
/**
 * The slider thumb's soft edge: iOS 26.2 blurs the band it bends (fringe contrast 0.45 of the middle
 * at its rim, back to full about 5 px in). A blur of `blur` px (standard deviation) mixed in by the
 * map's blue channel, `1 - d / soft`.
 */
export const LENS_SOFT = { blur: 2 };
/** Raster work allowed for one lens map: up to 3 samples per px on a control lens. */
export const LENS_MAP_PIXELS = 65536;
/**
 * The bend (px, positive inward) of a `kind` lens at depth `d` px inside its outline. A pill's
 * depends on `halfMinor` (half its shorter side, which caps its bevel and shift) and `gap`: how far
 * (px) the lens reaches past its rest pill at that point (0 when it hasn't lifted).
 */
export function lensBend(kind, d, gap = 0, halfMinor = Infinity) {
    if (!(d >= 0))
        return 0;
    if (kind === 'pill') {
        const { height, amount, margin, reach } = LENS_BEND.pill;
        const half = Number.isFinite(halfMinor) && halfMinor > 0 ? halfMinor : Infinity;
        const bevel = Math.min(height, half / 2);
        const most = Math.min(amount, half);
        const x = 1 - d / bevel;
        const dome = x > 0 ? most * (1 - Math.sqrt(1 - x * x)) : 0;
        const g = Math.max(0, Number.isFinite(gap) ? gap : 0) + margin;
        const t = 1 - d / (reach * g);
        return Math.max(dome, t > 0 ? g * t * t : 0);
    }
    if (kind === 'thumb') {
        const { peak, at, reach, power } = LENS_BEND.thumb;
        if (d <= at)
            return peak;
        const t = 1 - (d - at) / reach;
        return t > 0 ? peak * t ** power : 0;
    }
    const { rim, rimWidth, peak, at, decay } = LENS_BEND.switch;
    if (d < rimWidth)
        return rim * (1 - d / rimWidth);
    if (d < at)
        return -peak * Math.min(1, (d - rimWidth) / (at - 1 - rimWidth));
    return -peak * Math.exp(-(d - at) / decay);
}
/**
 * The map of a control's lens (lens-layer.ts): one `shape` (its own box, at 0, 0) bending by
 * `lensBend` along its outline's normal (a switch also leans and zooms out). A pill passes `lift`,
 * how far it reaches past its rest pill on each side (its rest pill is the shape inset by it, the
 * corner smaller by `lift.y`): its bend follows the gap between the two outlines. Same encoding as
 * `displacementMap` (red/green = shift as a share of `scale / 2`, alpha = the shape, blue = how much
 * of the softened copy shows: the thumb's `LENS_SOFT` band), sampled at most `LENS_MAP_PIXELS`. The
 * bend is linear in `scale`, so an owner can ease a thumb's lens in by scaling `scale` alone.
 */
export function lensDisplacementMap(shape, kind, lift = { x: 0, y: 0 }) {
    const logicalWidth = Number.isFinite(shape.width) ? Math.max(1, shape.width) : 1;
    const logicalHeight = Number.isFinite(shape.height) ? Math.max(1, shape.height) : 1;
    // A thumb's or switch's rim is under 1 px wide: up to 3 map pixels per px. A pill's dome is
    // smooth: 1.5 (the browser stretches the map with filtering).
    const density = Math.min(kind === 'pill' ? 1.5 : 3, Math.sqrt(LENS_MAP_PIXELS / logicalWidth / logicalHeight));
    const w = Math.max(1, Math.floor(logicalWidth * density));
    const h = Math.max(1, Math.floor(logicalHeight * density));
    const pixelWidth = logicalWidth / w;
    const pixelHeight = logicalHeight / h;
    const coverageWidth = Math.max(pixelWidth, pixelHeight);
    const box = { x: 0, y: 0, width: logicalWidth, height: logicalHeight, radius: shape.radius, cornerExponent: shape.cornerExponent };
    const distance = prepareUnionDistance([box], 0);
    // A pill's rest pill: the lens inset by its lift, the corner smaller by the vertical lift.
    const liftX = kind === 'pill' ? Math.max(0, lift.x) : 0;
    const liftY = kind === 'pill' ? Math.max(0, lift.y) : 0;
    const rest = kind === 'pill'
        ? prepareUnionDistance([{
                x: liftX,
                y: liftY,
                width: Math.max(0, logicalWidth - 2 * liftX),
                height: Math.max(0, logicalHeight - 2 * liftY),
                radius: Math.max(0, shape.radius - liftY),
                cornerExponent: shape.cornerExponent,
            }], 0)
        : null;
    // A small lens can't bend further than half its shorter side.
    const limit = Math.min(logicalWidth, logicalHeight) / 2;
    const shifts = new Float32Array(w * h * 2);
    const data = new Uint8ClampedArray(w * h * 4);
    let largest = 0;
    const halfMinor = limit;
    // The lens is symmetric about both axes: work out one quadrant and mirror it (each shift flips
    // its sign across the axis it crosses).
    const mirror = (i, x, y, sx, sy) => {
        const j = y * w + x;
        if (j === i)
            return;
        shifts[j * 2] = sx * shifts[i * 2];
        shifts[j * 2 + 1] = sy * shifts[i * 2 + 1];
        data[j * 4 + 2] = data[i * 4 + 2];
        data[j * 4 + 3] = data[i * 4 + 3];
    };
    const qw = Math.ceil(w / 2);
    const qh = Math.ceil(h / 2);
    for (let y = 0; y < qh; y++)
        for (let x = 0; x < qw; x++) {
            const px = (x + 0.5) * pixelWidth;
            const py = (y + 0.5) * pixelHeight;
            const d = distance(px, py);
            const i = y * w + x;
            data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, 0.5 - d / coverageWidth)) * 255);
            if (d >= coverageWidth / 2)
                continue;
            if (kind === 'thumb')
                data[i * 4 + 2] = Math.round(Math.max(0, 1 + d / LENS_BEND.thumb.soft) * 255);
            const offsetX = px - logicalWidth / 2;
            const offsetY = py - logicalHeight / 2;
            // A switch's middle is zoomed out: it shows the backdrop from further out.
            if (kind === 'switch') {
                shifts[i * 2] = offsetX * LENS_BEND.switch.zoom.x;
                shifts[i * 2 + 1] = offsetY * LENS_BEND.switch.zoom.y;
            }
            // The gap between the lens's outline and its rest pill's, along the normal here.
            const gap = rest ? Math.max(0, rest(px, py) - d) : 0;
            const bend = Math.max(-limit, Math.min(limit, lensBend(kind, Math.max(0, -d), gap, halfMinor)));
            if (bend) {
                const gx = distance(px + 1, py) - distance(px - 1, py);
                const gy = distance(px, py + 1) - distance(px, py - 1);
                const g = Math.hypot(gx, gy) || 1;
                const lean = kind === 'switch' ? LENS_BEND.switch.radial : 0;
                const nx = gx / g + (lean * offsetX) / (logicalWidth / 2);
                const ny = gy / g + (lean * offsetY) / (logicalHeight / 2);
                const length = Math.hypot(nx, ny) || 1;
                // Positive bends sample inward: against the outward direction.
                shifts[i * 2] += (-nx / length) * bend;
                shifts[i * 2 + 1] += (-ny / length) * bend;
            }
            largest = Math.max(largest, Math.abs(shifts[i * 2]), Math.abs(shifts[i * 2 + 1]));
            const mx = w - 1 - x;
            const my = h - 1 - y;
            mirror(i, mx, y, -1, 1);
            mirror(i, x, my, 1, -1);
            mirror(i, mx, my, -1, -1);
        }
    for (let i = 0; i < w * h; i++) {
        data[i * 4] = largest > 0 ? Math.round(128 + (shifts[i * 2] / largest) * 127) : 128;
        data[i * 4 + 1] = largest > 0 ? Math.round(128 + (shifts[i * 2 + 1] / largest) * 127) : 128;
    }
    return { width: w, height: h, data, scale: 2 * largest };
}
/**
 * Encode an RGBA map without canvas readback or synchronous PNG compression. A top-down 32-bit
 * BITMAPV4HEADER carries explicit RGB/alpha masks, preserving the map's anti-aliased coverage in
 * Chromium and Firefox. The byte order is BGRA; the input remains unchanged.
 */
export function rgbaBmpBytes(width, height, rgba) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) {
        throw new RangeError('A bitmap requires positive integer dimensions and one RGBA value per pixel');
    }
    const offset = 14 + 108;
    const bytes = new Uint8Array(offset + rgba.length);
    const header = new DataView(bytes.buffer);
    bytes[0] = 0x42;
    bytes[1] = 0x4d;
    header.setUint32(2, bytes.length, true);
    header.setUint32(10, offset, true);
    header.setUint32(14, 108, true);
    header.setInt32(18, width, true);
    header.setInt32(22, -height, true);
    header.setUint16(26, 1, true);
    header.setUint16(28, 32, true);
    header.setUint32(30, 3, true); // BI_BITFIELDS: use the explicit masks, including alpha.
    header.setUint32(34, rgba.length, true);
    header.setUint32(54, 0x00ff0000, true);
    header.setUint32(58, 0x0000ff00, true);
    header.setUint32(62, 0x000000ff, true);
    header.setUint32(66, 0xff000000, true);
    header.setUint32(70, 0x73524742, true); // LCS_sRGB
    for (let i = 0; i < rgba.length; i += 4) {
        bytes[offset + i] = rgba[i + 2];
        bytes[offset + i + 1] = rgba[i + 1];
        bytes[offset + i + 2] = rgba[i];
        bytes[offset + i + 3] = rgba[i + 3];
    }
    return bytes;
}
/** Inline transport for engines that synchronously sample the map as a backdrop filter. */
export function rgbaBmpDataUrl(width, height, rgba) {
    const bytes = rgbaBmpBytes(width, height, rgba);
    const chunks = [];
    for (let i = 0; i < bytes.length; i += 0x8000)
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
    return `data:image/bmp;base64,${btoa(chunks.join(''))}`;
}
/**
 * True where SVG filters work as a backdrop filter (Chromium). Elsewhere `backdrop-filter: url()`
 * is ignored or breaks the blur, so the canvas renderer keeps CSS glass.
 */
export function supportsRefraction() {
    if (typeof navigator === 'undefined' || typeof document === 'undefined')
        return false;
    const brands = navigator.userAgentData?.brands;
    return !!brands?.some((entry) => /Chromium/i.test(entry.brand));
}
/** Firefox can refract an explicitly supplied live element image with a regular SVG filter. */
export function supportsElementRefraction() {
    return typeof CSS !== 'undefined' && CSS.supports('background-image', '-moz-element(#glass-source)');
}
/**
 * What glass can do in this browser, for apps that show or log it (a settings screen, telemetry):
 * `refraction` = SVG backdrop filters bend the backdrop (Chromium), `elementRefraction` = a
 * supplied `backdropSource` can be bent (Firefox), `backdropBlur` = `backdrop-filter` blurs.
 * The kit already uses these checks itself; profiles never need a per-browser variant.
 */
export function glassCapabilities() {
    const supports = (property, value) => typeof CSS !== 'undefined' && CSS.supports(property, value);
    return {
        refraction: supportsRefraction(),
        elementRefraction: supportsElementRefraction(),
        backdropBlur: supports('backdrop-filter', 'blur(1px)') || supports('-webkit-backdrop-filter', 'blur(1px)'),
    };
}
/** Place a live background image in a glass piece, with both boxes in material coordinates. */
export function elementImagePlacement(source, piece) {
    return { width: source.width, height: source.height, x: source.x - piece.x, y: source.y - piece.y };
}
//# sourceMappingURL=refraction.js.map