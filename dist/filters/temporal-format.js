import { parseCalendarDate } from './calendar-model.js';
import { normalizeTemporal, temporalInputType, validateTemporal, } from './temporal.js';
/** Display only; canonical form values remain local ISO strings. */
export function formatTemporalValue(type, value, locale) {
    if (value == null || !normalizeTemporal(value))
        return '';
    const input = temporalInputType(type);
    const part = (text) => {
        if (!text)
            return 'Any';
        const singleType = type.replace('Range', '');
        if (validateTemporal({ type: singleType }, text))
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
//# sourceMappingURL=temporal-format.js.map