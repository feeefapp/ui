import type { ReactNode } from 'react';
interface LabActionBase {
    /** Unique throughout this bar's action tree. */
    id: string;
    /** Required accessible name; also used for menu rows. */
    label: string;
    /** Icon shown before the label, and in menu rows. */
    icon?: ReactNode;
    /** Icon mode falls back to the label when no icon is supplied. */
    display?: 'label' | 'icon';
    /** Native tooltip text. Icon-only controls default to the label. */
    tooltip?: string;
    /** Lower priorities spill first; source order is retained in both locations. */
    priority?: number;
    /** Shown but not clickable, inline and in the menu. */
    disabled?: boolean;
    /** Shows a loader and blocks activation, for work the owner tracks itself. */
    loading?: boolean;
    /** Paints the action as destructive, inline and in the menu. */
    destructive?: boolean;
    /** Button emphasis when shown inline. Defaults to quiet toolbar chrome. */
    variant?: import('../primitives/button.js').LabButtonVariant;
    /** Quiet chrome can retain semantic/destructive color without a separate raised surface. */
    appearance?: 'default' | 'toolbar';
}
/** A command. A returned promise shows a loader and blocks repeats until it settles. */
export interface LabCommandAction extends LabActionBase {
    type: 'action';
    /** Runs the command. */
    onAction: () => void | Promise<void>;
}
/** An on/off action: `aria-pressed` inline, a checkbox item in menus. Controlled. */
export interface LabToggleAction extends LabActionBase {
    type: 'toggle';
    /** Current state. */
    checked: boolean;
    /** Called with the next state. */
    onCheckedChange: (checked: boolean) => void | Promise<void>;
}
/** A menu of further actions (groups may nest). An empty group is disabled. */
export interface LabGroupAction extends LabActionBase {
    type: 'group';
    /** Items of the menu. */
    actions: readonly LabAction[];
    /** Return false to cancel opening, for example when nothing is selected. */
    onOpen?: () => boolean | void;
}
/** Any entry of a `LabActionsBar`. */
export type LabAction = LabCommandAction | LabToggleAction | LabGroupAction;
export {};
//# sourceMappingURL=types.d.ts.map