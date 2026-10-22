import * as React from 'react';
import type { LabControlVariant } from './control-variants.js';
import '../system.css';
import './control-variants.css';
import './text-field.css';
export type LabFieldDecorationProps = {
    /** The field's name. It sits inside the empty field and floats up on focus or when a value is present. */
    hint?: string;
    label?: string;
    /** Text direction of the field. `auto` follows the typed text once the field has a value. */
    dir?: React.HTMLAttributes<HTMLElement>['dir'];
    /** Where the floated hint rests: on the border (`outlined`) or inside the field above the value (`inside`). */
    labelStyle?: 'inside' | 'outlined';
    /** Decorative icon at the start of the field. Hidden from assistive technology. */
    leadingIcon?: React.ReactNode;
    /** Content at the start of the field, after the icon: a prefix such as `+213` or a currency. */
    leading?: React.ReactNode;
    /** Content at the end of the field: a unit, a clear button or another small action. */
    trailing?: React.ReactNode;
    /** Help text under the field. Replaced by `error` while there is one. */
    supportingText?: React.ReactNode;
    /** Error message under the field. Any non-empty value marks the field invalid. */
    error?: string | null;
    /** Class name for the outer wrapper (field plus supporting text), for layout. */
    containerClassName?: string;
    /** Surface emphasis, shared with buttons. */
    variant?: LabControlVariant;
    /** Field height: `regular` (44px) or `compact` (40px). */
    controlSize?: 'regular' | 'compact';
};
/** What `LabFieldShell` hands its child control so the label and messages stay connected. */
export type LabFieldControlState = {
    /** Put on the control; the floating label points at it. */
    id: string;
    /** Put on the control as `aria-describedby`: supporting text, error and counter ids. */
    describedBy: string | undefined;
    /** Put on the control as `aria-invalid`. */
    invalid: boolean;
};
export type LabFieldShellProps = LabFieldDecorationProps & {
    /** Id for the control. Generated when omitted. */
    id?: string;
    /** Dims the field. The child control must also be disabled. */
    disabled?: boolean;
    /** Adds a required marker after the hint. The child control enforces it. */
    required?: boolean;
    /** Marks the field invalid without showing an error message. */
    invalid?: boolean;
    /** Extra ids to include in the control's `aria-describedby`. */
    describedBy?: string;
    /** Keeps the hint floated, for controls that hold a value the shell cannot see. */
    populated?: boolean;
    /** Always floats the hint, for controls that always show content (dates, colors). */
    alwaysFloat?: boolean;
    /** Content at the end of the supporting line, such as a character count. */
    counter?: React.ReactNode;
    /** Renders the control, given the id, description ids and invalid state to apply to it. */
    children: (state: LabFieldControlState) => React.ReactNode;
};
/**
 * The field frame on its own: surface, floating hint, icons, affixes, supporting text and
 * counter. It paints and labels; the child control owns editing, selection and validation.
 */
export declare function LabFieldShell({ id: suppliedId, label, hint, dir, labelStyle, leadingIcon, leading, trailing, supportingText, error, containerClassName, variant, controlSize, disabled, required, invalid, describedBy, populated, alwaysFloat, counter, children, }: LabFieldShellProps): React.JSX.Element;
//# sourceMappingURL=field-shell.d.ts.map