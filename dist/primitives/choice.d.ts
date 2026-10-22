import * as React from 'react';
import './choice.css';
type ChoiceDecoration = {
    /** Visible label next to the mark. Clicking it toggles the control. */
    label?: React.ReactNode;
    /** Secondary text under the label, linked as the control's description. */
    description?: React.ReactNode;
    /** Error message under the label. Marks the control invalid and blocks form submission. */
    error?: string | null;
    /** Control density: `regular` or `compact`. */
    controlSize?: 'regular' | 'compact';
    /** Class name for the outer `<label>`, for layout. */
    containerClassName?: string;
};
export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'children'> & ChoiceDecoration & {
    /** Shows a dash for a partly selected group and reports `aria-checked="mixed"`. Derive it from your own state; it does not clear itself. */
    indeterminate?: boolean;
    /** Called with the new checked state. */
    onCheckedChange?: (checked: boolean) => void;
};
export type RadioProps = Omit<CheckboxProps, 'indeterminate'>;
/** A native checkbox with a label, description, error and indeterminate state. */
export declare const Checkbox: React.ForwardRefExoticComponent<Omit<React.InputHTMLAttributes<HTMLInputElement>, "children" | "type" | "size"> & ChoiceDecoration & {
    /** Shows a dash for a partly selected group and reports `aria-checked="mixed"`. Derive it from your own state; it does not clear itself. */
    indeterminate?: boolean;
    /** Called with the new checked state. */
    onCheckedChange?: (checked: boolean) => void;
} & React.RefAttributes<HTMLInputElement>>;
/** A single native radio with a label and description. Prefer `RadioGroup`, which names and labels the set. */
export declare const Radio: React.ForwardRefExoticComponent<RadioProps & React.RefAttributes<HTMLInputElement>>;
/** One entry in `RadioGroup`'s `options`. */
export type RadioOption = {
    /** The value submitted and passed to `onValueChange`. Must be unique in the group. */
    value: string;
    /** Visible label. */
    label: React.ReactNode;
    /** Secondary text under the label. */
    description?: React.ReactNode;
    /** Disables this option only. */
    disabled?: boolean;
};
export type RadioGroupProps = Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'defaultValue'> & {
    /** The group's question, rendered as the fieldset legend. */
    label: React.ReactNode;
    /** The choices, in order. */
    options: readonly RadioOption[];
    /** The selected value, for a controlled group. */
    value?: string;
    /** The initially selected value, for an uncontrolled group. */
    defaultValue?: string;
    /** Called with the newly selected option's value. */
    onValueChange?: (value: string) => void;
    /** Form field name shared by the radios. Generated when omitted. */
    name?: string;
    /** Id of a form outside the group that the radios belong to. */
    form?: string;
    /** Requires a choice before the form submits; adds a marker to the legend. */
    required?: boolean;
    /** Error message under the options. Marks the group invalid and blocks form submission. */
    error?: string | null;
    /** Help text under the legend. */
    description?: React.ReactNode;
    /** Density of every radio: `regular` or `compact`. */
    controlSize?: 'regular' | 'compact';
};
/**
 * A labelled set of mutually exclusive choices. Native radios own keyboard navigation, form
 * submission and reset; the `<fieldset>` and `<legend>` own the group label.
 */
export declare const RadioGroup: React.ForwardRefExoticComponent<Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> & {
    /** The group's question, rendered as the fieldset legend. */
    label: React.ReactNode;
    /** The choices, in order. */
    options: readonly RadioOption[];
    /** The selected value, for a controlled group. */
    value?: string;
    /** The initially selected value, for an uncontrolled group. */
    defaultValue?: string;
    /** Called with the newly selected option's value. */
    onValueChange?: (value: string) => void;
    /** Form field name shared by the radios. Generated when omitted. */
    name?: string;
    /** Id of a form outside the group that the radios belong to. */
    form?: string;
    /** Requires a choice before the form submits; adds a marker to the legend. */
    required?: boolean;
    /** Error message under the options. Marks the group invalid and blocks form submission. */
    error?: string | null;
    /** Help text under the legend. */
    description?: React.ReactNode;
    /** Density of every radio: `regular` or `compact`. */
    controlSize?: "regular" | "compact";
} & React.RefAttributes<HTMLFieldSetElement>>;
export {};
//# sourceMappingURL=choice.d.ts.map