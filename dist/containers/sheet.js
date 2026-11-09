'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useI18n } from '../i18n.js';
import { PresentationHost, usePresented } from '../presentation/host.js';
import { PresentationHeader } from '../presentation/header.js';
import { PresentationBody } from '../presentation/body.js';
import { attachPan, canChildPan } from '../physics/gesture.js';
import { MotionValue, motionOf, prefersReducedMotion } from '../physics/motion-value.js';
import { motionFade } from '../theme-config.js';
import { SPRINGS, projectMomentum, rubberBand } from '../physics/spring.js';
import { detentHeight, detentHeights, dragHeight, flingStep, focusRaise, freeTarget, nearestDetent, releaseTarget, sheetDim, sheetFrame, sheetMorphFrame, sheetRecede, sheetScrollStep, wheelDismisses, wheelHeight, } from './sheet-model.js';
import { cn } from '../utils.js';
import { GLASS_INSTANT_ATTRIBUTE, settleGlass } from '../glass/transitions.js';
import { POP_MOTION } from '../presentation/motion.js';
import { SheetPane, useHostWidth } from './sheet-pane.js';
import '../presentation/presentation.css';
import './sheet.css';
const SheetContext = React.createContext(null);
/**
 * The sheet this component is inside, or null: its resting detent, its live expansion and a way
 * to move it. Use it to show more at higher detents (Maps shows only its search bar at `peek`).
 */
export function useSheet() {
    return React.useContext(SheetContext);
}
const DEFAULT_DETENTS = ['large'];
const PANE_DETENTS = ['fit'];
/** The sheet growing out of its source, and flying back into it. */
const MORPH_OPEN = { duration: 0.46, bounce: 0.16 };
const MORPH_CLOSE = { duration: 0.36, bounce: 0.08 };
/**
 * A sheet that rises from the bottom, like iOS 26/27: it rests at detents (just its header, half,
 * full, fit or custom heights), follows the finger, snaps where a flick projects and closes when
 * flicked down. Below full height it floats inset from the edges on glass; rising, it reaches the
 * edges and turns opaque in one continuous motion. It can grow out of the button that opened it,
 * leave the page usable at low detents, and becomes a dialog, a floating card or an inspector pane
 * on wide screens, so you write the content once.
 */
export function Sheet(props) {
    return props.regular === 'pane' ? _jsx(PaneSheet, { ...props }) : _jsx(BottomSheet, { ...props });
}
/** @internal A permanently mounted Sheet tree, restyled as a column without moving its children. */
export function InPlaceSheet(props) {
    return _jsx(SheetPresentation, { ...props, onExited: () => { } });
}
function BottomSheet(props) {
    const { mounted, exited } = usePresented(props.open);
    if (!mounted)
        return null;
    return _jsx(SheetPresentation, { ...props, onExited: exited });
}
/** `regular: 'pane'`: the side panel from the breakpoint, a bottom sheet below it. */
function PaneSheet(props) {
    const width = useHostWidth(props.container);
    if (width >= (props.regularBreakpoint ?? 720))
        return _jsx(SheetPane, { ...props });
    return (_jsx(BottomSheet, { ...props, regular: "sheet", detents: props.detents ?? PANE_DETENTS, contentPadding: props.contentPadding ?? 16 }));
}
/** Rendered px per layout px of `el` (a sheet inside a scaled demo frame). */
function scaleOf(el) {
    return el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
}
const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]), textarea, [contenteditable=""], [contenteditable="true"]';
function SheetPresentation({ open, onOpenChange, label, children, detents = DEFAULT_DETENTS, detent: controlledDetent, defaultDetent, onDetentChange, dismissible = true, snap = true, grabber, title, leading, trailing, showClose = true, header, dock, modal = true, backgroundInteraction, floating, source, focusDetent, regular = 'dialog', regularBreakpoint = 720, cardWidth = 380, container, recede = true, contentPadding, initialFocusRef, returnFocusRef, className, onExited, inPlace, }) {
    const { t } = useI18n();
    const host = React.useRef(null);
    const panel = React.useRef(null);
    const surface = React.useRef(null);
    const solid = React.useRef(null);
    const column = React.useRef(null);
    const scrim = React.useRef(null);
    const viewport = React.useRef(null);
    const grabRow = React.useRef(null);
    const probe = React.useRef(null);
    const tokens = React.useRef(null);
    const titleId = React.useId();
    const [metrics, setMetrics] = React.useState(null);
    /** The body's natural height (content + reserved chrome), reported by PresentationBody. */
    const bodyNatural = React.useRef(0);
    const measureRef = React.useRef(() => { });
    const wide = !!metrics && metrics.width >= regularBreakpoint;
    const presentation = wide && regular !== 'sheet' && regular !== 'pane' ? regular : 'sheet';
    const heights = metrics ? detentHeights(detents, metrics) : [];
    const large = metrics ? detentHeight('large', metrics) : 0;
    const hasPartial = heights.some((h) => h < large - 0.5);
    const mode = presentation === 'card' ? 'card' : (floating ?? hasPartial) ? 'float' : 'attached';
    /** The content column keeps the floating gap at every height, so nothing reflows while it moves. */
    const columnInset = presentation === 'dialog' || mode === 'attached' ? 0 : (metrics?.inset ?? 0);
    const undimmed = backgroundInteraction !== undefined && metrics ? detentHeight(backgroundInteraction, metrics) : null;
    const columnMode = !!inPlace && !inPlace.sheet;
    const dims = !columnMode && (modal || backgroundInteraction !== undefined);
    const hostModal = !columnMode && modal && backgroundInteraction === undefined;
    const showGrabber = !columnMode && presentation !== 'dialog' && (grabber ?? detents.length > 1);
    const [localIndex, setLocalIndex] = React.useState(() => Math.max(0, detents.indexOf(defaultDetent ?? detents[0])));
    const index = controlledDetent !== undefined ? Math.max(0, detents.indexOf(controlledDetent)) : Math.min(localIndex, detents.length - 1);
    /** A free sheet's rest height, and the detent reported with it (a controlled host echoes it back). */
    const [freeHeight, setFreeHeight] = React.useState(null);
    const reported = React.useRef(null);
    const minHeight = heights.length ? Math.min(...heights) : 0;
    const maxHeight = heights.length ? Math.max(...heights) : 0;
    const free = !snap && freeHeight !== null && detents[index] === reported.current;
    /** A sheet that changes height: its content gestures grow it before they scroll, and back. */
    const resizable = presentation !== 'dialog' && (!snap || new Set(heights).size > 1);
    // Motion: `visible` is the sheet's visible height (sheet, card); `shown` 0–1 and `lift` px
    // (dialog); `morph` 0–1 the growth out of the source; `expansion` mirrors the frame for content.
    const visible = React.useRef(new MotionValue(0, 0.5)).current;
    const shown = React.useRef(new MotionValue(0, 0.004)).current;
    const lift = React.useRef(new MotionValue(0, 0.5)).current;
    const morph = React.useRef(new MotionValue(1, 0.002)).current;
    const expansion = React.useRef(new MotionValue(0, 0.001)).current;
    const motionHeight = React.useRef(0);
    const presented = React.useRef(false);
    const dragging = React.useRef(false);
    /** Set while the sheet grows out of (or back into) its source: the rects of that morph. */
    const morphing = React.useRef(null);
    const draggedAway = React.useRef(false);
    const live = React.useRef({
        heights,
        large,
        metrics,
        presentation,
        mode,
        index,
        open,
        dismissible,
        dims,
        hostModal,
        undimmed,
        onOpenChange,
    });
    live.current = { heights, large, metrics, presentation, mode, index, open, dismissible, dims, hostModal, undimmed, onOpenChange };
    const gesture = React.useRef({ snap, resizable, minHeight, maxHeight });
    gesture.current = { snap, resizable, minHeight, maxHeight };
    const backdrop = React.useMemo(() => {
        if (typeof document === 'undefined')
            return null;
        return (container ?? document).querySelector('[data-lab-sheet-backdrop]');
    }, [container]);
    const pinned = () => {
        const area = panel.current?.querySelector('.lab-presentation-scroll');
        return area
            ? Array.from(area.querySelectorAll(':scope > .lab-scroll-float--bottom, :scope > .lab-scroll-gradient > .lab-scroll-wash--bottom'))
            : [];
    };
    const paintRecede = (v) => {
        const m = live.current.metrics;
        if (!backdrop || !m)
            return;
        const q = recede && live.current.hostModal && live.current.presentation === 'sheet' && !prefersReducedMotion()
            ? sheetRecede(v, m.hostHeight - m.topInset) * morph.get()
            : 0;
        backdrop.style.transformOrigin = '50% 0';
        backdrop.style.transform = q ? `translate3d(0, ${q * 10}px, 0) scale(${1 - q * 0.06})` : '';
        backdrop.style.clipPath = q ? `inset(0 round ${q * 22}px)` : '';
    };
    /** The surface (glass + opaque layer) at one frame; `offset` is how far the panel hangs below. */
    const paintSurface = (frame, offset) => {
        const s = surface.current;
        if (!s)
            return;
        s.style.insetInline = `${frame.gap}px`;
        s.style.bottom = `${offset + frame.gap}px`;
        s.style.borderEndStartRadius = s.style.borderEndEndRadius = `${frame.bottomRadius}px`;
        if (solid.current)
            solid.current.style.opacity = String(frame.solid);
        if (expansion.get() !== frame.expansion)
            expansion.set(frame.expansion);
    };
    const paintScrim = (v) => {
        const L = live.current;
        const el = scrim.current;
        if (!el)
            return;
        const dim = L.dims ? sheetDim(v, L.heights, L.undimmed, L.large) * morph.get() : 0;
        el.style.opacity = String(dim);
        // Below the undimmed detent the page under the scrim stays usable.
        if (L.undimmed !== null)
            el.style.pointerEvents = dim > 0.02 ? 'auto' : 'none';
    };
    const columnRef = React.useRef(columnMode);
    columnRef.current = columnMode;
    const paintSheet = (v) => {
        if (columnRef.current)
            return;
        const el = panel.current;
        const L = live.current;
        if (!el || L.presentation === 'dialog' || !L.metrics)
            return;
        const H = motionHeight.current;
        const offset = H ? H - v : 0;
        if (H) {
            el.style.transform = `translate3d(0, ${offset}px, 0)`;
            for (const node of pinned())
                node.style.translate = `0 ${-offset}px`;
        }
        paintSurface(sheetFrame(v, { heights: L.heights, large: L.large, inset: L.metrics.inset, radius: L.metrics.radius, mode: L.mode }), offset);
        paintScrim(v);
        paintRecede(v);
    };
    /** One frame of the morph: the panel at rest, clipped to the source's size and moved over it. */
    const paintMorph = (p) => {
        const el = panel.current;
        const m = morphing.current;
        if (!el || !m || live.current.presentation === 'dialog')
            return;
        const height = el.offsetHeight;
        const rect = {
            x: el.offsetLeft,
            y: (live.current.metrics?.hostHeight ?? height) - height,
            width: el.offsetWidth,
            height,
        };
        const frame = sheetMorphFrame(p, rect, m.source, m.radius, live.current.metrics?.radius ?? 28);
        el.style.transform = frame.transform;
        el.style.clipPath = frame.clip;
        if (column.current)
            column.current.style.opacity = String(frame.content);
        // The source hides once the sheet covers it, and shows again as the sheet lands back in it.
        m.element.style.opacity = p > 0.08 ? '0' : m.opacity;
        paintScrim(visible.get());
        paintRecede(visible.get());
    };
    const endMorph = () => {
        const m = morphing.current;
        const el = panel.current;
        morphing.current = null;
        if (m)
            m.element.style.opacity = m.opacity;
        if (el) {
            el.style.clipPath = '';
            if (!motionHeight.current)
                el.style.transform = '';
        }
        if (column.current)
            column.current.style.opacity = '';
    };
    /** While the panel moves, its glass rides it as is (no springs of its own) and leaves with it. */
    const riding = (on) => {
        const el = panel.current;
        if (!el)
            return;
        if (on)
            el.setAttribute(GLASS_INSTANT_ATTRIBUTE, '');
        else
            settleGlass(el);
    };
    /** Switches to transform-only motion: the panel is tall enough for any position, nothing reflows. */
    const beginMotion = () => {
        const el = panel.current;
        riding(true);
        if (morphing.current) {
            morph.stop();
            morph.set(1);
            endMorph();
        }
        if (!el || motionHeight.current)
            return;
        motionHeight.current = Math.max(...live.current.heights, visible.get(), 1) + 240;
        el.style.height = `${motionHeight.current}px`;
        paintSheet(visible.get());
    };
    /** At rest the panel is exactly as tall as it shows, so its scroll area and dock lay out normally. */
    const rest = (height) => {
        const el = panel.current;
        if (!el)
            return;
        motionHeight.current = 0;
        if (!morphing.current)
            riding(false);
        el.style.height = `${height}px`;
        if (!morphing.current)
            el.style.transform = '';
        for (const node of pinned())
            node.style.translate = '';
        paintSheet(height);
    };
    const moveTo = (height, spring = SPRINGS.smooth, velocity) => {
        beginMotion();
        return visible.animateTo(height, { spring, velocity }).then((arrived) => {
            if (arrived)
                rest(height);
            return arrived;
        });
    };
    /** The source to grow out of, in host pixels, or null when there is none to see. */
    const sourceRect = () => {
        const box = host.current;
        const origin = source?.current;
        if (!box || !origin?.isConnected)
            return null;
        // A button hugged by its glass bubble grows out of the bubble.
        const member = origin.closest('[data-glass-member]');
        const element = member && member.getBoundingClientRect().width - origin.getBoundingClientRect().width < 16 ? member : origin;
        const r = element.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (!r.width || !r.height)
            return null;
        const scale = b.width / (box.offsetWidth || 1) || 1;
        const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || r.height / 2;
        return {
            element: origin,
            radius,
            source: {
                x: (r.left - b.left) / scale,
                y: (r.top - b.top) / scale,
                width: r.width / scale,
                height: r.height / scale,
            },
        };
    };
    const paintDialog = () => {
        const el = panel.current;
        if (!el)
            return;
        const p = shown.get();
        el.style.opacity = String(Math.max(0, Math.min(1, p)));
        el.style.transform = `translate3d(0, ${(1 - p) * 28 + lift.get()}px, 0) scale(${0.96 + 0.04 * p})`;
        if (scrim.current)
            scrim.current.style.opacity = live.current.dims ? String(Math.max(0, Math.min(1, p))) : '0';
    };
    React.useLayoutEffect(() => visible.subscribe(paintSheet), []);
    React.useLayoutEffect(() => morph.subscribe(paintMorph), []);
    React.useLayoutEffect(() => {
        const a = shown.subscribe(paintDialog), b = lift.subscribe(paintDialog);
        return () => {
            a();
            b();
        };
    }, []);
    // Mount: start measuring the host and the body.
    React.useLayoutEffect(() => {
        const measure = () => {
            const box = host.current;
            if (!box)
                return;
            const token = tokens.current;
            const inset = token?.offsetWidth ?? 8;
            const radius = token?.offsetHeight ?? 28;
            const L = live.current;
            const gap = L.presentation === 'dialog' || L.mode === 'attached' ? 0 : inset;
            const grab = grabRow.current?.offsetHeight ?? 0;
            // Peek: the grabber, the floating header and the same gap again below it.
            const float = panel.current?.querySelector('.lab-presentation-scroll > .lab-scroll-float--top');
            const peek = float ? grab + 2 * float.offsetTop + float.offsetHeight + gap : grab + 64 + gap;
            const next = {
                width: box.clientWidth,
                hostHeight: box.clientHeight,
                topInset: 10 + (probe.current?.offsetHeight ?? 0),
                natural: Math.ceil(grab + bodyNatural.current + gap),
                peek: Math.ceil(peek),
                inset,
                radius,
            };
            setMetrics((m) => m &&
                m.width === next.width &&
                m.hostHeight === next.hostHeight &&
                m.topInset === next.topInset &&
                m.natural === next.natural &&
                m.peek === next.peek &&
                m.inset === next.inset &&
                m.radius === next.radius
                ? m
                : next);
        };
        measureRef.current = measure;
        const observer = new ResizeObserver(measure);
        if (host.current)
            observer.observe(host.current);
        measure();
        return () => {
            observer.disconnect();
            if (backdrop) {
                backdrop.style.transform = '';
                backdrop.style.clipPath = '';
            }
            const m = morphing.current;
            if (m)
                m.element.style.opacity = m.opacity;
        };
    }, [container]);
    // The column inset (and with it fit and peek) follows the presentation and floating mode.
    React.useLayoutEffect(() => measureRef.current(), [columnInset]);
    // Present, follow detent and size changes, and leave.
    const target = free ? Math.max(minHeight, Math.min(maxHeight, freeHeight)) : (heights[index] ?? 0);
    const dialogHeight = metrics ? Math.min(metrics.natural, metrics.hostHeight - 64) : 0;
    React.useLayoutEffect(() => {
        if (columnMode) {
            // animation_level: 1. Resizing snaps layout; the shared Sheet engine animates presentation.
            visible.stop();
            shown.stop();
            lift.stop();
            morph.stop();
            endMorph();
            motionHeight.current = 0;
            presented.current = false;
            for (const node of [panel.current, surface.current, solid.current, column.current])
                node?.removeAttribute('style');
            for (const node of pinned())
                node.style.translate = '';
            riding(false);
            return;
        }
        if (!metrics)
            return;
        const reduced = prefersReducedMotion();
        const motion = motionOf();
        if (!open) {
            presented.current = false;
            // Unmounting the host leaves the top layer and returns focus.
            const done = () => onExited();
            if (presentation === 'dialog') {
                // Like Modal: the panel and the dim fade out on one fixed curve that ends exactly at its
                // length (a spring's tail would leave it faintly on screen), while the move eases back.
                const length = motionFade(motion, POP_MOTION.fadeOut);
                riding(true);
                void shown.animateTo(0, { spring: reduced ? { duration: length, bounce: 0 } : SPRINGS.smooth, instant: length === 0 });
                const el = panel.current;
                const fades = [el, scrim.current].flatMap((node) => {
                    if (!node || !length || typeof node.animate !== 'function')
                        return [];
                    const from = getComputedStyle(node).opacity;
                    node.getAnimations().forEach((animation) => animation.cancel());
                    return [node.animate([{ opacity: from }, { opacity: 0 }], { duration: length * 1000, easing: POP_MOTION.fadeEasing, fill: 'forwards' })];
                });
                if (!fades.length)
                    done();
                else
                    void Promise.all(fades.map((fade) => fade.finished)).then(done, () => { });
            }
            else if (reduced) {
                // The panel fades out, then unmounts once the fade has ended.
                const fade = motionFade(motion, 0.16);
                const el = panel.current;
                if (el)
                    el.style.transition = fade ? `opacity ${fade * 1000}ms` : '';
                if (el)
                    el.style.opacity = '0';
                if (scrim.current)
                    scrim.current.style.opacity = '0';
                if (fade)
                    window.setTimeout(done, fade * 1000 + 10);
                else
                    done();
            }
            else {
                const back = !draggedAway.current && !dragging.current ? sourceRect() : null;
                draggedAway.current = false;
                if (back && !visible.isAnimating()) {
                    // Fly back into the control that opened it.
                    riding(true);
                    morphing.current = { ...back, opacity: morphing.current?.opacity ?? back.element.style.opacity };
                    void morph.animateTo(0, { spring: MORPH_CLOSE }).then((arrived) => {
                        if (!arrived)
                            return;
                        endMorph();
                        done();
                    });
                }
                else {
                    beginMotion();
                    void visible.animateTo(0, { spring: SPRINGS.smooth }).then((a) => a && done());
                }
            }
            return;
        }
        if (presentation === 'dialog') {
            const el = panel.current;
            if (morphing.current) {
                morph.stop();
                morph.set(1);
                endMorph();
            }
            if (el) {
                el.style.height = `${dialogHeight}px`;
                motionHeight.current = 0;
                for (const node of pinned())
                    node.style.translate = '';
            }
            const s = surface.current;
            if (s)
                s.removeAttribute('style');
            if (solid.current)
                solid.current.style.opacity = '';
            paintRecede(0);
            if (!presented.current) {
                presented.current = true;
                // Opened again while fading out: the fade gives way to the spring.
                for (const node of [el, scrim.current])
                    node?.getAnimations?.().forEach((animation) => animation.cancel());
                if (!shown.isAnimating())
                    shown.set(0);
                const fade = motionFade(motion, 0.2);
                riding(true);
                void shown
                    .animateTo(1, { spring: reduced ? { duration: fade, bounce: 0 } : SPRINGS.smooth, instant: fade === 0 })
                    .then((arrived) => arrived && riding(false));
            }
            else
                paintDialog();
            return;
        }
        const el = panel.current;
        if (el) {
            el.style.opacity = '';
            el.style.translate = '';
        }
        if (!presented.current) {
            presented.current = true;
            if (reduced) {
                visible.set(target);
                rest(target);
                return;
            }
            const from = !visible.isAnimating() && !morph.isAnimating() ? sourceRect() : null;
            if (from) {
                // Grow out of the control that opened it: the panel takes its place at rest at once and
                // a clip the size of the control opens up to it.
                morphing.current = { ...from, opacity: from.element.style.opacity };
                riding(true);
                visible.stop();
                visible.set(target);
                rest(target);
                morph.set(0);
                void morph.animateTo(1, { spring: MORPH_OPEN }).then((arrived) => {
                    if (!arrived)
                        return;
                    endMorph();
                    riding(false);
                    rest(visible.get());
                });
                return;
            }
            if (morph.isAnimating() && morphing.current) {
                // Reopened while flying back into the source: turn around.
                void morph.animateTo(1, { spring: MORPH_OPEN }).then((arrived) => {
                    if (!arrived)
                        return;
                    endMorph();
                    riding(false);
                });
                return;
            }
            // Reopened while still leaving: turn around from where it is.
            if (!visible.isAnimating())
                visible.set(0);
            void moveTo(target);
            return;
        }
        if (dragging.current)
            return;
        if (morphing.current) {
            // The detent moved while growing (a fit sheet measured late): the clip follows the panel.
            visible.set(target);
            rest(target);
            paintMorph(morph.get());
            return;
        }
        if (visible.isAnimating()) {
            // The detent moved while rising (a fit sheet's content measured late): retarget in flight.
            if (Math.abs(visible.getTarget() - target) >= 1)
                void moveTo(target);
        }
        else if (Math.abs(visible.get() - target) < 1)
            rest(target);
        else
            void moveTo(target);
    }, [open, metrics, presentation, mode, target, dialogHeight, columnMode]);
    const setDetentIndex = (next) => {
        setFreeHeight(null);
        reported.current = null;
        if (controlledDetent === undefined)
            setLocalIndex(next);
        if (next !== live.current.index)
            onDetentChange?.(detents[next]);
    };
    const setDetentRef = React.useRef(setDetentIndex);
    setDetentRef.current = setDetentIndex;
    /** A free sheet rests at `height`; the nearest detent is reported as its detent. */
    const settleFree = (height) => {
        const next = nearestDetent(height, live.current.heights);
        reported.current = detents[next];
        setFreeHeight(height);
        if (controlledDetent === undefined)
            setLocalIndex(next);
        if (next !== live.current.index)
            onDetentChange?.(detents[next]);
    };
    const settleFreeRef = React.useRef(settleFree);
    settleFreeRef.current = settleFree;
    /** Where a released sheet goes (snap or free) at `velocity`; false when it was dismissed. */
    const releaseSheet = (velocity, cancelled) => {
        const L = live.current;
        const G = gesture.current;
        if (!G.snap) {
            const landing = freeTarget(visible.get(), velocity, L.heights, L.dismissible);
            if (landing.dismiss && !cancelled)
                return dismissAway(velocity);
            const height = landing.dismiss ? visible.get() : landing.height;
            settleFreeRef.current(height);
            void moveTo(height, SPRINGS.release, velocity);
            return;
        }
        const landing = releaseTarget(visible.get(), velocity, L.heights, L.dismissible);
        if (landing.dismiss && !cancelled)
            return dismissAway(velocity);
        const next = landing.dismiss ? L.index : landing.index;
        setDetentRef.current(next);
        void moveTo(L.heights[next] ?? landing.height, SPRINGS.release, velocity);
    };
    /** Leave at the finger's speed; the close that follows continues this same motion. */
    const dismissAway = (velocity) => {
        draggedAway.current = true;
        void visible.animateTo(0, { spring: SPRINGS.smooth, velocity });
        live.current.onOpenChange(false);
        // A host that keeps the sheet open gets it back at its detent.
        window.setTimeout(() => {
            draggedAway.current = false;
            if (live.current.open && !visible.isAnimating())
                void moveTo(live.current.heights[live.current.index] ?? 0);
        }, 400);
    };
    const releaseRef = React.useRef(releaseSheet);
    releaseRef.current = releaseSheet;
    // Drag: the grabber and chrome always move the sheet. On a resizable sheet a gesture over the
    // content is split between the sheet and its scroll (grow, then scroll; scroll back, then
    // shrink), the way iOS sheets and Flutter's DraggableScrollableSheet behave, so the sheet drives
    // the content's scroll and momentum itself for touch. On a fixed sheet the content scrolls
    // natively and drags the sheet down only from its top. Touch claims early so the browser does
    // not start scrolling first.
    React.useEffect(() => {
        const el = panel.current;
        if (!el || columnMode)
            return;
        let start = 0;
        let scale = 1;
        /** A content gesture on a resizable sheet: the split state and the last finger offset. */
        let content = null;
        let fling = 0;
        const stopFling = () => {
            if (fling)
                cancelAnimationFrame(fling);
            fling = 0;
        };
        /** The element that scrolls (the scroll area's viewport, inside its frame with the floats). */
        const scroller = () => viewport.current?.querySelector(':scope > .lab-scroll-viewport') ?? viewport.current;
        // The grabber, the floating header and dock, and anything marked as a handle move the sheet.
        const isChrome = (target) => !!target && (!scroller()?.contains(target) || !!target.closest('[data-lab-sheet-handle]'));
        /** How far the content can scroll once the sheet is at `max` (measured at the current rest height). */
        const scrollMaxAt = (max) => {
            const v = scroller();
            if (!v)
                return 0;
            return Math.max(0, v.scrollHeight - v.clientHeight - Math.max(0, max - visible.get()));
        };
        /** The content keeps moving after a flick; reaching its top going down, it hands on to the sheet. */
        const flingContent = (velocity) => {
            const v = scroller();
            if (!v)
                return;
            stopFling();
            let speed = velocity;
            let scroll = v.scrollTop;
            let last = performance.now();
            const max = v.scrollHeight - v.clientHeight;
            const frame = (now) => {
                const step = flingStep(scroll, speed, Math.min(64, now - last));
                last = now;
                scroll = step.scroll;
                speed = step.velocity;
                if (scroll <= 0 && speed < 0) {
                    v.scrollTop = 0;
                    fling = 0;
                    // What is left of the flick carries the sheet down (and may close it).
                    if (speed < -80) {
                        beginMotion();
                        releaseRef.current(speed, false);
                    }
                    return;
                }
                v.scrollTop = Math.min(max, scroll);
                if (scroll >= max || Math.abs(speed) < 12) {
                    fling = 0;
                    return;
                }
                fling = requestAnimationFrame(frame);
            };
            fling = requestAnimationFrame(frame);
        };
        const stopPan = attachPan(el, () => ({
            axis: 'y',
            touch: 'claim',
            canBegin: ({ target, pointerType }) => {
                stopFling();
                // A field keeps the mouse (text selection) and its own drags while focused; a finger
                // dragging across an unfocused field moves the sheet (a tap still focuses it), as in Maps.
                const field = target?.closest(EDITABLE);
                if (field && (pointerType === 'mouse' || field === document.activeElement))
                    return false;
                return (live.current.open &&
                    (pointerType !== 'mouse' || isChrome(target) || !!target?.closest('.lab-sheet-grabber')));
            },
            shouldStart: ({ direction, target }) => {
                const L = live.current;
                if (L.presentation === 'dialog')
                    return direction === 1 && L.dismissible && isChrome(target);
                if (isChrome(target))
                    return true;
                // A nested scroller or draggable control inside the content keeps its own gesture.
                if (gesture.current.resizable)
                    return !canChildPan(target, scroller() ?? el, 'y', direction);
                if (direction === 1)
                    return !canChildPan(target, el, 'y', 1);
                return visible.get() < Math.max(...L.heights) - 1;
            },
            onStart: ({ pointerType }) => {
                dragging.current = true;
                scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
                if (live.current.presentation === 'dialog') {
                    lift.stop();
                    start = lift.get();
                    return;
                }
                visible.stop();
                content = null;
                start = visible.get();
                const target = lastTarget;
                if (gesture.current.resizable && !isChrome(target) && pointerType !== 'mouse') {
                    // Lay the content out at the height it shows, so its scroll range is the real one.
                    if (motionHeight.current)
                        rest(start);
                    const max = gesture.current.maxHeight;
                    content = { state: { raw: start, scroll: scroller()?.scrollTop ?? 0 }, last: 0, scrollMax: scrollMaxAt(max) };
                    if (start < max - 0.5)
                        beginMotion();
                    return;
                }
                beginMotion();
            },
            onMove: ({ dy, time }) => {
                const L = live.current;
                const move = dy / scale;
                if (L.presentation === 'dialog') {
                    const y = start + move;
                    lift.track(y < 0 ? -rubberBand(-y, 300) * 0.5 : y, time);
                    return;
                }
                const c = content;
                if (c) {
                    const max = gesture.current.maxHeight;
                    c.state = sheetScrollStep(c.state, -(move - c.last), max, c.scrollMax);
                    c.last = move;
                    const atTop = Math.abs(c.state.raw - max) < 0.5;
                    // At its full height the sheet rests (exact layout) and only the content scrolls.
                    if (atTop && motionHeight.current)
                        rest(max);
                    if (!atTop && !motionHeight.current)
                        beginMotion();
                    const v = scroller();
                    if (v)
                        v.scrollTop = c.state.scroll;
                    visible.track(dragHeight(c.state.raw, L.heights, L.metrics?.hostHeight ?? 800, L.dismissible), time);
                    return;
                }
                visible.track(dragHeight(start - move, L.heights, L.metrics?.hostHeight ?? 800, L.dismissible), time);
            },
            onEnd: ({ vy, cancelled, time }) => {
                dragging.current = false;
                const L = live.current;
                if (L.presentation === 'dialog') {
                    const away = !cancelled && L.dismissible && projectMomentum(lift.get(), vy / scale, 0.99) > 160;
                    if (away) {
                        L.onOpenChange(false);
                        void lift.animateTo(0, { spring: SPRINGS.smooth });
                    }
                    else
                        void lift.animateTo(0, { spring: SPRINGS.release, velocity: lift.getVelocity(time) });
                    return;
                }
                const c = content;
                content = null;
                const max = gesture.current.maxHeight;
                if (c && c.state.raw >= max - 0.5 && !cancelled) {
                    // At full height: settle any stretch, and let the content carry the flick.
                    const speed = -vy / scale;
                    if (c.state.raw > max + 0.5)
                        void moveTo(max, SPRINGS.release, visible.getVelocity(time));
                    else if (motionHeight.current)
                        rest(max);
                    // It rests at its highest detent: report it.
                    if (gesture.current.snap)
                        setDetentRef.current(L.heights.indexOf(max));
                    else
                        settleFreeRef.current(max);
                    const scroll = c.state.scroll;
                    if ((speed > 0 && scroll < c.scrollMax - 0.5) || (speed < 0 && scroll > 0.5))
                        flingContent(speed);
                    return;
                }
                releaseRef.current(visible.getVelocity(time), cancelled);
            },
        }));
        // The element the current pointer went down on (attachPan reports it to shouldStart only).
        let lastTarget = null;
        const remember = (event) => {
            lastTarget = event.target instanceof Element ? event.target : null;
        };
        el.addEventListener('pointerdown', remember, true);
        el.addEventListener('touchstart', remember, { capture: true, passive: true });
        // Wheel and trackpad: grow before scrolling down, shrink once scrolled back to the top, and on
        // a dismissible sheet go on below the lowest height until it closes. A snapping sheet settles
        // on a detent when the wheel stops.
        let idle = 0;
        const settleWheel = () => {
            if (dragging.current || visible.isAnimating())
                return;
            const L = live.current;
            const G = gesture.current;
            const height = visible.get();
            if (height < G.minHeight - 0.5) {
                if (L.dismissible && wheelDismisses(height, G.minHeight))
                    return dismissAway(0);
                if (G.snap)
                    setDetentRef.current(L.heights.indexOf(G.minHeight));
                else
                    settleFreeRef.current(G.minHeight);
                void moveTo(G.minHeight, SPRINGS.release);
                return;
            }
            if (G.snap)
                releaseRef.current(0, true);
            else {
                settleFreeRef.current(height);
                rest(height);
            }
        };
        const onWheel = (event) => {
            const L = live.current;
            const G = gesture.current;
            const v = scroller();
            if (!v || !L.open || L.presentation === 'dialog' || event.ctrlKey || dragging.current)
                return;
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest(EDITABLE))
                return;
            const delta = (event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? v.clientHeight : 1)) / scaleOf(el);
            // A nested scroller inside the content keeps its own wheel.
            if (!delta || (v.contains(target) && canChildPan(target, v, 'y', delta > 0 ? -1 : 1)))
                return;
            const height = visible.get();
            // A fixed sheet only moves to close.
            const grow = G.resizable && delta > 0 && height < G.maxHeight - 0.5;
            const shrink = delta < 0 && v.scrollTop <= 0 && (L.dismissible ? height > 0.5 : G.resizable && height > G.minHeight + 0.5);
            if (!grow && !shrink)
                return;
            event.preventDefault();
            stopFling();
            visible.stop();
            beginMotion();
            visible.set(wheelHeight(height, delta, G.minHeight, G.maxHeight, L.dismissible));
            window.clearTimeout(idle);
            idle = window.setTimeout(settleWheel, 160);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            stopPan();
            stopFling();
            window.clearTimeout(idle);
            el.removeEventListener('pointerdown', remember, true);
            el.removeEventListener('touchstart', remember, { capture: true });
            el.removeEventListener('wheel', onWheel);
        };
        // A sheet open before its container exists gets its panel when the container arrives.
    }, [container, columnMode]);
    const cycle = (step) => {
        const order = heights.map((h, i) => [h, i]).sort((a, b) => a[0] - b[0]);
        const at = order.findIndex(([, i]) => i === index);
        const next = order[(at + step + order.length) % order.length][1];
        setDetentIndex(next);
    };
    /** Back down to where the page is usable, or closed. */
    const collapse = () => {
        const L = live.current;
        if (L.undimmed !== null && backgroundInteraction !== undefined && heights[index] > L.undimmed + 0.5) {
            setDetentIndex(detents.indexOf(backgroundInteraction));
            return;
        }
        if (dismissible)
            onOpenChange(false);
    };
    const sheetState = React.useMemo(() => ({
        detent: detents[index],
        expansion,
        height: visible,
        presentation,
        setDetent: (d) => {
            const i = detents.indexOf(d);
            if (i >= 0)
                setDetentRef.current(i);
        },
    }), [detents[index], presentation]);
    const top = header !== undefined ? (header) : (_jsx(PresentationHeader, { title: title, leading: leading, titleId: titleId, trailing: trailing, onClose: showClose ? () => open && onOpenChange(false) : undefined, closeLabel: t('lab.composer.closeLabel', { label }) }));
    return (_jsxs(PresentationHost, { ref: host, inPlace: inPlace, kind: "sheet", label: label, labelledBy: header === undefined && leading == null && title != null ? titleId : undefined, modal: hostModal, container: container, initialFocusRef: initialFocusRef ?? panel, returnFocusRef: returnFocusRef, onEscape: collapse, children: [(dims || inPlace) && _jsx("div", { ref: scrim, className: "lab-sheet-scrim", "aria-hidden": "true", onClick: collapse }), _jsx("div", { ref: probe, className: "lab-sheet-safe-probe", "aria-hidden": "true" }), _jsx("div", { ref: tokens, className: "lab-sheet-token-probe", "aria-hidden": "true" }), _jsxs("div", { ref: panel, className: cn('lab-sheet', className), "data-presentation": presentation, "data-mode": mode, "data-detent": typeof detents[index] === 'string' ? detents[index] : undefined, "data-ready": metrics ? '' : undefined, style: presentation === 'card' ? { '--lab-sheet-card-width': `${cardWidth}px` } : undefined, tabIndex: -1, onKeyDown: (event) => {
                    // A non-modal host gets no cancel event: Escape still lowers or closes the sheet.
                    if (event.key !== 'Escape' || hostModal || event.defaultPrevented)
                        return;
                    event.preventDefault();
                    event.stopPropagation();
                    collapse();
                }, onFocus: (event) => {
                    if (!(event.target instanceof Element) || !event.target.matches(EDITABLE))
                        return;
                    const next = focusRaise(detents, heights, index, focusDetent);
                    if (next !== null)
                        setDetentIndex(next);
                }, children: [_jsx("div", { ref: surface, className: "lab-sheet-surface", "aria-hidden": "true", children: _jsx("div", { ref: solid, className: "lab-sheet-solid" }) }), _jsxs("div", { ref: column, className: "lab-sheet-column", style: columnInset ? { insetInline: columnInset, bottom: columnInset } : undefined, children: [showGrabber && (_jsx("div", { ref: grabRow, className: "lab-sheet-grabber-row", "data-lab-sheet-handle": "", children: _jsx("button", { type: "button", className: "lab-sheet-grabber", "aria-label": t('lab.sheet.grabber'), onClick: () => cycle(1), onKeyDown: (event) => {
                                        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                                            event.preventDefault();
                                            cycle(event.key === 'ArrowUp' ? 1 : -1);
                                        }
                                    } }) })), _jsx(SheetContext.Provider, { value: sheetState, children: _jsx(PresentationBody, { ref: viewport, label: label, top: top, bottom: dock, fill: true, contentPadding: contentPadding, onNaturalHeight: (height) => {
                                        bodyNatural.current = height;
                                        measureRef.current();
                                    }, children: children }) })] })] })] }));
}
//# sourceMappingURL=sheet.js.map