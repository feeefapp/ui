import * as React from 'react';
import { type FieldDecorationProps } from './field-shell.js';
import { type InputValidator } from './raw-input.js';
export type SelectProps = FieldDecorationProps & {
    /** The `Option` items of the menu. */
    'children': React.ReactNode;
    /** The selected option's value. `null` or `''` means nothing is selected. */
    'value': string | null;
    /** Called with the chosen option's value (`''` for an option without one). */
    'onValueChange': (value: string) => void;
    /** Class name for the trigger button. */
    'className'?: string;
    /** Accessible name when the select has no `hint`. */
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: React.AriaAttributes['aria-invalid'];
    /** Id for the trigger button. Generated when omitted. */
    'id'?: string;
    /** Text shown while nothing is selected. Only used when there is no `hint`. */
    'placeholder'?: string;
    /** Disables the trigger and closes the menu. */
    'disabled'?: boolean;
    /** Form field name; the value is submitted with the form. */
    'name'?: string;
    /** An empty selection blocks form submission and shows `requiredMessage`. */
    'required'?: boolean;
    /** Error shown when a required select is empty. */
    'requiredMessage'?: string;
    /** Synchronous check run on the value; return an actionable error, or nothing when it is valid. */
    'validator'?: InputValidator;
    /** When errors appear: after the menu first closes or the trigger blurs (`blur`), on every change (`change`) or only on submit (`submit`). */
    'validationMode'?: 'blur' | 'change' | 'submit';
    /** Called with the visible error message, or `null` when it clears. */
    'onValidationChange'?: (error: string | null) => void;
    'onBlur'?: React.FocusEventHandler<HTMLButtonElement>;
};
/**
 * A single-choice dropdown in the same field frame as `TextField`: floating hint, icons,
 * supporting text and validation. The options (`Option`) open in a glass menu that grows out of
 * the field and covers it (`MenuSurface`).
 */
export declare function Select({ children, value: suppliedValue, onValueChange, className, variant, controlSize, label, hint, dir, placeholder, labelStyle, leadingIcon, leading, trailing, supportingText, error, containerClassName, name, required, requiredMessage, validator, validationMode, onValidationChange, onBlur, ...props }: SelectProps): React.JSX.Element;
/** One choice in a `Select` menu. A check marks the selected option. */
export declare function Option({ value, children, }: {
    /** The value passed to `onValueChange`. Defaults to the text of `children`; `''` is the "no selection" option. */
    value?: string;
    /** The option's visible text, also shown in the trigger when selected. */
    children: React.ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=select.d.ts.map