import { type CSSProperties } from 'react';
/** Measure unconstrained content against the host, not against an in-flight animated shell. */
export declare function useDockSize(): {
    host: import("react").RefObject<HTMLDivElement | null>;
    actionsMaxWidth: number | undefined;
    surface: import("react").RefObject<HTMLElement | null>;
    body: import("react").RefObject<HTMLDivElement | null>;
    shellStyle: {
        width: number;
        height: number;
    } | undefined;
    bodyStyle: CSSProperties;
};
//# sourceMappingURL=use_dock_size.d.ts.map