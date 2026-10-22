import * as React from 'react';
import './raw-input.css';
export type LabInputElement = HTMLInputElement | HTMLTextAreaElement;
export type LabInputValidator = (value: string) => string | null | undefined;
type CommonProps = {
    /** An error to show now, such as one from the server. Blocks form submission while set. */
    error?: string | null;
    /** Synchronous check run on the value; return an actionable error, or nothing when it is valid. */
    validator?: LabInputValidator;
    /** When errors appear: after the first blur (`blur`), on every change (`change`) or only on submit (`submit`). */
    validationMode?: 'blur' | 'change' | 'submit';
    /** Called with the visible error message, or `null` when it clears. */
    onValidationChange?: (error: string | null) => void;
    /** Multiline only: grows the textarea with its content between `minLines` and `maxLines`. Turn off for editors that size themselves. */
    autoResize?: boolean;
    /** Called with the new text on every change. */
    onValueChange?: (value: string) => void;
};
type SingleLineProps = React.InputHTMLAttributes<HTMLInputElement> & {
    /** Renders a growing `<textarea>` instead of an `<input>`. */
    multiline?: false;
    minLines?: never;
    maxLines?: never;
};
type MultilineProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Renders a growing `<textarea>` instead of an `<input>`. */
    multiline: true;
    /** Multiline only: visible lines when empty. */
    minLines?: number;
    /** Multiline only: lines before the textarea scrolls. Unlimited when omitted. */
    maxLines?: number;
    type?: never;
};
export type LabRawInputProps = CommonProps & (SingleLineProps | MultilineProps);
/**
 * An unpainted native `<input>` or `<textarea>` with the kit's validation and auto-growing
 * lines. Native selection, IME, autofill and form semantics stay intact. Use it inside bespoke
 * editors that draw their own surface; use `LabTextField` everywhere else.
 */
export declare const LabRawInput: React.ForwardRefExoticComponent<LabRawInputProps & React.RefAttributes<LabInputElement>>;
export {};
//# sourceMappingURL=raw-input.d.ts.map