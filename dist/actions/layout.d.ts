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
//# sourceMappingURL=layout.d.ts.map