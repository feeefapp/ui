export const calendarDate = (date) => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function parseCalendarDate(value) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date;
}
export function monthDays(year, month) {
    const first = new Date(year, month, 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
        const day = index - offset + 1;
        return day < 1 || day > count ? null : calendarDate(new Date(year, month, day, 12));
    });
}
export function chooseRangeDate(current, day, edge) {
    if (edge === 'from' || !current.from || day < current.from)
        return { value: { from: day, to: '' }, edge: 'to' };
    return { value: { from: current.from, to: day }, edge: 'from' };
}
//# sourceMappingURL=calendar-model.js.map