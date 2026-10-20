import * as React from 'react';
import type { LabControlVariant } from './control-variants.js';
/** Material common-button types, rendered with Feeef Lab's visual system. */
export type LabButtonVariant = LabControlVariant | 'destructive' | 'primary' | 'secondary' | 'ghost';
export type LabControlSize = 'regular' | 'compact' | 'inline' | 'icon';
export type LabButtonAppearance = 'default' | 'toolbar';
export type LabButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: 'default' | 'sm' | 'lg' | 'icon';
    loading?: boolean;
    /** Use filled for primary actions. The primary spelling is deprecated. */
    variant?: LabButtonVariant;
    controlSize?: LabControlSize;
    /** Square icon geometry; compact retains a 44px minimum on coarse pointers. */
    iconSize?: 'regular' | 'compact' | 'inline';
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: LabButtonAppearance;
};
export declare const LabButton: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: "default" | "sm" | "lg" | "icon";
    loading?: boolean;
    /** Use filled for primary actions. The primary spelling is deprecated. */
    variant?: LabButtonVariant;
    controlSize?: LabControlSize;
    /** Square icon geometry; compact retains a 44px minimum on coarse pointers. */
    iconSize?: "regular" | "compact" | "inline";
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: LabButtonAppearance;
} & React.RefAttributes<HTMLButtonElement>>;
export type LabIconButtonProps = Omit<LabButtonProps, 'controlSize' | 'iconSize' | 'size'> & {
    'aria-label': string;
    'controlSize'?: 'regular' | 'compact' | 'inline';
};
/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export declare const LabIconButton: React.ForwardRefExoticComponent<Omit<LabButtonProps, "size" | "controlSize" | "iconSize"> & {
    'aria-label': string;
    controlSize?: "regular" | "compact" | "inline";
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=button.d.ts.map