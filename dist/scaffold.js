'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { createPortal, flushSync } from 'react-dom';
import { cn } from './utils.js';
import { GlassContext } from './glass/context.js';
import './scaffold.css';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
const ScaffoldContext = React.createContext(null);
const reserveProperties = [
    '--lab-player-reserve',
    '--lab-header-reserve',
    '--lab-rail-reserve',
    '--lab-rail-width',
    '--lab-rail-height',
    '--lab-notice-reserve',
    '--lab-floating-bottom',
    '--lab-floating-top',
    '--lab-floating-left',
    '--lab-floating-right',
    '--lab-viewport-bottom',
    '--lab-viewport-height',
];
/**
 * Page-level host for floating chrome. Mount it once near the root: it creates the viewport-fixed
 * portal that FloatingLayer renders into and writes each region's measured size as CSS custom
 * properties (`--lab-header-reserve`, `--lab-player-reserve`, `--lab-floating-bottom`, …) on
 * `<html>`, its own root and the portal. The portal host has no transform/filter, so every floating
 * region stays viewport-fixed.
 */
export function ScaffoldProvider({ children, className, }) {
    const root = React.useRef(null);
    const regions = React.useRef(new Map());
    const host = React.useRef(null);
    const [portal, setPortal] = React.useState(null);
    const write = React.useCallback(() => {
        if (typeof window === 'undefined' || !host.current)
            return;
        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const visual = window.visualViewport;
        const bottom = visual ? Math.max(0, height - visual.height - visual.offsetTop) : 0;
        const values = Object.fromEntries(reserveProperties.map((name) => [name, 0]));
        values['--lab-viewport-bottom'] = bottom;
        values['--lab-viewport-height'] = visual?.height ?? height;
        regions.current.forEach(({ slot, edge, rect, gap }) => {
            const visible = rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.left < width &&
                rect.top < height;
            if (!visible)
                return;
            const size = Math.max(0, Math.ceil((edge === 'bottom'
                ? height - rect.top
                : edge === 'top'
                    ? rect.bottom
                    : edge === 'left'
                        ? rect.right
                        : width - rect.left) + gap));
            const name = `--lab-${slot}-reserve`;
            values[name] = Math.max(values[name] ?? 0, size);
            if (slot === 'rail') {
                const dimension = edge === 'left' || edge === 'right' ? 'width' : 'height';
                values[`--lab-rail-${dimension}`] = Math.max(values[`--lab-rail-${dimension}`], size);
            }
            // Notices sit above the dock; they do not add their own position back into the stack.
            if (slot !== 'notice') {
                values[`--lab-floating-${edge}`] = Math.max(values[`--lab-floating-${edge}`], size);
            }
        });
        for (const [name, value] of Object.entries(values)) {
            const length = `${value}px`;
            for (const element of [document.documentElement, root.current, host.current]) {
                if (element && element.style.getPropertyValue(name) !== length)
                    element.style.setProperty(name, length);
            }
        }
    }, []);
    const reserve = React.useCallback((id, reservation) => {
        if (reservation)
            regions.current.set(id, reservation);
        else
            regions.current.delete(id);
        write();
    }, [write]);
    useIsomorphicLayoutEffect(() => {
        const previous = new Map(reserveProperties.map((name) => [name, document.documentElement.style.getPropertyValue(name)]));
        const floating = document.createElement('div');
        floating.className = 'lab-floating-root';
        floating.dataset.labFloatingRoot = '';
        host.current = floating;
        document.body.append(floating);
        setPortal(floating);
        write();
        window.addEventListener('resize', write);
        window.visualViewport?.addEventListener('resize', write);
        window.visualViewport?.addEventListener('scroll', write);
        return () => {
            window.removeEventListener('resize', write);
            window.visualViewport?.removeEventListener('resize', write);
            window.visualViewport?.removeEventListener('scroll', write);
            floating.remove();
            host.current = null;
            for (const name of reserveProperties) {
                const original = previous.get(name);
                if (original)
                    document.documentElement.style.setProperty(name, original);
                else
                    document.documentElement.style.removeProperty(name);
            }
        };
    }, [write]);
    const context = React.useMemo(() => ({ portal, reserve }), [portal, reserve]);
    return (_jsx(ScaffoldContext.Provider, { value: context, children: _jsx("div", { ref: root, className: cn('lab-scaffold', className), "data-lab-scaffold": true, children: children }) }));
}
/**
 * Registers an existing fixed surface with the nearest ScaffoldProvider so its size is reserved,
 * without moving it or changing its semantic element. Remeasures on resize, animation and
 * transition end. Does nothing outside a provider.
 */
export function useFloatingReserve(slot, ref, { active = true, edge = 'auto', gap = 12, measureChildren = false, } = {}) {
    const scaffold = React.useContext(ScaffoldContext);
    const id = React.useId();
    const reserve = scaffold?.reserve;
    useIsomorphicLayoutEffect(() => {
        if (!reserve || !active || !ref.current)
            return;
        const region = ref.current;
        let frame = 0;
        const surfaces = () => measureChildren
            ? [...region.children].filter((node) => node instanceof HTMLElement)
            : [region];
        const read = () => {
            frame = 0;
            const visible = surfaces().filter((surface) => getComputedStyle(surface).display !== 'none');
            const surface = visible.find((element) => element.getBoundingClientRect().height > 0);
            if (!surface) {
                reserve(id, null);
                return;
            }
            const resolved = edge !== 'auto'
                ? edge
                : slot === 'rail'
                    ? getComputedStyle(surface).getPropertyValue('--lab-rail-edge').trim() === 'top'
                        ? 'top'
                        : 'left'
                    : slot === 'header'
                        ? 'top'
                        : 'bottom';
            const rect = surface.getBoundingClientRect();
            const style = getComputedStyle(surface);
            // A fixed region's slide-in animation must not shrink the reserved layout space.
            // The media dock normally measures its stationary outer wrapper; other regions
            // may animate the surface itself. Ignore pure visual translation in that case.
            if (style.position === 'fixed' && style.transform !== 'none') {
                const matrix = new DOMMatrixReadOnly(style.transform);
                if (matrix.is2D && matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1) {
                    rect.x -= matrix.e;
                    rect.y -= matrix.f;
                }
            }
            reserve(id, { slot, edge: resolved, rect, gap });
        };
        const schedule = () => {
            if (!frame)
                frame = requestAnimationFrame(read);
        };
        const resize = new ResizeObserver(schedule);
        const observe = () => {
            resize.disconnect();
            surfaces().forEach((surface) => resize.observe(surface));
            read();
        };
        const mutations = new MutationObserver(observe);
        mutations.observe(region, { childList: true });
        observe();
        region.addEventListener('animationend', schedule);
        region.addEventListener('transitionend', schedule);
        window.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('scroll', schedule);
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            mutations.disconnect();
            region.removeEventListener('animationend', schedule);
            region.removeEventListener('transitionend', schedule);
            window.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('scroll', schedule);
            reserve(id, null);
        };
    }, [reserve, id, slot, ref, active, edge, gap, measureChildren, scaffold?.portal]);
}
/**
 * Portals persistent floating surfaces out of the animated page (and its stacking contexts) into
 * the provider's viewport-fixed layer, and reserves their measured size under `slot`. The layer
 * fills the viewport and ignores pointer input; position the child yourself.
 */
export function FloatingLayer({ children, slot, active = true, edge = 'auto', gap = 12, className, }) {
    const scaffold = React.useContext(ScaffoldContext);
    const region = React.useRef(null);
    const [ready, setReady] = React.useState(false);
    useIsomorphicLayoutEffect(() => setReady(true), []);
    // Late-mounted notices must register after their portal ref is attached.
    useFloatingReserve(slot, region, { active: active && ready, edge, gap, measureChildren: true });
    if (!ready)
        return null;
    const target = scaffold?.portal ?? document.body;
    return createPortal(_jsx("div", { ref: region, className: cn('lab-floating-layer', `lab-floating-layer--${slot}`, className), "data-lab-floating-slot": slot, children: children }), target);
}
/**
 * One translucent glass material (blur, light edge, neutral shadow) around a group of related
 * controls. Glass belongs to grouped navigation/actions, not to the editing content. Falls back to
 * an opaque surface without backdrop-filter or with reduced transparency. Inside a GlassContainer
 * the container paints it, so neighbouring bubbles can merge, split and share light.
 */
export const GlassGroup = React.forwardRef(({ as = 'div', className, children, glassId, glassUnion, glassMotion, ...props }, ref) => {
    const glass = React.useContext(GlassContext);
    const autoId = React.useId();
    const id = glassId ?? autoId;
    const element = React.useRef(null);
    const setRef = React.useCallback((node) => {
        element.current = node;
        if (typeof ref === 'function')
            ref(node);
        else if (ref)
            ref.current = node;
    }, [ref]);
    useIsomorphicLayoutEffect(() => {
        if (!glass || !element.current)
            return;
        return glass.register(id, element.current, { union: glassUnion, motion: glassMotion });
    }, [glass, id, glassUnion, glassMotion]);
    // Content changes can resize the bubble without a resize the container would notice in time.
    useIsomorphicLayoutEffect(() => glass?.requestMeasure());
    return React.createElement(as, {
        ...props,
        'ref': setRef,
        'className': cn('lab-glass-group lab-light-edge', className),
        'data-lab-corners': '',
        'data-glass-member': glass ? '' : undefined,
    }, children);
});
GlassGroup.displayName = 'GlassGroup';
let currentTransition = null;
let navigationSerial = 0;
/** Keep the media engine mounted while navigation crossfades only the content surface. */
export function useNavigation() {
    return React.useCallback((update) => {
        const serial = ++navigationSerial;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const doc = document;
        if (reduced || !doc.startViewTransition) {
            update();
            return;
        }
        currentTransition?.skipTransition();
        document.documentElement.dataset.labTransition = '';
        const transition = doc.startViewTransition(() => {
            // A second navigation may arrive while the browser is preparing its snapshot.
            if (serial === navigationSerial)
                flushSync(update);
        });
        currentTransition = transition;
        void transition.ready.catch(() => { });
        void transition.updateCallbackDone?.catch(() => { });
        void transition.finished
            .catch(() => { })
            .finally(() => {
            if (currentTransition !== transition)
                return;
            currentTransition = null;
            delete document.documentElement.dataset.labTransition;
        });
    }, []);
}
/** Its key changes trigger motion; the React subtree is never keyed/remounted by the scaffold. */
export function ViewTransition({ as = 'div', viewKey, className, children, ...props }) {
    const ref = React.useRef(null);
    useIsomorphicLayoutEffect(() => {
        const element = ref.current;
        // The shared content frame keeps draft state while each newly selected view
        // begins at its heading, before the browser captures its transition snapshot.
        if (element) {
            const scrollHost = element.closest('.lab-app');
            if (scrollHost)
                scrollHost.scrollTop = 0;
            else
                element.scrollTop = 0;
        }
        if (!element ||
            currentTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            typeof element.animate !== 'function')
            return;
        const animation = element.animate([
            { opacity: 0, transform: 'translateY(7px)' },
            { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 210, easing: 'cubic-bezier(.2,.8,.2,1)' });
        void animation.finished.catch(() => { });
        return () => animation.cancel();
    }, [viewKey]);
    return React.createElement(as, {
        ...props,
        ref,
        'className': cn('lab-view-transition', className),
        'data-lab-view': viewKey,
    }, children);
}
//# sourceMappingURL=scaffold.js.map