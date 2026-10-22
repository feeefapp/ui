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
    /** The prompt text (controlled). */
    prompt: string;
    /** Called with the new text on every edit. */
    onPrompt(value: string): void;
    /** Animated hint shown while the prompt is empty. */
    placeholder: string;
    /** Maximum prompt length in characters. */
    maxLength: number;
    /** Attached reference images, shown as chips above the card. The first is the main image. */
    references: ComposerReference[];
    /** `null` when the selected model takes no image input. */
    referenceLimit: {
        max: number;
        formats: string[];
    } | null;
    /** Called with files from upload, paste, clipboard or drop. The owner validates type and count. */
    onAddFiles(files: File[]): void;
    /** Called when a reference chip is removed. */
    onRemoveReference(id: string): void;
    /** The user's earlier images for the "From your images" submenu (first 12). Empty hides it. */
    recent: RecentImage[];
    /** Called with the id of a recent image picked as a reference. */
    onUseRecent(id: string): void;
    /** Called with the photo chosen from "Edit a photo…". */
    onEditPhoto(file: File): void;
    /** Prompt ideas for the + menu (first 10). Empty hides the submenu. */
    templates: ComposerTemplate[];
    /** Label of the ideas submenu. Defaults to the localized "Start from an idea". */
    templatesLabel?: string;
    /** Called with the idea the user picked. */
    onTemplate(template: ComposerTemplate): void;
    /** Image makes one picture; Poster builds a tall landing-page image from the brief. */
    mode: 'image' | 'poster';
    /** The poster template in use, shown as a chip above the card. */
    templateName?: string | null;
    onClearTemplate?(): void;
    /** Replaces the template submenu with one entry that opens a full template browser. */
    onBrowseTemplates?(): void;
    /** Renders the model control for a slot, usually a ModelLadder with that variant. */
    ladder(variant: 'icon' | 'chip'): ReactNode;
    /** Content of the output settings popover (shape, resolution, format). */
    settings: ReactNode;
    /** Short summary of the current settings, used in the settings button's label. */
    settingsLabel: string;
    /** Disables the settings button and closes its popover. */
    settingsDisabled?: boolean;
    /** When set, the settings button toggles a panel the page owns instead of a popover. */
    onSettings?(): void;
    /** Pressed state of the settings button when `onSettings` is set. */
    settingsActive?: boolean;
    /** What attached images are called in the + menu ("References", "Product photos"). */
    referenceNoun?: string;
    /** Overrides the wand's label (posters suggest details instead of rewriting the prompt). */
    wandLabel?: string;
    /** The AI wand request in flight, or `''` when idle. Shows a loader on the wand. */
    enhancing: '' | 'enhance' | 'ideas';
    /** Improve the prompt, or suggest ideas when it is empty. */
    onEnhance?(mode: 'enhance' | 'ideas'): void;
    /** Called by the send button and by Enter (Shift+Enter breaks the line). */
    onSubmit(): void;
    /** Disables sending. */
    submitDisabled: boolean;
    /** A generation is being sent: the send button shows a loader and is disabled. */
    submitting: boolean;
    /** Accessible name of the send button, such as "Create image". */
    submitLabel: string;
    /** Small text under the card, such as price or allowance. */
    caption: ReactNode;
    /** Suggestion cards shown right above the card (AI proposals, conflicts). */
    above?: ReactNode;
    /** Runs before the built-in Enter handling; call `preventDefault()` to skip it. */
    onKeyDown?(event: KeyboardEvent): void;
}): import("react").JSX.Element;
//# sourceMappingURL=prompt-composer.d.ts.map