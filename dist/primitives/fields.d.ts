import * as React from 'react';
export declare const Input: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>;
export declare const Textarea: React.ForwardRefExoticComponent<React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.RefAttributes<HTMLTextAreaElement>>;
export declare const Label: React.ForwardRefExoticComponent<React.LabelHTMLAttributes<HTMLLabelElement> & React.RefAttributes<HTMLLabelElement>>;
export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    /**
     * The page's largest image above the fold (its LCP): loads eagerly at high fetch priority.
     * Give it to at most one image per page; several "priority" images compete for bandwidth
     * and all arrive later. Every other image loads lazily.
     */
    priority?: boolean;
}
/**
 * A plain `<img>` with fast defaults: decoded off the main thread, lazy unless `priority`.
 * Always pass `width` and `height` (or size the box with CSS `aspect-ratio`) so the layout
 * does not shift when the file arrives.
 */
export declare const Image: React.ForwardRefExoticComponent<ImageProps & React.RefAttributes<HTMLImageElement>>;
//# sourceMappingURL=fields.d.ts.map