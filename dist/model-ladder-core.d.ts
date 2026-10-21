/** Pure ladder helpers (no React, no CSS) so they can be unit tested. */
/**
 * Quality ladder: one control that moves between curated models, cheapest first.
 * Web port of marchant `tools/ai/widgets/model_ladder_selector.dart`.
 */
export type LadderStop = {
    access?: 'free' | 'pro';
    modelId: string;
    /** Tier word shown large, e.g. "Fast", "Pro". Replaced by a positional tier when it copies the name or id. */
    label: string;
    modelName: string;
    /** Optional one-liner shown in the model list. */
    description?: string | null;
    /** Typical price per run, when known. Never estimated on the client. */
    priceUsd?: number | null;
};
/** A ladder as the Lab API serves it (Cloud collection, or a priced catalog fallback). */
export type LabLadder = {
    id: string;
    name: string;
    source: 'cloud' | 'catalog';
    stops: {
        access?: 'free' | 'pro';
        modelId: string;
        label: string;
        modelName: string;
        description: string | null;
    }[];
    defaultIndex: number;
};
/** Size and aspect of the canvas the selected model will render. */
export type AspectReadout = {
    size: string;
    aspect: string;
    widthOverHeight: number;
};
export type LadderCopy = {
    quality: string;
    reset: string;
    fast: string;
    balanced: string;
    best: string;
    pickModel: string;
    searchModels: string;
    noMatches: string;
    back: string;
    typical: (price: string) => string;
};
export declare const LADDER_COPY: LadderCopy;
export declare const clamp: (value: number, min: number, max: number) => number;
/** Tier word for a stop; a label that copies the name or id becomes Fast / Balanced / Best. */
export declare function visibleLabel(stop: LadderStop, index: number, count: number, copy?: LadderCopy): string;
/** Human name for a list row; falls back to the tier when the catalog copied the id. */
export declare function displayName(stop: LadderStop, index: number, count: number, copy?: LadderCopy): string;
/** The ladder's middle rung is the balanced default, as in marchant. */
export declare const middleIndex: (count: number) => number;
/** Heat of the top rung: 0 until the thumb passes the second-to-last stop, 1 on the last. */
export declare const heatAt: (position: number, count: number) => number;
/** USD with enough precision for cents-level AI prices. */
export declare const formatUsd: (value: number) => string;
export declare const reducedMotion: () => boolean;
export declare const FIRE_CELL = 5;
export declare const FIRE_PALETTE: string[];
/** Cheap deterministic noise in [0, 1) for one cell and frame. */
export declare const fireNoise: (x: number, y: number, frame: number) => number;
/** Palette index for a cell, or -1 when it stays dark. `rise` is 0 at the top edge, 1 at the bottom. */
export declare function fireCell(col: number, row: number, rows: number, frame: number): number;
//# sourceMappingURL=model-ladder-core.d.ts.map