import * as React from 'react';
import { type LabFieldDecorationProps } from './field-shell.js';
import { type LabTemporalConfig, type LabTemporalValue } from '../filters/temporal.js';
import './temporal-field.css';
export type LabTemporalFieldProps = LabFieldDecorationProps & LabTemporalConfig & {
    /** Committed value: a local ISO string (`2026-10-21`, `09:30`, `2026-10-21T09:30`), a `{ from, to }` range, or `null`. */
    value: LabTemporalValue;
    /** Called with the normalized value on Apply or when the clear button empties the field. */
    onValueChange: (value: LabTemporalValue) => void;
    /** Id of the trigger button; generated when omitted. */
    id?: string;
    /** Form field name. Single values submit as the ISO string, ranges as `{"from","to"}` JSON. */
    name?: string;
    /** Optional independent range form entries, in addition to name's JSON value. */
    rangeNames?: {
        from: string;
        to: string;
    };
    /** Disables the trigger and leaves the value out of form submission. */
    disabled?: boolean;
    /** Shows the value but never opens the picker; skips validation. */
    readOnly?: boolean;
    /** Requires a value; checked on blur, on form submit and on Apply. */
    required?: boolean;
    /** Error shown when a required field is empty. */
    requiredMessage?: string;
    /** Text shown while empty. Hidden when a `hint` is set; add an `aria-label` when used alone. */
    placeholder?: string;
    /** Shows a clear button inside the field while it has a value. */
    clearable?: boolean;
    /** Extra synchronous rule after the built-in format, step and bounds checks. Return an error message or nothing. */
    validator?: (value: LabTemporalValue) => string | null | undefined;
    /** When errors appear: after the field loses focus (default), on every change, or only on form submit. */
    validationMode?: 'blur' | 'change' | 'submit';
    /** Receives the current error message, or `null` once the value is valid. */
    onValidationChange?: (error: string | null) => void;
    /** Blur handler for the trigger button. */
    onBlur?: React.FocusEventHandler<HTMLButtonElement>;
    /** BCP 47 locale for the displayed value and the calendar. Defaults to the kit's i18n locale; the stored value stays ISO. */
    locale?: string;
    /** Replaces the default display text for the value. Display only. */
    formatValue?: (value: LabTemporalValue) => string;
    /** Class name for the trigger button. Use `containerClassName` for the field box. */
    className?: string;
    /** Accessible name when there is no visible `hint`. */
    'aria-label'?: string;
    /** Extra ids describing the field, added to its supporting text and error. */
    'aria-describedby'?: string;
};
/**
 * A date or time field: a full-surface trigger that opens a selection-first picker with preset
 * chips, calendars, number-field times and optional typed entry. Single values open in a popover
 * (a dialog on phones), ranges in a dialog. A date commits on the day you pick; times, datetimes and
 * ranges commit on Apply.
 */
export declare const LabTemporalField: React.ForwardRefExoticComponent<LabFieldDecorationProps & LabTemporalConfig & {
    /** Committed value: a local ISO string (`2026-10-21`, `09:30`, `2026-10-21T09:30`), a `{ from, to }` range, or `null`. */
    value: LabTemporalValue;
    /** Called with the normalized value on Apply or when the clear button empties the field. */
    onValueChange: (value: LabTemporalValue) => void;
    /** Id of the trigger button; generated when omitted. */
    id?: string;
    /** Form field name. Single values submit as the ISO string, ranges as `{"from","to"}` JSON. */
    name?: string;
    /** Optional independent range form entries, in addition to name's JSON value. */
    rangeNames?: {
        from: string;
        to: string;
    };
    /** Disables the trigger and leaves the value out of form submission. */
    disabled?: boolean;
    /** Shows the value but never opens the picker; skips validation. */
    readOnly?: boolean;
    /** Requires a value; checked on blur, on form submit and on Apply. */
    required?: boolean;
    /** Error shown when a required field is empty. */
    requiredMessage?: string;
    /** Text shown while empty. Hidden when a `hint` is set; add an `aria-label` when used alone. */
    placeholder?: string;
    /** Shows a clear button inside the field while it has a value. */
    clearable?: boolean;
    /** Extra synchronous rule after the built-in format, step and bounds checks. Return an error message or nothing. */
    validator?: (value: LabTemporalValue) => string | null | undefined;
    /** When errors appear: after the field loses focus (default), on every change, or only on form submit. */
    validationMode?: "blur" | "change" | "submit";
    /** Receives the current error message, or `null` once the value is valid. */
    onValidationChange?: (error: string | null) => void;
    /** Blur handler for the trigger button. */
    onBlur?: React.FocusEventHandler<HTMLButtonElement>;
    /** BCP 47 locale for the displayed value and the calendar. Defaults to the kit's i18n locale; the stored value stays ISO. */
    locale?: string;
    /** Replaces the default display text for the value. Display only. */
    formatValue?: (value: LabTemporalValue) => string;
    /** Class name for the trigger button. Use `containerClassName` for the field box. */
    className?: string;
    /** Accessible name when there is no visible `hint`. */
    'aria-label'?: string;
    /** Extra ids describing the field, added to its supporting text and error. */
    'aria-describedby'?: string;
} & React.RefAttributes<HTMLButtonElement>>;
export type LabTemporalSingleFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
    /** Committed local ISO string, or `null` when empty. */
    value: string | null;
    /** Called with the applied string, or `null` when cleared. */
    onValueChange: (value: string | null) => void;
};
export type LabTemporalRangeFieldProps = Omit<LabTemporalFieldProps, 'type' | 'value' | 'onValueChange'> & {
    /** Committed range of local ISO strings; either end may be `''` (open), or the whole value `null`. */
    value: {
        from: string;
        to: string;
    } | null;
    /** Called with the applied range, or `null` when cleared. */
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
};
/** A calendar day, stored as `YYYY-MM-DD`. */
export declare const LabDateField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed local ISO string, or `null` when empty. */
    value: string | null;
    /** Called with the applied string, or `null` when cleared. */
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
/** A time of day, stored as `HH:mm` (or `HH:mm:ss` when `step` is under 60 seconds). */
export declare const LabTimeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed local ISO string, or `null` when empty. */
    value: string | null;
    /** Called with the applied string, or `null` when cleared. */
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
/** A local date and time, stored as `YYYY-MM-DDTHH:mm`. */
export declare const LabDateTimeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed local ISO string, or `null` when empty. */
    value: string | null;
    /** Called with the applied string, or `null` when cleared. */
    onValueChange: (value: string | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
/** A range of calendar days, stored as `{ from, to }` dates. */
export declare const LabDateRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed range of local ISO strings; either end may be `''` (open), or the whole value `null`. */
    value: {
        from: string;
        to: string;
    } | null;
    /** Called with the applied range, or `null` when cleared. */
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
/** A range of times of day; `allowOvernight` lets the end come before the start. */
export declare const LabTimeRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed range of local ISO strings; either end may be `''` (open), or the whole value `null`. */
    value: {
        from: string;
        to: string;
    } | null;
    /** Called with the applied range, or `null` when cleared. */
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
/** A range of local dates and times. */
export declare const LabDateTimeRangeField: React.ForwardRefExoticComponent<Omit<LabTemporalFieldProps, "type" | "value" | "onValueChange"> & {
    /** Committed range of local ISO strings; either end may be `''` (open), or the whole value `null`. */
    value: {
        from: string;
        to: string;
    } | null;
    /** Called with the applied range, or `null` when cleared. */
    onValueChange: (value: {
        from: string;
        to: string;
    } | null) => void;
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=temporal-field.d.ts.map