/** Viewport coordinates require a viewport layer, not an inline panel's transformed ancestor.
 * Only actual modal dialogs need their own top layer; ordinary desktop panel dialogs do not.
 */
export declare function movingBrandLayer<T>(anchor: {
    closest: (selector: string) => T | null;
} | null, body: T): T;
//# sourceMappingURL=moving-brand-model.d.ts.map