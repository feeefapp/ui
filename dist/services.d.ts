import { type ReactNode } from 'react';
/**
 * Key/value storage for small UI preferences (the kit stores the theme mode under
 * `feeef-lab-theme`). The browser default uses `localStorage` and never throws.
 */
export interface LabPreferences {
    /** Returns the stored string, or `null` when the key is missing or storage is unavailable. */
    get(key: string): string | null;
    /** Stores a string. Failures are swallowed; the current session keeps working. */
    set(key: string, value: string): void;
    /** Deletes a key. */
    remove(key: string): void;
}
/**
 * Platform ports: every browser or router dependency a kit widget needs. Widgets call these
 * through `useLabServices()` instead of touching `window`, `localStorage` or the clipboard, so
 * hosts can swap them for a client-side router, a native shell or test doubles.
 */
export interface LabServices {
    /** Small persistent preferences, such as the theme mode. Default: `localStorage`. */
    preferences: LabPreferences;
    /** Opens a URL, e.g. after a language change. Default: `window.location.assign`. */
    navigate(url: string): void;
    /** Writes text to the clipboard. Default: `navigator.clipboard.writeText`; rejects when unavailable. */
    copyText(text: string): Promise<void>;
    /** Reads clipboard items (images, text). Default: `navigator.clipboard.read`; rejects when unavailable. */
    readClipboard(): Promise<ClipboardItem[]>;
    /** Saves `content` as a file named `filename` with the given media type. Default: a Blob download link. */
    downloadText(filename: string, content: string, mediaType: string): void;
}
/**
 * Installs services for its subtree. Pass only the ports you override; the rest keep their
 * browser defaults. `LabProvider` renders this for you from its `services` prop.
 */
export declare function LabServicesProvider({ children, services, }: {
    children: ReactNode;
    /** Services to override. Keep the object stable (memoize it) to avoid re-rendering consumers. */
    services?: Partial<LabServices>;
}): import("react").JSX.Element;
/** Returns the nearest services, or the browser defaults when no provider is mounted. */
export declare const useLabServices: () => LabServices;
//# sourceMappingURL=services.d.ts.map