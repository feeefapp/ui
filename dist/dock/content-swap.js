'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../utils.js';
/**
 * Cross-fades interactive dock content when `swapKey` changes: the old content fades out and turns
 * inert (focus moves to the dock first), then the new content fades in. Same-key changes keep focus
 * and child state.
 */
export function DockContentSwap({ swapKey, children, }) {
    const latest = useRef({ key: swapKey, node: children });
    latest.current = { key: swapKey, node: children };
    const [shown, setShown] = useState(latest.current);
    const [phase, setPhase] = useState('idle');
    const snapshot = useRef(shown);
    const root = useRef(null);
    const shownKey = useRef(swapKey);
    if (shown.key === swapKey && phase !== 'out')
        snapshot.current = latest.current;
    useLayoutEffect(() => {
        if (shownKey.current === swapKey) {
            setPhase('idle');
            setShown(latest.current);
            return;
        }
        let enter = 0, settle = 0;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // A focused outgoing action must not leave focus on an inert or detached node.
        const active = document.activeElement;
        const owner = active instanceof Element
            ? active.closest('[data-lab-actions-owner]')?.getAttribute('data-lab-actions-owner')
            : null;
        const ownsMenuFocus = owner &&
            [...(root.current?.querySelectorAll('[data-lab-actions-owner]') ?? [])].some((element) => element.getAttribute('data-lab-actions-owner') === owner);
        if (root.current?.contains(active) || ownsMenuFocus)
            root.current?.closest('[data-lab-dock]')?.focus({ preventScroll: true });
        if (reduced) {
            shownKey.current = swapKey;
            setShown(latest.current);
            setPhase('idle');
            return;
        }
        setShown(snapshot.current);
        setPhase('out');
        enter = window.setTimeout(() => {
            shownKey.current = latest.current.key;
            setShown(latest.current);
            setPhase('in');
            settle = window.setTimeout(() => setPhase('idle'), 160);
        }, 100);
        return () => {
            clearTimeout(enter);
            clearTimeout(settle);
        };
    }, [swapKey]);
    const content = shown.key === swapKey && phase !== 'out' ? children : shown.node;
    return (_jsx("div", { ref: root, className: cn('lab-dock-swap', `lab-dock-swap--${phase}`), inert: phase === 'out' || undefined, children: _jsx("div", { children: content }, shown.key) }));
}
//# sourceMappingURL=content-swap.js.map