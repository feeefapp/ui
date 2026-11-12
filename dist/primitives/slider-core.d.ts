/** Shared numeric contract for pointer, keyboard and programmatic values. */
export declare function sliderRange(min?: number, max?: number, step?: number): {
    min: number;
    max: number;
    step: number;
};
export declare function sliderValue(value: number, min: number, max: number, step: number): number;
export declare function sliderFraction(value: number, min: number, max: number): number;
export declare function sliderPointer(clientX: number, left: number, width: number, rtl: boolean, inset?: number): number;
export declare function sliderKey(key: string, value: number, min: number, max: number, step: number, rtl: boolean): number | null;
//# sourceMappingURL=slider-core.d.ts.map