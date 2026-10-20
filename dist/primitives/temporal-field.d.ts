import * as React from 'react';
import { type LabFieldDecorationProps } from './field-shell.js';
import { type LabTemporalConfig, type LabTemporalValue } from '../filters/temporal.js';
import './temporal-field.css';
export type LabTemporalFieldProps = LabFieldDecorationProps & LabTemporalConfig & {
    'value': LabTemporalValue;
    'onValueChange': (value: LabTemporalValue) => void;
    'id'?: string;
    'name'?: string;
    /** Optional independent range form entries, in addition to name's JSON value. */
    'rangeNames'?: {
        from: string;
        to: string;
    };
    'disabled'?: boolean;
    'readOnly'?: boolean;
    'required'?: boolean;
    'requiredMessage'?: string;
    'placeholder'?: string;
    'clearable'?: boolean;
    'validator'?: (value: LabTemporalValue) => string | null | undefined;
    'validationMode'?: 'blur' | 'change' | 'submit';
    'onValidationChange'?: (error: string | null) => void;
    'onBlur'?: React.FocusEventHandler<HTMLButtonElement>;
    'locale'?: string;
    'formatValue'?: (value: LabTemporalValue) => string;
    'className'?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
};
/** Full-surface field trigger + shared selection-first editor. Drafts commit only on Apply. */
export declare const LabTemporalField: React.ForwardRefExoticComponent<LabFieldDecorationProps & LabTemporalConfig & {
    value: LabTemporalValue;
    onValueChange: (value: LabTemporalValue) => void;
    id?: string;
    name?: string;
    /** Optional independent range form entries, in addition to name's JSON value. */
    rangeNames?: {
        from: string;
        to: string;
    };
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    requiredMessage?: string;
    placeholder?: string;
    clearable?: boolean;
    validator?: (value: LabTemporalValue) => string | null | undefined;
    validationMode?: "blur" | "change" | "submit";
    onValidationChange?: (error: string | null) => void;
    onBlur?: React.FocusEventHandler<HTMLButtonElement>;
    locale?: string;
    formatValue?: (value: LabTemporalValue) => string;
    className?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
} & React.RefAttributes<HTMLButtonElement>>;
export type LabTemporalSingleFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
    value: string | null;
    onValueChange: (value: string | null) => void;
};
export type LabTemporalRangeFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
    value: {
        from: string;
        to: string;
    } | null;
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
};
export declare const LabDateField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: string | null;
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const LabTimeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: string | null;
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const LabDateTimeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: string | null;
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const LabDateRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: {
        from: string;
        to: string;
    } | null;
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const LabTimeRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: {
        from: string;
        to: string;
    } | null;
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
export declare const LabDateTimeRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    value: {
        from: string;
        to: string;
    } | null;
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=temporal-field.d.ts.map