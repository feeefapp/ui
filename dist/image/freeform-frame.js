/**
 * Horizontal room a floating panel occupies.
 * A side column (the project rail, the poster inspector) reserves space.
 * A full-width sheet does not, because it covers the canvas on purpose.
 */
export function sideInset(open, rect, viewportW, side, gap = 8) {
    if (!open || !rect || viewportW <= 0 || rect.width <= 0 || rect.height <= 0)
        return 0;
    if (rect.width > viewportW * 0.7)
        return 0;
    if (side === 'left') {
        if (rect.left >= viewportW * 0.5)
            return 0;
        return Math.round(Math.max(0, rect.right + gap));
    }
    if (rect.left <= 0 || rect.right > viewportW + 1 || rect.right <= viewportW * 0.5)
        return 0;
    return Math.round(Math.max(0, viewportW - rect.left + gap));
}
/**
 * After the focused card is fitted, pull any card that is already peeking out
 * from under a side panel fully into the free area. The focus stays inside
 * that area; cards that are completely hidden stay put so a long history does
 * not shove the current poster to the opposite edge.
 */
export function revealCovered(view, cards, focus, viewport, insets, padding = 28) {
    const leftBound = insets.left + padding;
    const rightBound = viewport.w - insets.right - padding;
    const scale = view.scale;
    if (!(scale > 0) || rightBound <= leftBound)
        return view;
    let x = view.x;
    const leftOf = (card, origin = x) => origin + card.x * scale;
    const rightOf = (card, origin = x) => origin + (card.x + card.w) * scale;
    const peekingLeft = cards.filter((card) => {
        const left = leftOf(card);
        const right = rightOf(card);
        return left < leftBound - 0.5 && right > leftBound + 0.5;
    });
    if (peekingLeft.length) {
        const need = Math.max(...peekingLeft.map((card) => leftBound - leftOf(card)));
        const slack = rightBound - rightOf(focus);
        if (need > 0.5 && slack > 0.5)
            x += Math.min(need, slack);
    }
    const peekingRight = cards.filter((card) => {
        const left = leftOf(card, x);
        const right = rightOf(card, x);
        return left < rightBound - 0.5 && right > rightBound + 0.5;
    });
    if (peekingRight.length) {
        const need = Math.max(...peekingRight.map((card) => rightOf(card, x) - rightBound));
        const slack = leftOf(focus, x) - leftBound;
        if (need > 0.5 && slack > 0.5)
            x -= Math.min(need, slack);
    }
    return x === view.x ? view : { ...view, x };
}
//# sourceMappingURL=freeform-frame.js.map