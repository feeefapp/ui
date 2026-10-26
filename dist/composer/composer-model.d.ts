/**
 * Pure rules of the composer family (PromptComposer, ImagePromptComposer). The Flutter twin is
 * `flutter/lib/composer/composer_model.dart`; `tests/composer.test.ts` and its Dart twin keep them
 * in step.
 */
/** The places inside the capsule, top to bottom: attachments, the field, then tools · actions · send. */
export type ComposerSlotName = 'attachments' | 'field' | 'tools' | 'actions' | 'send';
/** Where a slot is drawn, in the capsule's own pixels: its offset, height and opacity. */
export type ComposerSlotBox = {
    x: number;
    y: number;
    height: number;
    opacity: number;
};
/** The capsule at one moment: its height and every slot that is on screen. */
export type ComposerLayoutSnapshot = {
    height: number;
    slots: Partial<Record<ComposerSlotName, ComposerSlotBox>>;
};
/**
 * Whether the capsule shows its second row (tools beside the actions and send). Calm while empty
 * and idle; open while it has text, while focus is inside, or while one of its menus or panels is
 * open (`pinned`), so a control never disappears under the pointer.
 */
export declare function composerExpanded(state: {
    hasText: boolean;
    focusWithin: boolean;
    pinned: boolean;
}): boolean;
/** What the send button shows: a quiet neutral circle, the primary arrow, a loader, or a loader that stops. */
export type ComposerSendState = 'idle' | 'ready' | 'sending' | 'stop';
export declare function composerSendState(state: {
    ready: boolean;
    submitting: boolean;
    stoppable: boolean;
}): ComposerSendState;
/**
 * One frame of a layout change, driven by one spring progress `p` (0 → 1, may overshoot): the
 * capsule's height and, per slot in `to`, how far to draw it from its laid-out place and how tall
 * and opaque. Mixing in the capsule's own coordinates keeps anchoring right: a capsule pinned at
 * its top grows down and its send button moves down; one pinned at its bottom (a floating
 * composer) grows up and its send button stays still. A slot new in `to` fades in where it lands.
 */
export declare function composerFrame(from: ComposerLayoutSnapshot, to: ComposerLayoutSnapshot, p: number): {
    height: number;
    slots: Partial<Record<ComposerSlotName, {
        dx: number;
        dy: number;
        height: number;
        opacity: number;
    }>>;
};
/** True when two snapshots draw the same (nothing worth animating). */
export declare function composerSameLayout(a: ComposerLayoutSnapshot, b: ComposerLayoutSnapshot): boolean;
/** The current frame as a snapshot, so an interrupted change continues from what is on screen. */
export declare function composerFrameSnapshot(from: ComposerLayoutSnapshot, to: ComposerLayoutSnapshot, p: number): ComposerLayoutSnapshot;
//# sourceMappingURL=composer-model.d.ts.map