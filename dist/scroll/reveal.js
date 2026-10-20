import { scrollRevealDelta } from './metrics.js';
/** Reveal only inside the supplied viewport; native scrollIntoView also moves ancestors. */
export function revealScrollChild(viewport, child, { block = 'nearest', inline = 'nearest', behavior = 'instant', } = {}) {
    if (!viewport || !child || !viewport.contains(child))
        return;
    const bounds = viewport.getBoundingClientRect();
    const target = child.getBoundingClientRect();
    const style = getComputedStyle(viewport);
    const padding = (value) => Number.parseFloat(value) || 0;
    const top = bounds.top + padding(style.scrollPaddingTop);
    const bottom = Math.max(top, bounds.bottom - padding(style.scrollPaddingBottom));
    const left = bounds.left + padding(style.scrollPaddingLeft);
    const right = Math.max(left, bounds.right - padding(style.scrollPaddingRight));
    const dy = block ? scrollRevealDelta(target.top, target.bottom, top, bottom, block) : 0;
    const dx = inline ? scrollRevealDelta(target.left, target.right, left, right, inline) : 0;
    if (!dx && !dy)
        return;
    viewport.scrollBy({
        top: dy,
        left: dx,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior,
    });
}
//# sourceMappingURL=reveal.js.map