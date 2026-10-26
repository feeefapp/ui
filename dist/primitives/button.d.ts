import * as React from 'react';
import type { ControlVariant } from './control-variants.js';
import '../system.css';
import './control-variants.css';
/** Material common-button types, rendered with Feeef Lab's visual system. */
export type ButtonVariant = ControlVariant | 'destructive' | 'primary' | 'secondary' | 'ghost';
/**
 * Height. `small` 30px, `regular` 36px, `large` 52px at comfortable density (the iOS control sizes;
 * ThemeConfig `metrics.controlHeight` changes them), `inline` fits running text, `icon` is square.
 */
export type ControlSize = 'small' | 'regular' | 'large' | 'inline' | 'icon';
export type ButtonAppearance = 'default' | 'toolbar';
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Render the single child (an `<a>` or router link) with button styling instead of a `<button>`. */
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: 'default' | 'sm' | 'lg' | 'icon';
    /** Shows a pixel loader, sets `aria-busy` and blocks activation until it clears. */
    loading?: boolean;
    /** Emphasis. Use filled for primary actions. The primary spelling is deprecated. */
    variant?: ButtonVariant;
    /** Height: `small` 30px, `regular` 36px, `large` 52px, `inline` fits running text; `icon` is square. On touch screens every size keeps its look and gains an invisible hit area of at least 44 × 44px. */
    controlSize?: ControlSize;
    /** Square icon geometry when `controlSize` is `icon`: `small`, `regular` or `large` (the button heights), or `inline`. */
    iconSize?: 'small' | 'regular' | 'large' | 'inline';
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: ButtonAppearance;
};
/**
 * A native `<button>` (or, with `asChild`, your link) painted by one of the emphasis variants. A
 * press answers like iOS: toolbar (glass) buttons swell and glow under the finger, filled, tonal,
 * elevated, outlined and destructive buttons grow a little; inside a glass bubble the bubble answers
 * instead. Reduced motion turns it off.
 */
export declare const Button: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Render the single child (an `<a>` or router link) with button styling instead of a `<button>`. */
    asChild?: boolean;
    /** Compatibility sizing for older consumers; new callers use controlSize. */
    size?: "default" | "sm" | "lg" | "icon";
    /** Shows a pixel loader, sets `aria-busy` and blocks activation until it clears. */
    loading?: boolean;
    /** Emphasis. Use filled for primary actions. The primary spelling is deprecated. */
    variant?: ButtonVariant;
    /** Height: `small` 30px, `regular` 36px, `large` 52px, `inline` fits running text; `icon` is square. On touch screens every size keeps its look and gains an invisible hit area of at least 44 × 44px. */
    controlSize?: ControlSize;
    /** Square icon geometry when `controlSize` is `icon`: `small`, `regular` or `large` (the button heights), or `inline`. */
    iconSize?: "small" | "regular" | "large" | "inline";
    /** Toolbar controls share their enclosing material instead of adding another raised surface. */
    appearance?: ButtonAppearance;
} & React.RefAttributes<HTMLButtonElement>>;
export type IconButtonProps = Omit<ButtonProps, 'controlSize' | 'iconSize' | 'size'> & {
    /** Required: the icon is the button's only content, so this is its accessible name. */
    'aria-label': string;
    /** Square size: `small` 30px, `regular` 36px, `large` 52px, `inline` for text runs. */
    'controlSize'?: 'small' | 'regular' | 'large' | 'inline';
};
/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export declare const IconButton: React.ForwardRefExoticComponent<Omit<ButtonProps, "size" | "controlSize" | "iconSize"> & {
    /** Required: the icon is the button's only content, so this is its accessible name. */
    'aria-label': string;
    /** Square size: `small` 30px, `regular` 36px, `large` 52px, `inline` for text runs. */
    controlSize?: "small" | "regular" | "large" | "inline";
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=button.d.ts.map