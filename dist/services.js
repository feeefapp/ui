'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
const browserServices = {
    navigate(url) {
        window.location.assign(url);
    },
    downloadText(filename, content, mediaType) {
        const url = URL.createObjectURL(new Blob([content], { type: mediaType }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async readClipboard() {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.read)
            throw new Error('Clipboard unavailable');
        return navigator.clipboard.read();
    },
    preferences: {
        get(key) {
            try {
                return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
            }
            catch {
                return null;
            }
        },
        remove(key) {
            try {
                if (typeof window !== 'undefined')
                    window.localStorage.removeItem(key);
            }
            catch { }
        },
        set(key, value) {
            try {
                if (typeof window !== 'undefined')
                    window.localStorage.setItem(key, value);
            }
            catch {
                /* Storage can be unavailable; the current session still works. */
            }
        },
    },
    async copyText(text) {
        if (typeof navigator === 'undefined' || !navigator.clipboard)
            throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
    },
};
const LabServicesContext = createContext(browserServices);
export function LabServicesProvider({ children, services, }) {
    const value = useMemo(() => ({ ...browserServices, ...services }), [services]);
    return _jsx(LabServicesContext.Provider, { value: value, children: children });
}
export const useLabServices = () => useContext(LabServicesContext);
//# sourceMappingURL=services.js.map