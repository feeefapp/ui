/** Physical arrow keys change a logical-start column; Home/End use its feasible bounds. */
export function dividerKeyValue(key, value, min, max, rtl) {
    let next;
    if (key === 'ArrowLeft' || key === 'ArrowRight')
        next = value + ((key === 'ArrowRight') !== rtl ? 24 : -24);
    else if (key === 'Home')
        next = min;
    else if (key === 'End')
        next = max;
    else
        return null;
    return Math.max(min, Math.min(max, next));
}
//# sourceMappingURL=resize-model.js.map