import * as React from 'react';
import { type LabRawInputProps, type LabInputElement } from './raw-input.js';
import { type LabFieldDecorationProps } from './field-shell.js';
type NullableFieldValue<T extends {
    value?: unknown;
}> = T extends unknown ? Omit<T, 'value'> & {
    value?: T['value'] | null;
} : never;
export type LabTextFieldProps = NullableFieldValue<LabRawInputProps> & LabFieldDecorationProps & {
    showCounter?: boolean;
};
export declare const LabTextField: React.ForwardRefExoticComponent<LabTextFieldProps & React.RefAttributes<LabInputElement>>;
export {};
//# sourceMappingURL=text-field.d.ts.map