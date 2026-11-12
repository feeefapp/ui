import { englishText } from '../i18n-core.js';
import { parseCalendarDate } from './calendar-model.js';
import { normalizeTemporal, temporalInputType, temporalPresets, validateTemporal, } from './temporal.js';
/** Display only; canonical form values remain local ISO strings. An open range end reads "Any" in `t`'s language. */
export function formatTemporalValue(type, value, locale, t = englishText) {
    if (value == null || !normalizeTemporal(value))
        return '';
    const input = temporalInputType(type);
    const part = (text) => {
        if (!text)
            return t('lab.filter.any');
        const singleType = type.replace('Range', '');
        if (validateTemporal({ type: singleType }, text, t))
            return text;
        if (input === 'time')
            return text;
        const date = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(parseCalendarDate(text));
        return input === 'datetime-local' ? `${date}, ${text.split('T')[1]}` : date;
    };
    return typeof value === 'string' ? part(value) : `${part(value.from)} – ${part(value.to)}`;
}
/**
 * Short text for a chosen value, e.g. on a filter chip: the label of the preset it equals (the
 * config's presets, else `temporalPresets(type, now)`), otherwise `formatTemporalValue`.
 */
export function temporalSummary(config, value, locale, now = new Date(), t = englishText) {
    if (normalizeTemporal(value) == null)
        return t('lab.filter.any');
    const preset = (config.presets ?? temporalPresets(config.type, now, t)).find((p) => JSON.stringify(normalizeTemporal(p.value)) === JSON.stringify(value) &&
        !validateTemporal(config, p.value, t));
    return preset?.label ?? formatTemporalValue(config.type, value, locale, t);
}
//# sourceMappingURL=temporal-format.js.map