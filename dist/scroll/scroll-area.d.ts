import { type ReactNode, type HTMLAttributes } from 'react';
import './scroll.css';
export type LabScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    children: ReactNode;
    top?: ReactNode;
    bottom?: ReactNode;
    label: string;
    edgeGap?: number;
    contentPadding?: number;
    gradient?: boolean;
    topFadeHeight?: number;
    bottomFadeHeight?: number;
    /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
    viewportProps?: HTMLAttributes<HTMLDivElement>;
};
/** Full-bleed scroll viewport with local floating chrome, measured spacers and edge washes. */
export declare const LabScrollArea: import("react").ForwardRefExoticComponent<Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    children: ReactNode;
    top?: ReactNode;
    bottom?: ReactNode;
    label: string;
    edgeGap?: number;
    contentPadding?: number;
    gradient?: boolean;
    topFadeHeight?: number;
    bottomFadeHeight?: number;
    /** Attributes/events for the actual scroll viewport; the forwarded ref points here too. */
    viewportProps?: HTMLAttributes<HTMLDivElement>;
} & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=scroll-area.d.ts.map