'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../primitives/button.js';
import { ScrollArea } from '../scroll/index.js';
import { ToolbarGroup } from '../toolbar.js';
import { ScaffoldAppBar } from '../workspace/scaffold.js';
import { useI18n } from '../i18n.js';
import { attachPan, canChildPan } from '../physics/gesture.js';
import { MotionValue, prefersReducedMotion } from '../physics/motion-value.js';
import { SPRINGS, mix, progressBetween, projectMomentum } from '../physics/spring.js';
import { diffStack, dragDismissRect, mixRect, slideFrame, zoomFrame } from './stack-model.js';
import { cn } from '../utils.js';
import './navigation-stack.css';
const ROOT_PAGE = { depth: 0, isTop: true, canGoBack: false, back: () => { } };
const PageContext = React.createContext(null);
/** The nearest stack page's position and `back()`. Outside a stack: a root page that cannot go back. */
export function useNavigationStack() {
    return React.useContext(PageContext) ?? ROOT_PAGE;
}
/**
 * Path state for a stack: an array of route values, root page not included. Map it to pages
 * (`path.map((route) => <NavigationPage key=… />)`) and pass `pop` as the stack's `onBack`.
 */
export function useNavigationPath(initial = []) {
    const [path, setPath] = React.useState(initial);
    const push = React.useCallback((route) => setPath((p) => [...p, route]), []);
    const pop = React.useCallback((count = 1) => setPath((p) => p.slice(0, Math.max(0, p.length - count))), []);
    const popToRoot = React.useCallback(() => setPath([]), []);
    const replace = React.useCallback((route) => setPath((p) => [...p.slice(0, -1), route]), []);
    return { path, setPath, push, pop, popToRoot, replace };
}
const keyOf = (element, index) => (element.key == null ? `#${index}` : String(element.key));
const propsOf = (element) => (element?.props ?? {});
const titleOf = (element) => {
    const props = propsOf(element);
    return typeof props.backTitle === 'string' ? props.backTitle : typeof props.title === 'string' ? props.title : undefined;
};
const sameKeys = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);
function nextState(state, keys, styleOf) {
    const change = diffStack(state.keys, keys);
    const serial = (state.transition?.serial ?? 0) + 1;
    if (change.kind === 'none')
        return { ...state, keys, popped: null };
    if (change.kind === 'push')
        return {
            keys,
            leaving: [],
            popped: null,
            transition: {
                serial,
                kind: 'push',
                front: change.enter,
                back: change.exit,
                from: 0,
                to: 1,
                animated: change.exit !== null,
                style: styleOf(change.enter),
            },
        };
    if (change.kind === 'pop') {
        const swiped = state.popped === change.exit;
        return {
            keys,
            leaving: swiped ? [] : [change.exit],
            popped: null,
            transition: {
                serial,
                kind: 'pop',
                front: change.exit,
                back: change.enter,
                from: 1,
                to: 0,
                animated: !swiped && change.enter !== null,
                style: styleOf(change.exit),
            },
        };
    }
    return {
        keys,
        leaving: change.exit ? [change.exit] : [],
        popped: null,
        transition: {
            serial,
            kind: 'replace',
            front: change.enter,
            back: change.exit,
            from: 0,
            to: 1,
            animated: change.exit !== null,
            style: 'fade',
        },
    };
}
/** Text-like targets where a mouse drag means "select", not "dismiss". */
const isTextTarget = (target) => !!target?.closest('p, span, h1, h2, h3, h4, li, td, th, code, pre, label, a, [contenteditable], input, textarea');
function focusPage(host) {
    if (!host)
        return;
    const heading = host.querySelector('[data-lab-page-title]');
    (heading ?? host).focus({ preventScroll: true });
}
/**
 * Push-and-pop page navigation, like iOS: a pushed page slides in over the current one, which
 * moves back with a parallax and dims; going back reverses it. Swiping toward the trailing edge
 * drags the page back with the finger and finishes or cancels from the release velocity. A page
 * pushed with `zoomSource` grows out of that element instead and can be dragged down to shrink
 * back into it. Every page stays mounted, so scroll positions and drafts survive.
 */
export function NavigationStack({ children, onBack, swipeBack = 'content', label = 'Pages', className, style, }) {
    const pages = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child))
            pages.push(child);
    });
    const keys = pages.map(keyOf);
    const latched = React.useRef(new Map());
    pages.forEach((page, i) => latched.current.set(keys[i], page));
    const styleOf = (key) => typeof propsOf(latched.current.get(key)).zoomSource === 'string' ? 'zoom' : 'slide';
    const [state, setState] = React.useState(() => ({
        keys,
        leaving: [],
        transition: null,
        popped: null,
    }));
    let current = state;
    if (!sameKeys(state.keys, keys)) {
        current = nextState(state, keys, styleOf);
        setState(current);
    }
    const root = React.useRef(null);
    const hosts = React.useRef(new Map());
    const shown = React.useRef(null);
    if (!shown.current)
        shown.current = new MotionValue(1, 0.0005);
    const painter = React.useRef(null);
    const activeFront = React.useRef(null);
    const returnFocus = React.useRef(new Map());
    const live = React.useRef({ keys: current.keys, transition: current.transition, onBack, swipeBack });
    live.current = { keys: current.keys, transition: current.transition, onBack, swipeBack };
    React.useLayoutEffect(() => shown.current.subscribe((value) => painter.current?.(value)), []);
    const hostRef = React.useCallback((key) => (element) => {
        if (element)
            hosts.current.set(key, element);
        else
            hosts.current.delete(key);
    }, []);
    const dimOf = (host) => host?.querySelector(':scope > .lab-nav-page-dim') ?? null;
    const resetHosts = () => {
        for (const host of hosts.current.values()) {
            host.style.transform = '';
            host.style.clipPath = '';
            host.style.opacity = '';
            delete host.dataset.moving;
            delete host.dataset.front;
            const dim = dimOf(host);
            if (dim)
                dim.style.opacity = '';
        }
    };
    const restoreSources = (host) => {
        host?.querySelectorAll('[data-lab-zoom-hidden]').forEach((el) => {
            delete el.dataset.labZoomHidden;
            el.style.opacity = '';
        });
    };
    const pageSize = () => ({ width: root.current?.clientWidth ?? 1, height: root.current?.clientHeight ?? 1 });
    /** Screen px per layout px: below 1 when an ancestor is scaled (a scaled demo, a sheet's backdrop). */
    const screenScale = () => {
        const el = root.current;
        return el && el.clientWidth ? el.getBoundingClientRect().width / el.clientWidth || 1 : 1;
    };
    const rtl = () => !!root.current && getComputedStyle(root.current).direction === 'rtl';
    /** The element a zoom page grew from, in stack coordinates, or a centered fallback. */
    const zoomSourceOf = (front, back) => {
        const id = propsOf(latched.current.get(front)).zoomSource;
        const element = typeof id === 'string' ? back?.querySelector(`[data-lab-zoom-source="${CSS.escape(id)}"]`) : null;
        const page = pageSize();
        const origin = root.current.getBoundingClientRect();
        const k = screenScale();
        if (element) {
            const box = element.getBoundingClientRect();
            if (box.width > 0 && box.bottom > origin.top && box.top < origin.bottom)
                return {
                    element,
                    rect: {
                        x: (box.left - origin.left) / k,
                        y: (box.top - origin.top) / k,
                        width: box.width / k,
                        height: box.height / k,
                    },
                    radius: parseFloat(getComputedStyle(element).borderTopLeftRadius) || 12,
                };
        }
        return {
            element: null,
            rect: { x: page.width * 0.3, y: page.height * 0.36, width: page.width * 0.4, height: page.height * 0.28 },
            radius: 24,
        };
    };
    const slidePainter = (front, back) => {
        const width = pageSize().width, mirrored = rtl();
        const dim = dimOf(back);
        return (value) => {
            const frame = slideFrame(value, width, mirrored);
            front.style.transform = `translate3d(${frame.front}px, 0, 0)`;
            if (back)
                back.style.transform = `translate3d(${frame.back}px, 0, 0)`;
            if (dim)
                dim.style.opacity = String(frame.dim);
        };
    };
    const fadePainter = (front) => (value) => {
        front.style.opacity = String(Math.max(0, Math.min(1, value)));
    };
    const zoomPainter = (front, frontKey, back) => {
        const page = pageSize();
        const full = { x: 0, y: 0, ...page };
        const source = zoomSourceOf(frontKey, back);
        if (source.element)
            source.element.dataset.labZoomHidden = '';
        return (value) => {
            const frame = zoomFrame(mixRect(source.rect, full, value), mix(source.radius, 0, value), page);
            const appear = progressBetween(value, 0, 0.22);
            front.style.transform = frame.transform;
            front.style.clipPath = frame.clip;
            front.style.opacity = String(appear);
            if (source.element)
                source.element.style.opacity = String(1 - appear);
        };
    };
    // Run each transition: paint its first frame before the browser paints, then spring.
    React.useLayoutEffect(() => {
        const transition = current.transition;
        if (!transition)
            return;
        const front = hosts.current.get(transition.front) ?? null;
        const back = transition.back ? (hosts.current.get(transition.back) ?? null) : null;
        const value = shown.current;
        const continuing = activeFront.current === transition.front && value.isAnimating();
        if (!continuing)
            value.stop();
        resetHosts();
        painter.current = null;
        if (transition.kind === 'push') {
            returnFocus.current.set(transition.front, document.activeElement);
            focusPage(front);
        }
        else if (transition.kind === 'pop') {
            const target = returnFocus.current.get(transition.front);
            returnFocus.current.delete(transition.front);
            if (target instanceof HTMLElement && target.isConnected && back?.contains(target))
                target.focus({ preventScroll: true });
            else
                focusPage(back);
        }
        else
            focusPage(front);
        const finish = () => {
            painter.current = null;
            activeFront.current = null;
            resetHosts();
            if (transition.kind === 'pop')
                restoreSources(back);
            for (const key of [...latched.current.keys()])
                if (!live.current.keys.includes(key))
                    latched.current.delete(key);
            setState((s) => s.transition?.serial === transition.serial ? { ...s, leaving: [], transition: null } : s);
        };
        if (!front || !transition.animated) {
            value.set(transition.to);
            finish();
            return;
        }
        const reduced = prefersReducedMotion();
        const style = reduced ? 'fade' : transition.style;
        front.dataset.moving = '';
        front.dataset.front = '';
        if (back)
            back.dataset.moving = '';
        const paint = style === 'zoom'
            ? zoomPainter(front, transition.front, back)
            : style === 'slide'
                ? slidePainter(front, back)
                : fadePainter(front);
        if (!continuing)
            value.set(transition.from);
        activeFront.current = transition.front;
        painter.current = paint;
        paint(value.get());
        void value
            .animateTo(transition.to, { spring: reduced ? { duration: 0.2, bounce: 0 } : SPRINGS.smooth })
            .then((arrived) => {
            if (arrived)
                finish();
        });
    }, [current.transition?.serial]);
    // Swipe back (x) and, on zoom pages, drag down to dismiss (y).
    React.useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        let session = null;
        const topKey = () => live.current.keys[live.current.keys.length - 1];
        const ready = () => live.current.keys.length > 1 && !live.current.transition && !session;
        const start = (axis, point) => {
            const key = topKey();
            const front = hosts.current.get(key);
            if (!front)
                return;
            const back = hosts.current.get(live.current.keys[live.current.keys.length - 2]) ?? null;
            const origin = el.getBoundingClientRect();
            const k = screenScale();
            shown.current.stop();
            session = {
                key,
                front,
                back,
                style: prefersReducedMotion() ? 'fade' : styleOf(key),
                axis,
                sign: rtl() ? -1 : 1,
                page: pageSize(),
                anchor: { x: (point.originX - origin.left) / k, y: (point.originY - origin.top) / k },
                motion: new MotionValue(0, 0.0005),
                rect: { x: 0, y: 0, ...pageSize() },
                radius: 0,
                k,
            };
            front.dataset.moving = '';
            front.dataset.front = '';
            if (back)
                back.dataset.moving = '';
            if (session.style === 'zoom') {
                const source = zoomSourceOf(key, back);
                if (source.element)
                    source.element.dataset.labZoomHidden = '';
            }
            else
                painter.current = session.style === 'slide' ? slidePainter(front, back) : fadePainter(front);
        };
        /** Pointer movement in layout px. */
        const local = (point, k) => ({
            ...point,
            dx: point.dx / k,
            dy: point.dy / k,
            vx: point.vx / k,
            vy: point.vy / k,
        });
        const move = (screen) => {
            const s = session;
            if (!s)
                return;
            const point = local(screen, s.k);
            if (s.style === 'zoom') {
                const pull = s.axis === 'y' ? point.dy : Math.max(0, point.dx * s.sign) * 0.7 + Math.max(0, point.dy);
                s.rect = dragDismissRect(s.page, s.anchor, point.dx, point.dy, pull);
                s.radius = mix(0, 28, progressBetween(pull, 0, 140));
                const frame = zoomFrame(s.rect, s.radius, s.page);
                s.front.style.transform = frame.transform;
                s.front.style.clipPath = frame.clip;
                return;
            }
            const travel = Math.max(0, point.dx * s.sign);
            shown.current.track(1 - Math.min(1, travel / s.page.width), point.time);
        };
        const settle = (s) => {
            painter.current = null;
            delete s.front.dataset.moving;
            delete s.front.dataset.front;
            s.front.style.transform = '';
            s.front.style.clipPath = '';
            s.front.style.opacity = '';
            if (s.back) {
                delete s.back.dataset.moving;
                s.back.style.transform = '';
                const dim = dimOf(s.back);
                if (dim)
                    dim.style.opacity = '';
            }
        };
        const popped = (s) => {
            setState((state) => ({ ...state, popped: s.key }));
            live.current.onBack?.();
            // If the host keeps the page, bring it back.
            window.setTimeout(() => {
                if (topKey() !== s.key || live.current.transition)
                    return;
                setState((state) => (state.popped === s.key ? { ...state, popped: null } : state));
                if (s.style === 'zoom') {
                    settle(s);
                    return;
                }
                s.front.dataset.moving = '';
                if (s.back)
                    s.back.dataset.moving = '';
                painter.current = s.style === 'slide' ? slidePainter(s.front, s.back) : fadePainter(s.front);
                void shown.current.animateTo(1, { spring: SPRINGS.release }).then((done) => done && settle(s));
            }, 500);
        };
        const end = (screen) => {
            const s = session;
            session = null;
            if (!s)
                return;
            const point = local(screen, s.k);
            if (s.style !== 'zoom') {
                const travel = point.dx * s.sign, speed = point.vx * s.sign;
                const complete = !point.cancelled && projectMomentum(travel, speed, 0.99) > s.page.width / 2 && speed > -250;
                const velocity = shown.current.getVelocity(point.time);
                void shown.current.animateTo(complete ? 0 : 1, { spring: SPRINGS.release, velocity }).then((done) => {
                    if (!done)
                        return;
                    if (complete)
                        popped(s);
                    else
                        settle(s);
                });
                return;
            }
            const pull = s.axis === 'y' ? point.dy : Math.max(0, point.dx * s.sign) * 0.7 + Math.max(0, point.dy);
            const speed = s.axis === 'y' ? point.vy : Math.max(0, point.vx * s.sign) * 0.7 + Math.max(0, point.vy);
            const dismiss = !point.cancelled && projectMomentum(pull, speed, 0.99) > s.page.height * 0.22;
            const from = s.rect, fromRadius = s.radius;
            const source = zoomSourceOf(s.key, s.back);
            const to = dismiss ? source.rect : { x: 0, y: 0, ...s.page };
            const toRadius = dismiss ? source.radius : 0;
            const dx = to.x - from.x, dy = to.y - from.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const toward = (point.vx * dx + point.vy * dy) / (distance * distance);
            const motion = s.motion;
            motion.set(0);
            const unsubscribe = motion.subscribe((q) => {
                const frame = zoomFrame(mixRect(from, to, q), mix(fromRadius, toRadius, q), s.page);
                s.front.style.transform = frame.transform;
                s.front.style.clipPath = frame.clip;
                if (dismiss) {
                    const fade = progressBetween(q, 0.72, 1);
                    s.front.style.opacity = String(1 - fade);
                    if (source.element)
                        source.element.style.opacity = String(fade);
                }
            });
            void motion
                .animateTo(1, { spring: SPRINGS.release, velocity: Math.max(0, Math.min(8, toward)) })
                .then((done) => {
                unsubscribe();
                if (!done)
                    return;
                if (dismiss)
                    popped(s);
                else
                    settle(s);
            });
        };
        const detachX = attachPan(el, () => ({
            axis: 'x',
            canBegin: ({ x, pointerType }) => {
                const mode = live.current.swipeBack;
                if (mode === 'off' || !ready())
                    return false;
                const box = el.getBoundingClientRect();
                const fromEdge = rtl() ? box.right - x : x - box.left;
                return fromEdge <= 28 || (mode === 'content' && pointerType !== 'mouse');
            },
            shouldStart: ({ direction, target }) => direction === (rtl() ? -1 : 1) && !canChildPan(target, el, 'x', direction),
            onStart: (point) => start('x', point),
            onMove: move,
            onEnd: end,
        }));
        const detachY = attachPan(el, () => ({
            axis: 'y',
            touch: 'claim',
            canBegin: ({ target, pointerType }) => live.current.swipeBack !== 'off' &&
                ready() &&
                styleOf(topKey()) === 'zoom' &&
                !prefersReducedMotion() &&
                (pointerType !== 'mouse' || !isTextTarget(target)),
            shouldStart: ({ direction, target }) => direction === 1 && !canChildPan(target, el, 'y', 1),
            onStart: (point) => start('y', point),
            onMove: move,
            onEnd: end,
        }));
        return () => {
            detachX();
            detachY();
        };
    }, []);
    const top = current.keys[current.keys.length - 1];
    const order = current.transition?.kind === 'replace'
        ? [...current.keys.slice(0, -1), ...current.leaving, top]
        : [...current.keys, ...current.leaving];
    const back = React.useCallback(() => live.current.onBack?.(), []);
    return (_jsx("div", { ref: root, className: cn('lab-nav-stack', className), style: style, role: "region", "aria-label": label, children: [...new Set(order)].map((key) => {
            const element = latched.current.get(key);
            if (!element)
                return null;
            const depth = current.keys.indexOf(key);
            const leaving = depth < 0;
            const isTop = key === top && !leaving;
            const previous = depth > 0 ? latched.current.get(current.keys[depth - 1]) : undefined;
            return (_jsxs("section", { ref: hostRef(key), className: "lab-nav-page-host", "data-state": isTop ? 'top' : leaving ? 'leaving' : 'below', "aria-label": typeof propsOf(element).title === 'string' ? propsOf(element).title : undefined, "aria-hidden": isTop ? undefined : true, inert: !isTop || undefined, tabIndex: -1, children: [_jsx(StackPage, { depth: Math.max(0, depth), isTop: isTop, back: back, previousTitle: titleOf(previous), children: element }), _jsx("div", { className: "lab-nav-page-dim", "aria-hidden": "true" })] }, key));
        }) }));
}
function StackPage({ depth, isTop, back, previousTitle, children, }) {
    const value = React.useMemo(() => ({ depth, isTop, canGoBack: depth > 0, back, previousTitle }), [depth, isTop, back, previousTitle]);
    return _jsx(PageContext.Provider, { value: value, children: children });
}
/**
 * One page of a NavigationStack: its own scroll area with a floating glass bar (back button
 * with the previous title, the page title, trailing actions) and an optional bottom dock. A large
 * title scrolls under the bar and reappears in it, like iOS.
 */
export function NavigationPage({ title, titleDisplay, subtitle, leading, trailing, bottom, hideBar, contentPadding, contentLabel, children, className, }) {
    const page = useNavigationStack();
    const { t } = useI18n();
    const display = titleDisplay ?? (page.depth === 0 ? 'large' : 'inline');
    const viewport = React.useRef(null);
    const bar = React.useRef(null);
    const heading = React.useRef(null);
    const [collapsed, setCollapsed] = React.useState(false);
    React.useLayoutEffect(() => {
        const scroller = viewport.current;
        if (display !== 'large' || !scroller)
            return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            const titleBox = heading.current?.getBoundingClientRect();
            const barBox = bar.current?.getBoundingClientRect();
            if (!titleBox)
                return;
            const line = barBox ? barBox.bottom : scroller.getBoundingClientRect().top;
            setCollapsed(titleBox.bottom <= line + 2);
        };
        const onScroll = () => {
            if (!frame)
                frame = requestAnimationFrame(measure);
        };
        measure();
        scroller.addEventListener('scroll', onScroll, { passive: true });
        // The bar's reserved height arrives after the first layout; fonts and resizes move the title.
        const resize = new ResizeObserver(onScroll);
        resize.observe(scroller);
        // Border box: the content's top padding is the bar's reservation.
        if (scroller.firstElementChild)
            resize.observe(scroller.firstElementChild, { box: 'border-box' });
        if (bar.current)
            resize.observe(bar.current);
        if (heading.current)
            resize.observe(heading.current);
        return () => {
            scroller.removeEventListener('scroll', onScroll);
            resize.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [display]);
    const titleShown = display === 'inline' || collapsed;
    const backLabel = page.previousTitle ? t('lab.nav.backTo', { title: page.previousTitle }) : t('lab.nav.back');
    const header = hideBar ? undefined : (_jsx(ScaffoldAppBar, { className: "lab-nav-bar", leading: page.canGoBack || leading ? (_jsxs(ToolbarGroup, { label: "Navigation", className: "lab-nav-bar-leading", children: [page.canGoBack && (_jsxs(Button, { variant: "text", appearance: "toolbar", className: "lab-nav-back", "aria-label": backLabel, onClick: page.back, children: [_jsx(ChevronLeft, { className: "lab-dir-flip", "aria-hidden": "true" }), _jsx("span", { className: "lab-nav-back-label", children: page.previousTitle ?? t('lab.nav.back') })] })), leading] })) : undefined, trailing: trailing, children: _jsx(ToolbarGroup, { label: "Page title", className: "lab-nav-bar-title", "data-shown": titleShown, "aria-hidden": display === 'large' ? true : undefined, children: display === 'inline' ? (_jsx("h1", { className: "lab-nav-bar-heading", tabIndex: -1, "data-lab-page-title": true, children: title })) : (_jsx("span", { className: "lab-nav-bar-heading", children: title })) }) }));
    return (_jsxs(ScrollArea, { ref: viewport, className: cn('lab-nav-page', className), label: contentLabel ?? title, contentPadding: contentPadding, top: header ? _jsx("div", { ref: bar, className: "lab-nav-bar-host", children: header }) : undefined, bottom: bottom, children: [display === 'large' && (_jsxs("header", { className: "lab-nav-large-title", children: [_jsx("h1", { ref: heading, tabIndex: -1, "data-lab-page-title": true, children: title }), subtitle && _jsx("div", { className: "lab-nav-subtitle", children: subtitle })] })), children] }));
}
//# sourceMappingURL=navigation-stack.js.map