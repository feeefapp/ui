import { type SelectionSemantics } from './segmented-model.js';
import type { SegmentOption } from './segmented.js';
import '../actions/actions.css';
import './lens.css';
import './segmented.css';
/**
 * The selection engine shared by `SegmentedControl` and `TabView`'s tab bar (Flutter twin:
 * `selection_track.dart`). Internal: apps use those two, which own the semantics and the look;
 * a third selection widget extends this instead of forking it.
 */
/** One option of a selection track: a segment, or a tab. */
export type SelectionOption<T extends string> = SegmentOption<T> & {
    /** The option element's id (a tab, which its panel is labelled by). */
    id?: string;
    /** Id of the element the option controls (a tab's panel). */
    controls?: string;
};
/** What chose an option: a click or tap (also Enter and Space), a released drag, or an arrow, Home or End key. */
export type SelectionSource = 'press' | 'drag' | 'key';
/** How an option lays out its content: icon, label and badge in a row (a segment), or the icon over
 * the label with the badge on the icon (a tab). */
export type SelectionLayout = 'inline' | 'stacked';
/** The pill at rest: the primary fill with on-primary ink (a segmented control), or a light primary
 * tint with the ink colour (a tab bar). Pressed or dragged, both become the same glass lens
 * (`GlassLensLayer`, laid over the options it slides across). */
export type SelectionPill = 'filled' | 'quiet';
/** What a track does when its options don't fit: scroll them inside itself, or fold into one
 * capsule (the selection and a chevron) that opens the options as a single-choice menu. */
export type SelectionOverflow = 'scroll' | 'menu';
/**
 * One row of options and one moving pill: measuring, the pill and its glass lens, drag with rubber band and momentum snap, auto-scroll, one-row overflow with edge fades and
 * reveal, keyboard roving, right-to-left, badges, tones, reduced motion and solid glass.
 *
 * `semantics` makes it a radio group (`radio`, `aria-checked`) or a tab list (`tab`, `aria-selected`
 * and `aria-controls`); `layout`, `pill` and the host's CSS (sizes) make it a segmented control or
 * a tab bar.
 * `overflow="menu"` folds it, when its row has no room (fitted with the row's other foldable
 * controls, `useFitRow`), into the selected option plus a chevron that opens a radio menu.
 */
export declare function SelectionTrack<const T extends string>({ value, onSelect, options, label, semantics, layout, pill, disabled, equalWidth, draggable, overflow: overflowMode, className, }: {
    /** The selected option's value. */
    value: T;
    /** Called with the chosen value and what chose it: on every press, when a dragged pill is
     * released on another option, and on every arrow, Home or End key. */
    onSelect(value: NoInfer<T>, source: SelectionSource): void;
    /** Options, in display order. */
    options: readonly SelectionOption<T>[];
    /** Accessible name of the group. */
    label: string;
    /** `radio`: a radio group (also Up and Down keys). `tab`: a tab list (Left and Right only). */
    semantics?: SelectionSemantics;
    /** `inline` icon, label, badge; `stacked` icon (badge on it) over the label. */
    layout?: SelectionLayout;
    /** The pill's rest paint. */
    pill?: SelectionPill;
    /** Disables every option. */
    disabled?: boolean;
    /** Fills the width with equal options that ellipsize (never scrolls). */
    equalWidth?: boolean;
    /** False: presses select but never pick up the pill. */
    draggable?: boolean;
    /** When the options don't fit: `scroll` inside the track, or `menu`: fold into the selection and
     * a chevron that opens the options as a menu (never with `equalWidth`). */
    overflow?: SelectionOverflow;
    /** Class name for the group (sizes and a background). */
    className?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=selection-track.d.ts.map