import * as React from 'react';
import './choice.css';
type ChoiceDecoration = {
    label?: React.ReactNode;
    description?: React.ReactNode;
    error?: string | null;
    controlSize?: 'regular' | 'compact';
    containerClassName?: string;
};
export type LabCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'children'> & ChoiceDecoration & {
    indeterminate?: boolean;
    onCheckedChange?: (checked: boolean) => void;
};
export type LabRadioProps = Omit<LabCheckboxProps, 'indeterminate'>;
export declare const LabCheckbox: React.ForwardRefExoticComponent<Omit<React.InputHTMLAttributes<HTMLInputElement>, "children" | "type" | "size"> & ChoiceDecoration & {
    indeterminate?: boolean;
    onCheckedChange?: (checked: boolean) => void;
} & React.RefAttributes<HTMLInputElement>>;
export declare const LabRadio: React.ForwardRefExoticComponent<LabRadioProps & React.RefAttributes<HTMLInputElement>>;
export type LabRadioOption = {
    value: string;
    label: React.ReactNode;
    description?: React.ReactNode;
    disabled?: boolean;
};
export type LabRadioGroupProps = Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'defaultValue'> & {
    label: React.ReactNode;
    options: readonly LabRadioOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    form?: string;
    required?: boolean;
    error?: string | null;
    description?: React.ReactNode;
    controlSize?: 'regular' | 'compact';
};
/** Native radios own keyboard navigation, form submission and reset; fieldset owns the group label. */
export declare const LabRadioGroup: React.ForwardRefExoticComponent<Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> & {
    label: React.ReactNode;
    options: readonly LabRadioOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    form?: string;
    required?: boolean;
    error?: string | null;
    description?: React.ReactNode;
    controlSize?: "regular" | "compact";
} & React.RefAttributes<HTMLFieldSetElement>>;
export {};
//# sourceMappingURL=choice.d.ts.map