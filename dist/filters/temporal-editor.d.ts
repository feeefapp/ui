import './calendar.css';
import { type ReactNode } from 'react';
import { type LabTemporalConfig, type LabTemporalValue } from './temporal.js';
export type LabTemporalEditorOptions = {
    /** Type, bounds, step and presets. Presets that fail `validateTemporal` are hidden. */
    config: LabTemporalConfig;
    /** Current draft value. */
    value: LabTemporalValue;
    /** Called on every pick, preset or edit. Nothing is validated or committed for you. */
    onChange: (value: LabTemporalValue) => void;
    /**
     * Called when a choice is complete on its own: a day in a date picker, or a preset. Hosts can
     * commit right away instead of waiting for Apply (LabDateField does).
     */
    onPick?: (value: LabTemporalValue) => void;
    /** BCP 47 locale for month, weekday and endpoint names. Defaults to the kit's i18n locale. */
    locale?: string;
    /** Changing it resets the visible month, the active end and typed entry (e.g. on every open). */
    resetKey?: unknown;
};
export type LabTemporalEditorState = ReturnType<typeof useLabTemporalEditor>;
/**
 * The picker's state, for hosts that place its parts apart: a dialog floats `LabTemporalPresets`
 * and `LabTemporalEdges` in its top bar and scrolls `LabTemporalBody`.
 */
export declare function useLabTemporalEditor({ config, value, onChange, onPick, locale: localeProp, resetKey, }: LabTemporalEditorOptions): {
    config: LabTemporalConfig;
    value: LabTemporalValue;
    locale: string;
    type: string;
    range: boolean;
    hasCalendar: boolean;
    hasTime: boolean;
    from: string;
    to: string;
    edge: "from" | "to";
    setEdge: import("react").Dispatch<import("react").SetStateAction<"from" | "to">>;
    month: string;
    setMonth: import("react").Dispatch<import("react").SetStateAction<string>>;
    manual: boolean;
    setManual: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    presets: import("./temporal.js").LabTemporalPreset[];
    dayOnly: (text: string) => string;
    choosePreset: (next: LabTemporalValue) => void;
    setPart: (part: "from" | "to", next: string) => void;
    pickDay: (day: string) => void;
    endpointText: (text: string) => string;
    setTime: (part: "from" | "to", time: string) => void;
    presetActive: (p: {
        value: LabTemporalValue;
    }) => boolean;
};
/**
 * Quick choices. `list` is a wrapping block of chips (popovers, menus); `bar` is one scrolling row
 * of toolbar buttons, meant to sit inside a glass group (dialog top bars).
 */
export declare function LabTemporalPresets({ editor, layout, }: {
    editor: LabTemporalEditorState;
    layout?: 'list' | 'bar';
}): import("react").JSX.Element | null;
/** The start/end switch of a date range; each side shows its chosen day. Nothing for other types. */
export declare function LabTemporalEdges({ editor, appearance, }: {
    editor: LabTemporalEditorState;
    /** `plain` when it sits inside a glass group of its own. */
    appearance?: 'plain';
}): import("react").JSX.Element | null;
/**
 * Calendars, times and typed entry, plus the hidden `date` or `from`/`to` inputs that
 * `readTemporalForm` reads back.
 */
export declare function LabTemporalBody({ editor, footer }: {
    editor: LabTemporalEditorState;
    footer?: ReactNode;
}): import("react").JSX.Element;
/**
 * The picker body without a trigger, all parts in one column: presets as chips, a start/end switch
 * for ranges, one or two calendars, number-field times and optional typed entry. Controlled; place
 * it in your own form or popover. In a dialog, use `LabTemporalDialog`, which floats the presets
 * and the switch in its top bar. It writes hidden `date` (single) or `from`/`to` (range) inputs
 * that `readTemporalForm` reads back.
 */
export declare function LabTemporalFilterEditor({ footer, ...options }: LabTemporalEditorOptions & {
    /** Shown at the end of the typed-entry row, e.g. a popover's own actions. */
    footer?: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=temporal-editor.d.ts.map