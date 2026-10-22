import * as React from 'react';
import { type LabSpring } from './spring.js';
type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Where each element is on screen now (transforms included), to animate from after a change. */
export declare function snapshotLayout(elements: Iterable<HTMLElement>): Map<HTMLElement, Box>;
/**
 * FLIP on springs: animates each element from its box in `before` to where layout now puts it.
 * Call it after the DOM changed (a layout effect). Elements mid-flight keep their speed. With
 * `size`, an element also scales from its old size (use it for media and plain shapes).
 */
export declare function animateLayoutFrom(before: Map<HTMLElement, Box>, options?: {
    spring?: LabSpring;
    size?: (el: HTMLElement) => boolean;
}): void;
export type LabLayoutGroupProps = {
    /** The subtree to watch. Elements with `data-lab-layout-id` move; ids must be unique in the group. */
    children: React.ReactNode;
    /** Animate only when this value changes (cheaper on busy screens). Default: after every render. */
    layoutKey?: unknown;
    /** Spring for movement. Default `snappy`. */
    spring?: LabSpring;
    /** Elements that are new in a render fade and scale in. Default true. */
    animateEnter?: boolean;
};
/**
 * Shared-element layout transitions (FLIP on springs): after each render, every element marked
 * `data-lab-layout-id` that moved animates from where it was to where it now is, even into
 * another container inside the group. Mark an element `data-lab-layout="size"` to animate its
 * size too (it scales, so prefer it for media and plain shapes). An interrupted move continues
 * from where it is on screen at the speed it had, so rapid changes never jump.
 */
export declare class LabLayoutGroup extends React.Component<LabLayoutGroupProps> {
    private root;
    private elements;
    getSnapshotBeforeUpdate(previous: LabLayoutGroupProps): Map<string, Box> | null;
    componentDidUpdate(_: LabLayoutGroupProps, __: unknown, before: Map<string, Box> | null): void;
    render(): React.JSX.Element;
}
export {};
//# sourceMappingURL=layout-group.d.ts.map