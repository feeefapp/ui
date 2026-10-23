import { type ReactNode } from 'react';
import './theme.css';
import './system.css';
import { type ThemeConfig } from './theme-config.js';
/** Color mode. `system` follows `prefers-color-scheme` and updates when it changes. */
export type ThemeMode = 'system' | 'light' | 'dark';
type Mode = ThemeMode;
/**
 * Owns the color mode and the app theme config. Sets `data-lab-theme="light|dark"` on `<html>`
 * (every color token hangs off it), applies `config` with `applyThemeConfig`, and stores
 * the chosen mode in the `preferences` service under `feeef-lab-theme`.
 * `Provider` renders this for you.
 */
export declare function ThemeProvider({ children, initialMode, enableCornerFallback, config, }: {
    children: ReactNode;
    /** Mode used when no preference is stored yet. Default: `system`. */
    initialMode?: Mode;
    /** Start the SVG superellipse fallback on browsers without `corner-shape` support. */
    enableCornerFallback?: boolean;
    /** App-level palette, density, radius, glass, motion and metrics (theme-config.ts). */
    config?: ThemeConfig;
}): import("react").JSX.Element;
/**
 * Current mode (`system|light|dark`), the resolved `light|dark` and `setMode`.
 * Throws outside `Provider` / `ThemeProvider`.
 */
export declare function useTheme(): {
    mode: Mode;
    resolvedMode: "light" | "dark";
    setMode: (mode: Mode) => void;
};
/** Icon button that cycles system → light → dark → system. Its label comes from `lab.common.theme*`. */
export declare function ThemeSwitch(): import("react").JSX.Element;
export {};
//# sourceMappingURL=theme.d.ts.map