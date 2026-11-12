import { type RefObject } from 'react';
import type { MotionValue } from '../physics/motion-value.js';
/**
 * Starts a `ScrollArea`'s refresh from code (a Refresh button, a keyboard shortcut) with the same
 * loader a pull shows, and tells whether one is running. Create one with `useRefreshController()`
 * and pass it as the area's `refreshController`. The Flutter twin is `RefreshController`.
 */
export declare class RefreshController {
    private run;
    private busy;
    private listeners;
    /** True while a refresh runs. */
    get refreshing(): boolean;
    /**
     * Runs the area's `onRefresh` with the loader showing; resolves when it settles. Does nothing
     * while one is running or when no area is attached.
     */
    refresh(): Promise<void>;
    /** Calls `listener` when `refreshing` changes. Returns an unsubscribe function. */
    subscribe(listener: () => void): () => void;
    /** @internal The area that runs refreshes. */
    attach(run: (() => Promise<void>) | null): void;
    /** @internal */
    setRefreshing(busy: boolean): void;
}
/** A `RefreshController` that lives as long as the component. */
export declare function useRefreshController(): RefreshController;
type PullState = 'idle' | 'refreshing' | 'done';
/**
 * Pull to refresh on a scroll viewport: touch only (a mouse never pulls). Moves the viewport down
 * by the pull and returns its motion value and status for the indicator.
 */
export declare function usePullToRefresh(viewport: RefObject<HTMLDivElement | null>, onRefresh: (() => Promise<unknown>) | undefined, controller: RefreshController | undefined): {
    pull: MotionValue;
    state: PullState;
};
/**
 * The loader in the gap a pull opens, just below the area's top reservation: squares light up as
 * the pull nears its threshold, then the wave runs while refreshing. A polite live region
 * announces the refresh and its end.
 */
export declare function PullRefreshIndicator({ pull, state }: {
    pull: MotionValue;
    state: PullState;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=pull-refresh.d.ts.map