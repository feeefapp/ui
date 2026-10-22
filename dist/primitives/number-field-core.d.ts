export type NumberFieldBounds = {
    min?: number;
    max?: number;
    step: number;
};
/** Both ends are known, so the field behaves like a slider (fill, absolute range mapping). */
export declare const isBounded: ({ min, max }: NumberFieldBounds) => boolean;
/** Decimal places implied by the step: 1 → 0, 0.25 → 2, 0.1 → 1. */
export declare function stepDecimals(step: number): number;
/** Clamps to the bounds that exist and snaps to the step grid (from `min` when it exists, else 0). */
export declare function clampNumber(value: number, { min, max, step }: NumberFieldBounds): number;
/** Pixels of drag per step when the field has no range to map across. */
export declare const UNBOUNDED_PX_PER_STEP = 8;
/**
 * The value while scrubbing. A bounded field maps its full width to its full range, relative to the
 * value at press time (no jump); an unbounded one moves one step per few pixels. `fine` (Shift) is
 * ten times slower. In RTL, dragging toward the start (right) increases the value.
 */
export declare function dragValue({ startValue, dx, width, fine, rtl, ...bounds }: NumberFieldBounds & {
    startValue: number;
    dx: number;
    width: number;
    fine?: boolean;
    rtl?: boolean;
}): number;
/** Keyboard stepping on the step grid; `null` when the key is not a value key. */
export declare function keyValue(key: string, value: number, bounds: NumberFieldBounds, { rtl }?: {
    rtl?: boolean;
}): number | null;
/** Fill fraction 0–1 for a bounded field. */
export declare function fillFraction(value: number, bounds: NumberFieldBounds): number;
/**
 * Parses what a person types: numbers with `.` or `,` decimals, spaces as thousands separators,
 * `+ - * /` (also `× ÷ −`) with parentheses, and `%` dividing the term before it by 100
 * (`2000*15%` → 300). Arabic-Indic digits are accepted. Returns `null` for anything else; it never
 * evaluates code.
 */
export declare function parseNumberExpression(input: string): number | null;
//# sourceMappingURL=number-field-core.d.ts.map