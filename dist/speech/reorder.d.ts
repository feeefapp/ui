import { type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
/** Pointer movement stays off React's render path; the owner receives one history edit on drop. */
export declare function useSpeechReorder({ root, index, count, onMove, announce, }: {
    root: RefObject<HTMLElement | null>;
    index: number;
    count: number;
    onMove: (from: number, to: number) => void;
    announce: (message: string) => void;
}): {
    onPointerDown(event: PointerEvent<HTMLButtonElement>): void;
    onPointerMove(event: PointerEvent<HTMLButtonElement>): void;
    onPointerUp(event: PointerEvent<HTMLButtonElement>): void;
    onPointerCancel(): void;
    onLostPointerCapture(): void;
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void;
};
//# sourceMappingURL=reorder.d.ts.map