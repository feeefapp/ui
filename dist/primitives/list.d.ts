import * as React from 'react';
import './list.css';
/**
 * A group of rows on one rounded card, with an optional header above and footer below: the
 * inset-grouped list of iOS Settings and Mail. Rows are separated by hairlines that start after
 * their leading icon. With `onReorder`, every row gets a grip: drag it (any pointer) or focus it
 * and press the arrow keys.
 */
export declare function LabListSection({ header, footer, children, className, label, onReorder, }: {
    /** Short label above the card, in sentence case. */
    header?: React.ReactNode;
    /** Help text under the card. */
    footer?: React.ReactNode;
    /** LabListRow elements. */
    children: React.ReactNode;
    className?: string;
    /** Accessible name when there is no visible header. */
    label?: string;
    /** Makes the rows reorderable. Move item `from` to index `to` in your data; the list animates the rest. */
    onReorder?: (from: number, to: number) => void;
}): React.JSX.Element;
/** An action revealed by swiping a row. */
export type LabRowAction = {
    /** Short verb: “Confirm”, “Archive”, “Delete”. */
    label: string;
    icon?: React.ReactNode;
    /** `destructive` (red), `primary` (brand) or `neutral` (gray, default). */
    tone?: 'neutral' | 'primary' | 'destructive';
    onAction: () => void;
};
export type LabListRowProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
    /** Main text. */
    title: React.ReactNode;
    /** Second line in muted text. */
    subtitle?: React.ReactNode;
    /** Icon, avatar or thumbnail at the start. */
    leading?: React.ReactNode;
    /** Value, badge or control at the end. */
    trailing?: React.ReactNode;
    /** Shows a disclosure chevron: the row opens another page. */
    chevron?: boolean;
    /** Marks the row as the current selection (a split view's open item). */
    selected?: boolean;
    /** Renders your own element (a router link) as the row, keeping the row's look and layout. */
    asChild?: boolean;
    /** Without `onClick`, `href` or `asChild`, the row is static text. */
    static?: boolean;
    /** Actions revealed by swiping toward the end (they sit at the start). The first runs on a long swipe. */
    leadingActions?: readonly LabRowAction[];
    /** Actions revealed by swiping toward the start (they sit at the end). The first runs on a long swipe. */
    trailingActions?: readonly LabRowAction[];
    /** Whether a long swipe runs the first action. Default true. */
    fullSwipe?: boolean;
    /** Accessible name of the reorder grip. Defaults to “Reorder” plus the title when it is text. */
    reorderLabel?: string;
};
/**
 * One row of a list: a full-width button (or your link with `asChild`) with leading media, title,
 * subtitle, trailing value and an optional chevron. Swipe actions reveal behind it, and inside a
 * reorderable LabListSection it gets a grip.
 */
export declare const LabListRow: React.ForwardRefExoticComponent<Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
    /** Main text. */
    title: React.ReactNode;
    /** Second line in muted text. */
    subtitle?: React.ReactNode;
    /** Icon, avatar or thumbnail at the start. */
    leading?: React.ReactNode;
    /** Value, badge or control at the end. */
    trailing?: React.ReactNode;
    /** Shows a disclosure chevron: the row opens another page. */
    chevron?: boolean;
    /** Marks the row as the current selection (a split view's open item). */
    selected?: boolean;
    /** Renders your own element (a router link) as the row, keeping the row's look and layout. */
    asChild?: boolean;
    /** Without `onClick`, `href` or `asChild`, the row is static text. */
    static?: boolean;
    /** Actions revealed by swiping toward the end (they sit at the start). The first runs on a long swipe. */
    leadingActions?: readonly LabRowAction[];
    /** Actions revealed by swiping toward the start (they sit at the end). The first runs on a long swipe. */
    trailingActions?: readonly LabRowAction[];
    /** Whether a long swipe runs the first action. Default true. */
    fullSwipe?: boolean;
    /** Accessible name of the reorder grip. Defaults to “Reorder” plus the title when it is text. */
    reorderLabel?: string;
} & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=list.d.ts.map