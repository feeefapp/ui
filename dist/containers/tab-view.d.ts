import * as React from 'react';
import './tab-view.css';
export type Tab = {
    /** Stable id; also the value of `value`. */
    id: string;
    /** Short label in sentence case (one word is best). */
    label: string;
    /** Icon shown above (phones) or before (wide) the label. */
    icon: React.ReactNode;
    /** A count or dot on the icon, e.g. unconfirmed orders. */
    badge?: React.ReactNode;
    /** The tab's content, usually a NavigationStack. It stays mounted while other tabs show. */
    content: React.ReactNode;
};
export type TabViewProps = {
    /** 2–5 top-level destinations. */
    tabs: readonly Tab[];
    /** Selected tab id (controlled). */
    value: string;
    /** Called when the person picks another tab. */
    onChange: (id: string) => void;
    /**
     * Called when the person picks the tab that is already selected: pop its stack to the root,
     * or (the default) scroll its content back to the top.
     */
    onReselect?: (id: string) => void;
    /**
     * `scroll` (default): the bar shrinks to the selected tab while content scrolls down and comes
     * back on scroll up or a tap, like iOS 26. `never` keeps it full.
     */
    minimize?: 'scroll' | 'never';
    /** A persistent control beside the tabs (a mini player, a call in progress). Sits above the bar, and beside it when minimized. */
    accessory?: React.ReactNode;
    /** Accessible name of the tab bar. */
    label?: string;
    className?: string;
};
/**
 * App-level tabs, like iOS: each tab keeps its own content (and stack) alive, a floating glass
 * tab bar switches between them, and while the person scrolls down it shrinks to the selected
 * tab so content gets the screen. Picking the current tab again returns it to the top.
 */
export declare function TabView({ tabs, value, onChange, onReselect, minimize, accessory, label, className, }: TabViewProps): React.JSX.Element;
//# sourceMappingURL=tab-view.d.ts.map