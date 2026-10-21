import * as React from 'react';
import './composer.css';
export { useComposerLayout } from './use-composer-layout.js';
/** Shared Chat/Image card. Domain-specific controls remain in named layout slots. */
export declare const LabComposerCard: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
    expanded?: boolean;
    layoutRef?: React.Ref<HTMLDivElement>;
    layoutClassName?: string;
    above?: React.ReactNode;
} & React.RefAttributes<HTMLDivElement>>;
export declare function LabComposerHint({ text }: {
    text: string;
}): React.JSX.Element;
export type LabPromptComposerProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange' | 'children'> & {
    value: string;
    onValueChange: (value: string) => void;
    onSubmit: () => void;
    label: string;
    placeholder?: string;
    disabled?: boolean;
    busy?: boolean;
    submitDisabled?: boolean;
    maxLength?: number;
    /** Files, references, mask controls or a contextual note above the input card. */
    above?: React.ReactNode;
    /** Attach, record, model and task controls. Their behavior stays with the host. */
    tools?: React.ReactNode;
    /** Host-supplied shared submit/stop/compare controls, with their own permissions. */
    submit: React.ReactNode;
    footer?: React.ReactNode;
    contentRevision?: unknown;
};
/** Canonical measured Lab composer with stable caret, growing input and responsive tool slots. */
export declare function LabPromptComposer({ value, onValueChange, onSubmit, label, placeholder, disabled, busy, submitDisabled, maxLength, above, tools, submit, footer, contentRevision, className, ...props }: LabPromptComposerProps): React.JSX.Element;
//# sourceMappingURL=composer.d.ts.map