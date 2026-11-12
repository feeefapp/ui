/** Shared numeric contract for pointer, keyboard and programmatic values. */
export function sliderRange(min = 0, max = 100, step = 1) {
    const start = Number.isFinite(min) ? min : 0;
    const end = Number.isFinite(max) ? Math.max(start, max) : start;
    return { min: start, max: end, step: Number.isFinite(step) && step > 0 ? step : 1 };
}
export function sliderValue(value, min, max, step) {
    if (!Number.isFinite(value))
        return min;
    if (value >= max)
        return max;
    let snapped = min + Math.round((value - min) / step) * step;
    if (Math.abs(max - value) < Math.abs(snapped - value))
        snapped = max;
    // Avoid floating point artifacts in form values, callbacks and ARIA readouts.
    return Math.min(max, Math.max(min, Number(snapped.toFixed(10))));
}
export function sliderFraction(value, min, max) {
    return max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
}
export function sliderPointer(clientX, left, width, rtl, inset = 22) {
    const edge = Math.min(inset, width / 2);
    const x = rtl ? left + width - clientX : clientX - left;
    return Math.max(0, Math.min(1, (x - edge) / Math.max(1, width - edge * 2)));
}
export function sliderKey(key, value, min, max, step, rtl) {
    const delta = {
        ArrowRight: rtl ? -step : step,
        ArrowLeft: rtl ? step : -step,
        ArrowUp: step,
        ArrowDown: -step,
        PageUp: step * 10,
        PageDown: -step * 10,
    };
    if (key === 'Home')
        return min;
    if (key === 'End')
        return max;
    if (!(key in delta))
        return null;
    // A final endpoint need not align to the step grid; stepping back reaches its last stop.
    const origin = value === max && delta[key] < 0 ? min + Math.ceil((max - min) / step) * step : value;
    return sliderValue(origin + delta[key], min, max, step);
}
//# sourceMappingURL=slider-core.js.map