'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils.js';
import { motionOf, onAnimationFrame } from '../physics/motion-value.js';
import { GlassContainer } from '../glass/container.js';
import { useGlassMember } from '../glass/member.js';
import { useFloatingBoundary } from './boundary.js';
import { MENU_MORPH, menuAlign, menuContentCloseFrame, menuContentOpenFrame } from './morph-model.js';
import { physicalMenuSide, sidePanelFallback } from './placement.js';
import './menu.css';
/** Minimum distance between a floating panel and the edges of its bounds, in px. */
export const MENU_COLLISION_PADDING = 12;
/** The bubble: the menu's one glass shape, born out of `origin` once `ready`, leaving when `leaving`. */
const MenuBubble = React.forwardRef(function MenuBubble({ origin, ready, children }, ref) {
    const element = React.useRef(null);
    const glass = useGlassMember(element, undefined, { origin, enabled: ready });
    return (_jsx("div", { ref: (node) => {
            element.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        }, className: "lab-menu__bubble", "data-glass-member": glass ? '' : undefined, children: children }));
});
/**
 * The kit's menu: one glass shape, painted by a GlassContainer in the thick menu material (the
 * container's hairline, pointer-following rim light and lens included), born out of the button
 * that opened it (`GLASS_ORIGIN_SPRINGS`: a glass button gives its own glass, a plain one a droplet
 * at its centre) with the rows sharpening inside it, and merging back into the button when it
 * closes. It covers its trigger, lines up with the trigger's edge in toolbars and centres on it
 * elsewhere, and stays inside the nearest `FloatingBoundary` (else the window). With `asChild` it
 * decorates a Radix content part: Radix keeps focus, keyboard and dismissal; the surface supplies
 * placement defaults (`sideOffset`, `align`, `collisionBoundary`, `collisionPadding`) that the
 * content's own props override. Reduced motion shows the glass in place and crossfades the rows;
 * reduced transparency, more contrast and `glass: 'solid'` paint it opaque.
 */
export const MenuSurface = React.forwardRef(({ asChild = false, cover = true, side = 'bottom', gap = 4, className, children, ...props }, ref) => {
    const boundary = useFloatingBoundary();
    const node = React.useRef(null);
    const bubble = React.useRef(null);
    const body = React.useRef(null);
    const placed = React.useRef(false);
    // Radix Select first renders its content into a detached fragment: the menu runs on whichever
    // element is current.
    const [element, setElement] = React.useState(null);
    const [origin, setOrigin] = React.useState(null);
    const [ready, setReady] = React.useState(!asChild);
    const [placement, setPlacement] = React.useState(null);
    const setNode = React.useCallback((element) => {
        node.current = element;
        setElement(element);
        if (typeof ref === 'function')
            ref(element);
        else if (ref)
            ref.current = element;
    }, [ref]);
    React.useLayoutEffect(() => {
        if (!asChild || !node.current)
            return;
        const trigger = findTrigger(node.current);
        setOrigin(trigger);
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
    }, [asChild, boundary, cover, side, gap, element]);
    React.useLayoutEffect(() => {
        placed.current = !!placement;
    }, [placement]);
    React.useLayoutEffect(() => {
        if (!asChild || !element?.isConnected || !bubble.current || !body.current)
            return;
        return runMenu(element, bubble.current, body.current, cover, () => placed.current, () => setReady(true));
    }, [asChild, cover, element]);
    const content = (inner) => (_jsx(GlassContainer, { className: "lab-menu__glass", material: "menu", interactive: false, adaptive: false, children: _jsx(MenuBubble, { ref: bubble, origin: origin, ready: ready, children: _jsx("div", { className: "lab-menu__body", ref: body, children: inner }) }) }));
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
/**
 * Plays one menu around its glass: waits for Radix to place it, then lets its glass be born out of
 * the trigger (`start`), sharpens the rows, hides the covered trigger, and when Radix marks it
 * closed (`data-state="closed"`, or the kit's `data-closing` for Select) fades the rows, sends the
 * glass back into the trigger (`data-glass-hidden`) and shows the trigger again. Returns the cleanup.
 */
function runMenu(content, bubble, body, cover, placed, start) {
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
    let shown = { opacity: 0, blur: 0, settled: false };
    let closingFrom = shown;
    const paint = (frame) => {
        shown = frame;
        body.style.opacity = frame.opacity >= 1 ? '' : String(frame.opacity);
        body.style.filter = frame.blur > 0.05 ? `blur(${frame.blur.toFixed(2)}px)` : '';
    };
    // Invisible (but focusable) until Radix has placed it.
    paint(shown);
    const isClosing = () => content.getAttribute('data-state') === 'closed' || content.hasAttribute('data-closing');
    /** The glass leaves: it flies back into the trigger (GlassMemberOptions `origin`). */
    const leave = () => bubble.setAttribute('data-glass-hidden', '');
    let stop = null;
    const tick = (now) => {
        if (!content.isConnected)
            return finish();
        if (phase === 'pending') {
            const wrapper = content.parentElement;
            const positioned = !wrapper?.style.transform.includes('-200%');
            waited++;
            if (waited < 30 && (!positioned || !placed()))
                return;
            trigger = trigger ?? findTrigger(content);
            content.setAttribute('data-lab-menu-phase', 'opening');
            phase = 'opening';
            started = now;
            start();
        }
        const elapsed = (now - started) / 1000;
        if (phase === 'opening') {
            if (isClosing())
                return beginClose(now);
            const frame = menuContentOpenFrame(elapsed, motion);
            if (elapsed >= (reduced ? 0 : MENU_MORPH.hideTrigger))
                hideTrigger(true);
            paint(frame);
            if (frame.settled) {
                phase = 'open';
                content.setAttribute('data-lab-menu-phase', 'open');
                stopLoop();
            }
            return;
        }
        if (phase === 'closing') {
            const frame = menuContentCloseFrame(elapsed, closingFrom, motion);
            paint(frame);
            // Reduced motion: the glass stays until the rows are gone, then leaves at once.
            if (reduced && frame.settled)
                leave();
            if (reduced || elapsed >= MENU_MORPH.revealTrigger)
                hideTrigger(false);
            if (frame.settled && (reduced || elapsed >= MENU_MORPH.revealTrigger)) {
                phase = 'closed';
                stopLoop();
            }
        }
    };
    const beginClose = (now) => {
        if (phase === 'closing' || phase === 'closed')
            return;
        if (phase === 'pending') {
            hideTrigger(false);
            phase = 'closed';
            return;
        }
        closingFrom = shown;
        phase = 'closing';
        content.setAttribute('data-lab-menu-phase', 'closing');
        if (!reduced)
            leave();
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