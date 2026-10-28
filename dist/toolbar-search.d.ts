import { type ReactNode, type Ref, type KeyboardEventHandler } from 'react';
import { type InputElement } from './primitives/raw-input.js';
import './toolbar-search.css';
export type ToolbarSearchInputProps = {
    ref: Ref<InputElement>;
    id: string;
    type: 'search';
    'aria-label': string;
    placeholder: string;
    value: string;
    disabled?: boolean;
    tabIndex: number;
    className: string;
    onValueChange: (value: string) => void;
    onKeyDown: KeyboardEventHandler<InputElement>;
};
/** Props for ToolbarSearch. */
export type ToolbarSearchProps = {
    /** Accessible name of the search field and its trigger. Also the default placeholder. */
    label: string;
    /** The query (controlled). */
    value: string;
    /** Called with the new query. Collapsing clears it. */
    onValueChange: (value: string) => void;
    /** Placeholder text. Defaults to `label`. */
    placeholder?: string;
    /** Controls at the start of the row (filters); absorbed into the search glass while the field is open. */
    children?: ReactNode;
    /** Controls at the end of the row, just before the search button (views, tools); absorbed like `children`. */
    trailing?: ReactNode;
    disabled?: boolean;
    className?: string;
    /** Starts open. A non-empty `value` also starts it open. */
    defaultExpanded?: boolean;
    /** Ref to the input element. */
    inputRef?: Ref<InputElement>;
    /** Replaces the default input, e.g. with a combobox; spread the given props onto it. */
    renderInput?: (props: ToolbarSearchInputProps) => ReactNode;
    /** Key handler for the input. Escape is handled first: it collapses and clears. */
    onInputKeyDown?: KeyboardEventHandler<InputElement>;
    /** Called when the field opens or collapses. */
    onExpandedChange?: (expanded: boolean) => void;
};
/**
 * Search button at the end of its row that springs open into a field inside the same glass pill,
 * growing toward the start across the whole row. Persistent material, stable control geometry and
 * a velocity-preserving spring. The row's other bubbles (`children`, `trailing`) are absorbed into
 * the search glass as it opens and grow back out of it when it closes.
 */
export declare function ToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, defaultExpanded, inputRef, renderInput, onInputKeyDown, onExpandedChange }: ToolbarSearchProps): import("react").JSX.Element;
//# sourceMappingURL=toolbar-search.d.ts.map