'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState, } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './button.js';
import { useMeasuredActions } from '../actions/use_measured_actions.js';
import { scheduleFitRows, useFitRow } from '../actions/fit-row.js';
import { useActionsWidth } from '../actions/width-context.js';
import { MenuSurface } from '../menu/menu-surface.js';
import { useFloatingBoundary } from '../menu/boundary.js';
import { cn } from '../utils.js';
import { scrollEdgeOpacities } from '../scroll/metrics.js';
import { revealScrollChild } from '../scroll/reveal.js';
import { GLASS_PRESS_SCALE, pressedShape } from '../glass/press.js';
import { GLASS_FOLLOW_ATTRIBUTE } from '../glass/transitions.js';
import { useMotionValue, useReducedMotion } from '../physics/react.js';
import { SPRINGS, springTiming } from '../physics/spring.js';
import { SEGMENTED_FADE, SEGMENTED_SLOP, segmentIndexAt, segmentedAutoScrollSpeed, segmentedDragCenter, segmentedPillWidth, segmentedSnapIndex, selectionKeyTarget, } from './segmented-model.js';
import { lensInkZoom, lensPillShape, lensStretch } from './lens-model.js';
import { GlassLensLayer, lensMode } from '../glass/lens-layer.js';
import '../actions/actions.css';
import './lens.css';
import './segmented.css';
const COLLAPSE = springTiming(SPRINGS.snappy);
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
export function SelectionTrack({ value, onSelect, options, label, semantics = 'radio', layout = 'inline', disabled = false, equalWidth = false, draggable = true, overflow: overflowMode = 'scroll', className, }) {
    const group = useRef(null);
    const scrollerRef = useRef(null);
    const trackRef = useRef(null);
    const pillRef = useRef(null);
    const lensRef = useRef(null);
    const lensLayer = useRef(null);
    const reduced = useReducedMotion();
    // Pill: centre, width and top; press response: swell, stretch, lens (0 filled … 1 glass).
    const center = useMotionValue(0, 0.05);
    const width = useMotionValue(0, 0.05);
    const top = useMotionValue(0, 0.05);
    const press = useMotionValue(1, 0.0005);
    const stretch = useMotionValue(0, 0.05);
    const lens = useMotionValue(0, 0.002);
    const layoutState = useRef({
        boxes: [],
        spans: [],
        corner: 1,
        /** The pill's drawn corner radius at rest (CSS), which the selected ink's clip follows. */
        pillRadius: Infinity,
        placed: false,
        /** The options are wider than the track: it scrolls. */
        overflow: false,
        rtl: false,
    });
    const drag = useRef(null);
    const suppressClick = useRef(false);
    const autoFrame = useRef(0);
    /** The value last scrolled into view. */
    const revealed = useRef(undefined);
    const menu = overflowMode === 'menu' && !equalWidth;
    const [foldedState, setFolded] = useState(false);
    const folded = menu && foldedState;
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuDir, setMenuDir] = useState('ltr');
    const [menuContainer, setMenuContainer] = useState();
    const boundary = useFloatingBoundary();
    const measuringRow = useRef(null);
    /** Focus follows the selection onto the capsule after a key changed it while folded. */
    const refocus = useRef(false);
    const live = useRef({ value, options, disabled, reduced, onSelect, equalWidth, draggable, folded });
    live.current = { value, options, disabled, reduced, onSelect, equalWidth, draggable, folded };
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
        const drawn = pillRef.current ? parseFloat(getComputedStyle(pillRef.current).borderTopLeftRadius) : NaN;
        state.pillRadius = Number.isFinite(drawn) && drawn > 0 ? drawn / (press.get() || 1) : Infinity;
        state.rtl = style.direction === 'rtl';
        const overflow = !equalWidth && overflowMode !== 'menu' && scroller.scrollWidth - scroller.clientWidth > 0.5;
        const changed = overflow !== state.overflow;
        state.overflow = overflow;
        root.toggleAttribute('data-overflow', overflow);
        fade();
        return changed;
    };
    const paint = () => {
        const el = group.current;
        const pillEl = pillRef.current;
        const { boxes, corner, pillRadius } = layoutState.current;
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
        const lensAmount = Math.max(0, Math.min(1, lens.get()));
        el.style.setProperty('--lab-lens', String(lensAmount));
        // A tile-shaped pill (e.g. the ladder's shape tiles) is rounder than it is wide: clipping the
        // ink to a full capsule there cut the label off, so the clip follows the pill as drawn.
        const radius = Math.min((Math.min(shape.width, shape.height) / 2) * corner, pillRadius * scale);
        // Pressed or dragged, the pill is real glass over the options; a liquid one lifts out of the
        // pill (from its rest size: the lift is iOS's whole growth), past the track.
        const mode = lensMode();
        const liquid = mode === 'liquid';
        const rest = pressedShape({ x: center.get() - w / 2, y: top.get(), width: w, height, radius: 0 }, 1, stretch.get(), 0);
        const glass = lensPillShape(rest, (Math.min(rest.width, rest.height) / 2) * corner, lensAmount, liquid);
        const lensEl = lensRef.current;
        if (lensEl) {
            lensEl.style.transform = `translate(${glass.x}px, ${glass.y}px)`;
            lensEl.style.width = `${glass.width}px`;
            lensEl.style.height = `${glass.height}px`;
            lensEl.style.borderRadius = `${glass.radius}px`;
            lensLayer.current?.update(lensAmount, glass);
        }
        // Selected ink shows exactly where the pill is, so a label turns over as the pill crosses it.
        // Under the lens the selected option grows (lensInkZoom, like iOS's tab item): the ink copy
        // scales up around the drop's centre (its clip mapped back so it still fills the drop) and the
        // plain content underneath is cut out where the drop is.
        const zoom = lensInkZoom(mode === 'off' ? 0 : lensAmount);
        buttons().forEach((button, i) => {
            const box = boxes[i];
            if (!box)
                return;
            const b = box.border;
            const innerW = box.w - 2 * b;
            const innerH = box.h - 2 * b;
            // The drop in the option's padding box, then where the scaled ink copy must be cut.
            const local = { x: shape.x - (box.x + b), y: shape.y - (box.y + b), w: shape.width, h: shape.height };
            const ox = local.x + local.w / 2;
            const oy = local.y + local.h / 2;
            const cut = { x: ox + (local.x - ox) / zoom, y: oy + (local.y - oy) / zoom, w: local.w / zoom, h: local.h / zoom };
            const inset = [cut.y, innerW - (cut.x + cut.w), innerH - (cut.y + cut.h), cut.x].map((v) => `${Math.max(0, v)}px`);
            button.style.setProperty('--lab-segmented-clip', `inset(${inset.join(' ')} round ${radius / zoom}px)`);
            button.style.setProperty('--lab-segmented-lens-at', `${ox}px ${oy}px`);
            button.style.setProperty('--lab-segmented-zoom', String(zoom));
            const plain = button.firstElementChild;
            if (!plain)
                return;
            const crosses = zoom > 1 && lensAmount > 0.01 && local.x < innerW && local.x + local.w > 0;
            plain.style.maskImage = crosses
                ? `radial-gradient(ellipse ${local.w / 2}px ${local.h / 2}px at ${ox - plain.offsetLeft}px ${oy - plain.offsetTop}px, transparent 94%, #000 100%)`
                : '';
        });
    };
    useLayoutEffect(() => {
        const el = lensRef.current;
        if (!el)
            return;
        // The switch thumb's lens: the selection is that thumb, sliding between options.
        const layer = new GlassLensLayer(el, 'switch');
        lensLayer.current = layer;
        return () => {
            layer.dispose();
            lensLayer.current = null;
        };
    }, []);
    useLayoutEffect(() => {
        const values = [center, width, top, press, stretch, lens];
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
    const pressIn = () => {
        if (live.current.reduced)
            return;
        group.current?.setAttribute('data-pressed', '');
        void press.animateTo(GLASS_PRESS_SCALE, { spring: SPRINGS.snappy });
        void lens.animateTo(1, { spring: SPRINGS.snappy });
    };
    const pressOut = () => {
        group.current?.removeAttribute('data-pressed');
        void press.animateTo(1, { spring: SPRINGS.bouncy });
        void stretch.animateTo(0, { spring: SPRINGS.bouncy });
        void lens.animateTo(0, { spring: SPRINGS.snappy });
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
        if (live.current.disabled || !live.current.draggable || live.current.folded || event.button > 0 || drag.current || !group.current)
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
            pressIn();
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
                pressIn();
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
    const openMenu = () => {
        if (!group.current)
            return;
        setMenuDir(getComputedStyle(group.current).direction === 'rtl' ? 'rtl' : 'ltr');
        setMenuOpen(true);
    };
    const navigate = (event) => {
        const rtl = !!group.current && getComputedStyle(group.current).direction === 'rtl';
        const index = enabled.findIndex((option) => option.value === value);
        // Folded: Up and Down open the menu (a pop-up button); Left, Right, Home and End still step
        // through the options without opening it.
        if (folded && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openMenu();
            return;
        }
        const target = selectionKeyTarget(event.key, index, enabled.length, rtl, folded ? 'tab' : semantics);
        if (target === null)
            return;
        event.preventDefault();
        const next = enabled[target];
        if (folded) {
            refocus.current = true;
            onSelect(next.value, 'key');
            return;
        }
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
    // Folding into a menu: hidden copies of the options give the unfolded and folded widths, and
    // the row (with its other foldable controls) decides when there is no room.
    const { measurements } = useMeasuredActions(group, measuringRow, `${optionKey}|${menu}`);
    // Inside a Dock the parent says how much it can give (like ActionsBar); elsewhere the row decides.
    const room = useActionsWidth();
    useFitRow(group, menu, {
        room,
        widths: () => {
            const scroller = scrollerRef.current;
            const row = measuringRow.current;
            if (!measurements || !scroller || !row)
                return null;
            const list = live.current.options;
            const widths = list.map((option) => measurements.widths.get(option.value) ?? 0);
            if (!widths.length || widths.some((width) => !width))
                return null;
            const style = getComputedStyle(scroller);
            const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
            const index = Math.max(0, list.findIndex((option) => option.value === live.current.value));
            return {
                full: widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1) + inset,
                compact: widths[index] + measurements.overflowWidth + inset,
            };
        },
        fold: (next) => {
            setFolded(next);
            if (!next)
                setMenuOpen(false);
        },
    });
    useEffect(() => {
        if (menu)
            scheduleFitRows();
    }, [menu, measurements, value, room]);
    // While it folds or unfolds, the bubble around it follows its size instead of springing after it.
    const foldedBefore = useRef(folded);
    useLayoutEffect(() => {
        const root = group.current;
        if (!root || foldedBefore.current === folded)
            return;
        foldedBefore.current = folded;
        root.setAttribute(GLASS_FOLLOW_ATTRIBUTE, '');
        const timer = setTimeout(() => root.removeAttribute(GLASS_FOLLOW_ATTRIBUTE), COLLAPSE.duration + 50);
        return () => {
            clearTimeout(timer);
            root.removeAttribute(GLASS_FOLLOW_ATTRIBUTE);
        };
    }, [folded]);
    useLayoutEffect(() => {
        if (menu)
            setMenuContainer(group.current?.closest('dialog') ?? boundary);
    }, [menu, boundary]);
    // The menu opens on the chosen option, like a pop-up button (Radix focuses the first one).
    const menuContent = useRef(null);
    useEffect(() => {
        if (!menuOpen || !folded)
            return;
        const frame = requestAnimationFrame(() => menuContent.current
            ?.querySelector('[role="menuitemradio"][aria-checked="true"]')
            ?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(frame);
    }, [menuOpen, folded]);
    useLayoutEffect(() => {
        if (!refocus.current)
            return;
        refocus.current = false;
        buttons()[selected]?.focus({ preventScroll: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);
    // Stacked, the badge sits on the icon (or after a label with no icon). The selected option of a
    // track that can fold into a menu carries the chevron (shown only while folded).
    const renderContent = (option, chevron) => {
        const badgeOnIcon = stacked && !!option.icon;
        const badge = option.badge ? _jsx("span", { className: "lab-segmented-badge", children: option.badge }) : null;
        return (_jsxs(_Fragment, { children: [option.icon && (_jsxs("span", { className: "lab-segmented-icon", "data-tone": option.tone, "aria-hidden": "true", children: [option.icon, badgeOnIcon && badge] })), _jsx("span", { className: "lab-segmented-label", children: option.label }), !badgeOnIcon && badge, chevron && (_jsx("span", { className: "lab-segmented-chevron", "aria-hidden": "true", children: _jsx(ChevronDown, {}) }))] }));
    };
    return (_jsxs("div", { ref: group, className: cn('lab-segmented', className), "data-equal-width": equalWidth || undefined, "data-layout": layout, "data-overflow-mode": menu ? 'menu' : undefined, "data-menu-folded": folded || undefined, "data-glass-own-press": "", 
        // Folded, the capsule is a pop-up button; the radios live in its menu.
        role: folded ? 'group' : tab ? 'tablist' : 'radiogroup', "aria-label": label, "aria-disabled": disabled || undefined, style: menu
            ? {
                '--lab-segmented-fold-ease': COLLAPSE.easing,
                '--lab-segmented-fold-duration': `${COLLAPSE.duration}ms`,
            }
            : undefined, onKeyDown: navigate, onPointerDown: onPointerDown, onClickCapture: (event) => {
            if (!suppressClick.current)
                return;
            event.preventDefault();
            event.stopPropagation();
        }, "data-lab-corners": true, children: [_jsx("div", { ref: scrollerRef, className: "lab-segmented-scroller", children: _jsxs("div", { ref: trackRef, className: "lab-segmented-track", children: [_jsx("span", { ref: pillRef, className: "lab-segmented-pill", "aria-hidden": "true", "data-hidden": "", children: _jsx("span", { className: "lab-segmented-fill" }) }), options.map((option) => {
                            const isSelected = option.value === value;
                            const content = renderContent(option, menu && isSelected);
                            // Folded: the selected option is the capsule that opens the menu; the rest fold away.
                            const trigger = folded && isSelected;
                            const name = option.badge ? `${option.label}, ${option.badge}` : undefined;
                            return (_jsxs(Button, { id: option.id, variant: "ghost", appearance: "toolbar", controlSize: "regular", className: "lab-segmented-option", role: trigger ? undefined : tab ? 'tab' : 'radio', "aria-checked": tab || trigger ? undefined : isSelected, "aria-selected": tab && !trigger ? isSelected : undefined, "aria-controls": trigger ? undefined : option.controls, "aria-haspopup": trigger ? 'menu' : undefined, "aria-expanded": trigger ? menuOpen : undefined, "aria-label": trigger ? `${label}: ${name ?? option.label}` : name, "data-selected": isSelected || undefined, 
                                // Folding springs max-width from the option's own width, never from a far cap.
                                style: menu && measurements?.widths.get(option.value)
                                    ? { '--lab-segmented-natural': `${measurements.widths.get(option.value)}px` }
                                    : undefined, inert: folded && !isSelected ? true : undefined, tabIndex: folded ? (isSelected ? 0 : -1) : option.value === tabValue ? 0 : -1, disabled: disabled || option.disabled, onClick: () => (trigger ? openMenu() : onSelect(option.value, 'press')), children: [_jsx("span", { className: "lab-segmented-content", children: content }), _jsx("span", { className: "lab-segmented-content lab-segmented-ink", "aria-hidden": "true", children: content })] }, option.value));
                        }), _jsx("span", { ref: lensRef, className: "lab-lens lab-segmented-lens", "aria-hidden": "true", "data-hidden": "" })] }) }), menu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "lab-segmented-measure", "aria-hidden": "true", inert: true, children: _jsxs("div", { ref: measuringRow, className: "lab-segmented-track", children: [options.map((option) => (_jsx(Button, { variant: "ghost", appearance: "toolbar", controlSize: "regular", className: "lab-segmented-option", tabIndex: -1, "data-lab-action-id": option.value, children: _jsx("span", { className: "lab-segmented-content", children: renderContent(option, false) }) }, option.value))), _jsx("span", { className: "lab-segmented-chevron", "data-lab-overflow-measure": "", children: _jsx(ChevronDown, {}) })] }) }), _jsxs(DropdownMenu.Root, { modal: false, open: folded && menuOpen, onOpenChange: setMenuOpen, dir: menuDir, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx("span", { className: "lab-segmented-menu-anchor", "aria-hidden": "true", tabIndex: -1 }) }), _jsx(DropdownMenu.Portal, { container: menuContainer, children: _jsx(MenuSurface, { asChild: true, children: _jsx(DropdownMenu.Content, { className: "lab-actions-menu lab-segmented-menu", "aria-label": label, ...(menuContainer ? { collisionBoundary: menuContainer } : {}), ref: menuContent, onCloseAutoFocus: (event) => {
                                            event.preventDefault();
                                            buttons()[selectedIndex()]?.focus({ preventScroll: true });
                                        }, children: _jsx(DropdownMenu.RadioGroup, { value: value, onValueChange: (next) => onSelect(next, 'press'), children: options.map((option) => (_jsxs(DropdownMenu.RadioItem, { value: option.value, disabled: disabled || option.disabled, className: "lab-actions-menu__item", "data-lab-corners": true, textValue: option.label, children: [_jsx("span", { className: "lab-actions-menu__leading", "aria-hidden": "true", children: _jsx(DropdownMenu.ItemIndicator, { children: _jsx(Check, { size: 18 }) }) }), option.icon && (_jsx("span", { className: "lab-segmented-icon", "data-tone": option.tone, "aria-hidden": "true", children: option.icon })), _jsx("span", { className: "lab-actions-menu__label", children: option.label }), option.badge && _jsx("span", { className: "lab-segmented-badge", children: option.badge })] }, option.value))) }) }) }) })] })] }))] }));
}
//# sourceMappingURL=selection-track.js.map