import { type RefObject } from 'react';
interface Measurements {
    availableWidth: number;
    widths: ReadonlyMap<string, number>;
    overflowWidth: number;
}
/** Measure the same controls the user sees, including fonts, zoom and loading. */
export declare function useMeasuredActions(host: RefObject<HTMLDivElement | null>, measuringRow: RefObject<HTMLDivElement | null>, revision: unknown): {
    measurements: Measurements | null;
    focusAfterFit: RefObject<string | null>;
};
export {};
//# sourceMappingURL=use_measured_actions.d.ts.map