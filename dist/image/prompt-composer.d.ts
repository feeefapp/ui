import { type KeyboardEvent, type ReactNode } from 'react';
import './prompt-composer.css';
export type ComposerReference = {
    id: string;
    url: string;
    name: string;
};
export type ComposerTemplate = {
    id: string;
    name: string;
    prompt: string;
    description?: string;
};
export type RecentImage = {
    id: string;
    thumbUrl: string;
    prompt: string;
};
/**
 * The image studio composer, after marchant `image_gen_view` `_buildComposer`: an attachment
 * row above a glass card that is one compact line until you type, then grows upward with its
 * controls on a second row. Model ladder, AI enhance, output settings and send are icon controls.
 */
export declare function PromptComposer({ prompt, onPrompt, placeholder, maxLength, references, referenceLimit, onAddFiles, onRemoveReference, recent, onUseRecent, onEditPhoto, templates, templatesLabel, onTemplate, mode, templateName, onClearTemplate, onBrowseTemplates, ladder, settings, settingsLabel, settingsDisabled, onSettings, settingsActive, referenceNoun, wandLabel, enhancing, onEnhance, onSubmit, submitDisabled, submitting, submitLabel, caption, above, onKeyDown, }: {
    prompt: string;
    onPrompt(value: string): void;
    placeholder: string;
    maxLength: number;
    references: ComposerReference[];
    /** `null` when the selected model takes no image input. */
    referenceLimit: {
        max: number;
        formats: string[];
    } | null;
    onAddFiles(files: File[]): void;
    onRemoveReference(id: string): void;
    recent: RecentImage[];
    onUseRecent(id: string): void;
    onEditPhoto(file: File): void;
    templates: ComposerTemplate[];
    templatesLabel?: string;
    onTemplate(template: ComposerTemplate): void;
    /** Image makes one picture; Poster builds a tall landing-page image from the brief. */
    mode: 'image' | 'poster';
    /** The poster template in use, shown as a chip above the card. */
    templateName?: string | null;
    onClearTemplate?(): void;
    /** Replaces the template submenu with one entry that opens a full template browser. */
    onBrowseTemplates?(): void;
    ladder(variant: 'icon' | 'chip'): ReactNode;
    settings: ReactNode;
    settingsLabel: string;
    settingsDisabled?: boolean;
    /** When set, the settings button toggles a panel the page owns instead of a popover. */
    onSettings?(): void;
    settingsActive?: boolean;
    /** What attached images are called in the + menu ("References", "Product photos"). */
    referenceNoun?: string;
    /** Overrides the wand's label (posters suggest details instead of rewriting the prompt). */
    wandLabel?: string;
    enhancing: '' | 'enhance' | 'ideas';
    /** Improve the prompt, or suggest ideas when it is empty. */
    onEnhance?(mode: 'enhance' | 'ideas'): void;
    onSubmit(): void;
    submitDisabled: boolean;
    submitting: boolean;
    submitLabel: string;
    caption: ReactNode;
    /** Suggestion cards shown right above the card (AI proposals, conflicts). */
    above?: ReactNode;
    onKeyDown?(event: KeyboardEvent): void;
}): import("react").JSX.Element;
//# sourceMappingURL=prompt-composer.d.ts.map