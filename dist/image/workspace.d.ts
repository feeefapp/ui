import { type ReactNode } from 'react';
import type { Insets } from './freeform-board.js';
import './workspace.css';
/** Bounded Lab canvas with measured floating chrome and a 12px edge inset. */
export declare function ImageWorkspace({ top, bottom, board }: {
    /** Floating chrome along the top edge (title, project actions). Measured. */
    top: ReactNode;
    /** Floating chrome along the bottom edge, usually the prompt composer (max 780px wide). Measured. */
    bottom: ReactNode;
    /** Renders the canvas behind the chrome; receives the room the chrome takes on each edge. */
    board: (insets: Insets) => ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=workspace.d.ts.map