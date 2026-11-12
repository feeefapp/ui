'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n.js';
import { PixelLoader } from '../pixel-art.js';
import { prefersReducedMotion } from '../physics/motion-value.js';
import { useMotionPaint, useMotionValue } from '../physics/react.js';
import { PULL_REFRESH, pullDistance, pullLoaderTop, pullProgress, pullRelease } from './pull-refresh-model.js';
/**
 * Starts a `ScrollArea`'s refresh from code (a Refresh button, a keyboard shortcut) with the same
 * loader a pull shows, and tells whether one is running. Create one with `useRefreshController()`
 * and pass it as the area's `refreshController`. The Flutter twin is `RefreshController`.
 */
export class RefreshController {
    run = null;
    busy = false;
    listeners = new Set();
    /** True while a refresh runs. */
    get refreshing() {
        return this.busy;
    }
    /**
     * Runs the area's `onRefresh` with the loader showing; resolves when it settles. Does nothing
     * while one is running or when no area is attached.
     */
    refresh() {
        return this.run ? this.run() : Promise.resolve();
    }
    /** Calls `listener` when `refreshing` changes. Returns an unsubscribe function. */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /** @internal The area that runs refreshes. */
    attach(run) {
        this.run = run;
    }
    /** @internal */
    setRefreshing(busy) {
        if (busy === this.busy)
            return;
        this.busy = busy;
        for (const listener of this.listeners)
            listener();
    }
}
/** A `RefreshController` that lives as long as the component. */
export function useRefreshController() {
    return useState(() => new RefreshController())[0];
}
/**
 * Pull to refresh on a scroll viewport: touch only (a mouse never pulls). Moves the viewport down
 * by the pull and returns its motion value and status for the indicator.
 */
export function usePullToRefresh(viewport, onRefresh, controller) {
    const pull = useMotionValue(0, 0.1);
    const [state, setState] = useState('idle');
    const busy = useRef(false);
    const latest = useRef(onRefresh);
    latest.current = onRefresh;
    // Only ever clears a transform this hook wrote, so a host's own viewport style survives.
    const moved = useRef(false);
    useMotionPaint(pull, (distance) => {
        const el = viewport.current;
        if (!el || (!moved.current && distance <= 0.01))
            return;
        moved.current = distance > 0.01;
        el.style.transform = moved.current ? `translateY(${distance}px)` : '';
    });
    const run = useRef(async () => { });
    run.current = async () => {
        const refresh = latest.current;
        if (!refresh || busy.current)
            return;
        busy.current = true;
        controller?.setRefreshing(true);
        setState('refreshing');
        const instant = prefersReducedMotion();
        void pull.animateTo(PULL_REFRESH.hold, { spring: 'release', instant });
        try {
            await refresh();
        }
        catch {
            // The app reports its own failures; the indicator still closes.
        }
        busy.current = false;
        controller?.setRefreshing(false);
        setState('done');
        await pull.animateTo(0, { spring: 'smooth', instant: prefersReducedMotion() });
    };
    useEffect(() => {
        if (!controller)
            return;
        controller.attach(() => run.current());
        return () => controller.attach(null);
    }, [controller]);
    const enabled = Boolean(onRefresh);
    useEffect(() => {
        const el = viewport.current;
        if (!el || !enabled)
            return;
        // One finger pulls: the first touch at the top, followed by its identifier. Other fingers
        // landing during a pull are ignored, so the pull always ends with the finger that made it.
        let start = null;
        let origin = null;
        const tracked = (list) => start ? Array.from(list).find((touch) => touch.identifier === start.id) : undefined;
        const onStart = (event) => {
            if (origin !== null)
                return;
            const touch = event.touches[0];
            start =
                !busy.current && event.touches.length === 1 && el.scrollTop <= 0 && touch
                    ? { id: touch.identifier, x: touch.clientX, y: touch.clientY }
                    : null;
        };
        const onMove = (event) => {
            const touch = tracked(event.touches);
            if (!start || !touch)
                return;
            const dy = touch.clientY - start.y;
            if (origin === null) {
                const dx = touch.clientX - start.x;
                if (el.scrollTop > 0 || dy < -PULL_REFRESH.slop || Math.abs(dx) > Math.max(PULL_REFRESH.slop, dy)) {
                    start = null;
                    return;
                }
                if (dy <= PULL_REFRESH.slop)
                    return;
                // Travel counts from here, so crossing the slop never jumps.
                origin = touch.clientY;
            }
            // The pull owns this touch: the page neither scrolls nor bounces under it.
            if (event.cancelable)
                event.preventDefault();
            pull.track(pullDistance(touch.clientY - origin, el.clientHeight, prefersReducedMotion()), event.timeStamp);
        };
        const onEnd = (event) => {
            if (!tracked(event.changedTouches))
                return;
            const pulled = origin !== null;
            start = origin = null;
            if (!pulled)
                return;
            // A cancelled touch (the system took it) never refreshes.
            if (event.type === 'touchend' && pullRelease(pull.get()).refresh)
                void run.current();
            else
                void pull.animateTo(0, { spring: 'release', instant: prefersReducedMotion() });
        };
        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchmove', onMove, { passive: false });
        el.addEventListener('touchend', onEnd);
        el.addEventListener('touchcancel', onEnd);
        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onEnd);
            pull.set(0);
        };
    }, [enabled, pull, viewport]);
    return { pull, state };
}
/**
 * The loader in the gap a pull opens, just below the area's top reservation: squares light up as
 * the pull nears its threshold, then the wave runs while refreshing. A polite live region
 * announces the refresh and its end.
 */
export function PullRefreshIndicator({ pull, state }) {
    const { t } = useI18n();
    const [distance, setDistance] = useState(0);
    useEffect(() => pull.subscribe(setDistance), [pull]);
    const refreshing = state === 'refreshing';
    return (_jsxs("div", { className: "lab-scroll-refresh", children: [(distance > 0.5 || refreshing) && (_jsx("span", { className: "lab-scroll-refresh-loader", style: {
                    transform: `translateY(${pullLoaderTop(distance)}px)`,
                    opacity: refreshing ? 1 : Math.min(1, pullProgress(distance) * 2),
                }, children: _jsx(PixelLoader, { size: PULL_REFRESH.loader, decorative: true, progress: refreshing ? undefined : pullProgress(distance) }) })), _jsx("span", { className: "lab-sr-only", "aria-live": "polite", children: refreshing ? t('lab.refresh.refreshing') : state === 'done' ? t('lab.refresh.done') : '' })] }));
}
//# sourceMappingURL=pull-refresh.js.map