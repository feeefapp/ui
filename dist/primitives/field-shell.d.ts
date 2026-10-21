import * as React from 'react';
import type { LabControlVariant } from './control-variants.js';
import '../system.css';
import './control-variants.css';
import './text-field.css';
export type LabFieldDecorationProps = {
    /** Floating field name. Takes precedence over the legacy label prop. */
    hint?: string;
    label?: string;
    dir?: React.HTMLAttributes<HTMLElement>['dir'];
    labelStyle?: 'inside' | 'outlined';
    leadingIcon?: React.ReactNode;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    supportingText?: React.ReactNode;
    error?: string | null;
    containerClassName?: string;
    variant?: LabControlVariant;
    controlSize?: 'regular' | 'compact';
};
export type LabFieldControlState = {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
};
export type LabFieldShellProps = LabFieldDecorationProps & {
    id?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    populated?: boolean;
    alwaysFloat?: boolean;
    counter?: React.ReactNode;
    children: (state: LabFieldControlState) => React.ReactNode;
};
/** Decoration only: the child owns editing, selection and validation behavior. */
export declare function LabFieldShell({ id: suppliedId, label, hint, dir, labelStyle, leadingIcon, leading, trailing, supportingText, error, containerClassName, variant, controlSize, disabled, required, invalid, describedBy, populated, alwaysFloat, counter, children, }: LabFieldShellProps): React.JSX.Element;
//# sourceMappingURL=field-shell.d.ts.map