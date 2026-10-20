export type SpringState = {
    position: number;
    velocity: number;
};
/** Stable semi-implicit integration in bounded substeps, including after a suspended tab. */
export declare function stepSpring(state: SpringState, target: number, elapsed: number, stiffness?: number, damping?: number): SpringState;
//# sourceMappingURL=spring-core.d.ts.map