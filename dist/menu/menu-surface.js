'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { cornerFit } from '../brand/corner-fit.js';
import { motionOf, onAnimationFrame } from '../physics/motion-value.js';
import { useFloatingBoundary } from './boundary.js';
import { MENU_MORPH, menuAlign, menuBubblePath, menuCloseFrame, menuFadeFrame, menuOpenFrame, menuRestFrame, } from './morph-model.js';
import { physicalMenuSide, sidePanelFallback } from './placement.js';
import './menu.css';
/** Minimum distance between a floating panel and the edges of its bounds, in px. */
export const MENU_COLLISION_PADDING = 12;
/**
 * The kit's menu: one Liquid Glass bubble that grows out of the button that opened it (the button
 * pinches, the bubble springs to the menu's size on `SPRINGS.menu`, the rows sharpen inside it) and
 * flies back into it when it closes. It covers its trigger, lines up with the trigger's edge in
 * toolbars and centres on it elsewhere, and stays inside the nearest `FloatingBoundary` (else the
 * window). With `asChild` it decorates a Radix content part: Radix keeps focus, keyboard and
 * dismissal; the surface supplies placement defaults (`sideOffset`, `align`, `collisionBoundary`,
 * `collisionPadding`) that the content's own props override. Reduced motion crossfades instead;
 * reduced transparency and more contrast paint it solid.
 */
export const MenuSurface = React.forwardRef(({ asChild = false, cover = true, side = 'bottom', gap = 4, className, children, ...props }, ref) => {
    const boundary = useFloatingBoundary();
    const node = React.useRef(null);
    const layers = React.useRef({ shadow: null, bubble: null, body: null, edge: null });
    const placed = React.useRef(false);
    const [placement, setPlacement] = React.useState(null);
    const setNode = React.useCallback((element) => {
        node.current = element;
        if (typeof ref === 'function')
            ref(element);
        else if (ref)
            ref.current = element;
    }, [ref]);
    React.useLayoutEffect(() => {
        if (!asChild || !node.current)
            return;
        const trigger = findTrigger(node.current);
        const bounds = (boundary ?? trigger?.closest('[data-lab-boundary]') ?? null);
        const rtl = getComputedStyle(node.current).direction === 'rtl';
        const area = bounds?.getBoundingClientRect() ?? {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
        };
        let align = cover ? 'center' : 'start';
        // Radix forces a submenu (opened from a menu row) toward the inline end.
        const physical = physicalMenuSide(isSubmenuTrigger(trigger) ? 'end' : side, rtl);
        let offset = cover && trigger ? -trigger.offsetHeight : gap;
        let alignOffset = 0;
        if (trigger) {
            const rect = trigger.getBoundingClientRect();
            if (cover) {
                align = menuAlign(isToolbarTrigger(trigger), rect.left + rect.width / 2, area.left, area.right, rtl);
            }
            else if (physical === 'left' || physical === 'right') {
                const pad = MENU_COLLISION_PADDING;
                const fallback = sidePanelFallback({
                    trigger: rect,
                    bounds: {
                        left: area.left + pad,
                        top: area.top + pad,
                        right: area.right - pad,
                        bottom: area.bottom - pad,
                    },
                    // Its natural width before Radix sizes it (at least the menu's minimum).
                    width: Math.min(node.current.offsetWidth, area.right - area.left - 2 * pad),
                    gap,
                    side: physical,
                    rtl,
                });
                if (fallback) {
                    offset = fallback.sideOffset;
                    alignOffset = fallback.alignOffset;
                }
            }
        }
        setPlacement({ offset, alignOffset, align, side: physical, boundary: bounds });
    }, [asChild, boundary, cover, side, gap]);
    React.useLayoutEffect(() => {
        placed.current = !!placement;
    }, [placement]);
    React.useLayoutEffect(() => {
        const element = node.current;
        if (!asChild || !element)
            return;
        return runMorph(element, layers.current, cover, () => placed.current);
    }, [asChild, cover]);
    const content = (inner) => (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-menu__shadow", "aria-hidden": "true", ref: (el) => void (layers.current.shadow = el) }), _jsx("div", { className: "lab-menu__bubble", ref: (el) => void (layers.current.bubble = el), children: _jsx("div", { className: "lab-menu__body", ref: (el) => void (layers.current.body = el), children: inner }) }), _jsx("span", { className: "lab-menu__edge", "aria-hidden": "true", ref: (el) => void (layers.current.edge = el) })] }));
    if (!asChild)
        return (_jsx("div", { ...props, ref: setNode, className: cn('lab-menu', className), "data-lab-menu-phase": "open", children: content(children) }));
    const child = React.Children.only(children);
    const radix = {
        sideOffset: placement?.offset ?? 0,
        align: placement?.align ?? (cover ? 'center' : 'start'),
        ...(cover ? {} : { side: placement?.side ?? physicalMenuSide(side, false), alignOffset: placement?.alignOffset ?? 0 }),
        collisionPadding: MENU_COLLISION_PADDING,
        collisionBoundary: placement?.boundary ?? undefined,
    };
    return (_jsx(Slot, { ...radix, ...props, ref: setNode, className: cn('lab-menu', className), "data-lab-menu-phase": "pending", children: React.cloneElement(child, undefined, content(child.props.children)) }));
});
MenuSurface.displayName = 'MenuSurface';
/** The element that opened `content`: Radix marks it with `aria-controls` while open. */
function findTrigger(content) {
    if (!content.id)
        return null;
    return content.ownerDocument.querySelector(`[aria-controls="${CSS.escape(content.id)}"]`);
}
/** A Radix submenu trigger: a menu row that opens a menu. */
function isSubmenuTrigger(trigger) {
    return trigger?.getAttribute('role') === 'menuitem' && trigger.hasAttribute('aria-haspopup');
}
function isToolbarTrigger(trigger) {
    return !!trigger.closest('[role="toolbar"], .lab-toolbar-group, .lab-glass-group, .lab-actions-bar, .lab-dock, .lab-scaffold-app-bar');
}
function radiusOf(element, box) {
    const css = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
    return Math.min(css / cornerFit(), Math.min(box.width, box.height) / 2);
}
/**
 * Drives one menu's morph on its own frame loop: waits for Radix to place it, grows it out of its
 * trigger, rests, and flies back when Radix marks it closed (`data-state="closed"`, or the kit's
 * `data-closing` for Select). Measures every frame, so a scrolling trigger is followed. Returns
 * the cleanup.
 */
function runMorph(content, layers, cover, placed) {
    const { shadow, bubble, body, edge } = layers;
    if (!shadow || !bubble || !body || !edge)
        return;
    const motion = motionOf();
    const reduced = motion !== 'full';
    let trigger = findTrigger(content);
    const savedOpacity = trigger?.style.opacity ?? '';
    const savedTransition = trigger?.style.transition ?? '';
    let hidden = false;
    const hideTrigger = (hide) => {
        if (!trigger || !cover || hide === hidden)
            return;
        hidden = hide;
        trigger.style.transition = hide ? 'opacity 60ms linear' : 'opacity 120ms ease-out';
        trigger.style.opacity = hide ? '0' : savedOpacity;
    };
    let phase = 'pending';
    let started = 0;
    let waited = 0;
    let shown = null;
    let closingFrom = null;
    let triggerRadius = 0;
    let menuRadius = 0;
    const paint = (frame) => {
        shown = frame;
        const fit = cornerFit();
        const atRest = frame.settled && phase === 'open';
        bubble.style.clipPath = atRest ? '' : `path('${menuBubblePath(frame.box, frame.radius)}')`;
        for (const layer of [shadow, edge]) {
            const s = layer.style;
            if (atRest) {
                s.inset = '';
                s.width = '';
                s.height = '';
                s.borderRadius = '';
            }
            else {
                s.inset = `${frame.box.y}px auto auto ${frame.box.x}px`;
                s.width = `${frame.box.width}px`;
                s.height = `${frame.box.height}px`;
                s.borderRadius = `${frame.radius * fit}px`;
            }
            s.opacity = frame.materialOpacity >= 1 ? '' : String(frame.materialOpacity);
        }
        bubble.style.opacity = frame.materialOpacity >= 1 ? '' : String(frame.materialOpacity);
        body.style.opacity = frame.contentOpacity >= 1 ? '' : String(frame.contentOpacity);
        body.style.filter = frame.contentBlur > 0.05 ? `blur(${frame.contentBlur.toFixed(2)}px)` : '';
    };
    // Invisible (but focusable) until Radix has placed it.
    for (const layer of [shadow, bubble, edge, body])
        layer.style.opacity = '0';
    // Geometry is read once and again only after a scroll or resize: reading it every frame right
    // after the layers' style writes would force a synchronous layout per frame.
    let measured = null;
    const invalidate = () => {
        measured = null;
    };
    const measure = () => (measured ??= read());
    const read = () => {
        const rect = content.getBoundingClientRect();
        const scale = content.offsetWidth ? rect.width / content.offsetWidth : 1;
        const full = { x: 0, y: 0, width: content.offsetWidth, height: content.offsetHeight };
        const t = trigger?.isConnected ? trigger.getBoundingClientRect() : null;
        const from = t
            ? {
                x: (t.left - rect.left) / scale,
                y: (t.top - rect.top) / scale,
                width: t.width / scale,
                height: t.height / scale,
            }
            : null;
        return { full, from };
    };
    const isClosing = () => content.getAttribute('data-state') === 'closed' || content.hasAttribute('data-closing');
    let stop = null;
    const tick = (now) => {
        if (!content.isConnected)
            return finish();
        if (phase === 'pending') {
            const wrapper = content.parentElement;
            const positioned = !wrapper?.style.transform.includes('-200%');
            // Radix is still placing it: read fresh every frame until the morph starts.
            const { full, from } = (measured = read());
            const covering = !cover ||
                !from ||
                (from.y < full.height - 1 && from.y + from.height > 1);
            waited++;
            if (waited < 30 && (!positioned || !placed() || (!covering && waited < 10)))
                return;
            trigger = trigger ?? findTrigger(content);
            triggerRadius = trigger && from ? radiusOf(trigger, from) : 0;
            menuRadius = radiusOf(bubble, full);
            content.setAttribute('data-lab-menu-phase', 'opening');
            phase = 'opening';
            started = now;
        }
        const elapsed = (now - started) / 1000;
        const { full, from } = measure();
        if (phase === 'opening') {
            if (isClosing())
                return beginClose(now);
            const frame = reduced || !from
                ? menuFadeFrame(elapsed, true, full, menuRadius, motion)
                : menuOpenFrame(elapsed, from, triggerRadius, full, menuRadius);
            if (elapsed >= (reduced || !from ? 0 : MENU_MORPH.hideTrigger))
                hideTrigger(true);
            if (frame.settled) {
                phase = 'open';
                content.setAttribute('data-lab-menu-phase', 'open');
                paint(menuRestFrame(full, menuRadius));
                stopLoop();
                return;
            }
            paint(frame);
            return;
        }
        if (phase === 'closing') {
            const target = from ?? full;
            const frame = reduced || !from || !closingFrom
                ? menuFadeFrame(elapsed, false, shown?.box ?? full, shown?.radius ?? menuRadius, motion)
                : menuCloseFrame(elapsed, closingFrom, target, triggerRadius);
            if (reduced || !from || elapsed >= MENU_MORPH.revealTrigger)
                hideTrigger(false);
            paint(frame);
            if (frame.settled) {
                phase = 'closed';
                stopLoop();
            }
        }
    };
    const beginClose = (now) => {
        if (phase === 'closing' || phase === 'closed')
            return;
        const { full } = measure();
        closingFrom = shown ?? menuRestFrame(full, menuRadius);
        if (phase === 'pending') {
            hideTrigger(false);
            phase = 'closed';
            return;
        }
        phase = 'closing';
        content.setAttribute('data-lab-menu-phase', 'closing');
        started = now;
        startLoop();
    };
    const startLoop = () => {
        if (!stop)
            stop = onAnimationFrame(tick);
    };
    const stopLoop = () => {
        stop?.();
        stop = null;
    };
    // The menu opens over its own trigger, so the release of the press that opened it lands on a
    // row; Radix would run that row (press-drag-release). Only a release after a press inside the
    // menu, or after the pointer travelled to another row, selects.
    let pressedInside = false;
    let travel = 0;
    let last = null;
    const onDown = () => {
        pressedInside = true;
    };
    const onMove = (event) => {
        if (last)
            travel += Math.hypot(event.clientX - last.x, event.clientY - last.y);
        last = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event) => {
        if (!pressedInside && travel < 8)
            event.stopPropagation();
        pressedInside = false;
    };
    const doc = content.ownerDocument;
    const view = doc.defaultView;
    view?.addEventListener('scroll', invalidate, { capture: true, passive: true });
    view?.addEventListener('resize', invalidate);
    content.addEventListener('pointerdown', onDown, true);
    content.addEventListener('pointerup', onUp, true);
    doc.addEventListener('pointermove', onMove, true);
    const observer = new MutationObserver(() => {
        if (isClosing())
            beginClose(performance.now());
    });
    observer.observe(content, { attributes: true, attributeFilter: ['data-state', 'data-closing'] });
    const finish = () => {
        stopLoop();
        observer.disconnect();
        view?.removeEventListener('scroll', invalidate, { capture: true });
        view?.removeEventListener('resize', invalidate);
        content.removeEventListener('pointerdown', onDown, true);
        content.removeEventListener('pointerup', onUp, true);
        doc.removeEventListener('pointermove', onMove, true);
        if (trigger) {
            trigger.style.opacity = savedOpacity;
            trigger.style.transition = savedTransition;
        }
    };
    startLoop();
    return finish;
}
//# sourceMappingURL=menu-surface.js.map