/** Stable identity and optional column bounds, in CSS pixels. */
export type PanelSizing = {
    /** Minimum desktop width. Default 280. A lone panel may shrink below it. */
    minWidth?: number;
    /** Desired desktop width before spare room is shared. Default 420. */
    preferredWidth?: number;
    /** Maximum desktop width. Default Infinity. */
    maxWidth?: number;
};
/** Stable stack identity; IDs must be unique within a host. */
export type PanelIdentity = {
    id: string;
};
/** One visible column returned by allocatePanelWidths. */
export type PanelWidth = {
    id: string; /** Allocated width in CSS pixels. */
    width: number;
};
/** Append a panel, or push after an ancestor and discard that ancestor's descendants. */
export declare function pushPanel<T extends PanelIdentity>(panels: readonly T[], panel: T, after?: string): readonly T[];
/** Replace the named panel (last by default) and discard its descendants. A retained ID retains its state. */
export declare function replacePanel<T extends PanelIdentity>(panels: readonly T[], panel: T, id?: string): readonly T[];
/** Remove the named panel and all descendants. Unknown IDs leave the stack unchanged. */
export declare function closePanel<T extends PanelIdentity>(panels: readonly T[], id: string): readonly T[];
/** Width preferences keyed by stable panel IDs; persistence belongs to the application. */
export type PanelWidths = Readonly<Record<string, number>>;
/** Feasible first-column range, intersecting both columns' bounds for a fixed pair total. */
export declare function panelResizeBounds(first: PanelSizing, second: PanelSizing, total: number): {
    min: number;
    max: number;
};
/** Clamp one adjacent pair without changing its total or any sibling's width/visibility. */
export declare function resizePanelPair(first: PanelIdentity & PanelSizing, second: PanelIdentity & PanelSizing, total: number, requested: number): PanelWidth[];
/**
 * Allocate a newest-first fitting suffix, returned in reading order. Hidden ancestors are not
 * removed from the owner's array. Explicit ID-keyed widths take priority: flexible siblings absorb
 * container changes first, then overrides yield only as required by available space and bounds.
 * Shrink proportionally toward minima; share spare space equally up to maxima. At least the newest
 * panel is returned, even in a zero-width container. Maxima may leave unused trailing space.
 */
export declare function allocatePanelWidths(panels: readonly (PanelIdentity & PanelSizing)[], containerWidth: number, gap?: number, widths?: PanelWidths): PanelWidth[];
//# sourceMappingURL=panel-model.d.ts.map