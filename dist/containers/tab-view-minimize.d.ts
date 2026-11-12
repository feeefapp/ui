/**
 * The tab bar's minimize morph as pure geometry (twin: flutter/lib/containers/tab_view_minimize.dart).
 * One progress value runs from 0 (the full bar, the accessory above it) to 1 (the selected tab as a
 * round bubble at the leading edge, the accessory filling the rest of the row). Scrolling moves the
 * progress; every frame places the pieces between the boxes measured at rest.
 */
export type MinimizeBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Boxes measured with the bar full, in the chrome's coordinates. */
export type MinimizeBoxes = {
    chrome: MinimizeBox;
    bar: MinimizeBox;
    /** The tabs' resting width: held while minimizing, the bar clips them. */
    track: number;
    /** The selected tab. */
    option: MinimizeBox;
    /** How far the selected tab's icon is from the tab's centre (it moves there as the label goes). */
    icon: {
        dx: number;
        dy: number;
    };
    accessory: MinimizeBox | null;
    /** Space between the accessory and the bar. */
    gap: number;
    rtl: boolean;
};
export type MinimizeFrame = {
    bar: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    accessory: {
        x: number;
        y: number;
        width: number;
    } | null;
    /** Moves the tabs so the selected one ends centred in the round bubble. */
    trackShift: {
        x: number;
        y: number;
    };
    /** Moves the selected icon to the centre of its tab. */
    icon: {
        dx: number;
        dy: number;
    };
};
/** Scroll distance (px) that takes the bar from full to minimized. */
export declare const MINIMIZE_DISTANCE = 56;
/** Scrolling back up restores it over a shorter distance, so the bar returns readily. */
export declare const RESTORE_DISTANCE = 40;
/** The minimized bubble's diameter (iOS 27: a 40pt tab in a 48pt glass circle), centred on the
 * line the full bar sat on. */
export declare const MINIMIZED_SIZE = 48;
/** Within this distance of the top the bar can't be more minimized than the scroll position allows. */
export declare const MINIMIZE_TOP = 24;
/** The progress after the content scrolled by `delta` px to `top`. */
export declare function minimizeProgress(progress: number, delta: number, top: number): number;
/** Where the pieces sit at progress `t`. */
export declare function minimizeGeometry(at: MinimizeBoxes, t: number): MinimizeFrame;
//# sourceMappingURL=tab-view-minimize.d.ts.map