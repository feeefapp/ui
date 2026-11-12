/** Frozen legacy decoration adapter. New controls must supply an explicit variant.
 * Kept separate so old Voice class names retain their exact existing rendering.
 */
export function legacyButtonHasTexture(className = '') {
    return /lab-dark|selected|lab-discover-voice|lab-plan-tile/.test(className);
}
//# sourceMappingURL=button-compat.js.map