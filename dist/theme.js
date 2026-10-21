'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { LabSwap } from './motion.js';
import { LabButton } from './ui.js';
import './theme.css';
import './system.css';
import { installFoContinuousCorners } from './brand/corners.js';
import { useLabServices } from './services.js';
import { useLabI18n } from './i18n.js';
import { applyLabThemeConfig } from './theme-config.js';
const Context = createContext(null);
const layoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export function LabThemeProvider({ children, initialMode = 'system', enableCornerFallback = false, config, }) {
    const { preferences } = useLabServices();
    const [mode, setMode] = useState(() => {
        if (typeof window === 'undefined')
            return initialMode;
        try {
            const saved = preferences.get('feeef-lab-theme');
            return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : initialMode;
        }
        catch {
            return initialMode;
        }
    });
    const [resolvedMode, setResolvedMode] = useState(initialMode === 'dark' ? 'dark' : 'light');
    useEffect(() => {
        if (enableCornerFallback)
            return installFoContinuousCorners();
    }, [enableCornerFallback]);
    const { palette, density, radius } = config ?? {};
    layoutEffect(() => {
        applyLabThemeConfig(document.documentElement, { palette, density, radius });
    }, [palette, density, radius]);
    layoutEffect(() => {
        const root = document.documentElement, previous = root.getAttribute('data-lab-theme'), preference = matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            const resolved = mode === 'system' ? (preference.matches ? 'dark' : 'light') : mode;
            root.setAttribute('data-lab-theme', resolved);
            setResolvedMode(resolved);
        };
        apply();
        preference.addEventListener('change', apply);
        try {
            preferences.set('feeef-lab-theme', mode);
        }
        catch { }
        return () => {
            preference.removeEventListener('change', apply);
            if (previous === null)
                root.removeAttribute('data-lab-theme');
            else
                root.setAttribute('data-lab-theme', previous);
        };
    }, [mode, preferences]);
    const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode]);
    return _jsx(Context.Provider, { value: value, children: children });
}
export function useLabTheme() {
    const context = useContext(Context);
    if (!context)
        throw new Error('useLabTheme requires LabProvider or LabThemeProvider');
    return context;
}
export function LabThemeSwitch() {
    const { t } = useLabI18n();
    const context = useLabTheme();
    const next = context.mode === 'system' ? 'light' : context.mode === 'light' ? 'dark' : 'system';
    const Icon = context.mode === 'system' ? Monitor : context.mode === 'dark' ? Moon : Sun;
    return (_jsx(LabButton, { className: "lab-theme-switch", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.common.themeSwitchTo', { mode: context.mode, next }), title: t('lab.common.theme', { mode: context.mode }), onClick: () => context.setMode(next), children: _jsx(LabSwap, { swapKey: context.mode, children: _jsx(Icon, { size: 20 }) }) }));
}
//# sourceMappingURL=theme.js.map