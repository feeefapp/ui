import { type ReactNode } from 'react';
import type { ImageTake } from './types.js';
import './freeform-board.css';
export type Insets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
type View = {
    x: number;
    y: number;
    scale: number;
};
type Card = {
    take: ImageTake;
    x: number;
    y: number;
    w: number;
    h: number;
    number: number;
};
/** Lay the versions out left to right, oldest first, centred on the origin row. */
/** `google/gemini-3-pro-image-preview` → `Gemini 3 Pro Image Preview`. */
export declare function humanModel(id: string): string;
export declare function layoutCards(takes: ImageTake[], ratios: Record<string, number>): Card[];
/** Scale and offset that fit a world rect into the visible area between floating panels. */
export declare function fitView(rect: {
    x: number;
    y: number;
    w: number;
    h: number;
}, viewport: {
    w: number;
    h: number;
}, insets: Insets, padding?: number, maxScale?: number): View;
/**
 * Freeform-style board: an endless dotted canvas behind every panel. Versions sit side by side;
 * the selected one glides into the free area between the floating panels. Drag to pan, scroll to
 * pan, pinch or ⌘/Ctrl+scroll to zoom, double-click a card to fit it.
 */
export declare function FreeformBoard({ embedded, takes, selectedId, onSelect, insets, now, signedIn, starters, onStarter, onRetry, onRemove, emptyContent, emptyScene, modelLabel, }: {
    /** Display name of a take's model for its card label ("{model} #{n}"). Defaults to a tidied id. */
    modelLabel?(modelId: string): string | undefined;
    /** Fills its positioned parent instead of the whole window (`position: fixed`). */
    embedded?: boolean;
    /** Versions to show, newest first; they are laid out oldest to newest, left to right. */
    takes: ImageTake[];
    /** The selected take; the board glides it into view. Defaults to the newest. */
    selectedId: string | undefined;
    /** Called with a take id when its card is clicked (not dragged). */
    onSelect(id: string): void;
    /** Room taken by floating chrome on each edge, in pixels; cards fit between them. */
    insets: Insets;
    /** Current time in ms, for the elapsed timer on pending cards. Tick it while work runs. */
    now: number;
    /** Picks the empty-board hint for signed-in or signed-out users. */
    signedIn: boolean;
    /** Starter prompts on the empty board. */
    starters: {
        label: string;
        prompt: string;
    }[];
    /** Called with the prompt of the starter the user clicked. */
    onStarter(prompt: string): void;
    /** Called from a failed card's "Try again". */
    onRetry(take: ImageTake): void;
    /** Called from a failed card's "Remove". */
    onRemove(take: ImageTake): void;
    /** Replaces the default welcome with content fixed to the viewport. */
    emptyContent?: ReactNode;
    /** Interactive content at the world origin. The board fits its measured bounds on entry and resize. */
    emptyScene?: {
        content: ReactNode;
        maxWidth: number;
    };
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=freeform-board.d.ts.map