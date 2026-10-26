import * as React from 'react';
import type { ControlVariant } from './control-variants.js';
import './control-variants.css';
import './number-field.css';
/** A synchronous check on the value: an actionable error, or nothing when it is valid. */
export type NumberValidator = (value: number) => string | null | undefined;
export type NumberFieldProps = {
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
    variant?: ControlVariant;
    /** Field height: `regular` 44px or `small` 36px, like a TextField beside it. */
    controlSize?: 'small' | 'regular';
    disabled?: boolean;
    /** Help text under the field. Replaced by `error` while there is one. */
    supportingText?: React.ReactNode;
    /** An error to show now, such as one from the server. Blocks form submission while set. */
    error?: string | null;
    /** Synchronous check run on the value; return an actionable error, or nothing when it is valid. Blocks form submission while it fails. */
    validator?: NumberValidator;
    /** When `validator` errors appear: after the field first loses focus (`blur`), on every change (`change`) or only on submit (`submit`). */
    validationMode?: 'blur' | 'change' | 'submit';
    /** Called with the visible validator message, or `null` when it clears. */
    onValidationChange?: (error: string | null) => void;
    /** Submits the value with forms through an invisible input that also carries its validity. */
    name?: string;
    form?: string;
    /** Class name for the control. */
    className?: string;
    /** Class name for the outer wrapper (control plus supporting text), for layout. */
    containerClassName?: string;
    id?: string;
    'aria-describedby'?: string;
};
/**
 * A Blender-style number field. Drag anywhere on it to scrub the value (mouse, pen or finger; Shift
 * for precision dragging), click without dragging to type, and use arrows, Page Up/Down, Home/End or
 * Backspace (reset) from the keyboard. Typed values accept `+ - * /`, parentheses and `%`.
 */
export declare const NumberField: React.ForwardRefExoticComponent<NumberFieldProps & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=number-field.d.ts.map