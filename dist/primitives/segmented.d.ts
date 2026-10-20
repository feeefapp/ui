import { type ReactNode } from 'react';
import './segmented.css';
export type LabSegmentOption<T extends string> = {
    value: T;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
};
export declare function LabSegmentedControl<const T extends string>({ value, onChange, options, label, disabled, className, appearance, }: {
    value: T;
    onChange(value: NoInfer<T>): void;
    options: readonly LabSegmentOption<T>[];
    label: string;
    disabled?: boolean;
    className?: string;
    appearance?: 'grouped' | 'plain';
}): import("react").JSX.Element;
//# sourceMappingURL=segmented.d.ts.map