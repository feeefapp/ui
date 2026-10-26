import * as React from 'react';
import { type RawInputProps, type InputElement } from './raw-input.js';
import { type FieldDecorationProps } from './field-shell.js';
type NullableFieldValue<T extends {
    value?: unknown;
}> = T extends unknown ? Omit<T, 'value'> & {
    value?: T['value'] | null;
} : never;
export type TextFieldProps = NullableFieldValue<RawInputProps> & FieldDecorationProps & {
    /** Shows the character count under the field, with `maxLength` when set. */
    showCounter?: boolean;
};
/**
 * A labelled text input: native `<input>` or growing `<textarea>` inside the field frame, with a
 * floating hint, icons, affixes, supporting text, validation and an optional counter.
 */
export declare const TextField: React.ForwardRefExoticComponent<TextFieldProps & React.RefAttributes<InputElement>>;
export {};
//# sourceMappingURL=text-field.d.ts.map