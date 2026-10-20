export type LabTemporalType = 'date' | 'time' | 'datetime' | 'dateRange' | 'timeRange' | 'datetimeRange';
export type LabTemporalValue = string | {
    from: string;
    to: string;
} | null;
export type LabTemporalPreset = {
    label: string;
    value: LabTemporalValue;
};
export type LabTemporalConfig = {
    type: LabTemporalType;
    min?: string;
    max?: string;
    step?: number;
    allowOvernight?: boolean;
    presets?: readonly LabTemporalPreset[];
};
export declare const isTemporalType: (type: string | undefined) => type is LabTemporalType;
export declare const isTemporalRange: (type: LabTemporalType) => boolean;
export declare const temporalInputType: (type: LabTemporalType) => "time" | "date" | "datetime-local";
export declare function normalizeTemporal(value: LabTemporalValue): LabTemporalValue;
export declare function validateTemporal(config: LabTemporalConfig, value: LabTemporalValue): string | null;
/** Local wall-clock presets; feature owners choose timezone/query conversion. */
export declare function temporalPresets(type: LabTemporalType, now?: Date): LabTemporalPreset[];
export declare function readTemporalForm(type: LabTemporalType, data: FormData): LabTemporalValue;
//# sourceMappingURL=temporal.d.ts.map