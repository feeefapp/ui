export declare const calendarDate: (date: Date) => string;
export declare function parseCalendarDate(value: string): Date;
export declare function monthDays(year: number, month: number): (string | null)[];
export declare function chooseRangeDate(current: {
    from: string;
    to: string;
}, day: string, edge: 'from' | 'to'): {
    value: {
        from: string;
        to: string;
    };
    edge: "to";
} | {
    value: {
        from: string;
        to: string;
    };
    edge: "from";
};
//# sourceMappingURL=calendar-model.d.ts.map