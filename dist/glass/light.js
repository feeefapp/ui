import { unionDistance, unionLoops } from './geometry.js';
export const DEFAULT_GLASS_LIGHT = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
/** How far (px) a pointer still pulls the light toward itself. */
export const GLASS_LIGHT_REACH = 480;
const normalize = (x, y) => {
    const length = Math.hypot(x, y);
    return length > 1e-6 ? { x: x / length, y: y / length } : DEFAULT_GLASS_LIGHT;
};
/**
 * Light for a bubble at `centre` with a fine pointer at `pointer` (or none): the default light,
 * turned toward the pointer the closer it is, so the rim brightens on the edge facing it.
 */
export function glassLightToward(centre, pointer, base = DEFAULT_GLASS_LIGHT, reach = GLASS_LIGHT_REACH) {
    if (!pointer)
        return base;
    const dx = pointer.x - centre.x;
    const dy = pointer.y - centre.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1)
        return base;
    const pull = 0.75 * Math.exp(-distance / reach);
    const toward = normalize(dx, dy);
    return normalize(base.x + (toward.x - base.x) * pull, base.y + (toward.y - base.y) * pull);
}
/**
 * Endpoints of the rim gradient over `bounds`, CSS-style: the line runs through the centre along
 * the light and is long enough that its ends touch the farthest corners. Offset 0 is the lit end.
 */
export function rimGradient(bounds, light) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const half = (Math.abs(bounds.width * light.x) + Math.abs(bounds.height * light.y)) / 2;
    return { x1: cx + light.x * half, y1: cy + light.y * half, x2: cx - light.x * half, y2: cy - light.y * half };
}
/** Rim reflection strength from the local surface normal, independent of bubble proportions. */
export function rimReflection(nx, ny, light) {
    const length = Math.hypot(nx, ny) * Math.hypot(light.x, light.y);
    if (length < 1e-6)
        return 0;
    return Math.min(1, ((nx * light.x + ny * light.y) / length) ** 2);
}
/** A short outline segment and the outward normal of the blended surface at its midpoint. */
export function rimSurface(shapes, spacing) {
    return unionLoops(shapes, spacing, 1).flatMap((loop) => loop.map(([x, y], i) => {
        const [ex, ey] = loop[(i + 1) % loop.length];
        const mx = (x + ex) / 2;
        const my = (y + ey) / 2;
        const nx = unionDistance(mx + 0.5, my, shapes, spacing) - unionDistance(mx - 0.5, my, shapes, spacing);
        const ny = unionDistance(mx, my + 0.5, shapes, spacing) - unionDistance(mx, my - 0.5, shapes, spacing);
        return { d: `M${x},${y}L${ex},${ey}`, nx, ny };
    }));
}
/** Width in CSS pixels of the rounded, reflective bevel on control-sized glass. */
export const GLASS_HIGHLIGHT_WIDTH = 5;
/**
 * Specular reflection on a convex quarter-circle cross-section. Depth runs inward from the
 * outline. The surface normal rotates from horizontal at the edge to vertical at the flat
 * interior; a fixed elevated light produces a finite-width highlight within that bevel.
 */
export function surfaceReflection(depth, nx, ny, light, width = GLASS_HIGHLIGHT_WIDTH) {
    if (depth < 0 || depth >= width || width <= 0)
        return 0;
    const length = Math.hypot(nx, ny);
    if (length < 1e-6)
        return 0;
    const radial = 1 - depth / width;
    const vertical = Math.sqrt(Math.max(0, 1 - radial * radial));
    const alignment = (nx * light.x + ny * light.y) / length;
    // Half vectors between a front-facing viewer and elevated key / weaker opposite light.
    const key = Math.max(0, alignment * radial * 0.8 + vertical * 0.6) ** 20;
    const bounce = Math.max(0, -alignment * radial * 0.8 + vertical * 0.6) ** 20 * 0.55;
    // Both the shoulder and flat interior fade out; no disconnected inner contour or hard stroke.
    const fade = Math.min(1, depth / 0.35) * Math.min(1, (width - depth) / 1.5);
    // A small grazing reflection resolves the silhouette; the broad environment lobe reads
    // as polished glass instead of a single airbrushed stripe.
    const edge = Math.exp(-depth / 0.65) * (Math.max(0, alignment) ** 4 + Math.max(0, -alignment) ** 4 * 0.45) * 0.5;
    const environment = Math.max(0, alignment * radial * 0.6 + vertical * 0.8) ** 8 * radial * radial * 0.1;
    return Math.min(1, (key + bounce + edge + environment) * fade);
}
/** Cached bevel samples, at 2× resolution to keep the reflection smooth at browser zoom. */
export function highlightSurface(shapes, spacing, bounds, highlightWidth = GLASS_HIGHLIGHT_WIDTH) {
    const scale = 2;
    const width = Math.max(1, Math.ceil(bounds.width * scale));
    const height = Math.max(1, Math.ceil(bounds.height * scale));
    const bezel = Math.max(0, Math.min(highlightWidth, ...shapes.map(s => Math.min(s.width, s.height) / 4)));
    const samples = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const px = bounds.x + (x + 0.5) / scale;
            const py = bounds.y + (y + 0.5) / scale;
            const d = unionDistance(px, py, shapes, spacing);
            if (d >= 0.25 || d <= -bezel)
                continue;
            const nx = unionDistance(px + 0.5, py, shapes, spacing) - unionDistance(px - 0.5, py, shapes, spacing);
            const ny = unionDistance(px, py + 0.5, shapes, spacing) - unionDistance(px, py - 0.5, shapes, spacing);
            samples.push({ index: (y * width + x) * 4, depth: Math.max(0, -d), nx, ny, coverage: Math.min(1, Math.max(0, 0.5 - d * scale)) });
        }
    return { width, height, bezel, samples };
}
/** Soft occlusion on the unlit inner bevel, paired with the reflected light for optical depth. */
export function surfaceShade(depth, nx, ny, light, width = GLASS_HIGHLIGHT_WIDTH) {
    if (depth <= 0 || depth >= width || width <= 0)
        return 0;
    const length = Math.hypot(nx, ny);
    if (length < 1e-6)
        return 0;
    const away = Math.max(0, -(nx * light.x + ny * light.y) / length);
    return away * away * Math.sin(Math.PI * depth / width) ** 2 * 0.65;
}
/** Screenshot-fitted rim: an outer-edge peak with symmetric lighting and a smooth inward fade.
 * Width and falloff are our reconstruction; base/peak come from theme rim tokens. */
export function measuredRimReflection(depth, nx, ny, light, width, base, peak) {
    if (width <= 0 || depth < 0 || depth >= width)
        return 0;
    const angular = rimReflection(nx, ny, light);
    const fade = Math.cos(depth / width * Math.PI / 2) ** 2;
    return Math.max(0, Math.min(1, (base + (peak - base) * angular) * fade));
}
//# sourceMappingURL=light.js.map