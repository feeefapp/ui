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
    /** Controls shown next to the collapsed search button; hidden while the field is open. */
    children?: ReactNode;
    /** Content after the search, always visible (it keeps its width while the field expands). */
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
 * Search button that springs open into a field inside the same glass pill, taking the free width
 * of its row. Persistent material, stable control geometry and a velocity-preserving spring.
 * Neighbouring bubbles in `children` are absorbed into the search glass as it opens and grow back
 * out of it when it closes.
 */
export declare function ToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, defaultExpanded, inputRef, renderInput, onInputKeyDown, onExpandedChange }: ToolbarSearchProps): import("react").JSX.Element;
//# sourceMappingURL=toolbar-search.d.ts.map