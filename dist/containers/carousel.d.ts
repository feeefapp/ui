import * as React from 'react';
import './carousel.css';
export type CarouselProps = {
    /** The slides. Each child becomes one slide. */
    children: React.ReactNode;
    /** Accessible name, e.g. “Featured products”. */
    label: string;
    /**
     * Slide width: a fraction of the carousel (0.8 shows a peek of the next slide, 1 is one per
     * view) or a CSS length (`'280px'`). Default 0.82.
     */
    slideWidth?: number | string;
    /** Space between slides in px. Default 12. */
    gap?: number;
    /** Where a resting slide aligns. Default `center`. */
    align?: 'center' | 'start';
    /** Scroll transition applied to each slide as it moves away from the center. Default `scale`. */
    effect?: 'none' | 'scale' | 'fade' | 'parallax';
    /** Controlled current slide. */
    index?: number;
    /** Called when a different slide comes to rest at the center (or start). */
    onIndexChange?: (index: number) => void;
    /** Page dots under the track. Default true. */
    dots?: boolean;
    /** Previous/next buttons over the track: `auto` (default) shows them for mouse and trackpad users. */
    controls?: 'auto' | 'always' | 'never';
    className?: string;
};
/**
 * A horizontal carousel on native scroll snapping, so touch and trackpads get the platform's own
 * momentum. Slides react to their distance from the center (scale, fade or parallax, plus a
 * `--lab-carousel-progress` property for custom effects). A mouse can drag and flick it; the
 * flick lands on the slide its momentum projects to.
 */
export declare function Carousel({ children, label, slideWidth, gap, align, effect, index: controlled, onIndexChange, dots, controls, className, }: CarouselProps): React.JSX.Element;
//# sourceMappingURL=carousel.d.ts.map