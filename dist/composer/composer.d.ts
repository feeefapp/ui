import * as React from 'react';
import './composer.css';
export { composerExpanded, composerSendState } from './composer-model.js';
export type { ComposerSendState } from './composer-model.js';
/**
 * Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately.
 * Its words are inline blocks, so it takes the direction of its own text (`dir="auto"`): an English
 * hint on an Arabic page keeps its word order, still aligned to the page's start.
 */
export declare function ComposerHint({ text }: {
    /** The hint text. Changing it replays the animation. */
    text: string;
}): React.JSX.Element;
export type ComposerFieldProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onSubmit' | 'rows' | 'placeholder'> & {
    /** The text (controlled). */
    value: string;
    /** Called with the new text on every edit. */
    onValueChange(value: string): void;
    /** Accessible name of the field. */
    label: string;
    /** Animated hint shown while the field is empty. */
    placeholder?: string;
    /** Called on Enter (not Shift+Enter, not while an input method composes, not on touch keyboards). The owner decides whether it sends. */
    onSubmit?(): void;
    /** Lines the field grows to before it scrolls. Default 6. */
    maxLines?: number;
};
/**
 * The composer's text field: an unpainted multiline input in the control font that grows from one
 * line to `maxLines`, then scrolls, with the animated `ComposerHint` while empty. Enter calls
 * `onSubmit`; Shift+Enter breaks the line (on touch keyboards Return always breaks it). Place it in `ComposerBar`'s `field` slot.
 */
export declare const ComposerField: React.ForwardRefExoticComponent<Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onSubmit" | "placeholder" | "rows"> & {
    /** The text (controlled). */
    value: string;
    /** Called with the new text on every edit. */
    onValueChange(value: string): void;
    /** Accessible name of the field. */
    label: string;
    /** Animated hint shown while the field is empty. */
    placeholder?: string;
    /** Called on Enter (not Shift+Enter, not while an input method composes, not on touch keyboards). The owner decides whether it sends. */
    onSubmit?(): void;
    /** Lines the field grows to before it scrolls. Default 6. */
    maxLines?: number;
} & React.RefAttributes<HTMLTextAreaElement>>;
/**
 * The send button inside the capsule, at its trailing end: a quiet neutral circle while there is
 * nothing to send, the primary circle with an up arrow when there is, the kit's loader while
 * sending. With `onStop` the sending button stays enabled and stops the request.
 */
export declare function ComposerSend({ label, ready, submitting, onSend, onStop, stopLabel, type }: {
    /** Accessible name, such as "Send message" or "Create image". */
    label: string;
    /** There is something to send and sending is allowed. */
    ready: boolean;
    /** A request is in flight: shows the loader. */
    submitting?: boolean;
    /** Called on click while ready. */
    onSend?(): void;
    /** Makes the sending button a stop button. */
    onStop?(): void;
    /** Accessible name while it stops. Defaults to the localized "Stop". */
    stopLabel?: string;
    /** `submit` to send through the enclosing form. */
    type?: 'button' | 'submit';
}): React.JSX.Element;
/**
 * Attachments inside the capsule, above the text (like iOS Messages): one row of
 * `ComposerAttachment` tiles that scrolls sideways with edge fades when it overflows, and, with
 * `max`, a quiet count of how many more fit.
 */
export declare function ComposerAttachments({ label, count, max, children }: {
    /** Accessible name of the list, such as "Reference images". */
    label: string;
    /** How many are attached; shown with `max`. */
    count?: number;
    /** How many fit. Shows "2 of 4" at the trailing end. */
    max?: number;
    /** `ComposerAttachment` tiles. */
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * One attachment tile: a rounded-square thumbnail (or, with `title`, a wider tile with an icon and
 * a name), a small × badge at its top-trailing corner, and an optional label such as "Main" at its
 * bottom-leading corner.
 */
export declare function ComposerAttachment({ id, src, preview, icon, title, label, badge, onRemove, removeLabel }: {
    /** Stable identity; tiles slide into place when others are removed. */
    id: string;
    /** Image URL of the thumbnail. */
    src?: string;
    /** Draws the thumbnail instead of `src`. */
    preview?: React.ReactNode;
    /** Icon of a wide tile (a template, a document). */
    icon?: React.ReactNode;
    /** Name shown on a wide tile. Without it the tile is a square thumbnail. */
    title?: string;
    /** Accessible name of the tile. */
    label: string;
    /** Short label on the thumbnail, such as "Main" for the primary reference. */
    badge?: string;
    /** Shows the × badge. */
    onRemove?(): void;
    /** Accessible name of the × badge. Defaults to the localized "Remove {label}". */
    removeLabel?: string;
}): React.JSX.Element;
export type ComposerBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
    /** Content of the round bubble before the capsule, usually one `IconButton` (+, attach). */
    leading?: React.ReactNode;
    /** `ComposerAttachments` shown inside the capsule, above the text. */
    attachments?: React.ReactNode;
    /** The `ComposerField`. */
    field: React.ReactNode;
    /** Chips on the second row's leading end (model, settings), `controlSize="small"`; they take muted ink. Shown while expanded. */
    tools?: React.ReactNode;
    /** Icon buttons beside send (AI help), `controlSize="small"` like send. Keep it to one: it stays on the calm bar. */
    actions?: React.ReactNode;
    /** The `ComposerSend`. */
    send: React.ReactNode;
    /** The field has text: keeps the second row open. */
    hasText: boolean;
    /** Dashed outline while a compatible file is dragged over the drop target. */
    dropActive?: boolean;
    /**
     * Keep `tools` on the first row, beside a one-line draft, so the chosen model stays visible while
     * idle. Tools move to a second row under the text once the draft has a line break, no longer fits
     * beside them, or `pinned` is set. Flutter twin: `ComposerBar.inlineTools`.
     */
    inlineTools?: boolean;
    /** With `inlineTools`: keep the two-row layout (Flutter's `pinned`). */
    pinned?: boolean;
};
/**
 * The composer's floating row, in iOS 26 Liquid Glass: a round `leading` bubble and one capsule
 * holding the attachments, the growing field and, at its trailing end, the actions and send. While
 * it is empty and idle it is one calm line; with text, focus inside or one of its menus open, a
 * second row shows the `tools` (ladder, settings) and the actions and send move under the text.
 * Every layout change (rows, lines, attachments) springs on one `SPRINGS.snappy`. Both bubbles
 * share one glass container inside a `GlassBar`, so text stays readable over moving content.
 */
export declare function ComposerBar({ leading, attachments, field, tools, actions, send, hasText, dropActive, inlineTools, pinned: pinnedProp, className, onFocus, onBlur, onMouseDown, ...props }: ComposerBarProps): React.JSX.Element;
export type PromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
    /** The prompt text (controlled). */
    value: string;
    /** Called with the new text on every edit. */
    onValueChange: (value: string) => void;
    /** Called by send and Enter, only when the prompt is not blank and submitting is allowed. */
    onSubmit: () => void;
    /** Accessible name of the text field. */
    label: string;
    /** Animated hint shown while the field is empty. */
    placeholder?: string;
    /** Disables the field and blocks submitting. */
    disabled?: boolean;
    /** Request in flight: the field turns read-only, the form sets `aria-busy`, send shows the loader. */
    busy?: boolean;
    /** With `busy`, send becomes a stop button that calls this. */
    onStop?: () => void;
    /** Accessible name of send, such as "Send message". */
    submitLabel: string;
    /** Accessible name of send while it stops. Defaults to the localized "Stop". */
    stopLabel?: string;
    /** Highlight the capsule while a compatible file is dragged over the drop target. */
    dropActive?: boolean;
    /** Blocks submitting without disabling the field. */
    submitDisabled?: boolean;
    /** Maximum prompt length in characters. */
    maxLength?: number;
    /** Lines the field grows to before it scrolls. Default 6. */
    maxLines?: number;
    /** Content of the round bubble before the capsule, usually an attach or + button. */
    leading?: React.ReactNode;
    /** `ComposerAttachments` inside the capsule, above the text. */
    attachments?: React.ReactNode;
    /** Chips on the second row (model, mode). Shown while the composer has text or focus. */
    tools?: React.ReactNode;
    /** Small icon buttons beside send. Keep it to one. */
    actions?: React.ReactNode;
    /** Notes or suggestions above the composer. */
    above?: React.ReactNode;
    /** Content below the composer, such as a caption or allowance note. */
    footer?: React.ReactNode;
};
/**
 * The AI prompt composer: a round leading bubble and a glass capsule whose field grows from one
 * line, with send inside at its trailing end. Tools appear on a second row while it has text or
 * focus. Enter sends; Shift+Enter adds a line.
 */
export declare function PromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, onStop, submitLabel, stopLabel, dropActive, submitDisabled, maxLength, maxLines, leading, attachments, tools, actions, above, footer, className, ...props }: PromptComposerProps): React.JSX.Element;
//# sourceMappingURL=composer.d.ts.map