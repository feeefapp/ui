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
 * The image studio composer, built from the composer parts (`ComposerBar`): a round + bubble with
 * the add menu, and a glass capsule holding the reference thumbnails (the first is marked "Main"),
 * the prompt and send. Empty and idle it is one calm line with the AI ideas button beside send;
 * with text or focus, a second row shows the model ladder and the output settings chip, and the
 * AI button turns into "Improve my prompt".
 */
export declare function ImagePromptComposer({ prompt, onPrompt, placeholder, maxLength, references, referenceLimit, onAddFiles, onRemoveReference, recent, onUseRecent, onBrowseFiles, onEditPhoto, templates, templatesLabel, onTemplate, mode, templateName, onClearTemplate, onBrowseTemplates, ladder, settings, settingsLabel, settingsDisabled, onSettings, settingsActive, referenceNoun, wandLabel, enhancing, onEnhance, onSubmit, submitDisabled, submitting, submitLabel, onStop, stopLabel, caption, above, onKeyDown, }: {
    /** The prompt text (controlled). */
    prompt: string;
    /** Called with the new text on every edit. */
    onPrompt(value: string): void;
    /** Animated hint shown while the prompt is empty. */
    placeholder: string;
    /** Maximum prompt length in characters. */
    maxLength: number;
    /** Attached reference images, shown as thumbnails inside the capsule. The first is the main image. */
    references: ComposerReference[];
    /** `null` when the selected model takes no image input. `max` is shown as "1 of 3". */
    referenceLimit: {
        max: number;
        formats: string[];
    } | null;
    /** Called with files from upload, paste, clipboard or drop. The owner validates type and count. */
    onAddFiles(files: File[]): void;
    /** Called when a reference's × badge is pressed. */
    onRemoveReference(id: string): void;
    /** The user's earlier images for the "From your images" submenu (first 12). Empty hides it. */
    recent: RecentImage[];
    /** Called with the id of a recent image picked as a reference. */
    onUseRecent(id: string): void;
    /** Opens the host's file library ("From your files" after Paste); the host adds the chosen
     * images with its own `onAddFiles`. Absent hides the item. */
    onBrowseFiles?(): void;
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
    /** The poster template in use, shown as a wide tile before the references. */
    templateName?: string | null;
    /** Shows the template tile's × badge. */
    onClearTemplate?(): void;
    /** Replaces the template submenu with one entry that opens a full template browser. */
    onBrowseTemplates?(): void;
    /** The model control on the second row, usually `<ModelLadder variant="compact" … />`. */
    ladder: ReactNode;
    /** Content of the output settings popover (shape, resolution, format). */
    settings: ReactNode;
    /** Short summary of the current settings ("1:1"), shown on the settings chip. */
    settingsLabel: string;
    /** Disables the settings chip and closes its popover. */
    settingsDisabled?: boolean;
    /** When set, the settings chip toggles a panel the page owns instead of a popover. */
    onSettings?(): void;
    /** Pressed state of the settings chip when `onSettings` is set. */
    settingsActive?: boolean;
    /** What attached images are called in the + menu ("References", "Product photos"). */
    referenceNoun?: string;
    /** Overrides the AI button's label (posters suggest details instead of rewriting the prompt). */
    wandLabel?: string;
    /** The AI request in flight, or `''` when idle. Shows a loader on the AI button. */
    enhancing: '' | 'enhance' | 'ideas';
    /** Improve the prompt, or suggest ideas when it is empty. Omit to hide the AI button. */
    onEnhance?(mode: 'enhance' | 'ideas'): void;
    /** Called by send and by Enter (Shift+Enter breaks the line). */
    onSubmit(): void;
    /** Disables sending. */
    submitDisabled: boolean;
    /** A generation is being sent: send shows the loader. */
    submitting: boolean;
    /** Accessible name of send, such as "Create image". */
    submitLabel: string;
    /** While submitting, send becomes a stop button that calls this. */
    onStop?(): void;
    /** Accessible name of send while it stops. Defaults to the localized "Stop". */
    stopLabel?: string;
    /** Small text under the composer, such as price or allowance. */
    caption: ReactNode;
    /** Suggestion cards shown right above the composer (AI proposals, conflicts). */
    above?: ReactNode;
    /** Runs before the built-in Enter handling; call `preventDefault()` to skip it. */
    onKeyDown?(event: KeyboardEvent): void;
}): import("react").JSX.Element;
//# sourceMappingURL=prompt-composer.d.ts.map