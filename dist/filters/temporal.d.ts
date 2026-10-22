/** What a temporal field or editor picks: a single value or a `from`/`to` range. */
export type LabTemporalType = 'date' | 'time' | 'datetime' | 'dateRange' | 'timeRange' | 'datetimeRange';
/** Local ISO string, `{ from, to }` range (either end may be `''`), or `null` for no value. */
export type LabTemporalValue = string | {
    from: string;
    to: string;
} | null;
/** A one-click choice shown beside the calendar. */
export type LabTemporalPreset = {
    /** Button text, also the preset's identity in the picker. */
    label: string;
    /** Value applied when the preset is chosen; `null` means "no filter". */
    value: LabTemporalValue;
};
/** Shared rules for a temporal field or editor. */
export type LabTemporalConfig = {
    /** Value shape and picker: date, time, datetime, or one of their `Range` forms. */
    type: LabTemporalType;
    /** Earliest allowed value, in the same ISO format as the value. Earlier days are disabled. */
    min?: string;
    /** Latest allowed value, in the same ISO format as the value. Later days are disabled. */
    max?: string;
    /** Allowed increment: days for dates, seconds for times and datetimes, counted from `min`. */
    step?: number;
    /** Time ranges only: lets the end time be earlier than the start (crossing midnight). */
    allowOvernight?: boolean;
    /** Quick choices; defaults to `temporalPresets(type)`. Presets that break the rules are hidden. */
    presets?: readonly LabTemporalPreset[];
};
export declare const isTemporalType: (type: string | undefined) => type is LabTemporalType;
/** True for the `…Range` types. */
export declare const isTemporalRange: (type: LabTemporalType) => boolean;
export declare const temporalInputType: (type: LabTemporalType) => "time" | "date" | "datetime-local";
/** Turns empty values (`''`, `{ from: '', to: '' }`) into `null`. */
export declare function normalizeTemporal(value: LabTemporalValue): LabTemporalValue;
/**
 * Checks a value against a config: ISO format and real calendar dates, `step`, `min`/`max`, and
 * range order. Returns an English error message, or `null` when the value (or `null`) is valid.
 */
export declare function validateTemporal(config: LabTemporalConfig, value: LabTemporalValue): string | null;
/**
 * Default presets for a type, computed from `now` in local wall-clock time (Today, Last 7 days,
 * Morning…). Feature owners choose timezone and query conversion.
 */
export declare function temporalPresets(type: LabTemporalType, now?: Date): LabTemporalPreset[];
/** Reads the value of a `LabTemporalFilterEditor` from its form's data (`date`, or `from`/`to`). */
export declare function readTemporalForm(type: LabTemporalType, data: FormData): LabTemporalValue;
//# sourceMappingURL=temporal.d.ts.map