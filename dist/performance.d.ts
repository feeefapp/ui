/**
 * How much the kit's effects may cost on this device: `ThemeConfig.performance`, resolved from the
 * device and from frames measured on it when it is `auto`. The twin of the Flutter kit's
 * `performance.dart` (same names; the web thresholds differ, see `resolvePerformance`).
 */
/** `auto` picks from the device; an app can fix a tier. */
export type Performance = 'auto' | 'full' | 'balanced' | 'light';
/**
 * The effects tier in use. `full` and `balanced` keep the whole look on the web; `light` paints
 * floating glass as transparent glass that keeps its tint, rim and shadow but filters nothing
 * behind it (no backdrop blur or refraction), and bubbles never merge (no union outline traced
 * per frame).
 */
export type PerformanceTier = 'full' | 'balanced' | 'light';
/** What the device can do, as far as the kit cares. */
export interface DeviceTraits {
    /** Logical processors, when the browser says (Safari rounds it). */
    cores?: number;
    /** Device memory in GB, when the browser says (Chromium only, rounded 0.25 … 8). */
    memoryGb?: number;
    /** WebGL is missing or would run in software: every frame is drawn by the CPU. */
    softwareGpu?: boolean;
}
/**
 * The tier for `mode` on a device with `traits`. `auto`: `light` with 2 GB of memory or less, 2
 * cores or fewer, no hardware GPU, or when this device measured slow (`slow`); else `balanced`.
 * The core rule is lower than the Flutter kit's (4): a web page is lighter than a Flutter web app,
 * and Safari reports 4 cores on phones that run the full look well.
 */
export declare function resolvePerformance(mode: Performance, traits: DeviceTraits, slow?: boolean): PerformanceTier;
/** Frame rules for `measuredPerformance`. */
export declare const MEASURE: {
    /** A frame interval (ms) longer than this misses 25 frames a second. */
    readonly slowFrameMs: 40;
    /** Frames a window needs before it counts (a shorter sample is ignored). */
    readonly minFrames: 20;
    /** Slow windows in a row that mark the device slow. */
    readonly strikes: 2;
    /** How long (ms) frames are timed after an input. */
    readonly windowMs: 1500;
    /** How long a measured slow device stays light. */
    readonly rememberMs: number;
};
/** Whether a window of frame intervals (ms) is slow: its median is over `MEASURE.slowFrameMs`. */
export declare function slowWindow(intervals: readonly number[]): boolean | null;
/** This browser's traits (read once; `{}` outside a browser). */
export declare function readDeviceTraits(): DeviceTraits;
/**
 * What frames actually cost here. Memory and cores don't tell a weak GPU or a busy phone from a
 * good one, so after each tap, click or key (what starts menus, merges and sheets) the frames of
 * the next `MEASURE.windowMs` are timed; idle pages time nothing. Two slow windows in a row mark
 * the device slow: `auto` themes step down to `light`, and the browser remembers it for
 * `MEASURE.rememberMs`.
 */
export declare const measuredPerformance: {
    /** True once this device measured slow (or remembered so). */
    readonly slow: boolean;
    /** Calls `listener` when `slow` changes; returns the unsubscribe. */
    subscribe(listener: () => void): () => void;
    /** Starts timing frames after input (once; later calls do nothing). Browser only. */
    watch(): void;
    /** Forgets a measured slow device (a settings "try the full look again"). */
    forget(): void;
    /** Feeds one window of frame intervals as if it had been timed (tests). */
    report(intervals: readonly number[]): void;
};
//# sourceMappingURL=performance.d.ts.map