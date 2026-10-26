import { type ReactNode } from 'react';
import './speech.css';
/**
 * One card in a speech script: a drag handle, a toolbar and the block's editor. Only the handle
 * drags; text editing, selection and viewport scrolling stay native. Blocks must be siblings.
 */
export declare function SpeechBlock({ children, toolbar, index, count, onMove, seed, reorderDisabled, }: {
    /** The block's editor, usually a multiline text field. */
    children: ReactNode;
    /** Controls next to the drag handle (speaker, style, delete). Defaults to a "Speech block N" caption. */
    toolbar?: ReactNode;
    /** Position of this block in the list, from 0. */
    index: number;
    /** Number of blocks in the list. Reordering is off below 2. */
    count: number;
    /** Stable id that picks the corner texture, usually the block id. */
    seed: string;
    /** Disables the drag handle, for example while a generation runs. */
    reorderDisabled?: boolean;
    /** Called once on drop (or arrow key) with the old and new index. */
    onMove: (from: number, to: number) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=block.d.ts.map