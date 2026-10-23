export type MenuBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** What to paint at one moment of the morph. */
export type MenuMorphFrame = {
    /** The bubble's outline. */
    box: MenuBox;
    /** Its corner radius (a superellipse corner, like every kit corner). */
    radius: number;
    /** Opacity of the menu's content inside the bubble. */
    contentOpacity: number;
    /** Blur of the content in px (0 = sharp). */
    contentBlur: number;
    /** Opacity of the glass itself; it fades only as it lands back in the trigger. */
    materialOpacity: number;
    /** True once nothing moves any more. */
    settled: boolean;
};
/** The measured timings (seconds) and shapes. */
export declare const MENU_MORPH: {
    /** The trigger pinches (narrower, taller) before the bubble springs out. */
    readonly pinch: 0.024;
    readonly pinchWidth: 0.86;
    readonly pinchHeight: 1.12;
    /** The near-elliptical blob turns into the menu's rounded rect between these times. */
    readonly cornerFrom: 0.08;
    readonly cornerTo: 0.26;
    /** Content starts this blurred (px) and this faint, then sharpens with the shape. */
    readonly contentBlur: 10;
    readonly contentOpacity: 0.2;
    /** Content reaches full contrast (opacity) and full sharpness by these times. */
    readonly contrastBy: 0.3;
    readonly sharpBy: 0.42;
    /** The trigger hides once the bubble covers it, and reappears as the bubble lands. */
    readonly hideTrigger: 0.06;
    readonly revealTrigger: 0.16;
    /** Dismissal: content gone within this, height eases in over `closeHeight`. */
    readonly closeContent: 0.05;
    readonly closeHeight: 0.25;
    /** The empty glass fades between these times as it lands in the trigger; then the morph ends. */
    readonly closeFadeFrom: 0.2;
    readonly closeEnd: 0.34;
    /** Reduced motion: a short crossfade in and out instead of the spring. */
    readonly fadeIn: 0.15;
    readonly fadeOut: 0.1;
};
/** How long a dismissal takes in seconds, for the host that keeps the menu mounted until it ends. */
export declare function menuCloseDuration(reducedMotion?: boolean): 0.1 | 0.34;
/** Hermite smoothstep of `value` between `from` and `to`. */
export declare function smoothstep(from: number, to: number, value: number): number;
/** Moves every edge of `from` toward `to`: x edges by `px`, y edges by `py` (both may overshoot). */
export declare function mixBox(from: MenuBox, to: MenuBox, px: number, py: number): MenuBox;
/** The trigger, pinched: narrower and taller around its centre. */
export declare function pinchedBox(trigger: MenuBox): MenuBox;
/**
 * The opening morph `t` seconds after it started: the trigger (`from`, corner `fromRadius`) pinches,
 * then one bubble springs (`SPRINGS.menu`) to the menu's box (`to`, corner `toRadius`), a blob that
 * becomes the rounded rect as it arrives, with the content sharpening inside it.
 */
export declare function menuOpenFrame(t: number, from: MenuBox, fromRadius: number, to: MenuBox, toRadius: number): MenuMorphFrame;
/**
 * The dismissal `t` seconds after it started from the frame on screen (`from`, so a menu closed
 * while still opening turns around where it is): the content goes first, then the empty bubble
 * springs back into the trigger (`to`): x edges on `SPRINGS.menuDismiss` (it narrows past the
 * trigger and springs back), y edges easing out, and the glass fades as it lands.
 */
export declare function menuCloseFrame(t: number, from: MenuMorphFrame, to: MenuBox, toRadius: number): MenuMorphFrame;
/** Reduced motion: the menu appears or leaves in place with a short crossfade. */
export declare function menuFadeFrame(t: number, opening: boolean, box: MenuBox, radius: number): MenuMorphFrame;
/** The settled, fully open frame. */
export declare function menuRestFrame(box: MenuBox, radius: number): MenuMorphFrame;
/** The bubble's outline as an SVG path in the menu's pixels (for CSS `clip-path: path()`). */
export declare function menuBubblePath(box: MenuBox, radius: number): string;
/**
 * Which edge of its trigger a menu lines up with (Radix `align`): a toolbar trigger lines up with
 * the edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
 * trigger is centred on. `triggerCenter`, `boundsLeft` and `boundsRight` are physical x positions.
 */
export declare function menuAlign(toolbar: boolean, triggerCenter: number, boundsLeft: number, boundsRight: number, rtl?: boolean): 'start' | 'center' | 'end';
//# sourceMappingURL=morph-model.d.ts.map