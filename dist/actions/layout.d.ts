/** Width-only contract, independent of React and browser measurement. */
export interface LabActionLayoutItem {
    id: string;
    /** Lower priorities enter overflow first. Equal priorities spill from the end. */
    priority?: number;
}
export interface LabActionsLayout<T> {
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
export declare function computeLabActionsLayout<T extends LabActionLayoutItem>({ actions, maxWidth, measure, overflowWidth, gap, }: {
    actions: readonly T[];
    maxWidth: number;
    measure: (action: T) => number;
    overflowWidth?: number;
    gap?: number;
}): LabActionsLayout<T>;
//# sourceMappingURL=layout.d.ts.map