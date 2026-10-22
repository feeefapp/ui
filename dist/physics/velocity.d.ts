/**
 * Estimates the speed of a pointer-driven value from recent samples, the way a pan gesture reports
 * velocity on release. A least-squares fit over the last `window` ms smooths jitter; a pointer
 * that stopped before lifting reports 0, so a careful drop never flings.
 */
export declare class LabVelocityTracker {
    /** How much recent history to fit, in milliseconds. */
    private readonly window;
    /** A gap this long (ms) between the last sample and release means the pointer had stopped. */
    private readonly stopAfter;
    /** Ignore absurd speeds from timer jitter (units per second). */
    private readonly maxSpeed;
    private samples;
    constructor(
    /** How much recent history to fit, in milliseconds. */
    window?: number, 
    /** A gap this long (ms) between the last sample and release means the pointer had stopped. */
    stopAfter?: number, 
    /** Ignore absurd speeds from timer jitter (units per second). */
    maxSpeed?: number);
    /** Records the value at `time` (ms, e.g. `event.timeStamp`). */
    add(value: number, time: number): void;
    /** Units per second at `now` (ms); 0 with too little data or after a pause. */
    velocity(now?: number): number;
    reset(): void;
}
//# sourceMappingURL=velocity.d.ts.map