import { type ReactNode } from 'react';
import './segmented.css';
/** One choice of a segmented control. */
export type SegmentOption<T extends string> = {
    /** Value reported to `onChange`. */
    value: T;
    /** Visible text and accessible name. */
    label: string;
    /** Decorative icon before the label. */
    icon?: ReactNode;
    /** Skipped by the keyboard and not clickable. */
    disabled?: boolean;
};
/**
 * A single choice among two to five short options, shown side by side. Radio semantics: one Tab
 * stop, arrow keys move and select.
 */
export declare function SegmentedControl<const T extends string>({ value, onChange, options, label, disabled, className, appearance, }: {
    /** The selected option's value. */
    value: T;
    /** Called with the chosen value on click and on every arrow, Home or End key press. */
    onChange(value: NoInfer<T>): void;
    /** Choices, in display order. */
    options: readonly SegmentOption<T>[];
    /** Accessible name of the radio group. */
    label: string;
    /** Disables every option. */
    disabled?: boolean;
    /** Class name for the group. */
    className?: string;
    /** `grouped` draws its own glass container; `plain` sits directly on an existing surface. */
    appearance?: 'grouped' | 'plain';
}): import("react").JSX.Element;
//# sourceMappingURL=segmented.d.ts.map