import * as React from 'react';
import './composer.css';
export { useComposerLayout } from './use-composer-layout.js';
/** Shared Chat/Image card. Domain-specific controls remain in named layout slots. */
export declare const ComposerCard: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    /** Two-row layout (field above, tools below) instead of one line. Sets `data-expanded`. */
    expanded?: boolean;
    /** Ref to the inner layout grid, for `useComposerLayout`. */
    layoutRef?: React.Ref<HTMLDivElement>;
    /** Class for the inner layout grid. */
    layoutClassName?: string;
    /** Content inside the card, above the layout grid. */
    above?: React.ReactNode;
} & React.RefAttributes<HTMLDivElement>>;
/** Placeholder that fades in word by word. Decorative (`aria-hidden`); label the field separately. */
export declare function ComposerHint({ text }: {
    /** The hint text. Changing it replays the animation. */
    text: string;
}): React.JSX.Element;
export type PromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
    /** The prompt text (controlled). */
    value: string;
    /** Called with the new text on every edit. */
    onValueChange: (value: string) => void;
    /** Called on Enter or form submit, only when the prompt is not blank and submitting is allowed. */
    onSubmit: () => void;
    /** Accessible name of the text field. */
    label: string;
    /** Animated hint shown while the field is empty. */
    placeholder?: string;
    /** Disables the field and blocks submitting. */
    disabled?: boolean;
    /** Request in flight: the field turns read-only, the form sets `aria-busy` and submitting is blocked. */
    busy?: boolean;
    /** Highlight the card only while a compatible file is dragged over the drop target. */
    dropActive?: boolean;
    /** Blocks submitting without disabling the field. */
    submitDisabled?: boolean;
    /** Maximum prompt length in characters. */
    maxLength?: number;
    /** Files, references, mask controls or a contextual note above the input card. */
    above?: React.ReactNode;
    /** Attach, record, model and task controls. Their behavior stays with the host. */
    tools?: React.ReactNode;
    /** Host-supplied shared submit/stop/compare controls, with their own permissions. */
    submit: React.ReactNode;
    /** Content below the card, such as a caption or allowance note. */
    footer?: React.ReactNode;
    /** Change it when slot content changes size, so the layout re-measures. */
    contentRevision?: unknown;
};
/** Canonical measured Lab composer with stable caret, growing input and responsive tool slots. */
export declare function PromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, dropActive, submitDisabled, maxLength, above, tools, submit, footer, contentRevision, className, ...props }: PromptComposerProps): React.JSX.Element;
//# sourceMappingURL=composer.d.ts.map