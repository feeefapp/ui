import { type ReactNode, type Ref, type KeyboardEventHandler } from 'react';
import { type LabInputElement } from './primitives/raw-input.js';
import './toolbar-search.css';
export type LabToolbarSearchInputProps = {
    ref: Ref<LabInputElement>;
    id: string;
    type: 'search';
    'aria-label': string;
    placeholder: string;
    value: string;
    disabled?: boolean;
    tabIndex: number;
    className: string;
    onValueChange: (value: string) => void;
    onKeyDown: KeyboardEventHandler<LabInputElement>;
};
export type LabToolbarSearchProps = {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    children?: ReactNode;
    trailing?: ReactNode;
    disabled?: boolean;
    className?: string;
    defaultExpanded?: boolean;
    inputRef?: Ref<LabInputElement>;
    renderInput?: (props: LabToolbarSearchInputProps) => ReactNode;
    onInputKeyDown?: KeyboardEventHandler<LabInputElement>;
    onExpandedChange?: (expanded: boolean) => void;
};
/** Persistent material, stable control geometry and a velocity-preserving spring. */
export declare function LabToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, defaultExpanded, inputRef, renderInput, onInputKeyDown, onExpandedChange }: LabToolbarSearchProps): import("react").JSX.Element;
//# sourceMappingURL=toolbar-search.d.ts.map