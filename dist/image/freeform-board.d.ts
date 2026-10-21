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
export declare function FreeformBoard({ embedded, takes, selectedId, onSelect, insets, now, signedIn, starters, onStarter, onRetry, onRemove, emptyContent, }: {
    embedded?: boolean;
    takes: ImageTake[];
    selectedId: string | undefined;
    onSelect(id: string): void;
    insets: Insets;
    now: number;
    signedIn: boolean;
    starters: {
        label: string;
        prompt: string;
    }[];
    onStarter(prompt: string): void;
    onRetry(take: ImageTake): void;
    onRemove(take: ImageTake): void;
    /** Replaces the default welcome on an empty board (e.g. the poster template gallery). */
    emptyContent?: ReactNode;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=freeform-board.d.ts.map