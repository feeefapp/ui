/** Move the original object, including its voice/delivery settings, in one undoable edit. */
export declare function moveSpeechBlock<T>(blocks: T[], from: number, to: number): T[];
/** Follow identity through reorder, removal, undo and redo; new drafts start at block zero. */
export declare function remapSpeechIndex(index: number, previousKeys: string[], nextKeys: string[]): number;
/** Measured slots keep mixed-height cards and their gaps intact during a live preview. */
export declare function speechPreviewOffsets(items: {
    top: number;
    height: number;
}[], from: number, to: number): number[];
/** Hit testing uses the unclamped grab delta, so a tall card can reach a short final slot. */
export declare function speechDragIndex(items: {
    top: number;
    height: number;
}[], from: number, delta: number): number;
//# sourceMappingURL=block-order.d.ts.map