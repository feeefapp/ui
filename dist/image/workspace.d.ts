import { type ReactNode } from 'react';
import type { Insets } from './freeform-board.js';
import './workspace.css';
/** Bounded Lab canvas with measured floating chrome and a 12px edge inset. */
export declare function LabImageWorkspace({ top, bottom, board }: {
    top: ReactNode;
    bottom: ReactNode;
    board: (insets: Insets) => ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=workspace.d.ts.map