import * as React from 'react';
import { type LabFieldDecorationProps } from './field-shell.js';
import { type LabInputValidator } from './raw-input.js';
export type LabSelectProps = LabFieldDecorationProps & {
    'children': React.ReactNode;
    'value': string | null;
    'onValueChange': (value: string) => void;
    'className'?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: React.AriaAttributes['aria-invalid'];
    'id'?: string;
    'placeholder'?: string;
    'disabled'?: boolean;
    'name'?: string;
    'required'?: boolean;
    'requiredMessage'?: string;
    'validator'?: LabInputValidator;
    'validationMode'?: 'blur' | 'change' | 'submit';
    'onValidationChange'?: (error: string | null) => void;
    'onBlur'?: React.FocusEventHandler<HTMLButtonElement>;
};
export declare function LabSelect({ children, value: suppliedValue, onValueChange, className, variant, controlSize, label, hint, dir, placeholder, labelStyle, leadingIcon, leading, trailing, supportingText, error, containerClassName, name, required, requiredMessage, validator, validationMode, onValidationChange, onBlur, ...props }: LabSelectProps): React.JSX.Element;
export declare function LabOption({ value, children }: {
    value?: string;
    children: React.ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=select.d.ts.map