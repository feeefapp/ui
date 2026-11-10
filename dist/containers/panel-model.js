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
function panelBounds(panel) {
    const min = finite(panel.minWidth, 280);
    return { min, max: Math.max(min, finite(panel.maxWidth, Infinity)) };
}
/** Feasible first-column range, intersecting both columns' bounds for a fixed pair total. */
export function panelResizeBounds(first, second, total) {
    const a = panelBounds(first), b = panelBounds(second);
    const min = Math.max(a.min, total - b.max);
    const max = Math.min(a.max, total - b.min);
    if (!Number.isFinite(total) || min > max)
        throw new RangeError('Panel pair total is outside its bounds');
    return { min, max };
}
/** Clamp one adjacent pair without changing its total or any sibling's width/visibility. */
export function resizePanelPair(first, second, total, requested) {
    const { min, max } = panelResizeBounds(first, second, total);
    const width = Math.max(min, Math.min(max, finite(requested, min)));
    return [{ id: first.id, width }, { id: second.id, width: total - width }];
}
/**
 * Allocate a newest-first fitting suffix, returned in reading order. Hidden ancestors are not
 * removed from the owner's array. Explicit ID-keyed widths take priority: flexible siblings absorb
 * container changes first, then overrides yield only as required by available space and bounds.
 * Shrink proportionally toward minima; share spare space equally up to maxima. At least the newest
 * panel is returned, even in a zero-width container. Maxima may leave unused trailing space.
 */
export function allocatePanelWidths(panels, containerWidth, gap = 8, widths = {}) {
    unique(panels);
    if (!panels.length)
        return [];
    const width = finite(containerWidth, 0), spacing = finite(gap, 0);
    const bounds = panels.map(p => {
        const { min, max } = panelBounds(p);
        const override = Object.hasOwn(widths, p.id) && Number.isFinite(widths[p.id]);
        return { id: p.id, min, max, override, preferred: Math.min(max, Math.max(min, finite(override ? widths[p.id] : p.preferredWidth, 420))) };
    });
    let start = bounds.length - 1, needed = bounds[start].min;
    while (start > 0 && needed + spacing + bounds[start - 1].min <= width) {
        needed += spacing + bounds[--start].min;
    }
    const visible = bounds.slice(start), room = Math.max(0, width - spacing * (visible.length - 1));
    const result = visible.map(p => ({ id: p.id, width: Math.min(room, p.preferred) }));
    let delta = room - result.reduce((sum, p) => sum + p.width, 0);
    // Preserve explicit sizes while flexible columns can still absorb the container's change.
    for (const override of [false, true]) {
        const indices = visible.map((_, i) => i).filter(i => visible[i].override === override);
        if (delta < 0) {
            const capacity = indices.reduce((sum, i) => sum + result[i].width - Math.min(room, visible[i].min), 0);
            if (capacity > 0) {
                const take = Math.min(-delta, capacity);
                for (const i of indices)
                    result[i].width -= take * (result[i].width - Math.min(room, visible[i].min)) / capacity;
                delta += take;
            }
        }
        else {
            let growing = indices.filter(i => result[i].width < visible[i].max);
            while (delta > 0.000001 && growing.length) {
                const share = delta / growing.length;
                for (const i of growing) {
                    const add = Math.min(share, visible[i].max - result[i].width);
                    result[i].width += add;
                    delta -= add;
                }
                growing = growing.filter(i => result[i].width < visible[i].max);
            }
        }
    }
    return result;
}
//# sourceMappingURL=panel-model.js.map