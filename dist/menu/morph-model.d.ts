import { type Motion } from '../theme-config.js';
/** The menu's rows at one moment: they sit in the glass from its first frame, blurred and faint. */
export type MenuContentFrame = {
    /** Opacity of the rows. */
    opacity: number;
    /** Blur of the rows in px (0 = sharp). */
    blur: number;
    /** True once they no longer change. */
    settled: boolean;
};
/** The measured timings (seconds). */
export declare const MENU_MORPH: {
    /** Rows start this blurred (px) and this faint, then sharpen as the glass arrives. */
    readonly contentBlur: 10;
    readonly contentOpacity: 0.2;
    /** Rows reach full contrast (opacity) and full sharpness by these times. */
    readonly contrastBy: 0.3;
    readonly sharpBy: 0.42;
    /** The button hides once the glass covers it, and reappears as the glass lands back in it. */
    readonly hideTrigger: 0.06;
    readonly revealTrigger: 0.16;
    /** Dismissal: the rows are gone within this. */
    readonly closeContent: 0.05;
    /** Dismissal: the glass has landed back in the button (`SPRINGS.menuDismiss` settled within half
     * a pixel over 250 px) and the menu can unmount (`--lab-menu-exit` is this plus a frame). */
    readonly closeEnd: 0.48;
    /** Reduced motion: a short crossfade of the rows in and out instead. */
    readonly fadeIn: 0.15;
    readonly fadeOut: 0.1;
};
/** How long a dismissal takes in seconds, for the host that keeps the menu mounted until it ends. */
export declare function menuCloseDuration(motion?: Motion): number;
/** Hermite smoothstep of `value` between `from` and `to`. */
export declare function smoothstep(from: number, to: number, value: number): number;
/** The rows `t` seconds after the menu started opening (its glass leaving the button). */
export declare function menuContentOpenFrame(t: number, motion?: Motion): MenuContentFrame;
/**
 * The rows `t` seconds after the menu started closing from `from` (the frame on screen, so a menu
 * closed while still opening turns around where it is): they go first, before the glass flies back.
 */
export declare function menuContentCloseFrame(t: number, from: MenuContentFrame, motion?: Motion): MenuContentFrame;
/**
 * Which edge of its trigger a menu lines up with (Radix `align`): a toolbar trigger lines up with
 * the edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
 * trigger is centred on. `triggerCenter`, `boundsLeft` and `boundsRight` are physical x positions.
 */
export declare function menuAlign(toolbar: boolean, triggerCenter: number, boundsLeft: number, boundsRight: number, rtl?: boolean): 'start' | 'center' | 'end';
//# sourceMappingURL=morph-model.d.ts.map