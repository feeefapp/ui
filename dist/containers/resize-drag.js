/** Transient layout, not a gesture recognizer: ResizeDivider still owns the shared pan.
 * animation_level: 1. Only schedules frames with pending direct input, even under motion:none.
 * No spring/idle clock; reduced motion never changes direct pointer tracking.
 */
export function createResizeDrag({ paint, commit, restore, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame, }) {
    let frame = null;
    let value;
    let active = true;
    return {
        move(next) {
            if (!active)
                return;
            value = next;
            if (frame === null)
                frame = requestFrame(() => {
                    frame = null;
                    if (active && value !== undefined)
                        paint(value);
                });
        },
        finish(cancelled) {
            if (!active)
                return;
            active = false;
            if (frame !== null)
                cancelFrame(frame);
            frame = null;
            restore();
            if (!cancelled && value !== undefined)
                commit(value);
        },
    };
}
//# sourceMappingURL=resize-drag.js.map