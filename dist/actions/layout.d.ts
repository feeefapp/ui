/** Width-only contract, independent of React and browser measurement. */
export interface ActionLayoutItem {
    id: string;
    /** Lower priorities enter overflow first. Equal priorities spill from the end. */
    priority?: number;
}
export interface ActionsLayout<T> {
    visible: T[];
    overflow: T[];
    /** The space the result needs, including the menu trigger when present. */
    requiredWidth: number;
}
/**
 * Fit complete top-level entries; nested groups remain intact. Both result
 * lists preserve source order. A host narrower than the overflow trigger still
 * receives that trigger, so every action remains reachable.
 */
export declare function computeActionsLayout<T extends ActionLayoutItem>({ actions, maxWidth, measure, overflowWidth, gap, }: {
    actions: readonly T[];
    maxWidth: number;
    measure: (action: T) => number;
    overflowWidth?: number;
    gap?: number;
}): ActionsLayout<T>;
/**
 * Whether a menu of `actions` reserves the leading slot on every row: some row has an icon, is a
 * toggle (its check) or is loading. A menu of plain labels has no empty slot. The Flutter twin is
 * `menuHasLeading` in `actions/layout.dart`.
 */
export declare function menuHasLeading(actions: readonly {
    id: string;
    type: string;
    icon?: unknown;
    loading?: boolean;
}[], pending: ReadonlySet<string>): boolean;
/** A control in a row that can fold to a compact form (a segmented control into its menu). */
export interface FitRowItem extends ActionLayoutItem {
    /** Width unfolded (every option showing). */
    full: number;
    /** Width folded (the selection and a chevron). */
    compact: number;
    /** Width it has right now (either, or between while it springs). */
    current: number;
}
/**
 * Which foldable controls of one row stay unfolded. `free` is the row's room left over right now
 * (negative when it overflows); each item may take `full - compact` more than folded. Items fold
 * like actions spill (`computeActionsLayout`): lowest `priority` first, equal priorities from the
 * end. The answer depends only on the row and the items' full and compact widths, never on which
 * are folded now (their `current` cancels out), so folding never flips back on the next measure.
 * Returns the ids that stay unfolded.
 */
export declare function computeFitRow(items: readonly FitRowItem[], free: number, tolerance?: number): Set<string>;
//# sourceMappingURL=layout.d.ts.map