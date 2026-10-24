/** Pure layout rules for Alert, shared with the Flutter twin (flutter/lib/presentation/alert_model.dart). */
/**
 * True when the actions sit side by side: exactly two, each as wide as its label needs (padding
 * included) within half the row, less half the gap. Anything else stacks full width.
 */
export function alertActionsFit(widths, rowWidth, gap) {
    if (widths.length !== 2)
        return false;
    const half = (rowWidth - gap) / 2;
    return widths.every((width) => width <= half + 0.5);
}
/**
 * The order actions appear in, as indices into `roles`: side by side the cancel action leads (the
 * main action ends the row); stacked it goes to the bottom. Others keep their given order.
 */
export function alertActionOrder(roles, sideBySide) {
    const indices = roles.map((_, index) => index);
    const cancel = indices.filter((index) => roles[index] === 'cancel');
    const rest = indices.filter((index) => roles[index] !== 'cancel');
    return sideBySide ? [...cancel, ...rest] : [...rest, ...cancel];
}
//# sourceMappingURL=alert-model.js.map