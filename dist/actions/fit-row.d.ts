import { type RefObject } from 'react';
/**
 * Rows of foldable controls (a segmented control that folds into its menu): every foldable control
 * in a row is fitted together, like `ActionsBar` spills actions, so they never fight over the same
 * space. The row is the nearest ancestor that doesn't hug its content (an app bar, a toolbar, a
 * stage). The free space is that row's width less its in-flow
 * children (and less the text they truncate, so a squeezed title counts at its full width); the
 * pure decision is `computeFitRow` (`layout.ts`).
 */
export interface FitRowMember {
    /** Lower priorities fold first; equal priorities fold from the end. */
    priority?: number;
    /** The width its parent can give it, when the parent knows (a Dock's actions slot,
     * `useActionsWidth`): it then folds by that alone, never by its row's current width (a Dock
     * hugs its content, so a folded control would never see room to unfold). */
    room?: number;
    /** Width unfolded and folded, or null while unmeasured (it stays as it is). */
    widths(): {
        full: number;
        compact: number;
    } | null;
    /** Folds or unfolds the control. */
    fold(folded: boolean): void;
}
/** The row a control is fitted in: the first ancestor whose width doesn't come from its content
 * (an app bar, a toolbar, a stage). Ancestors that hug it (a bubble, a glass scope around one, a
 * centred column) take their width from the control, so their width says nothing about its room. */
export declare function fitBoundary(element: HTMLElement): HTMLElement;
/** Fits every foldable control again on the next frame (after a size or content change). */
export declare function scheduleFitRows(): void;
/**
 * Registers `element` (the control's root) as a foldable member of its row while `enabled`. The
 * first fit runs before paint, so a control that doesn't fit never shows unfolded. Call the returned
 * function after the control's own widths change (fonts, labels).
 */
export declare function useFitRow(element: RefObject<HTMLElement | null>, enabled: boolean, member: FitRowMember): void;
//# sourceMappingURL=fit-row.d.ts.map