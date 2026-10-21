import { type ReactNode } from 'react';
import './toolbar-search.css';
export type LabToolbarSearchProps = {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    /** Adjacent filter/navigation bubbles. They give way to the same expanding search surface. */
    children?: ReactNode;
    /** Persistent independent actions, such as dismissing the surrounding dialog. */
    trailing?: ReactNode;
    disabled?: boolean;
    className?: string;
    onExpandedChange?: (expanded: boolean) => void;
};
/** One persistent glass surface morphs from a search action into an unpainted native editor.
 * Content reflows at its final width; only the surrounding material changes geometry.
 */
export declare function LabToolbarSearch({ label, value, onValueChange, placeholder, children, trailing, disabled, className, onExpandedChange }: LabToolbarSearchProps): import("react").JSX.Element;
//# sourceMappingURL=toolbar-search.d.ts.map