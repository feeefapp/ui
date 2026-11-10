function unique(panels) {
    const ids = new Set();
    for (const panel of panels) {
        if (ids.has(panel.id))
            throw new Error(`Duplicate panel ID: ${panel.id}`);
        ids.add(panel.id);
    }
}
function indexOf(panels, id) {
    const index = panels.findIndex(p => p.id === id);
    if (index < 0)
        throw new Error(`Unknown panel ID: ${id}`);
    return index;
}
/** Append a panel, or push after an ancestor and discard that ancestor's descendants. */
export function pushPanel(panels, panel, after) {
    const next = [...panels.slice(0, after === undefined ? panels.length : indexOf(panels, after) + 1), panel];
    unique(next);
    return next;
}
/** Replace the named panel (last by default) and discard its descendants. A retained ID retains its state. */
export function replacePanel(panels, panel, id) {
    const index = id === undefined ? Math.max(0, panels.length - 1) : indexOf(panels, id);
    const next = [...panels.slice(0, index), panel];
    unique(next);
    return next;
}
/** Remove the named panel and all descendants. Unknown IDs leave the stack unchanged. */
export function closePanel(panels, id) {
    const index = panels.findIndex(p => p.id === id);
    return index < 0 ? panels : panels.slice(0, index);
}
const finite = (value, fallback) => value !== undefined && Number.isFinite(value) ? Math.max(0, value) : fallback;
/**
 * Allocate a newest-first fitting suffix, returned in reading order. Hidden ancestors are not
 * removed from the owner's array. Shrink proportionally toward minima, then share spare space
 * equally up to maxima. At least the newest panel is returned, even in a zero-width container.
 */
export function allocatePanelWidths(panels, containerWidth, gap = 8) {
    unique(panels);
    if (!panels.length)
        return [];
    const width = finite(containerWidth, 0), spacing = finite(gap, 0);
    const bounds = panels.map(p => {
        const min = finite(p.minWidth, 280);
        const max = Math.max(min, finite(p.maxWidth, Infinity));
        return { id: p.id, min, max, preferred: Math.min(max, Math.max(min, finite(p.preferredWidth, 420))) };
    });
    let start = bounds.length - 1, needed = bounds[start].min;
    while (start > 0 && needed + spacing + bounds[start - 1].min <= width) {
        needed += spacing + bounds[--start].min;
    }
    const visible = bounds.slice(start), room = Math.max(0, width - spacing * (visible.length - 1));
    const desired = visible.reduce((sum, p) => sum + p.preferred, 0);
    const minimum = visible.reduce((sum, p) => sum + p.min, 0);
    const ratio = desired === minimum ? 0 : Math.min(1, Math.max(0, (room - minimum) / (desired - minimum)));
    const result = visible.map(p => ({ id: p.id, width: Math.min(room, p.min + (p.preferred - p.min) * ratio) }));
    let spare = room - result.reduce((sum, p) => sum + p.width, 0);
    let growing = result.map((_, i) => i).filter(i => result[i].width < visible[i].max);
    while (spare > 0.001 && growing.length) {
        const share = spare / growing.length;
        for (const i of growing) {
            const add = Math.min(share, visible[i].max - result[i].width);
            result[i].width += add;
            spare -= add;
        }
        growing = growing.filter(i => result[i].width < visible[i].max);
    }
    return result;
}
//# sourceMappingURL=panel-model.js.map