import { type ReactNode } from 'react';
import './speech.css';
/** Only the handle drags. Text editing, selection and viewport scrolling stay native. */
export declare function LabSpeechBlock({ children, toolbar, index, count, onMove, seed, reorderDisabled, }: {
    children: ReactNode;
    toolbar?: ReactNode;
    index: number;
    count: number;
    seed: string;
    reorderDisabled?: boolean;
    onMove: (from: number, to: number) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=block.d.ts.map