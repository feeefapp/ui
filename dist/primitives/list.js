'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, GripVertical } from 'lucide-react';
import { attachPan } from '../physics/gesture.js';
import { animateLayoutFrom, snapshotLayout } from '../physics/layout-group.js';
import { LabMotionValue } from '../physics/motion-value.js';
import { LAB_SPRINGS, rubberBand, rubberBandClamp } from '../physics/spring.js';
import { reorderLanding, reorderShifts, reorderTarget, swipeIsFull, swipeRelease, } from './list-model.js';
import { cn } from '../utils.js';
import './list.css';
const Reorder = React.createContext({ enabled: false });
/**
 * A group of rows on one rounded card, with an optional header above and footer below: the
 * inset-grouped list of iOS Settings and Mail. Rows are separated by hairlines that start after
 * their leading icon. With `onReorder`, every row gets a grip: drag it (any pointer) or focus it
 * and press the arrow keys.
 */
export function LabListSection({ header, footer, children, className, label, onReorder, }) {
    const id = React.useId();
    const card = React.useRef(null);
    const pending = React.useRef(null);
    const [announcement, setAnnouncement] = React.useState('');
    const live = React.useRef(onReorder);
    live.current = onReorder;
    // After a reorder renders, items start from where they were on screen and spring into place.
    React.useLayoutEffect(() => {
        if (!pending.current)
            return;
        const snapshot = pending.current;
        pending.current = null;
        animateLayoutFrom(snapshot, { spring: LAB_SPRINGS.snappy });
    });
    const items = () => (card.current ? Array.from(card.current.children) : []);
    const commit = (from, to) => {
        pending.current = snapshotLayout(items());
        live.current?.(from, to);
        setAnnouncement(`Moved to position ${to + 1} of ${items().length}.`);
    };
    // Drag by the grip: the row lifts and follows the pointer, the others part around it.
    React.useEffect(() => {
        const el = card.current;
        if (!el || !onReorder)
            return;
        let drag = null;
        let grip = null;
        const paint = (node, value, lifted) => {
            node.style.transform = lifted ? `translate3d(0, ${value}px, 0) scale(1.02)` : `translate3d(0, ${value}px, 0)`;
        };
        const update = () => {
            const d = drag;
            if (!d)
                return;
            const scrolled = (d.scroller?.scrollTop ?? 0) - d.scrollStart;
            const delta = rubberBandClamp(d.dy + scrolled, d.bounds[0], d.bounds[1], 200);
            d.offsets[d.from].set(delta);
            const to = reorderTarget(d.heights, d.from, delta);
            if (to !== d.to) {
                d.to = to;
                reorderShifts(d.heights, d.from, to).forEach((shift, j) => {
                    if (j !== d.from)
                        void d.offsets[j].animateTo(shift, { spring: LAB_SPRINGS.snappy });
                });
            }
        };
        // Near the scroller's edges, scroll toward the pointer, faster the closer it is.
        const autoScroll = () => {
            const d = drag;
            if (!d)
                return;
            d.frame = requestAnimationFrame(autoScroll);
            if (!d.scroller)
                return;
            const box = d.scroller.getBoundingClientRect();
            const zone = 64;
            const speed = d.pointerY < box.top + zone
                ? -((box.top + zone - d.pointerY) / zone) * 14
                : d.pointerY > box.bottom - zone
                    ? ((d.pointerY - (box.bottom - zone)) / zone) * 14
                    : 0;
            if (speed) {
                d.scroller.scrollTop += speed;
                update();
            }
        };
        return attachPan(el, () => ({
            axis: 'y',
            threshold: 2,
            canBegin: ({ target }) => {
                grip = target?.closest('[data-lab-reorder-handle]') ?? null;
                return !!grip;
            },
            onStart: ({ originY }) => {
                const nodes = items();
                const from = nodes.findIndex((n) => !!grip && n.contains(grip));
                if (from < 0)
                    return;
                const heights = nodes.map((n) => n.getBoundingClientRect().height);
                let scroller = el.parentElement;
                while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY))
                    scroller = scroller.parentElement;
                const above = heights.slice(0, from).reduce((a, b) => a + b, 0);
                const below = heights.slice(from + 1).reduce((a, b) => a + b, 0);
                drag = {
                    from,
                    to: from,
                    heights,
                    nodes,
                    offsets: nodes.map((node, j) => {
                        const value = new LabMotionValue(0, 0.25);
                        value.subscribe((v) => paint(node, v, j === from));
                        return value;
                    }),
                    scroller,
                    scrollStart: scroller?.scrollTop ?? 0,
                    dy: 0,
                    bounds: [-above, below],
                    frame: 0,
                    pointerY: originY,
                };
                nodes[from].dataset.lifted = '';
                el.dataset.reordering = '';
                paint(nodes[from], 0, true);
                drag.frame = requestAnimationFrame(autoScroll);
            },
            onMove: ({ dy, originY }) => {
                if (!drag)
                    return;
                drag.dy = dy;
                drag.pointerY = originY + dy;
                update();
            },
            onEnd: () => {
                const d = drag;
                drag = null;
                if (!d)
                    return;
                cancelAnimationFrame(d.frame);
                const finish = () => {
                    delete d.nodes[d.from].dataset.lifted;
                    delete el.dataset.reordering;
                    d.offsets.forEach((o) => o.stop());
                    if (d.to !== d.from)
                        commit(d.from, d.to);
                    d.nodes.forEach((n) => {
                        if (d.to === d.from)
                            n.style.transform = '';
                    });
                };
                const landing = reorderLanding(d.heights, d.from, d.to);
                void d.offsets[d.from].animateTo(landing, { spring: LAB_SPRINGS.release }).then((arrived) => arrived && finish());
            },
        }));
    }, [Boolean(onReorder)]);
    const onKeyDown = (event) => {
        const handle = event.target.closest('[data-lab-reorder-handle]');
        if (!handle || !onReorder || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown'))
            return;
        const all = items();
        const from = all.findIndex((n) => n.contains(handle));
        const to = from + (event.key === 'ArrowUp' ? -1 : 1);
        if (from < 0 || to < 0 || to >= all.length)
            return;
        event.preventDefault();
        commit(from, to);
    };
    return (_jsxs("section", { className: cn('lab-list-section', className), "aria-labelledby": header ? id : undefined, "aria-label": header ? undefined : label, children: [header && (_jsx("h3", { id: id, className: "lab-list-header", children: header })), _jsx(Reorder.Provider, { value: { enabled: !!onReorder }, children: _jsx("div", { ref: card, className: "lab-list-card", role: "list", onKeyDown: onReorder ? onKeyDown : undefined, children: children }) }), footer && _jsx("p", { className: "lab-list-footer", children: footer }), onReorder && (_jsx("span", { className: "lab-sr-only", role: "status", children: announcement }))] }));
}
const ACTION_WIDTH = 76;
/** Only one row shows its actions at a time. */
let closeOpenRow = null;
/**
 * One row of a list: a full-width button (or your link with `asChild`) with leading media, title,
 * subtitle, trailing value and an optional chevron. Swipe actions reveal behind it, and inside a
 * reorderable LabListSection it gets a grip.
 */
export const LabListRow = React.forwardRef(function LabListRow({ title, subtitle, leading, trailing, chevron, selected, asChild, static: isStatic, leadingActions, trailingActions, fullSwipe = true, reorderLabel, className, children, ...props }, ref) {
    const reorder = React.useContext(Reorder);
    const item = React.useRef(null);
    const swipeable = !!(leadingActions?.length || trailingActions?.length);
    const [open, setOpen] = React.useState(null);
    const [full, setFull] = React.useState(null);
    const offset = React.useRef(null);
    if (!offset.current)
        offset.current = new LabMotionValue(0, 0.25);
    const live = React.useRef({ leadingActions, trailingActions, fullSwipe });
    live.current = { leadingActions, trailingActions, fullSwipe };
    const rtl = () => !!item.current && getComputedStyle(item.current).direction === 'rtl';
    const sides = () => ({
        leading: (live.current.leadingActions?.length ?? 0) * ACTION_WIDTH,
        trailing: (live.current.trailingActions?.length ?? 0) * ACTION_WIDTH,
        row: item.current?.clientWidth ?? 360,
        fullLeading: live.current.fullSwipe,
        fullTrailing: live.current.fullSwipe,
    });
    // `offset` is logical (positive shows leading actions); painted mirrored in RTL.
    React.useLayoutEffect(() => {
        if (!swipeable)
            return;
        return offset.current.subscribe((v) => {
            const el = item.current;
            if (!el)
                return;
            el.style.setProperty('--lab-row-swipe', `${Math.abs(v)}px`);
            const row = el.querySelector(':scope > .lab-list-row');
            if (row)
                row.style.transform = v ? `translate3d(${rtl() ? -v : v}px, 0, 0)` : '';
            el.dataset.swiping = v > 0.5 ? 'leading' : v < -0.5 ? 'trailing' : '';
            const isFull = swipeIsFull(v, sides());
            setFull(isFull ? (v > 0 ? 'leading' : 'trailing') : null);
        });
    }, [swipeable]);
    const settle = (target, velocity) => offset.current.animateTo(target, { spring: LAB_SPRINGS.release, velocity });
    const close = React.useCallback(() => {
        setOpen(null);
        void settle(0);
    }, []);
    const run = (action) => {
        close();
        action.onAction();
    };
    React.useEffect(() => {
        const el = item.current;
        if (!el || !swipeable)
            return;
        let start = 0;
        return attachPan(el, () => ({
            axis: 'x',
            threshold: 8,
            canBegin: ({ target }) => !target?.closest('.lab-list-actions, [data-lab-reorder-handle]'),
            onStart: () => {
                if (closeOpenRow && closeOpenRow !== close)
                    closeOpenRow();
                offset.current.stop();
                start = offset.current.get();
            },
            onMove: ({ dx, time }) => {
                const s = sides();
                const raw = start + (rtl() ? -dx : dx);
                const max = s.leading ? s.row : 0, min = s.trailing ? -s.row : 0;
                offset.current.track(raw > max ? max + rubberBand(raw - max, 120) : raw < min ? min + rubberBand(raw - min, 120) : raw, time);
            },
            onEnd: ({ time, cancelled }) => {
                const velocity = offset.current.getVelocity(time);
                const landing = cancelled ? { offset: 0, commit: null } : swipeRelease(offset.current.get(), velocity, sides());
                const L = live.current;
                if (landing.commit) {
                    const action = (landing.commit === 'leading' ? L.leadingActions : L.trailingActions)[0];
                    void settle(landing.offset, velocity).then(() => {
                        action.onAction();
                        // A row that stays (archive, mark read) slides home; a removed one is gone already.
                        if (item.current?.isConnected)
                            void settle(0);
                    });
                    setOpen(null);
                    return;
                }
                setOpen(landing.offset > 0 ? 'leading' : landing.offset < 0 ? 'trailing' : null);
                closeOpenRow = landing.offset ? close : null;
                void settle(landing.offset, velocity);
            },
        }));
    }, [swipeable, close]);
    // Keyboard: arrows on the row reveal a side's actions and focus the first; Escape closes.
    const onKeyDown = (event) => {
        props.onKeyDown?.(event);
        if (!swipeable || event.defaultPrevented)
            return;
        const towardEnd = event.key === (rtl() ? 'ArrowLeft' : 'ArrowRight');
        const towardStart = event.key === (rtl() ? 'ArrowRight' : 'ArrowLeft');
        const side = towardStart && trailingActions?.length ? 'trailing' : towardEnd && leadingActions?.length ? 'leading' : null;
        if (!side)
            return;
        event.preventDefault();
        const width = (side === 'leading' ? leadingActions.length : trailingActions.length) * ACTION_WIDTH;
        setOpen(side);
        closeOpenRow = close;
        // Visible now, so the first action can take focus before the slide has painted.
        if (item.current)
            item.current.dataset.swiping = side;
        void settle(side === 'leading' ? width : -width);
        requestAnimationFrame(() => item.current?.querySelector(`.lab-list-actions[data-side="${side}"] button`)?.focus());
    };
    const body = (_jsxs(_Fragment, { children: [leading && _jsx("span", { className: "lab-list-row-leading", children: leading }), _jsxs("span", { className: "lab-list-row-text", children: [_jsx("span", { className: "lab-list-row-title", children: title }), subtitle && _jsx("span", { className: "lab-list-row-subtitle", children: subtitle })] }), trailing && _jsx("span", { className: "lab-list-row-trailing", children: trailing }), chevron && _jsx(ChevronRight, { className: "lab-list-row-chevron lab-dir-flip", "aria-hidden": "true" })] }));
    const common = {
        'className': cn('lab-list-row', className),
        'data-selected': selected || undefined,
    };
    const actions = (side, list) => list?.length ? (_jsx("div", { className: "lab-list-actions", "data-side": side, "data-full": full === side || undefined, "aria-hidden": open !== side || undefined, children: list.map((action) => (_jsxs("button", { type: "button", className: "lab-list-action", "data-tone": action.tone ?? 'neutral', tabIndex: open === side ? 0 : -1, onClick: () => run(action), onKeyDown: (event) => {
                if (event.key !== 'Escape')
                    return;
                close();
                item.current?.querySelector(':scope > .lab-list-row')?.focus();
            }, children: [action.icon, _jsx("span", { children: action.label })] }, action.label))) })) : null;
    const titleText = typeof title === 'string' ? title : undefined;
    return (_jsxs("div", { ref: item, role: "listitem", className: "lab-list-item", "data-leading": leading ? '' : undefined, "data-swipe": swipeable || undefined, "data-reorder": reorder.enabled || undefined, children: [actions('leading', leadingActions), actions('trailing', trailingActions), isStatic ? (_jsx("div", { ...common, "data-static": "", children: body })) : asChild ? (_jsx(Slot, { ...common, ...props, "aria-current": selected ? 'true' : undefined, onKeyDown: onKeyDown, children: React.isValidElement(children)
                    ? React.cloneElement(children, {}, body)
                    : children })) : (_jsx("button", { ref: ref, type: "button", ...common, ...props, "aria-current": selected ? 'true' : undefined, onKeyDown: onKeyDown, onClickCapture: (event) => {
                    // A tap on an open row closes it instead of opening the row.
                    if (open) {
                        event.preventDefault();
                        event.stopPropagation();
                        close();
                    }
                }, children: body })), reorder.enabled && (_jsx("button", { type: "button", className: "lab-list-grip", "data-lab-reorder-handle": "", "aria-label": reorderLabel ?? (titleText ? `Reorder ${titleText}` : 'Reorder'), "aria-description": "Drag, or use the up and down arrow keys.", children: _jsx(GripVertical, { "aria-hidden": "true" }) }))] }));
});
//# sourceMappingURL=list.js.map