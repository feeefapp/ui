import { type ReactNode } from 'react';
/** Platform ports: inject storage and clipboard without coupling widgets to browser globals. */
export interface LabPreferences {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
}
export interface LabServices {
    preferences: LabPreferences;
    navigate(url: string): void;
    copyText(text: string): Promise<void>;
    readClipboard(): Promise<ClipboardItem[]>;
    downloadText(filename: string, content: string, mediaType: string): void;
}
export declare function LabServicesProvider({ children, services, }: {
    children: ReactNode;
    services?: Partial<LabServices>;
}): import("react").JSX.Element;
export declare const useLabServices: () => LabServices;
//# sourceMappingURL=services.d.ts.map