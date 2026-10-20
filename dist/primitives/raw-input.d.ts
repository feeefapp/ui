import * as React from 'react';
import './raw-input.css';
export type LabInputElement = HTMLInputElement | HTMLTextAreaElement;
export type LabInputValidator = (value: string) => string | null | undefined;
type CommonProps = {
    /** Synchronous domain validation; return an actionable error or nothing. */
    error?: string | null;
    validator?: LabInputValidator;
    validationMode?: 'blur' | 'change' | 'submit';
    onValidationChange?: (error: string | null) => void;
    /** Bespoke editors can retain their own measured sizing. */
    autoResize?: boolean;
    onValueChange?: (value: string) => void;
};
type SingleLineProps = React.InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
    minLines?: never;
    maxLines?: never;
};
type MultilineProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
    minLines?: number;
    maxLines?: number;
    type?: never;
};
export type LabRawInputProps = CommonProps & (SingleLineProps | MultilineProps);
/** Unpainted editing primitive. Native selection, IME, autofill and form semantics stay intact. */
export declare const LabRawInput: React.ForwardRefExoticComponent<LabRawInputProps & React.RefAttributes<LabInputElement>>;
export {};
//# sourceMappingURL=raw-input.d.ts.map