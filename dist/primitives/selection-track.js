'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, } from 'react';
import { Button } from './button.js';
import { cn } from '../utils.js';
import { scrollEdgeOpacities } from '../scroll/metrics.js';
import { revealScrollChild } from '../scroll/reveal.js';
import { GLASS_GLOW_START, GLASS_PRESS_SCALE, glassGlowRadius, pressedShape } from '../glass/press.js';
import { useMotionValue, useReducedMotion } from '../physics/react.js';
import { SPRINGS, springTiming } from '../physics/spring.js';
import { SEGMENTED_FADE, SEGMENTED_SLOP, segmentIndexAt, segmentedAutoScrollSpeed, segmentedDragCenter, segmentedPillWidth, segmentedSnapIndex, selectionKeyTarget, } from './segmented-model.js';
import { lensStretch } from './lens-model.js';
import './lens.css';
import './segmented.css';
const COLLAPSE = springTiming(SPRINGS.snappy);
/**
 * One row of options and one moving pill: measuring, the pill and its glass lens with the touch
 * glow, drag with rubber band and momentum snap, auto-scroll, one-row overflow with edge fades and
 * reveal, keyboard roving, right-to-left, badges, tones, reduced motion and solid glass.
 *
 * `semantics` makes it a radio group (`radio`, `aria-checked`) or a tab list (`tab`, `aria-selected`
 * and `aria-controls`); `layout`, `pill` and the host's CSS (sizes) make it a segmented control or
 * a tab bar. `collapsed` folds it to the selected option, icon only (a minimized tab bar).
 */
export function SelectionTrack({ value, onSelect, options, label, semantics = 'radio', layout = 'inline', pill = 'filled', disabled = false, equalWidth = false, draggable = true, collapsed, className, }) {
    const group = useRef(null);
    const scrollerRef = useRef(null);
    const trackRef = useRef(null);
    const pillRef = useRef(null);
    const reduced = useReducedMotion();
    // Pill: centre, width and top; press response: swell, stretch, lens (0 filled … 1 glass), glow.
    const center = useMotionValue(0, 0.05);
    const width = useMotionValue(0, 0.05);
    const top = useMotionValue(0, 0.05);
    const press = useMotionValue(1, 0.0005);
    const stretch = useMotionValue(0, 0.05);
    const lens = useMotionValue(0, 0.002);
    const glowRadius = useMotionValue(GLASS_GLOW_START, 0.5);
    const glowOpacity = useMotionValue(0, 0.005);
    const layoutState = useRef({
        boxes: [],
        spans: [],
        corner: 1,
        placed: false,
        /** The options are wider than the track: it scrolls. */
        overflow: false,
        rtl: false,
    });
    const glowAt = useRef({ x: 0, y: 0 });
    const drag = useRef(null);
    const suppressClick = useRef(false);
    const autoFrame = useRef(0);
    /** The value last scrolled into view. */
    const revealed = useRef(undefined);
    const live = useRef({ value, options, disabled, reduced, onSelect, equalWidth, draggable });
    live.current = { value, options, disabled, reduced, onSelect, equalWidth, draggable };
    const tab = semantics === 'tab';
    const stacked = layout === 'stacked';
    const enabled = options.filter((option) => !disabled && !option.disabled);
    const tabValue = enabled.some((option) => option.value === value) ? value : enabled[0]?.value;
    const optionKey = options
        .map((option) => `${option.value}:${option.label}:${option.badge ?? ''}:${option.disabled ? 1 : 0}`)
        .join('|');
    const buttons = () => trackRef.current ? [...trackRef.current.querySelectorAll(':scope > .lab-segmented-option')] : [];
    /** Client point → the track's own pixels (undoes scaled ancestors, like a pressed bubble, and the
     * scroll: the track moves with it). */
    const local = (clientX, clientY) => {
        const el = trackRef.current;
        const rect = el.getBoundingClientRect();
        const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
        return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    };
    /** Edge fades of a scrolling track: each edge fades in as content moves past it. */
    const fade = () => {
        const scroller = scrollerRef.current;
        if (!scroller)
            return;
        if (!layoutState.current.overflow) {
            scroller.style.removeProperty('--lab-segmented-fade-left');
            scroller.style.removeProperty('--lab-segmented-fade-right');
            return;
        }
        const max = scroller.scrollWidth - scroller.clientWidth;
        // Right-to-left scrollers run from -max (far left) to 0.
        const left = layoutState.current.rtl ? max + scroller.scrollLeft : scroller.scrollLeft;
        const edges = scrollEdgeOpacities(left, max, SEGMENTED_FADE);
        scroller.style.setProperty('--lab-segmented-fade-left', String(edges.top));
        scroller.style.setProperty('--lab-segmented-fade-right', String(edges.bottom));
    };
    /** Scrolls the track (never the page) to show option `index` clear of the edge fades. */
    const reveal = (index, behavior) => {
        if (!layoutState.current.overflow)
            return;
        revealScrollChild(scrollerRef.current, buttons()[index], { block: false, behavior });
    };
    const measure = () => {
        const root = group.current;
        const el = trackRef.current;
        const scroller = scrollerRef.current;
        if (!root || !el || !scroller)
            return;
        const rect = el.getBoundingClientRect();
        const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
        const { options, disabled, equalWidth } = live.current;
        const boxes = buttons().map((button) => {
            const r = button.getBoundingClientRect();
            return {
                x: (r.left - rect.left) / scale,
                y: (r.top - rect.top) / scale,
                w: r.width / scale,
                h: r.height / scale,
                border: button.clientLeft,
            };
        });
        const state = layoutState.current;
        state.boxes = boxes;
        state.spans = boxes.map((box, i) => ({
            start: box.x,
            width: box.w,
            disabled: disabled || !!options[i]?.disabled,
        }));
        const style = getComputedStyle(root);
        state.corner = parseFloat(style.getPropertyValue('--lab-corner-scale')) || 1;
        state.rtl = style.direction === 'rtl';
        const overflow = !equalWidth && scroller.scrollWidth - scroller.clientWidth > 0.5;
        const changed = overflow !== state.overflow;
        state.overflow = overflow;
        root.toggleAttribute('data-overflow', overflow);
        fade();
        return changed;
    };
    const paint = () => {
        const el = group.current;
        const pillEl = pillRef.current;
        const { boxes, corner } = layoutState.current;
        if (!el || !pillEl || !boxes.length)
            return;
        const height = boxes[0].h;
        const w = width.get();
        const scale = press.get();
        const shape = pressedShape({ x: center.get() - w / 2, y: top.get(), width: w, height, radius: 0 }, scale, stretch.get(), 0);
        pillEl.style.transform = `translate(${shape.x}px, ${shape.y}px)`;
        pillEl.style.width = `${shape.width}px`;
        pillEl.style.height = `${shape.height}px`;
        el.style.setProperty('--lab-segmented-press', String(scale));
        el.style.setProperty('--lab-lens', String(Math.max(0, Math.min(1, lens.get()))));
        el.style.setProperty('--lab-lens-glow-x', `${glowAt.current.x - shape.x}px`);
        el.style.setProperty('--lab-lens-glow-y', `${glowAt.current.y - shape.y}px`);
        el.style.setProperty('--lab-lens-glow-r', `${Math.max(1, glowRadius.get())}px`);
        el.style.setProperty('--lab-lens-glow', String(Math.max(0, Math.min(1, glowOpacity.get()))));
        // Selected ink shows exactly where the pill is, so a label turns over as the pill crosses it.
        const radius = (Math.min(shape.width, shape.height) / 2) * corner;
        buttons().forEach((button, i) => {
            const box = boxes[i];
            if (!box)
                return;
            const b = box.border;
            const inset = [
                shape.y - (box.y + b),
                box.x + box.w - b - (shape.x + shape.width),
                box.y + box.h - b - (shape.y + shape.height),
                shape.x - (box.x + b),
            ].map((v) => `${Math.max(0, v)}px`);
            button.style.setProperty('--lab-segmented-clip', `inset(${inset.join(' ')} round ${radius}px)`);
        });
    };
    useLayoutEffect(() => {
        const values = [center, width, top, press, stretch, lens, glowRadius, glowOpacity];
        const off = values.map((motion) => motion.subscribe(paint));
        // While dragged, the width follows the centre: one option's width to the next.
        off.push(center.subscribe((c) => {
            if (drag.current?.active)
                width.set(segmentedPillWidth(c, layoutState.current.spans));
        }));
        return () => off.forEach((unsubscribe) => unsubscribe());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const selectedIndex = () => live.current.options.findIndex((option) => option.value === live.current.value);
    /** Springs (or, with reduced motion or before the first placement, jumps) the pill onto `index`. */
    const moveTo = (index, spring) => {
        const box = layoutState.current.boxes[index];
        const pillEl = pillRef.current;
        if (!box || !pillEl) {
            pillEl?.setAttribute('data-hidden', '');
            return;
        }
        pillEl.removeAttribute('data-hidden');
        const instant = live.current.reduced || !layoutState.current.placed;
        layoutState.current.placed = true;
        void center.animateTo(box.x + box.w / 2, { spring, instant });
        void width.animateTo(box.w, { spring, instant });
        void top.animateTo(box.y, { spring, instant });
        paint();
    };
    // Follow the selection and the layout (option text, density, container width).
    const selected = options.findIndex((option) => option.value === value);
    useLayoutEffect(() => {
        measure();
        if (drag.current?.active)
            return;
        // Whatever chose it (a press, a key, a release, the owner), a new selection scrolls into view;
        // new labels or counts leave the scroll where the person put it.
        if (revealed.current !== value) {
            revealed.current = value;
            reveal(selected, layoutState.current.placed ? 'smooth' : 'instant');
        }
        const box = layoutState.current.boxes[selected];
        // A released pill already heading here keeps its release spring.
        if (box && center.isAnimating() && Math.abs(center.getTarget() - (box.x + box.w / 2)) < 0.5)
            return;
        moveTo(selected, SPRINGS.snappy);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, optionKey, equalWidth, disabled, reduced]);
    useLayoutEffect(() => {
        const el = group.current;
        if (!el || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => {
            const overflowChanged = measure();
            if (drag.current?.active)
                return;
            const index = selectedIndex();
            if (overflowChanged)
                reveal(index, 'instant');
            if (center.isAnimating())
                moveTo(index, SPRINGS.snappy);
            else {
                // At rest: snap to the new geometry without animating a resize (a folding track's options
                // spring their own widths; the pill follows them frame by frame).
                const box = layoutState.current.boxes[index];
                if (!box)
                    return moveTo(index, SPRINGS.snappy);
                center.set(box.x + box.w / 2);
                width.set(box.w);
                top.set(box.y);
            }
        });
        observer.observe(el);
        if (trackRef.current)
            observer.observe(trackRef.current);
        for (const button of buttons())
            observer.observe(button);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionKey]);
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller)
            return;
        scroller.addEventListener('scroll', fade, { passive: true });
        return () => scroller.removeEventListener('scroll', fade);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const pressIn = (point) => {
        if (live.current.reduced)
            return;
        group.current?.setAttribute('data-pressed', '');
        glowAt.current = point;
        void press.animateTo(GLASS_PRESS_SCALE, { spring: SPRINGS.snappy });
        void lens.animateTo(1, { spring: SPRINGS.snappy });
        glowRadius.set(GLASS_GLOW_START);
        glowOpacity.set(1);
        void glowRadius.animateTo(glassGlowRadius(width.get()), { spring: SPRINGS.smooth });
    };
    const pressOut = () => {
        group.current?.removeAttribute('data-pressed');
        void press.animateTo(1, { spring: SPRINGS.bouncy });
        void stretch.animateTo(0, { spring: SPRINGS.bouncy });
        void lens.animateTo(0, { spring: SPRINGS.snappy });
        void glowOpacity.animateTo(0, { spring: SPRINGS.smooth });
    };
    /** Reports a released choice; if the owner keeps the old value, the pill goes back to it. */
    const commit = (index) => {
        const option = live.current.options[index];
        if (!option || option.value === live.current.value)
            return;
        live.current.onSelect(option.value, 'drag');
        requestAnimationFrame(() => {
            if (!drag.current && live.current.value !== option.value)
                moveTo(selectedIndex(), SPRINGS.snappy);
        });
    };
    const detach = useRef(() => { });
    useEffect(() => () => {
        detach.current();
        cancelAnimationFrame(autoFrame.current);
    }, []);
    /** Moves a dragged pill to the pointer. `auto`: an auto-scroll frame moved the track under a
     * still pointer, so the pill springs after it instead of tracking pointer samples. */
    const follow = (d, time, auto) => {
        const point = local(d.clientX, d.clientY);
        const { spans, boxes } = layoutState.current;
        if (live.current.reduced) {
            // No sliding: the pill sits on the option under the pointer.
            const index = segmentIndexAt(point.x, spans);
            if (index >= 0 && !spans[index].disabled && index !== d.index) {
                d.index = index;
                center.set(boxes[index].x + boxes[index].w / 2);
                width.set(boxes[index].w);
            }
            return;
        }
        glowAt.current = point;
        const target = segmentedDragCenter(point.x, d.grab, spans);
        if (d.catching || auto) {
            void center.animateTo(target, { spring: SPRINGS.interactive });
            if (d.catching && Math.abs(center.get() - target) < 1)
                d.catching = false;
        }
        else
            center.track(target, time);
        void stretch.animateTo(lensStretch(center.getVelocity(time)), { spring: SPRINGS.interactive });
        paint();
    };
    /** While a pill is dragged, a pointer near an edge of a scrolling track scrolls it. */
    const autoScroll = () => {
        if (autoFrame.current)
            return;
        let last = performance.now();
        const frame = (now) => {
            const d = drag.current;
            const scroller = scrollerRef.current;
            if (!d?.active || !scroller) {
                autoFrame.current = 0;
                return;
            }
            autoFrame.current = requestAnimationFrame(frame);
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            if (!layoutState.current.overflow)
                return;
            const rect = scroller.getBoundingClientRect();
            const scale = scroller.offsetWidth ? rect.width / scroller.offsetWidth : 1;
            const speed = segmentedAutoScrollSpeed((d.clientX - rect.left) / scale, 0, scroller.clientWidth);
            if (!speed)
                return;
            const before = scroller.scrollLeft;
            scroller.scrollLeft = before + speed * dt;
            if (scroller.scrollLeft !== before)
                follow(d, now, true);
        };
        autoFrame.current = requestAnimationFrame(frame);
    };
    const onPointerDown = (event) => {
        if (live.current.disabled || !live.current.draggable || event.button > 0 || drag.current || !group.current)
            return;
        measure();
        const { spans, boxes, overflow } = layoutState.current;
        if (!boxes.length)
            return;
        const point = local(event.clientX, event.clientY);
        const index = segmentIndexAt(point.x, spans);
        if (index < 0 || spans[index].disabled)
            return;
        const onPill = index === selectedIndex() && !center.isAnimating();
        const touch = event.pointerType === 'touch';
        // A finger off the pill in a scrolling track scrolls it (a tap still selects).
        if (overflow && touch && !onPill)
            return;
        drag.current = {
            pointer: event.pointerId,
            touch,
            startX: event.clientX,
            startY: event.clientY,
            clientX: event.clientX,
            clientY: event.clientY,
            onPill,
            grab: onPill ? point.x - center.get() : 0,
            active: false,
            catching: !onPill,
            index,
        };
        if (onPill)
            pressIn(point);
        const move = (e) => onPointerMove(e);
        const up = (e) => onPointerEnd(e, false);
        const cancel = (e) => onPointerEnd(e, true);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        detach.current = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            detach.current = () => { };
        };
    };
    const onPointerMove = (event) => {
        const d = drag.current;
        if (!d || event.pointerId !== d.pointer || !group.current)
            return;
        const dx = event.clientX - d.startX;
        const dy = event.clientY - d.startY;
        d.clientX = event.clientX;
        d.clientY = event.clientY;
        if (!d.active) {
            if (Math.abs(dx) < (d.touch ? SEGMENTED_SLOP.touch : SEGMENTED_SLOP.mouse) || Math.abs(dx) < Math.abs(dy))
                return;
            d.active = true;
            group.current.setAttribute('data-dragging', '');
            if (!d.onPill)
                pressIn(local(event.clientX, event.clientY));
            autoScroll();
        }
        event.preventDefault();
        follow(d, event.timeStamp, false);
    };
    const onPointerEnd = (event, cancelled) => {
        const d = drag.current;
        if (!d || event.pointerId !== d.pointer)
            return;
        detach.current();
        drag.current = null;
        cancelAnimationFrame(autoFrame.current);
        autoFrame.current = 0;
        group.current?.removeAttribute('data-dragging');
        pressOut();
        if (!d.active)
            return;
        // The click that ends a drag is not a press.
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        const { spans } = layoutState.current;
        const index = cancelled
            ? selectedIndex()
            : live.current.reduced
                ? d.index
                : segmentedSnapIndex(center.get(), center.getVelocity(event.timeStamp), spans);
        const target = index >= 0 ? index : selectedIndex();
        moveTo(target, SPRINGS.release);
        if (!cancelled)
            commit(target);
    };
    const navigate = (event) => {
        const rtl = !!group.current && getComputedStyle(group.current).direction === 'rtl';
        const index = enabled.findIndex((option) => option.value === value);
        const target = selectionKeyTarget(event.key, index, enabled.length, rtl, semantics);
        if (target === null)
            return;
        event.preventDefault();
        const next = enabled[target];
        onSelect(next.value, 'key');
        const position = options.findIndex((option) => option.value === next.value);
        const button = buttons()[position];
        // The track scrolls the option into view as the selection follows (see above); an enclosing
        // scroll area shows the track.
        button?.focus({ preventScroll: true });
        revealScrollChild(group.current?.closest('.lab-scroll-viewport'), button, {
            inline: false,
        });
    };
    const collapsible = collapsed !== undefined;
    return (_jsx("div", { ref: group, className: cn('lab-segmented', className), "data-equal-width": equalWidth || undefined, "data-layout": layout, "data-pill": pill, "data-collapsible": collapsible || undefined, "data-collapsed": collapsed || undefined, "data-glass-own-press": "", role: tab ? 'tablist' : 'radiogroup', "aria-label": label, "aria-disabled": disabled || undefined, style: collapsible
            ? {
                '--lab-segmented-fold-ease': COLLAPSE.easing,
                '--lab-segmented-fold-duration': `${COLLAPSE.duration}ms`,
            }
            : undefined, onKeyDown: navigate, onPointerDown: onPointerDown, onClickCapture: (event) => {
            if (!suppressClick.current)
                return;
            event.preventDefault();
            event.stopPropagation();
        }, "data-lab-corners": true, children: _jsx("div", { ref: scrollerRef, className: "lab-segmented-scroller", children: _jsxs("div", { ref: trackRef, className: "lab-segmented-track", children: [_jsxs("span", { ref: pillRef, className: "lab-segmented-pill", "aria-hidden": "true", "data-hidden": "", children: [_jsx("span", { className: "lab-segmented-fill" }), _jsx("span", { className: "lab-lens lab-light-edge" }), _jsx("span", { className: "lab-lens-glow" })] }), options.map((option) => {
                        const isSelected = option.value === value;
                        // Stacked, the badge sits on the icon (or after a label with no icon).
                        const badgeOnIcon = stacked && !!option.icon;
                        const badge = option.badge ? _jsx("span", { className: "lab-segmented-badge", children: option.badge }) : null;
                        const content = (_jsxs(_Fragment, { children: [option.icon && (_jsxs("span", { className: "lab-segmented-icon", "data-tone": option.tone, "aria-hidden": "true", children: [option.icon, badgeOnIcon && badge] })), _jsx("span", { className: "lab-segmented-label", children: option.label }), !badgeOnIcon && badge] }));
                        return (_jsxs(Button, { id: option.id, variant: "ghost", appearance: "toolbar", controlSize: "regular", className: "lab-segmented-option", role: tab ? 'tab' : 'radio', "aria-checked": tab ? undefined : isSelected, "aria-selected": tab ? isSelected : undefined, "aria-controls": option.controls, "aria-label": option.badge ? `${option.label}, ${option.badge}` : undefined, "data-selected": isSelected || undefined, tabIndex: option.value === tabValue ? 0 : -1, disabled: disabled || option.disabled, onClick: () => onSelect(option.value, 'press'), children: [_jsx("span", { className: "lab-segmented-content", children: content }), _jsx("span", { className: "lab-segmented-content lab-segmented-ink", "aria-hidden": "true", children: content })] }, option.value));
                    })] }) }) }));
}
//# sourceMappingURL=selection-track.js.map