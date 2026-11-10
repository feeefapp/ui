import * as React from 'react';
import type { PresentationHostProps } from './host.js';
/** Internal stable host: column and top-layer sheet are the very same DOM subtree. */
export type InPlacePresentation = {
    sheet: boolean;
    hidden?: boolean;
};
/** Never portal or change the element type: native top-layer promotion does not reparent React. */
export declare const InPlaceHost: React.ForwardRefExoticComponent<PresentationHostProps & {
    inPlace: InPlacePresentation;
} & React.RefAttributes<HTMLElement>>;
//# sourceMappingURL=in-place-host.d.ts.map