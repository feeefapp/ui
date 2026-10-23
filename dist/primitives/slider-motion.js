'use client';
import { useLayoutEffect, useRef } from 'react';
import { GLASS_GLOW_START, glassGlowRadius } from '../glass/press.js';
import { SPRINGS, springCoefficients } from '../physics/spring.js';
import { LENS_THUMB_SCALE, lensStretch } from './lens-model.js';
import { stepSpring } from './spring-core.js';
const SNAPPY = springCoefficients(SPRINGS.snappy);
const BOUNCY = springCoefficients(SPRINGS.bouncy);
const SMOOTH = springCoefficients(SPRINGS.smooth);
const INTERACTIVE = springCoefficients(SPRINGS.interactive);
/**
 * One spring clock for fill, thumb travel and the thumb's glass lens; never rerenders the owner.
 * While `pressed` the thumb turns into a lens (`lens-model.ts`): it grows by `LENS_THUMB_SCALE`,
 * stretches with its speed, shows the touch glow at the pointer (`pointer()`) and springs back on
 * release, on the segmented pill's springs. Reduced motion and a disabled control skip all of it.
 */
export function useSliderMotion(host, target, tracking, pressed, thin, disabled, 
/** Lets a dragged switch thumb rubber-band past its ends instead of clamping to 0–1. */
overshoot = false) {
    const simulation = useRef({
        position: target,
        velocity: 0,
        press: { position: 1, velocity: 0 },
        lens: { position: 0, velocity: 0 },
        stretch: { position: 0, velocity: 0 },
        glowRadius: { position: GLASS_GLOW_START, velocity: 0 },
        glowOpacity: { position: 0, velocity: 0 },
        lensing: false,
        /** Radius (px) the glow spreads to, set when a press starts. */
        glowTo: GLASS_GLOW_START,
        frame: 0,
        time: 0,
    });
    const goal = useRef({
        target,
        tracking,
        pressed,
        thin,
        disabled,
        overshoot,
        reduced: false,
        rtl: false,
        pointer: null,
    });
    const wake = useRef(() => { });
    useLayoutEffect(() => {
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const state = simulation.current;
        let alive = true;
        /** The thumb's travel (px) and inset: the edge-to-centre distance at either end. */
        const geometry = () => {
            const el = host.current;
            if (!el)
                return { travel: 0, inset: 0 };
            const inset = Number.parseFloat(getComputedStyle(el).getPropertyValue('--lab-slider-inset')) || el.offsetHeight / 2;
            return { travel: Math.max(0, el.offsetWidth - 2 * inset), inset };
        };
        const paint = (measured = geometry()) => {
            const el = host.current;
            if (!el)
                return;
            const g = goal.current;
            const position = g.overshoot ? state.position : Math.max(0, Math.min(1, state.position));
            const stretch = state.stretch.position;
            el.style.setProperty('--lab-slider-visual-fraction', String(position));
            el.style.setProperty('--lab-slider-press', String(state.press.position));
            el.style.setProperty('--lab-slider-stretch', `${stretch}px`);
            el.style.setProperty('--lab-slider-stretch-size', `${Math.abs(stretch)}px`);
            el.style.setProperty('--lab-lens', String(Math.max(0, Math.min(1, state.lens.position))));
            el.style.setProperty('--lab-lens-glow', String(Math.max(0, Math.min(1, state.glowOpacity.position))));
            el.style.setProperty('--lab-lens-glow-r', `${Math.max(1, state.glowRadius.position)}px`);
            const pointer = g.pointer;
            if (pointer) {
                // The glow sits under the pointer: its offset from the drawn thumb's centre.
                const { travel, inset } = measured;
                const center = inset + travel * position + stretch / 2;
                const dx = (pointer.x - center) * (g.rtl ? -1 : 1);
                el.style.setProperty('--lab-lens-glow-x', `calc(50% + ${dx}px)`);
                el.style.setProperty('--lab-lens-glow-y', `calc(50% + ${pointer.y - el.offsetHeight / 2}px)`);
            }
        };
        const spring = (value, to, dt, { stiffness, damping }) => {
            const next = stepSpring(value, to, dt, stiffness, damping);
            value.position = next.position;
            value.velocity = next.velocity;
        };
        const settle = (value, to) => {
            value.position = to;
            value.velocity = 0;
        };
        const tick = (time) => {
            state.frame = 0;
            if (!alive)
                return;
            const g = goal.current;
            const dt = state.time ? Math.max(1 / 240, Math.min(0.04, (time - state.time) / 1000)) : 1 / 60;
            state.time = time;
            // Read layout once, before this frame writes anything.
            const measured = geometry();
            if (g.reduced || g.disabled) {
                state.position = g.target;
                state.velocity = 0;
                settle(state.press, 1);
                settle(state.lens, 0);
                settle(state.stretch, 0);
                settle(state.glowOpacity, 0);
                state.lensing = false;
                paint(measured);
                state.time = 0;
                return;
            }
            const previous = state.position;
            if (g.tracking) {
                state.position = g.target;
                state.velocity = (g.target - previous) / dt;
            }
            else {
                const next = stepSpring({ position: state.position, velocity: state.velocity }, g.target, dt, g.thin ? 700 : 420, g.thin ? 48 : 28);
                state.position = next.position;
                state.velocity = next.velocity;
            }
            // The lens: in on a press (the glow starts small under the finger and spreads), out on release.
            if (g.pressed && !state.lensing) {
                state.lensing = true;
                settle(state.glowRadius, GLASS_GLOW_START);
                settle(state.glowOpacity, 1);
                const thumb = host.current?.querySelector(':scope > .lab-slider-thumb');
                state.glowTo = glassGlowRadius(thumb?.offsetWidth ?? 0);
            }
            else if (!g.pressed)
                state.lensing = false;
            const lensing = state.lensing;
            spring(state.press, lensing ? LENS_THUMB_SCALE : 1, dt, lensing ? SNAPPY : BOUNCY);
            spring(state.lens, lensing ? 1 : 0, dt, SNAPPY);
            const stretchTarget = lensing ? lensStretch(state.velocity * measured.travel) : 0;
            spring(state.stretch, stretchTarget, dt, lensing ? INTERACTIVE : BOUNCY);
            spring(state.glowRadius, state.glowTo, dt, SMOOTH);
            spring(state.glowOpacity, lensing ? 1 : 0, dt, SMOOTH);
            paint(measured);
            const resting = (value, to, delta) => Math.abs(value.position - to) <= delta && Math.abs(value.velocity) <= delta * 10;
            const moving = Math.abs(state.position - g.target) > 0.0001 ||
                Math.abs(state.velocity) > 0.002 ||
                !resting(state.press, lensing ? LENS_THUMB_SCALE : 1, 0.0005) ||
                !resting(state.lens, lensing ? 1 : 0, 0.002) ||
                !resting(state.stretch, stretchTarget, 0.05) ||
                !resting(state.glowOpacity, lensing ? 1 : 0, 0.005) ||
                (lensing && !resting(state.glowRadius, state.glowTo, 0.5));
            if (moving)
                state.frame = requestAnimationFrame(tick);
            else {
                state.position = g.target;
                state.velocity = 0;
                settle(state.press, lensing ? LENS_THUMB_SCALE : 1);
                settle(state.lens, lensing ? 1 : 0);
                settle(state.stretch, 0);
                settle(state.glowOpacity, lensing ? 1 : 0);
                state.time = 0;
                paint(measured);
            }
        };
        wake.current = () => {
            if (!state.frame && alive)
                state.frame = requestAnimationFrame(tick);
        };
        const changed = () => {
            goal.current.reduced = media.matches;
            wake.current();
        };
        goal.current.reduced = media.matches;
        media.addEventListener('change', changed);
        paint();
        wake.current();
        return () => {
            alive = false;
            cancelAnimationFrame(state.frame);
            state.frame = 0;
            state.time = 0;
            media.removeEventListener('change', changed);
        };
    }, [host]);
    useLayoutEffect(() => {
        goal.current = {
            ...goal.current,
            target,
            tracking,
            pressed,
            thin,
            disabled,
            overshoot,
            rtl: Boolean(host.current && getComputedStyle(host.current).direction === 'rtl'),
        };
        if (!pressed)
            goal.current.pointer = null;
        wake.current();
    }, [host, target, tracking, pressed, thin, disabled, overshoot]);
    return {
        /** Moves the touch glow to the pointer (the control's own px, `x` from its inline start). */
        pointer(point) {
            goal.current.pointer = point;
            wake.current();
        },
    };
}
//# sourceMappingURL=slider-motion.js.map