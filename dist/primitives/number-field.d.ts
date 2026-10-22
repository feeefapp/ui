import * as React from 'react';
import type { LabControlVariant } from './control-variants.js';
import './control-variants.css';
import './number-field.css';
export type LabNumberFieldProps = {
    /** Shown inside the field at the start; also the accessible name. */
    label: string;
    /** Current value (controlled). */
    value?: number;
    /** Initial value when uncontrolled, and the value Backspace resets to. */
    defaultValue?: number;
    /** Called on every change: each drag move, step and typed commit. */
    onValueChange?: (value: number) => void;
    /** Called once a change is final: drag release, step, typed commit. Use it for saves. */
    onValueCommit?: (value: number) => void;
    /** Lower bound. With `max` too, the field shows a fill and its width maps to the full range. */
    min?: number;
    /** Upper bound. */
    max?: number;
    /** Snap interval; also sets the displayed decimals. Shift while dragging scrubs 10× slower. */
    step?: number;
    /** Text after the value, e.g. `DA` or `%`. */
    unit?: string;
    /** Display text for the value (the typed text and form value stay plain numbers). */
    format?: (value: number) => string;
    /** Shows the slider fill. Defaults to true when both bounds are set. */
    fill?: boolean;
    /** Shows ‹ › steppers at the ends (on hover and focus). */
    steppers?: boolean;
    /** Field paint recipe, shared with text fields and selects. */
    variant?: LabControlVariant;
    /** `regular` 44px or `compact` 40px. */
    controlSize?: 'regular' | 'compact';
    disabled?: boolean;
    /** Submits the value with forms through a hidden input. */
    name?: string;
    form?: string;
    className?: string;
    id?: string;
    'aria-describedby'?: string;
};
/**
 * A Blender-style number field. Drag anywhere on it to scrub the value (mouse, pen or finger; Shift
 * for precision dragging), click without dragging to type, and use arrows, Page Up/Down, Home/End or
 * Backspace (reset) from the keyboard. Typed values accept `+ - * /`, parentheses and `%`.
 */
export declare const LabNumberField: React.ForwardRefExoticComponent<LabNumberFieldProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=number-field.d.ts.map