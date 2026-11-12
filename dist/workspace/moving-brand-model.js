/** Viewport coordinates require a viewport layer, not an inline panel's transformed ancestor.
 * Only actual modal dialogs need their own top layer; ordinary desktop panel dialogs do not.
 */
export function movingBrandLayer(anchor, body) {
    return anchor?.closest('dialog:modal') ?? body;
}
//# sourceMappingURL=moving-brand-model.js.map