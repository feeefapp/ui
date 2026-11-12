import { type RefObject } from 'react';
/** The default shell gap G in px, before a theme's `metrics.shellGap` resolves. */
export declare const SHELL_GAP_DEFAULT = 8;
/**
 * `--lab-shell-gap` (the one chrome gap G) in px as `element` resolves it (the document root
 * without one); themes change it through `metrics.shellGap`. Re-read after every render, so a
 * theme change that re-renders picks it up.
 */
export declare function useShellGap(element?: RefObject<HTMLElement | null>): number;
//# sourceMappingURL=shell-gap.d.ts.map