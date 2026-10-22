'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FoAnimatedLogo } from '../brand/logo.js';
import { useScaffold } from './scaffold.js';
import './moving-brand.css';
/** One persistent visual follows the real, accessible logo links as navigation changes. */
export function MovingBrand({ host, }) {
    const state = useScaffold();
    const visual = useRef(null);
    const [portal, setPortal] = useState(null);
    const position = useRef(null);
    useEffect(() => {
        const root = host.current;
        const layer = visual.current;
        if (!root || !layer)
            return;
        let frame = 0;
        let last = 0;
        let followUntil = 0;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const target = () => {
            const inSidebar = state.drawerOpen || (!state.compact && state.sideMode === 'expanded');
            return root.querySelector(`[data-tool-brand-anchor="${inSidebar ? 'side' : 'header'}"]`);
        };
        const tick = (time) => {
            frame = 0;
            const anchor = target();
            if (!anchor)
                return;
            const modal = anchor.closest('dialog');
            if (modal !== portal) {
                setPortal(modal);
                return;
            }
            const rect = anchor.getBoundingClientRect();
            if (!rect.width || !rect.height)
                return;
            const drawerTransform = modal ? new DOMMatrix(getComputedStyle(modal).transform) : null;
            const goal = {
                x: rect.left + (rect.width - 104) / 2 - (drawerTransform?.m41 ?? 0),
                y: rect.top + (rect.height - 26) / 2 - (drawerTransform?.m42 ?? 0),
            };
            const current = position.current ?? goal;
            const dt = Math.min(40, Math.max(1, time - (last || time - 16)));
            last = time;
            const blend = reduced.matches ? 1 : 1 - Math.exp(-dt / 55);
            const next = {
                x: current.x + (goal.x - current.x) * blend,
                y: current.y + (goal.y - current.y) * blend,
            };
            position.current = next;
            // Native dialogs form a top layer; keep the moving visual in that same layer.
            const transformed = portal && getComputedStyle(portal).transform !== 'none';
            const bounds = transformed ? portal.getBoundingClientRect() : null;
            const origin = bounds && portal
                ? { left: bounds.left + portal.clientLeft, top: bounds.top + portal.clientTop }
                : { left: 0, top: 0 };
            layer.style.transform = `translate3d(${next.x - origin.left}px, ${next.y - origin.top}px, 0)`;
            layer.style.visibility = 'visible';
            root.dataset.movingBrand = 'ready';
            if (time < followUntil || Math.abs(next.x - goal.x) + Math.abs(next.y - goal.y) > 0.1)
                frame = requestAnimationFrame(tick);
        };
        const wake = () => {
            followUntil = performance.now() + (reduced.matches ? 0 : 450);
            if (!frame)
                frame = requestAnimationFrame(tick);
        };
        const observer = new ResizeObserver(wake);
        observer.observe(root);
        const header = root.querySelector('.lab-tool-app-bar');
        if (header)
            observer.observe(header);
        window.addEventListener('resize', wake);
        reduced.addEventListener('change', wake);
        wake();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', wake);
            reduced.removeEventListener('change', wake);
        };
    }, [host, state.compact, state.sideMode, state.drawerOpen, portal]);
    useEffect(() => () => {
        if (host.current)
            delete host.current.dataset.movingBrand;
    }, [host]);
    const logo = (_jsx("div", { ref: visual, className: "lab-tool-moving-brand", "aria-hidden": "true", children: _jsx(FoAnimatedLogo, { width: 104, height: 26 }) }));
    return portal ? createPortal(logo, portal) : logo;
}
//# sourceMappingURL=moving-brand.js.map