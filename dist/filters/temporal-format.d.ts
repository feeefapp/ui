import { type Translate } from '../i18n-core.js';
import { type TemporalConfig, type TemporalType, type TemporalValue } from './temporal.js';
/** Display only; canonical form values remain local ISO strings. An open range end reads "Any" in `t`'s language. */
export declare function formatTemporalValue(type: TemporalType, value: TemporalValue, locale?: string, t?: Translate): string;
/**
 * Short text for a chosen value, e.g. on a filter chip: the label of the preset it equals (the
 * config's presets, else `temporalPresets(type, now)`), otherwise `formatTemporalValue`.
 */
export declare function temporalSummary(config: TemporalConfig, value: TemporalValue, locale?: string, now?: Date, t?: Translate): string;
//# sourceMappingURL=temporal-format.d.ts.map