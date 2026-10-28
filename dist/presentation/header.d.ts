import * as React from 'react';
import './presentation.css';
export type PresentationHeaderProps = {
    /** The title, in a glass bubble at the start. Omit for no title bubble. */
    title?: React.ReactNode;
    /** Custom content at the start instead of the title bubble (a search field, a back button with a heading). */
    leading?: React.ReactNode;
    /** Id for the title heading, so the surface can be labelled by it. */
    titleId?: string;
    /** More bubbles before the close bubble: a Reset, a Done, a view switch. */
    trailing?: React.ReactNode;
    /** Shows the close bubble at the end and is called when it is pressed. */
    onClose?: () => void;
    /** Accessible name of the close button. Default “Close”. */
    closeLabel?: string;
    /** Disables the close button (while a save runs, say). A leaving surface keeps its look: closing twice does nothing. */
    closeDisabled?: boolean;
    className?: string;
};
/**
 * The floating header of a presentation surface (Modal, Sheet): a title bubble at the start,
 * optional trailing bubbles and a close bubble at the end, all glass in one `GlassScope` so they
 * merge and share light. Put it in a `PresentationBody` `top` slot; it renders nothing when it has
 * nothing to show.
 */
export declare function PresentationHeader({ title, leading, titleId, trailing, onClose, closeLabel, closeDisabled, className, }: PresentationHeaderProps): React.JSX.Element | null;
/** The close bubble: one glass group holding the close button. Kit-internal (header and a sheet's pane). */
export declare function CloseBubble({ label, disabled, onClose, className, }: {
    label: string;
    disabled?: boolean;
    onClose: () => void;
    className?: string;
}): React.JSX.Element;
//# sourceMappingURL=header.d.ts.map