import * as React from 'react';
import type { LabControlVariant } from './control-variants.js';
import '../system.css';
import './control-variants.css';
/** Material common-button types, rendered with Feeef Lab's visual system. */
export type LabButtonVariant = LabControlVariant | 'destructive' | 'primary' | 'secondary' | 'ghost';
export type LabControlSize = 'regular' | 'compact' | 'inline' | 'icon';
export type LabButtonAppearance = 'default' | 'toolbar';
export type LabButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Render the single child (an `<a>` or router link) with button styling instead of a `<button>`. */
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: 'default' | 'sm' | 'lg' | 'icon';
    /** Shows a pixel loader, sets `aria-busy` and blocks activation until it clears. */
    loading?: boolean;
    /** Emphasis. Use filled for primary actions. The primary spelling is deprecated. */
    variant?: LabButtonVariant;
    /** Height: `regular` 44px, `compact` 40px, `inline` fits running text; `icon` is square. */
    controlSize?: LabControlSize;
    /** Square icon geometry; compact retains a 44px minimum on coarse pointers. */
    iconSize?: 'regular' | 'compact' | 'inline';
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: LabButtonAppearance;
};
/** A native `<button>` (or, with `asChild`, your link) painted by one of the emphasis variants. */
export declare const LabButton: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Render the single child (an `<a>` or router link) with button styling instead of a `<button>`. */
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: "default" | "sm" | "lg" | "icon";
    /** Shows a pixel loader, sets `aria-busy` and blocks activation until it clears. */
    loading?: boolean;
    /** Emphasis. Use filled for primary actions. The primary spelling is deprecated. */
    variant?: LabButtonVariant;
    /** Height: `regular` 44px, `compact` 40px, `inline` fits running text; `icon` is square. */
    controlSize?: LabControlSize;
    /** Square icon geometry; compact retains a 44px minimum on coarse pointers. */
    iconSize?: "regular" | "compact" | "inline";
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: LabButtonAppearance;
} & React.RefAttributes<HTMLButtonElement>>;
export type LabIconButtonProps = Omit<LabButtonProps, 'controlSize' | 'iconSize' | 'size'> & {
    /** Required: the icon is the button's only content, so this is its accessible name. */
    'aria-label': string;
    /** Square size: `regular` 44px, `compact` 40px, `inline` for text runs. */
    'controlSize'?: 'regular' | 'compact' | 'inline';
};
/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export declare const LabIconButton: React.ForwardRefExoticComponent<Omit<LabButtonProps, "size" | "controlSize" | "iconSize"> & {
    /** Required: the icon is the button's only content, so this is its accessible name. */
    'aria-label': string;
    /** Square size: `regular` 44px, `compact` 40px, `inline` for text runs. */
    controlSize?: "regular" | "compact" | "inline";
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=button.d.ts.map