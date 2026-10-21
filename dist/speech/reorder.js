'use client';
import { useEffect, useRef } from 'react';
import { useLabI18n } from '../i18n.js';
import { flushSync } from 'react-dom';
import { speechDragIndex, speechPreviewOffsets } from './block-order.js';
const selector = '[data-speech-block]';
/** Pointer movement stays off React's render path; the owner receives one history edit on drop. */
export function useSpeechReorder({ root, index, count, onMove, announce, }) {
    const { t } = useLabI18n();
    const drag = useRef(null);
    const animations = useRef(new Map());
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const measure = () => [...(root.current?.parentElement?.querySelectorAll(selector) ?? [])].map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, top: rect.top, height: rect.height };
    });
    function cancelAnimation(element) {
        element
            .getAnimations()
            .filter((animation) => animation.id === 'lab-speech-reorder')
            .forEach((animation) => animation.cancel());
        animations.current.delete(element);
        delete element.dataset.reorderSettling;
    }
    function animate(element, from, to, lifted = false) {
        cancelAnimation(element);
        if (reducedMotion() || Math.abs(from - to) < 0.5)
            return;
        const animation = element.animate([{ translate: `0 ${from}px` }, { translate: `0 ${to}px` }], {
            duration: 220,
            easing: 'cubic-bezier(.2,.8,.2,1)',
        });
        if (lifted)
            element.dataset.reorderSettling = 'true';
        animation.id = 'lab-speech-reorder';
        animations.current.set(element, animation);
        const settled = () => {
            if (animations.current.get(element) !== animation)
                return;
            animations.current.delete(element);
            delete element.dataset.reorderSettling;
        };
        void animation.finished.then(settled, settled);
    }
    function clear(state) {
        cancelAnimationFrame(state.frame);
        state.items.forEach(({ element }) => {
            cancelAnimation(element);
            element.style.removeProperty('translate');
            delete element.dataset.dragging;
        });
        delete state.parent.dataset.speechReordering;
    }
    useEffect(() => {
        const cancel = () => finish(true);
        const visibility = () => {
            if (document.hidden)
                cancel();
        };
        window.addEventListener('blur', cancel);
        window.addEventListener('resize', cancel);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            window.removeEventListener('blur', cancel);
            window.removeEventListener('resize', cancel);
            document.removeEventListener('visibilitychange', visibility);
            if (drag.current)
                clear(drag.current);
            animations.current.forEach((animation) => animation.cancel());
            animations.current.clear();
        };
    }, []);
    function sample(time = performance.now()) {
        const state = drag.current;
        if (!state || !root.current)
            return;
        const elapsed = Math.min(32, time - state.time) / (1000 / 60);
        state.time = time;
        if (!state.active && Math.abs(state.y - state.start) > 6) {
            state.active = true;
            root.current.dataset.dragging = 'true';
            root.current.parentElement.dataset.speechReordering = 'true';
            announce(t('lab.speech.picked', { index: index + 1 }));
        }
        if (state.active) {
            const { viewport } = state;
            if (viewport) {
                const bounds = viewport.getBoundingClientRect();
                const css = getComputedStyle(viewport);
                const top = bounds.top + (Number.parseFloat(css.scrollPaddingTop) || 0);
                const bottom = bounds.bottom - (Number.parseFloat(css.scrollPaddingBottom) || 0);
                const edge = Math.min(64, Math.max(12, (bottom - top) / 4));
                const speed = state.y < top + edge
                    ? -Math.min(12, (top + edge - state.y) / 4)
                    : state.y > bottom - edge
                        ? Math.min(12, (state.y - bottom + edge) / 4)
                        : 0;
                if (speed)
                    viewport.scrollTop += speed * elapsed;
            }
            const scroll = (viewport?.scrollTop ?? 0) - state.scroll;
            const own = state.items[index];
            const last = state.items[state.items.length - 1];
            // Keep the card in its lane, with its original grab point under the pointer.
            const offset = Math.max(state.items[0].top - own.top, Math.min(last.top + last.height - own.height - own.top, state.y - state.start + scroll));
            const target = speechDragIndex(state.items, index, state.y - state.start + scroll);
            if (target !== state.target) {
                const before = state.items.map(({ element }) => element.getBoundingClientRect().top);
                const offsets = speechPreviewOffsets(state.items, index, target);
                state.items.forEach(({ element, top }, i) => {
                    if (i === index)
                        return;
                    element.style.translate = `0 ${offsets[i]}px`;
                    animate(element, before[i] - top + scroll, offsets[i]);
                });
                state.target = target;
                announce(t('lab.speech.position', { index: target + 1, count }));
            }
            root.current.style.translate = `0 ${offset}px`;
        }
        state.frame = requestAnimationFrame(sample);
    }
    function finish(cancel = false) {
        const state = drag.current;
        if (!state)
            return;
        drag.current = null;
        const before = state.items.map(({ element }) => element.getBoundingClientRect().top);
        cancelAnimationFrame(state.frame);
        // Suppress focus-reveal until the measured layout has committed, avoiding a scroll jump.
        if (!cancel && state.active && state.target !== index)
            flushSync(() => onMove(index, state.target));
        clear(state);
        state.items.forEach(({ element }, i) => {
            animate(element, before[i] - element.getBoundingClientRect().top, 0, element === root.current);
        });
        if (state.handle.hasPointerCapture(state.pointer))
            state.handle.releasePointerCapture(state.pointer);
        if (state.active)
            announce(cancel
                ? t('lab.speech.cancelled')
                : t('lab.speech.moved', { index: state.target + 1, count }));
    }
    return {
        onPointerDown(event) {
            if (event.button !== 0 || !event.isPrimary || drag.current)
                return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            // Settle an earlier reorder before measuring a new one.
            root.current?.parentElement?.querySelectorAll(selector).forEach(cancelAnimation);
            animations.current.clear();
            event.currentTarget.setPointerCapture(event.pointerId);
            const viewport = root.current?.closest('.lab-scroll-viewport') ?? null;
            drag.current = {
                items: measure(),
                parent: root.current.parentElement,
                viewport,
                scroll: viewport?.scrollTop ?? 0,
                start: event.clientY,
                y: event.clientY,
                target: index,
                frame: 0,
                active: false,
                handle: event.currentTarget,
                pointer: event.pointerId,
                time: performance.now(),
            };
            drag.current.frame = requestAnimationFrame(sample);
        },
        onPointerMove(event) {
            if (drag.current?.pointer === event.pointerId)
                drag.current.y = event.clientY;
        },
        onPointerUp(event) {
            if (drag.current?.pointer !== event.pointerId)
                return;
            drag.current.y = event.clientY;
            cancelAnimationFrame(drag.current.frame);
            sample();
            finish();
        },
        onPointerCancel() {
            finish(true);
        },
        onLostPointerCapture() {
            finish(true);
        },
        onKeyDown(event) {
            if (drag.current) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    finish(true);
                }
                return;
            }
            const next = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : null;
            if (next === null)
                return;
            event.preventDefault();
            if (next < 0 || next >= count)
                return;
            const before = measure();
            flushSync(() => onMove(index, next));
            before.forEach(({ element, top }) => animate(element, top - element.getBoundingClientRect().top, 0));
            announce(t('lab.speech.moved', { index: next + 1, count }));
        },
    };
}
//# sourceMappingURL=reorder.js.map