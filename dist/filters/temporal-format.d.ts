import { type TemporalConfig, type TemporalType, type TemporalValue } from './temporal.js';
/** Display only; canonical form values remain local ISO strings. */
export declare function formatTemporalValue(type: TemporalType, value: TemporalValue, locale?: string): string;
/**
 * Short text for a chosen value, e.g. on a filter chip: the label of the preset it equals (the
 * config's presets, else `temporalPresets(type, now)`), otherwise `formatTemporalValue`.
 */
export declare function temporalSummary(config: TemporalConfig, value: TemporalValue, locale?: string, now?: Date): string;
//# sourceMappingURL=temporal-format.d.ts.map