'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../primitives/button.js';
import { ToolbarGroup } from '../toolbar.js';
import { attachPan } from '../physics/gesture.js';
import { MotionValue, prefersReducedMotion } from '../physics/motion-value.js';
import { SPRINGS } from '../physics/spring.js';
import { centeredIndex, flickTarget, slideEffect, slideProgress } from './carousel-model.js';
import { cn } from '../utils.js';
import './carousel.css';
import { GlassScope } from '../glass/container.js';
/**
 * A horizontal carousel on native scroll snapping, so touch and trackpads get the platform's own
 * momentum. Slides react to their distance from the center (scale, fade or parallax, plus a
 * `--lab-carousel-progress` property for custom effects). A mouse can drag and flick it; the
 * flick lands on the slide its momentum projects to.
 */
export function Carousel({ children, label, slideWidth = 0.82, gap = 12, align = 'center', effect = 'scale', index: controlled, onIndexChange, dots = true, controls = 'auto', className, }) {
    const slides = React.Children.toArray(children).filter(React.isValidElement);
    const track = React.useRef(null);
    const [current, setCurrent] = React.useState(controlled ?? 0);
    const live = React.useRef({ current, onIndexChange, effect, align });
    live.current = { current, onIndexChange, effect, align };
    const slideEls = () => (track.current ? Array.from(track.current.children) : []);
    /** Scroll delta (physical px) that brings slide `i` to rest. */
    const deltaTo = (i) => {
        const el = track.current, slide = slideEls()[i];
        if (!el || !slide)
            return 0;
        const t = el.getBoundingClientRect(), s = slide.getBoundingClientRect();
        const rtl = getComputedStyle(el).direction === 'rtl';
        if (live.current.align === 'start')
            return rtl ? s.right - t.right : s.left - t.left;
        return s.left + s.width / 2 - (t.left + t.width / 2);
    };
    const go = React.useCallback((i, smooth = true) => {
        const el = track.current;
        if (!el)
            return;
        const target = Math.max(0, Math.min(slideEls().length - 1, i));
        el.scrollBy({ left: deltaTo(target), behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    }, []);
    // Scroll transitions and the current index, once per frame while the track moves.
    React.useLayoutEffect(() => {
        const el = track.current;
        if (!el)
            return;
        let frame = 0;
        const paint = () => {
            frame = 0;
            const box = el.getBoundingClientRect();
            const all = slideEls();
            if (!all.length)
                return;
            const first = all[0].getBoundingClientRect();
            const step = first.width + gap;
            const rtl = getComputedStyle(el).direction === 'rtl';
            const anchor = live.current.align === 'start' ? (rtl ? box.right - first.width / 2 : box.left + first.width / 2) : box.left + box.width / 2;
            const progress = all.map((slide) => {
                const r = slide.getBoundingClientRect();
                const p = slideProgress(r.left + r.width / 2, anchor, step);
                const inner = slide.firstElementChild;
                slide.style.setProperty('--lab-carousel-progress', p.toFixed(3));
                if (inner && !prefersReducedMotion()) {
                    const fx = slideEffect(live.current.effect, p);
                    inner.style.transform = fx.transform;
                    inner.style.opacity = fx.opacity === 1 ? '' : String(fx.opacity);
                }
                return p;
            });
            const next = centeredIndex(progress);
            if (next !== live.current.current) {
                setCurrent(next);
                live.current.onIndexChange?.(next);
            }
        };
        const schedule = () => {
            if (!frame)
                frame = requestAnimationFrame(paint);
        };
        paint();
        el.addEventListener('scroll', schedule, { passive: true });
        const observer = new ResizeObserver(schedule);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', schedule);
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [slides.length, gap]);
    React.useEffect(() => {
        if (controlled !== undefined && controlled !== live.current.current)
            go(controlled);
    }, [controlled, go]);
    // A mouse drags the track 1:1 and flicks it; snapping waits until the flick lands.
    React.useEffect(() => {
        const el = track.current;
        if (!el)
            return;
        const scroll = new MotionValue(0, 0.5);
        scroll.subscribe((v) => (el.scrollLeft = v));
        let start = 0;
        return attachPan(el, () => ({
            axis: 'x',
            pointers: ['mouse'],
            threshold: 4,
            onStart: () => {
                scroll.stop();
                el.dataset.dragging = '';
                start = el.scrollLeft;
                scroll.set(start);
            },
            onMove: ({ dx, time }) => scroll.track(start - dx, time),
            onEnd: ({ time }) => {
                const velocity = scroll.getVelocity(time);
                const now = el.scrollLeft;
                const offsets = slideEls().map((_, i) => now + deltaTo(i));
                const target = flickTarget(now, velocity, offsets, live.current.current);
                void scroll.animateTo(offsets[target], { spring: SPRINGS.release, velocity }).then(() => {
                    delete el.dataset.dragging;
                });
            },
        }));
    }, []);
    const onKeyDown = (event) => {
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
        const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
        if (event.key === 'Home')
            go(0);
        else if (event.key === 'End')
            go(slides.length - 1);
        else if (step)
            go(current + step);
        else
            return;
        event.preventDefault();
    };
    const width = typeof slideWidth === 'number' ? `${slideWidth * 100}%` : slideWidth;
    return (_jsxs("section", { className: cn('lab-carousel', className), "aria-roledescription": "carousel", "aria-label": label, "data-controls": controls, "data-effect": effect, style: { '--lab-carousel-slide': width, '--lab-carousel-gap': `${gap}px` }, children: [_jsxs("div", { className: "lab-carousel-frame", children: [_jsx("div", { ref: track, className: "lab-carousel-track", "data-align": align, tabIndex: 0, "aria-label": `${label}, slide ${current + 1} of ${slides.length}`, onKeyDown: onKeyDown, children: slides.map((slide, i) => (_jsx("div", { className: "lab-carousel-slide", role: "group", "aria-roledescription": "slide", "aria-label": `${i + 1} of ${slides.length}`, children: _jsx("div", { className: "lab-carousel-slide-body", children: slide }) }, slide.key ?? i))) }), controls !== 'never' && slides.length > 1 && (_jsxs(GlassScope, { className: "lab-carousel-controls", children: [_jsx(ToolbarGroup, { label: "Previous slide", className: "lab-carousel-control", "data-side": "start", "data-glass-hidden": current === 0 ? '' : undefined, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", "aria-label": "Previous slide", disabled: current === 0, onClick: () => go(current - 1), children: _jsx(ChevronLeft, { className: "lab-dir-flip" }) }) }), _jsx(ToolbarGroup, { label: "Next slide", className: "lab-carousel-control", "data-side": "end", "data-glass-hidden": current === slides.length - 1 ? '' : undefined, children: _jsx(IconButton, { variant: "text", appearance: "toolbar", "aria-label": "Next slide", disabled: current === slides.length - 1, onClick: () => go(current + 1), children: _jsx(ChevronRight, { className: "lab-dir-flip" }) }) })] }))] }), dots && slides.length > 1 && (_jsx("div", { className: "lab-carousel-dots", role: "group", "aria-label": `${label} slides`, children: slides.map((_, i) => (_jsx("button", { type: "button", className: "lab-carousel-dot", "aria-label": `Go to slide ${i + 1}`, "aria-current": i === current || undefined, onClick: () => go(i) }, i))) }))] }));
}
//# sourceMappingURL=carousel.js.map