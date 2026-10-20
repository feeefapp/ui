import { type ReactNode } from 'react';
import { type LabTemporalConfig } from './filters/temporal.js';
import './filter-bar.css';
export type LabFilterValue = string | boolean | {
    from: string;
    to: string;
} | null;
export type LabFilterOption = {
    id: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    keywords?: readonly string[];
    validate?: (value: LabFilterValue) => string | null;
} & ({
    type?: 'boolean';
} | {
    type: 'enum';
    choices: readonly {
        value: string;
        label: string;
    }[];
} | LabTemporalConfig | {
    type: 'custom';
    renderEditor: (value: LabFilterValue, onChange: (value: LabFilterValue) => void) => ReactNode;
    formatValue?: (value: LabFilterValue) => string;
});
export type LabFilterBarProps = {
    label: string;
    options: readonly LabFilterOption[];
    /** Enabled boolean filters. */
    value: readonly string[];
    onChange: (value: string[]) => void;
    /** Non-boolean values can be controlled independently from pinned shortcuts. */
    values?: Readonly<Record<string, LabFilterValue>>;
    onValuesChange?: (values: Record<string, LabFilterValue>) => void;
    pinned?: readonly string[];
    onPinnedChange?: (ids: string[]) => void;
    onNaturalFilter?: (text: string) => Promise<readonly string[]> | readonly string[];
    onBack?: () => void;
    trailing?: ReactNode;
};
/** Searchable filter catalog; pinning controls shortcuts, clearing controls query values. */
export declare function LabFilterBar({ label, options, value, onChange, values: controlledValues, onValuesChange, pinned: controlledPins, onPinnedChange, onNaturalFilter, onBack, trailing, }: LabFilterBarProps): import("react").JSX.Element;
//# sourceMappingURL=filter-bar.d.ts.map