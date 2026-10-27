/**
 * How much the kit's effects may cost on this device: `ThemeConfig.performance`, resolved from the
 * device and from frames measured on it when it is `auto`. The twin of the Flutter kit's
 * `performance.dart` (same names; the web thresholds differ, see `resolvePerformance`).
 */
/**
 * The tier for `mode` on a device with `traits`. `auto`: `light` with 2 GB of memory or less, 2
 * cores or fewer, no hardware GPU, or when this device measured slow (`slow`); else `balanced`.
 * The core rule is lower than the Flutter kit's (4): a web page is lighter than a Flutter web app,
 * and Safari reports 4 cores on phones that run the full look well.
 */
export function resolvePerformance(mode, traits, slow = false) {
    if (mode !== 'auto')
        return mode;
    if (slow || traits.softwareGpu)
        return 'light';
    if (traits.memoryGb !== undefined && traits.memoryGb <= 2)
        return 'light';
    if (traits.cores !== undefined && traits.cores <= 2)
        return 'light';
    return 'balanced';
}
/** Frame rules for `measuredPerformance`. */
export const MEASURE = {
    /** A frame interval (ms) longer than this misses 25 frames a second. */
    slowFrameMs: 40,
    /** Frames a window needs before it counts (a shorter sample is ignored). */
    minFrames: 20,
    /** Slow windows in a row that mark the device slow. */
    strikes: 2,
    /** How long (ms) frames are timed after an input. */
    windowMs: 1500,
    /** How long a measured slow device stays light. */
    rememberMs: 14 * 24 * 60 * 60 * 1000,
};
/** Whether a window of frame intervals (ms) is slow: its median is over `MEASURE.slowFrameMs`. */
export function slowWindow(intervals) {
    if (intervals.length < MEASURE.minFrames)
        return null;
    const sorted = [...intervals].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] > MEASURE.slowFrameMs;
}
/** This browser's traits (read once; `{}` outside a browser). */
export function readDeviceTraits() {
    if (typeof navigator === 'undefined' || typeof document === 'undefined')
        return {};
    const nav = navigator;
    return {
        cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
        memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
        softwareGpu: !hardwareWebGl(),
    };
}
/**
 * Whether WebGL gets a GPU: with `failIfMajorPerformanceCaveat` the browser refuses a context it
 * would draw in software. The probe context is released at once (browsers cap live contexts).
 */
function hardwareWebGl() {
    try {
        const canvas = document.createElement('canvas');
        const options = { failIfMajorPerformanceCaveat: true };
        const gl = (canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options));
        if (!gl)
            return false;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
    }
    catch {
        // A browser that throws here gets the benefit of the doubt.
        return true;
    }
}
const SLOW_KEY = 'feeef-ui.slow';
/**
 * What frames actually cost here. Memory and cores don't tell a weak GPU or a busy phone from a
 * good one, so after each tap, click or key (what starts menus, merges and sheets) the frames of
 * the next `MEASURE.windowMs` are timed; idle pages time nothing. Two slow windows in a row mark
 * the device slow: `auto` themes step down to `light`, and the browser remembers it for
 * `MEASURE.rememberMs`.
 */
export const measuredPerformance = {
    /** True once this device measured slow (or remembered so). */
    get slow() {
        return state.slow;
    },
    /** Calls `listener` when `slow` changes; returns the unsubscribe. */
    subscribe(listener) {
        state.listeners.add(listener);
        return () => state.listeners.delete(listener);
    },
    /** Starts timing frames after input (once; later calls do nothing). Browser only. */
    watch() {
        if (state.watching || state.slow || typeof window === 'undefined')
            return;
        state.watching = true;
        const options = { capture: true, passive: true };
        const onInput = () => sampleFrames();
        window.addEventListener('pointerdown', onInput, options);
        window.addEventListener('keydown', onInput, options);
        state.unwatch = () => {
            window.removeEventListener('pointerdown', onInput, options);
            window.removeEventListener('keydown', onInput, options);
        };
    },
    /** Forgets a measured slow device (a settings "try the full look again"). */
    forget() {
        try {
            localStorage.removeItem(SLOW_KEY);
        }
        catch { }
        state.strikes = 0;
        setSlow(false);
    },
    /** Feeds one window of frame intervals as if it had been timed (tests). */
    report(intervals) {
        countWindow(intervals);
    },
};
const state = {
    slow: rememberedSlow(),
    watching: false,
    sampling: false,
    strikes: 0,
    listeners: new Set(),
    unwatch: null,
};
function rememberedSlow() {
    try {
        const at = Number(localStorage.getItem(SLOW_KEY));
        if (!at)
            return false;
        const age = Date.now() - at;
        return age >= 0 && age < MEASURE.rememberMs;
    }
    catch {
        return false;
    }
}
function setSlow(slow) {
    if (state.slow === slow)
        return;
    state.slow = slow;
    for (const listener of [...state.listeners])
        listener();
}
function countWindow(intervals) {
    const slow = slowWindow(intervals);
    if (slow === null)
        return;
    state.strikes = slow ? state.strikes + 1 : 0;
    if (state.strikes < MEASURE.strikes)
        return;
    state.unwatch?.();
    state.unwatch = null;
    try {
        localStorage.setItem(SLOW_KEY, String(Date.now()));
    }
    catch { }
    setSlow(true);
}
/** Times frame intervals for `MEASURE.windowMs` (one sample at a time, skipped while hidden). */
function sampleFrames() {
    if (state.sampling || state.slow || document.visibilityState !== 'visible')
        return;
    state.sampling = true;
    const intervals = [];
    let start = 0;
    let last = 0;
    const step = (now) => {
        if (!start)
            start = now;
        else
            intervals.push(now - last);
        last = now;
        if (now - start < MEASURE.windowMs && document.visibilityState === 'visible') {
            requestAnimationFrame(step);
            return;
        }
        state.sampling = false;
        countWindow(intervals);
    };
    requestAnimationFrame(step);
}
//# sourceMappingURL=performance.js.map