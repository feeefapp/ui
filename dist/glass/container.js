'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { useReducedMotion } from '../physics/react.js';
import { GlassBackdropContext, GlassContext } from './context.js';
import { GlassScene } from './scene.js';
import { clampGlassTint } from './material.js';
import './glass.css';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
/** A value read from `<html>`, live: `read` runs again whenever one of `attributes` changes. */
function useRootValue(attributes, read, fallback) {
    return React.useSyncExternalStore((notify) => {
        const observer = new MutationObserver(notify);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: attributes });
        return () => observer.disconnect();
    }, () => read(document.documentElement), () => fallback);
}
/** The app's glass style (ThemeConfig `glass`, on `<html data-lab-glass>`), live. */
export function useGlassStyle() {
    const value = useRootValue(['data-lab-glass'], (root) => root.getAttribute('data-lab-glass') ?? '', 'liquid');
    return value === 'still' || value === 'solid' ? value : 'liquid';
}
/**
 * The app's glass material options (ThemeConfig `glassTint`, `glassBlur`, `glassRefraction`, on
 * `<html>` as `--lab-glass-tint`, `data-lab-glass-blur` and `data-lab-glass-refraction`), live.
 */
export function useGlassOptions() {
    const blur = useRootValue(['data-lab-glass-blur'], (root) => root.getAttribute('data-lab-glass-blur') ?? '', 'off') === 'on';
    const refraction = useRootValue(['data-lab-glass-refraction'], (root) => root.getAttribute('data-lab-glass-refraction') ?? '', 'on') !== 'off';
    const tint = useRootValue(['style'], 
    // The inline variable (themeAttributes / applyThemeConfig), else the stylesheet's default.
    (root) => root.style.getPropertyValue('--lab-glass-tint') || getComputedStyle(root).getPropertyValue('--lab-glass-tint'), '');
    return { tint: clampGlassTint(Number.parseFloat(tint)), blur, refraction };
}
/**
 * Draws ONE glass material for every bubble inside it (GlassGroup, ToolbarGroup, Dock, …), like
 * Apple's GlassEffectContainer. The app's ThemeConfig `glass` sets the style: `liquid` (moving
 * light, press response), `still` (fixed light, no press) or `solid` (opaque); `glassTint`,
 * `glassBlur` and `glassRefraction` set the material. Bubbles that come within `spacing` bend toward each other and
 * merge; a bubble that splits into several grows them out of itself; new and removed bubbles
 * materialize. Bubbles keep their layout, focus and semantics; only the paint moves here. Without
 * JavaScript, or in forced colors, every bubble paints its own glass as before.
 */
export const GlassContainer = React.forwardRef(function GlassContainer({ as = 'div', spacing = 8, cornerShape = 'round', light = 'pointer', interactive = true, adaptive = true, highlightWidth = 1, highlightProfile = 'rim', highlightStrength = 1, refractionStrength = 1, refractionProfile = 'measured', tint, backdropSource, className, children, ...props }, ref) {
    const inheritedBackdrop = React.useContext(GlassBackdropContext);
    backdropSource ??= inheritedBackdrop;
    const host = React.useRef(null);
    const backdrop = React.useRef(null);
    const paint = React.useRef(null);
    const shadow = React.useRef(null);
    const scene = React.useRef(null);
    const pending = React.useRef([]);
    const uid = React.useId();
    const reduced = useReducedMotion();
    const style = useGlassStyle();
    const options = useGlassOptions();
    const liquid = style === 'liquid';
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
        current.cornerShape = cornerShape;
        current.spacing = Math.max(0, spacing);
        current.reduceMotion = reduced;
        current.followPointer = light === 'pointer' && liquid;
        current.interactive = interactive && liquid;
        current.adaptive = adaptive;
        current.preserveHighlights = true;
        current.tint = tint === undefined ? options.tint : clampGlassTint(tint);
        current.blur = options.blur;
        current.highlightWidth = Number.isFinite(highlightWidth) ? Math.min(100, Math.max(0, highlightWidth)) : 1;
        current.highlightProfile = highlightProfile;
        current.highlightStrength = Number.isFinite(highlightStrength) ? Math.min(10, Math.max(0, highlightStrength)) : 1;
        current.refractionProfile = refractionProfile;
        current.refractionStrength = Number.isFinite(refractionStrength) ? Math.min(10, Math.max(0, refractionStrength)) : 1;
        current.backdropSource = backdropSource;
        current.refraction = options.refraction;
        current.requestMeasure();
    });
    React.useEffect(() => {
        const source = backdropSource ? document.getElementById(backdropSource) : null;
        if (!source || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => scene.current?.requestMeasure());
        observer.observe(source);
        return () => observer.disconnect();
    }, [backdropSource]);
    React.useEffect(() => {
        if (light !== 'pointer' || reduced || !liquid)
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
    }, [light, reduced, liquid]);
    return React.createElement(as, { ...props, 'ref': setHost, 'className': cn('lab-glass-container', className), 'data-glass-container': '', 'data-glass-corners': cornerShape, 'data-glass-local-tint': '', style: { ...props.style, ...(tint === undefined ? {} : { '--lab-glass-tint': clampGlassTint(tint) }) } }, _jsxs("div", { className: "lab-glass-material", "aria-hidden": "true", children: [_jsx("svg", { ref: shadow, className: "lab-glass-shadow" }), _jsx("div", { ref: backdrop, className: "lab-glass-backdrops" }), _jsx("svg", { ref: paint, className: "lab-glass-paint" })] }), _jsx(GlassContext.Provider, { value: registry, children: children }));
});
/**
 * A GlassContainer unless one already encloses it, then a plain element. Kit rows (app bar,
 * toolbar, dock, search) use it so they share one material without ever nesting containers.
 */
export const GlassScope = React.forwardRef(function GlassScope({ as = 'div', spacing, cornerShape, light, interactive, adaptive, tint, highlightWidth, highlightProfile, highlightStrength, refractionStrength, refractionProfile, backdropSource, ...props }, ref) {
    const outer = React.useContext(GlassContext);
    if (outer)
        return React.createElement(as, { ...props, ref });
    return _jsx(GlassContainer, { ...props, as: as, spacing: spacing, cornerShape: cornerShape, light: light, interactive: interactive, adaptive: adaptive, tint: tint, highlightWidth: highlightWidth, highlightProfile: highlightProfile, highlightStrength: highlightStrength, refractionStrength: refractionStrength, refractionProfile: refractionProfile, backdropSource: backdropSource, ref: ref });
});
//# sourceMappingURL=container.js.map