/**
 * One month grid. The heading is a plain row on the host surface: previous, a title that opens a
 * month/year grid, next. Days support arrow, Home/End and Page Up/Down navigation; a range paints one continuous band.
 */
export declare function CalendarMonth({ month, onMonthChange, from, to, min, max, onSelect, locale, label, navigation, }: {
    /** Visible month as `YYYY-MM`. */
    month: string;
    /** Called when the person pages or picks another month or year. */
    onMonthChange: (month: string) => void;
    /** Selected day, or range start, as `YYYY-MM-DD`. */
    from: string;
    /** Range end as `YYYY-MM-DD`; days between `from` and `to` are tinted. */
    to?: string;
    /** Earliest selectable day; earlier days are disabled. */
    min?: string;
    /** Latest selectable day; later days are disabled. */
    max?: string;
    /** Called with the chosen day as `YYYY-MM-DD`. */
    onSelect: (date: string) => void;
    /** Locale for month, weekday and day names. */
    locale?: string;
    /** Accessible name of the month region. */
    label?: string;
    /** Which paging arrows this month shows; two side-by-side months show one each. */
    navigation?: 'both' | 'previous' | 'next';
}): import("react").JSX.Element;
//# sourceMappingURL=calendar.d.ts.map