import * as React from 'react';
import { type AlertActionRole } from './alert-model.js';
import '../menu/menu.css';
import './presentation.css';
export type { AlertActionRole } from './alert-model.js';
export type AlertAction = {
    /** The button text: name the outcome (“Cancel order”, “Keep order”), never “OK”. */
    label: string;
    /**
     * `cancel` backs out (also run by Escape; it sits first in a row and last in a stack),
     * `primary` is the one main action (filled), `destructive` deletes or loses something (tinted
     * danger). No role: any other choice.
     */
    role?: AlertActionRole;
    /** Runs when the action is chosen. Return `false` to keep the alert open (to show an error). */
    onAction?: () => void | boolean;
    /** Disables the button. */
    disabled?: boolean;
};
export type AlertProps = {
    /** Shows the alert. Keep it mounted and toggle this so it can fade out. */
    open: boolean;
    /** Called with `false` once an action is chosen (or Escape runs the cancel action). */
    onOpenChange: (open: boolean) => void;
    /** The question or the fact, as a short sentence (“Cancel order #10482?”). Also its name. */
    title: string;
    /** One or two sentences: what happens, and whether it can be undone. */
    message?: React.ReactNode;
    /** The choices, in reading order. Two that fit sit side by side; otherwise they stack. */
    actions: readonly AlertAction[];
    /** A field the decision needs (a reason, a confirmation word), between the message and the actions. */
    children?: React.ReactNode;
    /** Focused when the alert opens. Default: the cancel action, or the last action. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Focused after it closes, when the control that opened it may be gone. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
    /** Renders inside this positioned element instead of the top layer (previews). */
    container?: HTMLElement | null;
    className?: string;
};
/**
 * A small centred decision, like an iOS alert: a title, a message and capsule buttons on the thick
 * glass the menus use, over a dimmed page. Choosing an action closes it; Escape runs the cancel
 * action. Use it for confirmations (“Delete order?”); use `Modal` for anything with a form.
 */
export declare function Alert(props: AlertProps): React.JSX.Element | null;
//# sourceMappingURL=alert.d.ts.map