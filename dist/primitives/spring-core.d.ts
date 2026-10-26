export type StepSpringState = {
    position: number;
    velocity: number;
};
/** Stable semi-implicit integration in bounded substeps, including after a suspended tab. */
export declare function stepSpring(state: StepSpringState, target: number, elapsed: number, stiffness?: number, damping?: number): StepSpringState;
//# sourceMappingURL=spring-core.d.ts.map