import { type ReactNode } from 'react';
import { type TemporalConfig } from './filters/temporal.js';
import './filter-bar.css';
/** A filter's value: `true` for on/off filters, a string, a `{from, to}` range, or `null` (any). */
export type FilterValue = string | boolean | {
    from: string;
    to: string;
} | null;
/**
 * One filter in the catalog. `type` picks the editor: omitted/`boolean` (on/off), `enum` (choice
 * list), a temporal type (`date`, `time`, `datetime`, `dateRange`, `timeRange`, `datetimeRange`)
 * or `custom` (your own editor in a dialog).
 */
export type FilterOption = {
    /** Stable id; the key in `value` / `values` / `pinned`. */
    id: string;
    /** Name shown in the catalog and on the pinned chip. */
    label: string;
    /** Second line in the catalog row. */
    description?: string;
    /** Catalog row icon. Defaults to one per type. */
    icon?: ReactNode;
    /** Extra words the catalog search matches. */
    keywords?: readonly string[];
    /** Returns an error message to block Apply, or null. Runs after the built-in temporal checks. */
    validate?: (value: FilterValue) => string | null;
} & ({
    type?: 'boolean';
} | {
    type: 'enum';
    /** The choices; the stored value is the choice's `value`. */
    choices: readonly {
        value: string;
        label: string;
    }[];
} | TemporalConfig | {
    type: 'custom';
    /** Renders the editor inside the filter dialog. Call `onChange` with the draft value. */
    renderEditor: (value: FilterValue, onChange: (value: FilterValue) => void) => ReactNode;
    /** Text for the chip and catalog row. Defaults to the raw value. */
    formatValue?: (value: FilterValue) => string;
});
export type FilterBarProps = {
    /** Accessible name of the bar. */
    label: string;
    /** The filter catalog. */
    options: readonly FilterOption[];
    /** Enabled boolean filters. */
    value: readonly string[];
    /** Called with the new list of enabled boolean filter ids. */
    onChange: (value: string[]) => void;
    /** Non-boolean values can be controlled independently from pinned shortcuts. */
    values?: Readonly<Record<string, FilterValue>>;
    /** Called with every non-boolean value after an edit; cleared filters are `null`. */
    onValuesChange?: (values: Record<string, FilterValue>) => void;
    /** Ids shown as chips in the bar (controlled). Pinning never changes a value. */
    pinned?: readonly string[];
    /** Called when filters are pinned or unpinned. Editing or toggling a filter also pins it. */
    onPinnedChange?: (ids: string[]) => void;
    /**
     * Adds a "describe a filter" button. Return the boolean filter ids to enable (an empty list clears
     * all) or throw an Error whose message is shown under the field. You supply the parser or model.
     */
    onNaturalFilter?: (text: string) => Promise<readonly string[]> | readonly string[];
    /** Example descriptions under the natural-language field; choosing one fills the field. */
    naturalSuggestions?: readonly string[];
    /** Shows a back button before the filter controls, e.g. to leave a filtered view. */
    onBack?: () => void;
    /** Content at the end of the bar, usually a ToolbarGroup of view actions. */
    trailing?: ReactNode;
};
/**
 * Filter toolbar: a searchable catalog button, an optional natural-language button, pinned filter
 * chips and trailing actions. Pinning controls shortcuts, clearing controls query values.
 */
export declare function FilterBar({ label, options, value, onChange, values: controlledValues, onValuesChange, pinned: controlledPins, onPinnedChange, onNaturalFilter, naturalSuggestions, onBack, trailing, }: FilterBarProps): import("react").JSX.Element;
//# sourceMappingURL=filter-bar.d.ts.map