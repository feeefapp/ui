/**
 * The menu morph: one glass bubble that grows out of the button that opened it and flies back into
 * it, fitted to iOS 26 menus measured on the simulator (research/liquid-glass/CONTROLS-MEASURED.md
 * §8, data/controls-menu.json). Pure geometry, no DOM: `menu-surface.tsx` paints it on the web and
 * `flutter/lib/menu/morph_model.dart` is its twin (vectors in flutter/test/fixtures/menu.json).
 *
 * Boxes are in the menu's own pixels: the menu's final box is usually `{0, 0, width, height}` and
 * the trigger's box is where the trigger sits relative to it.
 */
import { SPRINGS, mix, solveSpring, springAtRest } from '../physics/spring.js';
import { foSuperellipsePath } from '../brand/geometry.js';
import { motionFade } from '../theme-config.js';
/** The measured timings (seconds) and shapes. */
export const MENU_MORPH = {
    /** The trigger pinches (narrower, taller) before the bubble springs out. */
    pinch: 0.024,
    pinchWidth: 0.86,
    pinchHeight: 1.12,
    /** The near-elliptical blob turns into the menu's rounded rect between these times. */
    cornerFrom: 0.08,
    cornerTo: 0.26,
    /** Content starts this blurred (px) and this faint, then sharpens with the shape. */
    contentBlur: 10,
    contentOpacity: 0.2,
    /** Content reaches full contrast (opacity) and full sharpness by these times. */
    contrastBy: 0.3,
    sharpBy: 0.42,
    /** The trigger hides once the bubble covers it, and reappears as the bubble lands. */
    hideTrigger: 0.06,
    revealTrigger: 0.16,
    /** Dismissal: content gone within this, height eases in over `closeHeight`. */
    closeContent: 0.05,
    closeHeight: 0.25,
    /** The empty glass fades between these times as it lands in the trigger; then the morph ends. */
    closeFadeFrom: 0.2,
    closeEnd: 0.34,
    /** Reduced motion: a short crossfade in and out instead of the spring. */
    fadeIn: 0.15,
    fadeOut: 0.1,
};
/** How long a dismissal takes in seconds, for the host that keeps the menu mounted until it ends. */
export function menuCloseDuration(motion = 'full') {
    return motion === 'full' ? MENU_MORPH.closeEnd : motionFade(motion, MENU_MORPH.fadeOut);
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** Hermite smoothstep of `value` between `from` and `to`. */
export function smoothstep(from, to, value) {
    const t = clamp01((value - from) / (to - from));
    return t * t * (3 - 2 * t);
}
const easeOutCubic = (t) => 1 - (1 - clamp01(t)) ** 3;
/** Moves every edge of `from` toward `to`: x edges by `px`, y edges by `py` (both may overshoot). */
export function mixBox(from, to, px, py) {
    const left = mix(from.x, to.x, px);
    const right = mix(from.x + from.width, to.x + to.width, px);
    const top = mix(from.y, to.y, py);
    const bottom = mix(from.y + from.height, to.y + to.height, py);
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
const halfShort = (box) => Math.min(box.width, box.height) / 2;
/** The trigger, pinched: narrower and taller around its centre. */
export function pinchedBox(trigger) {
    const width = trigger.width * MENU_MORPH.pinchWidth;
    const height = trigger.height * MENU_MORPH.pinchHeight;
    return {
        x: trigger.x + (trigger.width - width) / 2,
        y: trigger.y + (trigger.height - height) / 2,
        width,
        height,
    };
}
/**
 * The opening morph `t` seconds after it started: the trigger (`from`, corner `fromRadius`) pinches,
 * then one bubble springs (`SPRINGS.menu`) to the menu's box (`to`, corner `toRadius`), a blob that
 * becomes the rounded rect as it arrives, with the content sharpening inside it.
 */
export function menuOpenFrame(t, from, fromRadius, to, toRadius) {
    const time = Math.max(0, t);
    const pinched = pinchedBox(from);
    let box;
    let springDone = false;
    if (time < MENU_MORPH.pinch) {
        const k = easeOutCubic(time / MENU_MORPH.pinch);
        box = mixBox(from, pinched, k, k);
    }
    else {
        const state = solveSpring(SPRINGS.menu, 0, 1)(time - MENU_MORPH.pinch);
        box = mixBox(pinched, to, state.position, state.position);
        const travel = Math.max(1, Math.abs(to.width - pinched.width), Math.abs(to.height - pinched.height));
        springDone = springAtRest(state, 1, 0.25 / travel, 2.5 / travel);
    }
    const short = halfShort(box);
    const blob = mix(Math.min(fromRadius, short), short * 0.96, smoothstep(0, MENU_MORPH.pinch + 0.04, time));
    const radius = Math.min(short, mix(blob, toRadius, smoothstep(MENU_MORPH.cornerFrom, MENU_MORPH.cornerTo, time)));
    const contentOpacity = 1 - (1 - MENU_MORPH.contentOpacity) * (1 - smoothstep(0, MENU_MORPH.contrastBy, time));
    const contentBlur = MENU_MORPH.contentBlur * (1 - smoothstep(0, MENU_MORPH.sharpBy, time));
    const settled = springDone && time >= MENU_MORPH.sharpBy;
    return settled
        ? { box: to, radius: Math.min(toRadius, halfShort(to)), contentOpacity: 1, contentBlur: 0, materialOpacity: 1, settled }
        : { box, radius, contentOpacity, contentBlur, materialOpacity: 1, settled };
}
/**
 * The dismissal `t` seconds after it started from the frame on screen (`from`, so a menu closed
 * while still opening turns around where it is): the content goes first, then the empty bubble
 * springs back into the trigger (`to`): x edges on `SPRINGS.menuDismiss` (it narrows past the
 * trigger and springs back), y edges easing out, and the glass fades as it lands.
 */
export function menuCloseFrame(t, from, to, toRadius) {
    const time = Math.max(0, t);
    const px = solveSpring(SPRINGS.menuDismiss, 0, 1)(time).position;
    const py = easeOutCubic(time / MENU_MORPH.closeHeight);
    const box = mixBox(from.box, to, px, py);
    const short = halfShort(box);
    const blob = mix(from.radius, short * 0.96, smoothstep(0, 0.12, time));
    const radius = Math.min(short, mix(blob, toRadius, smoothstep(MENU_MORPH.revealTrigger, MENU_MORPH.closeEnd, time)));
    const gone = smoothstep(0, MENU_MORPH.closeContent, time);
    const settled = time >= MENU_MORPH.closeEnd;
    return {
        box,
        radius,
        contentOpacity: from.contentOpacity * (1 - gone),
        contentBlur: mix(from.contentBlur, MENU_MORPH.contentBlur, gone),
        materialOpacity: settled ? 0 : from.materialOpacity * (1 - smoothstep(MENU_MORPH.closeFadeFrom, MENU_MORPH.closeEnd, time)),
        settled,
    };
}
/**
 * Reduced motion: the menu appears or leaves in place with a short crossfade (`motionFade`: none
 * under motion `none`, which shows the end state at once).
 */
export function menuFadeFrame(t, opening, box, radius, motion = 'reduced') {
    const duration = motionFade(motion, opening ? MENU_MORPH.fadeIn : MENU_MORPH.fadeOut);
    const k = duration === 0 ? 1 : smoothstep(0, duration, Math.max(0, t));
    const opacity = opening ? k : 1 - k;
    return {
        box,
        radius: Math.min(radius, halfShort(box)),
        contentOpacity: opacity,
        contentBlur: 0,
        materialOpacity: opacity,
        settled: t >= duration,
    };
}
/** The settled, fully open frame. */
export function menuRestFrame(box, radius) {
    return { box, radius: Math.min(radius, halfShort(box)), contentOpacity: 1, contentBlur: 0, materialOpacity: 1, settled: true };
}
/** The bubble's outline as an SVG path in the menu's pixels (for CSS `clip-path: path()`). */
export function menuBubblePath(box, radius) {
    const corner = { x: radius, y: radius };
    const path = foSuperellipsePath(box.width, box.height, [corner, corner, corner, corner]);
    if (!box.x && !box.y)
        return path;
    return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${Number((Number(x) + box.x).toFixed(3))},${Number((Number(y) + box.y).toFixed(3))}`);
}
/**
 * Which edge of its trigger a menu lines up with (Radix `align`): a toolbar trigger lines up with
 * the edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
 * trigger is centred on. `triggerCenter`, `boundsLeft` and `boundsRight` are physical x positions.
 */
export function menuAlign(toolbar, triggerCenter, boundsLeft, boundsRight, rtl = false) {
    if (!toolbar)
        return 'center';
    const left = triggerCenter <= (boundsLeft + boundsRight) / 2;
    return left !== rtl ? 'start' : 'end';
}
//# sourceMappingURL=morph-model.js.map