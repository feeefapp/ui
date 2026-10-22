import * as React from 'react';
import { type LabRawInputProps, type LabInputElement } from './raw-input.js';
import { type LabFieldDecorationProps } from './field-shell.js';
type NullableFieldValue<T extends {
    value?: unknown;
}> = T extends unknown ? Omit<T, 'value'> & {
    value?: T['value'] | null;
} : never;
export type LabTextFieldProps = NullableFieldValue<LabRawInputProps> & LabFieldDecorationProps & {
    /** Shows the character count under the field, with `maxLength` when set. */
    showCounter?: boolean;
};
/**
 * A labelled text input: native `<input>` or growing `<textarea>` inside the field frame, with a
 * floating hint, icons, affixes, supporting text, validation and an optional counter.
 */
export declare const LabTextField: React.ForwardRefExoticComponent<LabTextFieldProps & React.RefAttributes<LabInputElement>>;
export {};
//# sourceMappingURL=text-field.d.ts.map