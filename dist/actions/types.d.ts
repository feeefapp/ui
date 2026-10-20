import type { ReactNode } from 'react';
interface LabActionBase {
    /** Unique throughout this bar's action tree. */
    id: string;
    /** Required accessible name; also used for menu rows. */
    label: string;
    icon?: ReactNode;
    /** Icon mode falls back to the label when no icon is supplied. */
    display?: 'label' | 'icon';
    tooltip?: string;
    /** Lower priorities spill first; source order is retained in both locations. */
    priority?: number;
    disabled?: boolean;
    loading?: boolean;
    destructive?: boolean;
    variant?: import('../primitives/button.js').LabButtonVariant;
    /** Quiet chrome can retain semantic/destructive color without a separate raised surface. */
    appearance?: 'default' | 'toolbar';
}
export interface LabCommandAction extends LabActionBase {
    type: 'action';
    onAction: () => void | Promise<void>;
}
export interface LabToggleAction extends LabActionBase {
    type: 'toggle';
    checked: boolean;
    onCheckedChange: (checked: boolean) => void | Promise<void>;
}
export interface LabGroupAction extends LabActionBase {
    type: 'group';
    actions: readonly LabAction[];
    /** Return false to cancel opening, for example when nothing is selected. */
    onOpen?: () => boolean | void;
}
export type LabAction = LabCommandAction | LabToggleAction | LabGroupAction;
export {};
//# sourceMappingURL=types.d.ts.map