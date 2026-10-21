import { type ReactNode } from 'react';
import './theme.css';
import './system.css';
import { type LabThemeConfig } from './theme-config.js';
export type LabThemeMode = 'system' | 'light' | 'dark';
type Mode = LabThemeMode;
export declare function LabThemeProvider({ children, initialMode, enableCornerFallback, config, }: {
    children: ReactNode;
    initialMode?: Mode;
    enableCornerFallback?: boolean;
    /** App-level palette, density and radius (theme-config.ts). */
    config?: LabThemeConfig;
}): import("react").JSX.Element;
export declare function useLabTheme(): {
    mode: Mode;
    resolvedMode: "light" | "dark";
    setMode: (mode: Mode) => void;
};
export declare function LabThemeSwitch(): import("react").JSX.Element;
export {};
//# sourceMappingURL=theme.d.ts.map