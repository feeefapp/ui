/** Pure layout rules for Alert, shared with the Flutter twin (flutter/lib/presentation/alert_model.dart). */
/** What an alert action does; it decides the button's paint and its place. No role is a plain choice. */
export type AlertActionRole = 'cancel' | 'primary' | 'destructive';
/**
 * True when the actions sit side by side: exactly two, each as wide as its label needs (padding
 * included) within half the row, less half the gap. Anything else stacks full width.
 */
export declare function alertActionsFit(widths: readonly number[], rowWidth: number, gap: number): boolean;
/**
 * The order actions appear in, as indices into `roles`: side by side the cancel action leads (the
 * main action ends the row); stacked it goes to the bottom. Others keep their given order.
 */
export declare function alertActionOrder(roles: readonly (AlertActionRole | undefined)[], sideBySide: boolean): number[];
//# sourceMappingURL=alert-model.d.ts.map