import { type ReactNode } from 'react';
import './theme.css';
import './system.css';
import { type LabThemeConfig } from './theme-config.js';
/** Color mode. `system` follows `prefers-color-scheme` and updates when it changes. */
export type LabThemeMode = 'system' | 'light' | 'dark';
type Mode = LabThemeMode;
/**
 * Owns the color mode and the app theme config. Sets `data-lab-theme="light|dark"` on `<html>`
 * (every color token hangs off it), applies `config` with `applyLabThemeConfig`, and stores
 * the chosen mode in the `preferences` service under `feeef-lab-theme`.
 * `LabProvider` renders this for you.
 */
export declare function LabThemeProvider({ children, initialMode, enableCornerFallback, config, }: {
    children: ReactNode;
    /** Mode used when no preference is stored yet. Default: `system`. */
    initialMode?: Mode;
    /** Start the SVG superellipse fallback on browsers without `corner-shape` support. */
    enableCornerFallback?: boolean;
    /** App-level palette, density and radius (theme-config.ts). */
    config?: LabThemeConfig;
}): import("react").JSX.Element;
/**
 * Current mode (`system|light|dark`), the resolved `light|dark` and `setMode`.
 * Throws outside `LabProvider` / `LabThemeProvider`.
 */
export declare function useLabTheme(): {
    mode: Mode;
    resolvedMode: "light" | "dark";
    setMode: (mode: Mode) => void;
};
/** Icon button that cycles system → light → dark → system. Its label comes from `lab.common.theme*`. */
export declare function LabThemeSwitch(): import("react").JSX.Element;
export {};
//# sourceMappingURL=theme.d.ts.map