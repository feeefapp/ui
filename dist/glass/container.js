'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { useReducedMotion } from '../physics/react.js';
import { GlassContext } from './context.js';
import { GlassScene } from './scene.js';
import './glass.css';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. Bubbles that come within `spacing` bend toward each other and
 * merge; a bubble that splits into several grows them out of itself; new and removed bubbles
 * materialize. Bubbles keep their layout, focus and semantics; only the paint moves here. Without
 * JavaScript, or in forced colors, every bubble paints its own glass as before.
 */
export const GlassContainer = React.forwardRef(function GlassContainer({ as = 'div', spacing = 8, light = 'pointer', className, children, ...props }, ref) {
    const host = React.useRef(null);
    const backdrop = React.useRef(null);
    const paint = React.useRef(null);
    const shadow = React.useRef(null);
    const scene = React.useRef(null);
    const pending = React.useRef([]);
    const uid = React.useId();
    const reduced = useReducedMotion();
    const setHost = React.useCallback((element) => {
        host.current = element;
        if (typeof ref === 'function')
            ref(element);
        else if (ref)
            ref.current = element;
    }, [ref]);
    // Bubbles register from their own layout effects, which run before ours: queue until ready.
    const registry = React.useMemo(() => ({
        register(id, element, options) {
            if (scene.current)
                return scene.current.register(id, element, options);
            let unregister = null;
            let cancelled = false;
            pending.current.push(() => {
                if (!cancelled)
                    unregister = scene.current.register(id, element, options);
            });
            return () => {
                cancelled = true;
                unregister?.();
            };
        },
        requestMeasure() {
            scene.current?.requestMeasure();
        },
    }), []);
    useIsomorphicLayoutEffect(() => {
        if (!host.current || !backdrop.current || !paint.current || !shadow.current)
            return;
        const created = new GlassScene(host.current, backdrop.current, paint.current, shadow.current, uid);
        scene.current = created;
        for (const register of pending.current.splice(0))
            register();
        created.measure();
        return () => {
            created.dispose();
            scene.current = null;
            host.current?.removeAttribute('data-glass-ready');
        };
    }, [uid]);
    useIsomorphicLayoutEffect(() => {
        const current = scene.current;
        if (!current)
            return;
        current.spacing = Math.max(0, spacing);
        current.reduceMotion = reduced;
        current.followPointer = light === 'pointer';
        current.requestMeasure();
    });
    React.useEffect(() => {
        if (light !== 'pointer' || reduced)
            return;
        const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
        if (!fine?.matches)
            return;
        let frame = 0;
        let last = null;
        const move = (event) => {
            if (event.pointerType === 'touch')
                return;
            last = { x: event.clientX, y: event.clientY };
            if (!frame)
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    scene.current?.setPointer(last);
                });
        };
        const leave = () => scene.current?.setPointer(null);
        window.addEventListener('pointermove', move, { passive: true });
        document.documentElement.addEventListener('pointerleave', leave);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', move);
            document.documentElement.removeEventListener('pointerleave', leave);
        };
    }, [light, reduced]);
    return React.createElement(as, { ...props, 'ref': setHost, 'className': cn('lab-glass-container', className), 'data-glass-container': '' }, _jsxs("div", { className: "lab-glass-material", "aria-hidden": "true", children: [_jsx("svg", { ref: shadow, className: "lab-glass-shadow" }), _jsx("div", { ref: backdrop, className: "lab-glass-backdrop" }), _jsx("svg", { ref: paint, className: "lab-glass-paint" })] }), _jsx(GlassContext.Provider, { value: registry, children: children }));
});
//# sourceMappingURL=container.js.map