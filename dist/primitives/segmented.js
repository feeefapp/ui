'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SelectionTrack } from './selection-track.js';
/**
 * A single choice among short options, shown side by side in one row. A filled pill marks the
 * selection and slides to the next one; press it and it becomes a glass lens you can drag (or
 * press another option and drag: the pill comes to you). Radio semantics: one Tab stop, arrow keys
 * move and select. Options can carry a count (`badge`).
 *
 * When its row has no room for every option it folds, like an actions bar spills into More: the
 * other options fold into the selected one, which gains a chevron and opens them as a single-choice
 * menu (`overflow="menu"`, the default). Every foldable control in the row is fitted together,
 * folding from the end, and unfolds as soon as the room is back. A status filter with many options
 * takes `overflow="scroll"` instead: options that don't fit scroll sideways inside the control
 * (never wrap or squeeze), its edges fade where there is more, the selection scrolls into view
 * whenever it changes, and a pill dragged near an edge scrolls on. On touch a swipe scrolls; a drag
 * that starts on the pill moves the pill.
 *
 * It paints no container: put it in glass (`ToolbarGroup`), on a box of your own (a surface-token
 * background; the root already has the capsule radius) or leave it bare. `TabView`'s tab bar is the
 * same control with tab semantics.
 */
export function SegmentedControl({ value, onChange, options, label, disabled = false, equalWidth = false, overflow = 'menu', className, }) {
    return (_jsx(SelectionTrack, { semantics: "radio", value: value, onSelect: (next) => onChange(next), options: options, label: label, disabled: disabled, equalWidth: equalWidth, overflow: overflow, className: className }));
}
//# sourceMappingURL=segmented.js.map