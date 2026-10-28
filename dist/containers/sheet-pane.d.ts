import * as React from 'react';
import type { SheetProps } from './sheet.js';
import '../presentation/presentation.css';
/** Width of the area a sheet presents over: the container, or the window. */
export declare function useHostWidth(container: HTMLElement | null | undefined): number;
/**
 * A sheet's `pane` presentation on wide screens: a full-height opaque panel the shell gap G from
 * the screen edges that slides in from `paneSide` (mirrored in RTL), with the close bubble floating
 * beside it, a floating glass header and a dock.
 */
export declare function SheetPane(props: SheetProps): React.JSX.Element | null;
//# sourceMappingURL=sheet-pane.d.ts.map