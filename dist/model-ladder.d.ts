import { type ReactNode } from 'react';
import './model-ladder.css';
import { type AspectReadout, type LadderCopy, type LadderStop } from './model-ladder-core.js';
export * from './model-ladder-core.js';
/**
 * Quality picker: a trigger (chip or icon) that opens a popover with the ladder card. Moves
 * between curated models with one slider, cheapest first; the title opens the full model list.
 */
export declare function ModelLadder({ stops, index, defaultIndex, onChange, enabled, canvas, belowModel, catalog, onPickModel, onBrowseModels, onOpenChange, selectedModel, copy, variant, align, side, className, }: {
    /** The quality rungs, cheapest first. Nothing renders when empty. */
    stops: LadderStop[];
    /** Selected rung (controlled). Clamped to the stops. */
    index: number;
    /** The rung "Reset to default" returns to. */
    defaultIndex?: number;
    /** Called with the new rung index. */
    onChange(index: number): void;
    /** `false` disables the trigger so the popover cannot open. */
    enabled?: boolean;
    /** Size and aspect readout of the output canvas, shown under the title. */
    canvas?: AspectReadout | null;
    /** Extra controls under the model switch (e.g. a length or shape picker). */
    belowModel?: ReactNode;
    /** Every model the user may pick from the title list; defaults to the ladder rungs. */
    catalog?: LadderStop[];
    /** Called when the user picks a catalog model that is not one of the rungs. */
    onPickModel?(modelId: string): void;
    /** Replaces the built-in model list: the title button closes the popover and calls this. */
    onBrowseModels?(): void;
    /** Called when the popover opens or closes. */
    onOpenChange?(open: boolean): void;
    /** A specific catalog choice outside the curated quality ladder. */
    selectedModel?: LadderStop;
    /** Overrides the localized strings. */
    copy?: LadderCopy;
    /**
     * `chip` shows the tier and model name; `icon` is a compact brain button like marchant;
     * `compact` is one small-control line (brain, tier, chevron) for composer and toolbar rows.
     */
    variant?: 'chip' | 'icon' | 'compact';
    /** Popover alignment against the trigger. */
    align?: 'start' | 'center' | 'end';
    /** Which side of the trigger the popover opens on. */
    side?: 'top' | 'bottom';
    className?: string;
}): import("react").JSX.Element | null;
/** The ladder card: tier title, model switch, canvas readout, extra controls and the track. */
export declare function ModelLadderCard({ stops, index, defaultIndex, onChange, canvas, belowModel, catalog, onPickModel, onBrowseModels, selectedModel, copy, pickable, }: {
    /** The quality rungs, cheapest first. Needs at least one. */
    stops: LadderStop[];
    /** Selected rung (controlled). Clamped to the stops. */
    index: number;
    /** The rung "Reset to default" returns to. */
    defaultIndex?: number;
    /** Called with the new rung index. */
    onChange(index: number): void;
    /** Size and aspect readout of the output canvas, shown under the title. */
    canvas?: AspectReadout | null;
    /** Extra controls between the readout and the track. */
    belowModel?: ReactNode;
    /** Every model the user may pick from the title list; defaults to the ladder rungs. */
    catalog?: LadderStop[];
    /** Called when the user picks a catalog model that is not one of the rungs. */
    onPickModel?(modelId: string): void;
    /** Replaces the built-in model list: the title button calls this instead. */
    onBrowseModels?(): void;
    /** A specific catalog choice outside the curated quality ladder. */
    selectedModel?: LadderStop;
    /** Overrides the localized strings. */
    copy?: LadderCopy;
    /** `false` turns the title into a plain label with no model list. */
    pickable?: boolean;
}): import("react").JSX.Element;
/** A rectangle at the true proportions, fitted inside a square so every ratio lines up. */
export declare function AspectBox({ widthOverHeight, box, }: {
    /** Aspect ratio as width divided by height. */
    widthOverHeight: number;
    /** Side of the square it is fitted into, in pixels. */
    box?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=model-ladder.d.ts.map