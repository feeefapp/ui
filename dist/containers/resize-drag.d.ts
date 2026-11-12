type ResizeDragOptions = {
    paint: (value: number) => void;
    commit: (value: number) => void;
    restore: () => void;
    requestFrame?: (callback: () => void) => number;
    cancelFrame?: (id: number) => void;
};
/** Transient layout, not a gesture recognizer: ResizeDivider still owns the shared pan.
 * animation_level: 1. Only schedules frames with pending direct input, even under motion:none.
 * No spring/idle clock; reduced motion never changes direct pointer tracking.
 */
export declare function createResizeDrag({ paint, commit, restore, requestFrame, cancelFrame, }: ResizeDragOptions): {
    move(next: number): void;
    finish(cancelled: boolean): void;
};
export {};
//# sourceMappingURL=resize-drag.d.ts.map