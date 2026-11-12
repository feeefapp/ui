import * as React from 'react';
import { type PanPoint } from '../physics/gesture.js';
type ResizeDividerProps = {
    value: number;
    min: number;
    max: number;
    reset: number;
    label: string;
    className: string;
    style?: React.CSSProperties;
    enabled?: boolean;
    onChange: (value: number) => void;
    onDragStart?: () => number;
    onDragMove?: (value: number, point: PanPoint) => void;
    onDragEnd?: (point: PanPoint & {
        cancelled: boolean;
    }) => void;
};
/** Internal shared separator: one pan recognizer and physical-arrow/RTL contract for columns. */
export declare function ResizeDivider(props: ResizeDividerProps): React.JSX.Element;
export {};
//# sourceMappingURL=resize-divider.d.ts.map