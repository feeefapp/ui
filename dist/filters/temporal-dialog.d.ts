import type { FormEventHandler, ReactNode, RefObject } from 'react';
import { type TemporalEditorOptions } from './temporal-editor.js';
import './temporal-dialog.css';
/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export declare function TemporalDialog({ open, label, close, returnFocusRef, formId, onSubmit, onClear, clearLabel, clearDisabled, applyLabel, showApply, error, intro, dir, className, ...options }: TemporalEditorOptions & {
    /** Shows the dialog. Changing it also resets the editor's month and active end. */
    open: boolean;
    /** Accessible name of the dialog. */
    label: string;
    /** Called by Cancel, Escape and the backdrop. */
    close: () => void;
    /** Focus target after closing, usually the trigger. */
    returnFocusRef?: RefObject<HTMLElement | null>;
    /** Id of the form that Apply submits. */
    formId: string;
    /** The form's submit handler: validate, commit and close. */
    onSubmit: FormEventHandler<HTMLFormElement>;
    /** Clear action; omitted means no Clear button. */
    onClear?: () => void;
    clearLabel?: string;
    clearDisabled?: boolean;
    applyLabel?: string;
    /** False for pickers that commit on pick (a single date). */
    showApply?: boolean;
    /** Validation message shown under the calendars. */
    error?: ReactNode;
    /** Optional sentence above the calendars. */
    intro?: ReactNode;
    dir?: 'ltr' | 'rtl';
    className?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=temporal-dialog.d.ts.map