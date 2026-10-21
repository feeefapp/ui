import { type ReactNode } from 'react';
import './model-ladder.css';
import { type AspectReadout, type LadderCopy, type LadderStop } from './model-ladder-core.js';
export * from './model-ladder-core.js';
export declare function ModelLadder({ stops, index, defaultIndex, onChange, enabled, canvas, belowModel, catalog, onPickModel, onBrowseModels, onOpenChange, selectedModel, copy, variant, align, side, className, }: {
    stops: LadderStop[];
    index: number;
    defaultIndex?: number;
    onChange(index: number): void;
    enabled?: boolean;
    canvas?: AspectReadout | null;
    /** Extra controls under the model switch (e.g. a length or shape picker). */
    belowModel?: ReactNode;
    /** Every model the user may pick from the title list; defaults to the ladder rungs. */
    catalog?: LadderStop[];
    onPickModel?(modelId: string): void;
    onBrowseModels?(): void;
    onOpenChange?(open: boolean): void;
    /** A specific catalog choice outside the curated quality ladder. */
    selectedModel?: LadderStop;
    copy?: LadderCopy;
    /** `chip` shows the tier and model name; `icon` is a compact brain button like marchant. */
    variant?: 'chip' | 'icon';
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'bottom';
    className?: string;
}): import("react").JSX.Element | null;
/** The ladder card: tier title, model switch, canvas readout, extra controls and the track. */
export declare function ModelLadderCard({ stops, index, defaultIndex, onChange, canvas, belowModel, catalog, onPickModel, onBrowseModels, selectedModel, copy, pickable, }: {
    stops: LadderStop[];
    index: number;
    defaultIndex?: number;
    onChange(index: number): void;
    canvas?: AspectReadout | null;
    belowModel?: ReactNode;
    catalog?: LadderStop[];
    onPickModel?(modelId: string): void;
    onBrowseModels?(): void;
    /** A specific catalog choice outside the curated quality ladder. */
    selectedModel?: LadderStop;
    copy?: LadderCopy;
    pickable?: boolean;
}): import("react").JSX.Element;
/** A rectangle at the true proportions, fitted inside a square so every ratio lines up. */
export declare function AspectBox({ widthOverHeight, box, }: {
    widthOverHeight: number;
    box?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=model-ladder.d.ts.map