/** What a temporal field or editor picks: a single value or a `from`/`to` range. */
export type TemporalType = 'date' | 'time' | 'datetime' | 'dateRange' | 'timeRange' | 'datetimeRange';
/** Local ISO string, `{ from, to }` range (either end may be `''`), or `null` for no value. */
export type TemporalValue = string | {
    from: string;
    to: string;
} | null;
/** A one-click choice shown beside the calendar. */
export type TemporalPreset = {
    /** Button text, also the preset's identity in the picker. */
    label: string;
    /** Value applied when the preset is chosen; `null` means "no filter". */
    value: TemporalValue;
};
/** Shared rules for a temporal field or editor. */
export type TemporalConfig = {
    /** Value shape and picker: date, time, datetime, or one of their `Range` forms. */
    type: TemporalType;
    /** Earliest allowed value, in the same ISO format as the value. Earlier days are disabled. */
    min?: string;
    /** Latest allowed value, in the same ISO format as the value. Later days are disabled. */
    max?: string;
    /** Allowed increment: days for dates, seconds for times and datetimes, counted from `min`. */
    step?: number;
    /** Time ranges only: lets the end time be earlier than the start (crossing midnight). */
    allowOvernight?: boolean;
    /** Quick choices; defaults to `temporalPresets(type)`. Presets that break the rules are hidden. */
    presets?: readonly TemporalPreset[];
};
export declare const isTemporalType: (type: string | undefined) => type is TemporalType;
/** True for the `…Range` types. */
export declare const isTemporalRange: (type: TemporalType) => boolean;
export declare const temporalInputType: (type: TemporalType) => "time" | "date" | "datetime-local";
/** Turns empty values (`''`, `{ from: '', to: '' }`) into `null`. */
export declare function normalizeTemporal(value: TemporalValue): TemporalValue;
/**
 * Checks a value against a config: ISO format and real calendar dates, `step`, `min`/`max`, and
 * range order. Returns an English error message, or `null` when the value (or `null`) is valid.
 */
export declare function validateTemporal(config: TemporalConfig, value: TemporalValue): string | null;
/**
 * Default presets for a type, computed from `now` in local wall-clock time (Today, Last 7 days,
 * Morning…). Feature owners choose timezone and query conversion.
 */
export declare function temporalPresets(type: TemporalType, now?: Date): TemporalPreset[];
/** Reads the value of a `TemporalFilterEditor` from its form's data (`date`, or `from`/`to`). */
export declare function readTemporalForm(type: TemporalType, data: FormData): TemporalValue;
//# sourceMappingURL=temporal.d.ts.map