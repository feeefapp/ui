/** Pure number-field math: drag scrubbing, keyboard steps, display precision and typed expressions. */
import { sliderValue } from './slider-core.js';
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
/** Both ends are known, so the field behaves like a slider (fill, absolute range mapping). */
export const isBounded = ({ min, max }) => finite(min) && finite(max) && max > min;
/** Decimal places implied by the step: 1 → 0, 0.25 → 2, 0.1 → 1. */
export function stepDecimals(step) {
    if (!Number.isFinite(step))
        return 0;
    const text = String(step);
    if (text.includes('e-'))
        return Number(text.split('e-')[1]);
    return text.includes('.') ? text.split('.')[1].length : 0;
}
/** Clamps to the bounds that exist and snaps to the step grid (from `min` when it exists, else 0). */
export function clampNumber(value, { min, max, step }) {
    if (!Number.isFinite(value))
        return finite(min) ? min : 0;
    if (finite(min) && finite(max))
        return sliderValue(value, min, max, step);
    const origin = finite(min) ? min : finite(max) ? max : 0;
    let snapped = origin + Math.round((value - origin) / step) * step;
    if (finite(min))
        snapped = Math.max(min, snapped);
    if (finite(max))
        snapped = Math.min(max, snapped);
    return Number(snapped.toFixed(Math.min(10, stepDecimals(step) + 2)));
}
/** Pixels of drag per step when the field has no range to map across. */
export const UNBOUNDED_PX_PER_STEP = 8;
/**
 * The value while scrubbing. A bounded field maps its full width to its full range, relative to the
 * value at press time (no jump); an unbounded one moves one step per few pixels. `fine` (Shift) is
 * ten times slower. In RTL, dragging toward the start (right) increases the value.
 */
export function dragValue({ startValue, dx, width, fine = false, rtl = false, ...bounds }) {
    const delta = (rtl ? -dx : dx) * (fine ? 0.1 : 1);
    const raw = isBounded(bounds)
        ? startValue + (delta / Math.max(1, width)) * (bounds.max - bounds.min)
        : startValue + (delta / UNBOUNDED_PX_PER_STEP) * bounds.step;
    return clampNumber(raw, bounds);
}
/** Keyboard stepping on the step grid; `null` when the key is not a value key. */
export function keyValue(key, value, bounds, { rtl = false } = {}) {
    const { step } = bounds;
    if (key === 'Home')
        return finite(bounds.min) ? bounds.min : null;
    if (key === 'End')
        return finite(bounds.max) ? bounds.max : null;
    const delta = {
        ArrowUp: step,
        ArrowDown: -step,
        ArrowRight: rtl ? -step : step,
        ArrowLeft: rtl ? step : -step,
        PageUp: step * 10,
        PageDown: -step * 10,
    };
    if (!(key in delta))
        return null;
    return clampNumber(value + delta[key], bounds);
}
/** Fill fraction 0–1 for a bounded field. */
export function fillFraction(value, bounds) {
    if (!isBounded(bounds))
        return 0;
    return Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)));
}
/**
 * Parses what a person types: numbers with `.` or `,` decimals, spaces as thousands separators,
 * `+ - * /` (also `× ÷ −`) with parentheses, and `%` dividing the term before it by 100
 * (`2000*15%` → 300). Arabic-Indic digits are accepted. Returns `null` for anything else; it never
 * evaluates code.
 */
export function parseNumberExpression(input) {
    const text = input
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/[\s  ']/g, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
    if (!text)
        return null;
    // A lone comma is a decimal separator ("1,5"); with a dot present, commas group thousands.
    const normalized = text.includes('.') ? text.replace(/,/g, '') : text.replace(/,/g, '.');
    let i = 0;
    const peek = () => normalized[i];
    const number = () => {
        const match = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\./i.exec(normalized.slice(i));
        if (!match)
            return null;
        i += match[0].length;
        return Number(match[0]);
    };
    const factor = () => {
        if (peek() === '+' || peek() === '-') {
            const sign = normalized[i++] === '-' ? -1 : 1;
            const inner = factor();
            return inner == null ? null : sign * inner;
        }
        let value;
        if (peek() === '(') {
            i++;
            value = sum();
            if (value == null || peek() !== ')')
                return null;
            i++;
        }
        else
            value = number();
        if (value != null && peek() === '%') {
            i++;
            value /= 100;
        }
        return value;
    };
    const product = () => {
        let left = factor();
        while (left != null && (peek() === '*' || peek() === '/')) {
            const op = normalized[i++];
            const right = factor();
            if (right == null)
                return null;
            left = op === '*' ? left * right : left / right;
        }
        return left;
    };
    const sum = () => {
        let left = product();
        while (left != null && (peek() === '+' || peek() === '-')) {
            const op = normalized[i++];
            const right = product();
            if (right == null)
                return null;
            left = op === '+' ? left + right : left - right;
        }
        return left;
    };
    const result = sum();
    return result != null && i === normalized.length && Number.isFinite(result) ? result : null;
}
//# sourceMappingURL=number-field-core.js.map