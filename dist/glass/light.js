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
//# sourceMappingURL=light.js.map