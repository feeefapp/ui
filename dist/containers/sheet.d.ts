import * as React from 'react';
import type { PresentationChromeProps } from '../presentation/modal.js';
import { MotionValue } from '../physics/motion-value.js';
import { type SheetDetent } from './sheet-model.js';
import '../presentation/presentation.css';
import './sheet.css';
export type { SheetDetent } from './sheet-model.js';
export type SheetProps = PresentationChromeProps & {
    /** Shows the sheet. It animates in and out; keep it mounted and toggle this. */
    open: boolean;
    /** Called with `false` when the person dismisses it (drag down, scrim, Escape, close bubble), never with `true`. */
    onOpenChange: (open: boolean) => void;
    /** Sheet content; it scrolls inside the sheet under the floating header and dock. */
    children: React.ReactNode;
    /**
     * Heights the sheet rests at, in any order. Default `['large']`. `peek` is just the header (a
     * search field, like Maps), so a sheet with `['peek', 'medium', 'large']` lives on the page.
     */
    detents?: readonly SheetDetent[];
    /** Controlled detent. Pair with `onDetentChange`. */
    detent?: SheetDetent;
    /** Detent to open at when uncontrolled. Default: the first in `detents`. */
    defaultDetent?: SheetDetent;
    /** Called when the person drags, taps the grabber, focuses a field or taps the dimmed page. */
    onDetentChange?: (detent: SheetDetent) => void;
    /**
     * `true` (default): a released sheet snaps to the detent its flick projects to. `false`: it rests
     * wherever it is let go (after the flick's momentum), anywhere between its lowest and highest
     * detents, like Flutter's DraggableScrollableSheet without snapping.
     */
    snap?: boolean;
    /** Whether dragging down, the scrim and Escape close it. Default true. The close bubble always does. */
    dismissible?: boolean;
    /** Shows the grabber. Default: when there is more than one detent. */
    grabber?: boolean;
    /**
     * `true` (default) dims and blocks the page. `false` leaves the page usable behind the sheet at
     * every height, with no scrim and no Escape dismissal (a `pane` still closes on Escape while focus
     * is inside it).
     */
    modal?: boolean;
    /**
     * The page stays usable (no dim) while the sheet rests at or below this detent, and dims as it
     * rises past it, like iOS `presentationBackgroundInteraction(.enabled(upThrough:))`: a map with
     * its results sheet. Tapping the dimmed page brings the sheet back down to it.
     */
    backgroundInteraction?: SheetDetent;
    /**
     * Whether a phone sheet with a partial detent floats: inset from the edges on glass, reaching
     * the edges and turning opaque as it rises to full height (iOS 26). Default: true when a detent
     * is below `large`. A sheet with only full-height detents is always attached and opaque.
     */
    floating?: boolean;
    /**
     * The control that opened the sheet. The sheet grows out of it and returns into it when it
     * closes (unless it is dragged away), and the control hides meanwhile, like an iOS 26 toolbar
     * button morphing into its sheet.
     */
    source?: React.RefObject<HTMLElement | null>;
    /**
     * The detent a text field focused inside raises the sheet to. Default: from `peek`, the highest
     * detent (typing in a Maps search bar opens the sheet); otherwise it stays. `null` never raises.
     */
    focusDetent?: SheetDetent | null;
    /**
     * What the sheet becomes on wide screens: a centered `dialog` (default), still a bottom `sheet`,
     * a floating glass `card` at the leading edge with the same detents (iPad Maps), or a `pane`: an
     * inspector beside the page, a full-height opaque panel sliding in from `paneSide` with the close
     * bubble floating beside it. Use `pane` for the details of the thing the page is about; with it
     * the phone sheet fits its content by default (`detents` `['fit']`) and pads 16 (a card's
     * inside), and `useSheet()` is null in the wide panel.
     */
    regular?: 'dialog' | 'sheet' | 'card' | 'pane';
    /** Width in px from which the sheet is “regular” (wide). Default 720. */
    regularBreakpoint?: number;
    /** Width of the `card` presentation in px. Default 380. */
    cardWidth?: number;
    /** Width of the `pane` presentation in px. Default 420, at most 60% of the window. */
    paneWidth?: number;
    /** The side the `pane` presentation slides in from: `end` (default; the right in LTR) or `start`. */
    paneSide?: 'end' | 'start';
    /** Renders inside this element (absolutely positioned) instead of the top layer: for embedded previews. */
    container?: HTMLElement | null;
    /** On phones, let the page behind recede (scale back) as a large modal sheet rises. Default true. */
    recede?: boolean;
    /** Content padding in px. Default: the shell gap G (list sections bring their own inset); 16 with `regular: 'pane'`. */
    contentPadding?: number;
    /** Focused when the sheet opens. Default: the sheet itself. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focused after it closes, when the control that opened it may be gone. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Class name of the sheet panel. */
    className?: string;
};
/** What content inside a sheet can read: where it rests and how far it is expanded. */
export type SheetState = {
    /** The detent the sheet rests at (it changes when a drag or a tap settles). */
    detent: SheetDetent;
    /** 0 at the lowest partial height … 1 at full height, every frame (subscribe to paint with it). */
    expansion: MotionValue;
    /** The visible height in px, every frame (a free sheet rests between detents). */
    height: MotionValue;
    /** Moves the sheet to another of its detents. */
    setDetent: (detent: SheetDetent) => void;
    /** How the sheet is presented right now. */
    presentation: 'sheet' | 'card' | 'dialog';
};
/**
 * The sheet this component is inside, or null: its resting detent, its live expansion and a way
 * to move it. Use it to show more at higher detents (Maps shows only its search bar at `peek`).
 */
export declare function useSheet(): SheetState | null;
/**
 * A sheet that rises from the bottom, like iOS 26/27: it rests at detents (just its header, half,
 * full, fit or custom heights), follows the finger, snaps where a flick projects and closes when
 * flicked down. Below full height it floats inset from the edges on glass; rising, it reaches the
 * edges and turns opaque in one continuous motion. It can grow out of the button that opened it,
 * leave the page usable at low detents, and becomes a dialog, a floating card or an inspector pane
 * on wide screens, so you write the content once.
 */
export declare function Sheet(props: SheetProps): React.JSX.Element;
//# sourceMappingURL=sheet.d.ts.map