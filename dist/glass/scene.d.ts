import type { GlassMemberOptions } from './context.js';
import { type GlassKind } from './material.js';
/** How far (px) a member may reach past the container and still be drawn (overshoot, growing bubbles). */
export declare const GLASS_MARGIN = 32;
/** True when `animation` is running and changes geometry (CSS transition, keyframes or WAAPI). */
export declare function movesGeometry(animation: Animation): boolean;
/**
 * The engine behind GlassContainer: tracks bubbles, springs their glass between layouts, plans
 * splits and merges, and paints one material (a backdrop clipped to the blended outline, plus an
 * SVG for edge, light and shadow). DOM-only; React just hands it elements.
 */
export declare class GlassScene {
    private host;
    private backdrop;
    private paint;
    private shadow;
    private members;
    private cornerFit;
    private shapes;
    /** When the container was first measured with a box (null while it has never been rendered). */
    private shownAt;
    private measureQueued;
    private drawHook;
    private wasMoving;
    private drawInput;
    private dirty;
    private resize;
    private mutations;
    private pointer;
    private cache;
    /** The backdrop pieces drawn for `cache.paths` (see `backdropPaths`). */
    private piecePaths;
    /** Scrollers inside the container that scrolled since the last measure: their bubbles follow exactly. */
    private scrolled;
    private uid;
    private pressed;
    private glow;
    spacing: number;
    reduceMotion: boolean;
    followPointer: boolean;
    /** Bubbles swell, stretch and glow under a press (Apple's interactive glass). */
    interactive: boolean;
    /** Small glass flips light/dark to stay legible over what is behind it. */
    adaptive: boolean;
    /** ThemeConfig `glassTint`: 0 clear … 1 tinted (the CSS reads `--lab-glass-tint`; the refraction filter needs the numbers). */
    cornerShape: 'superellipse' | 'round';
    tint: number;
    /** Which material it paints (GlassContainer `material`): regular glass, or menus' thick glass. */
    material: GlassKind;
    /** ThemeConfig `glassBlur`: the measured backdrop blur, sized per cluster. */
    blur: boolean;
    /** ThemeConfig `glassRefraction`: bend the backdrop continuously at the edges, where supported. */
    refraction: boolean;
    backdropSource?: string;
    highlightWidth: number;
    highlightProfile: 'surface' | 'rim';
    highlightStrength: number;
    refractionProfile: 'gentle' | 'measured';
    refractionStrength: number;
    /** Grey level (0–1) of the veil's colour, `--lab-surface`, for the edge terms. */
    private surfaceGrey;
    private sourceFrame;
    private refractKey;
    private refractionMaps;
    private refractionWork;
    private refractionRequests;
    private decodedMaps;
    private decodedScales;
    private filters;
    private filterHost;
    private disposed;
    /** True while some bubble (or an ancestor up to the container) runs a geometric animation. */
    private tracking;
    /** One backdrop element per cluster: a lone bubble clips with border-radius, which every
     * browser applies to backdrop-filter; only merging bubbles need a path clip, in their own box. */
    private pieces;
    /** Per cluster, the hairline's ring and sliver paths, in their own SVG layer above the glass. */
    private hairlines;
    private hairlineHost;
    /** Cancels a queued backdrop read (and the write that follows it). */
    private stopSample;
    private visibility;
    private unwatchBackdrop;
    /** False while the container is off screen: scrolls and pointer moves then cost nothing. */
    private onScreen;
    private lastSample;
    private sampleLater;
    constructor(host: HTMLElement, backdrop: HTMLElement, paint: SVGSVGElement, shadow: SVGSVGElement, uid: string);
    /**
     * The page changed somewhere (a dialog opened, content loaded): read the backdrop once things
     * settle, never in the frame of the change, which is often busy (a presentation's first frame).
     */
    private onBackdropChange;
    /** Any scroll changes what is behind the glass; a scroller inside the container also moves bubbles. */
    private onScroll;
    /** Reading the backdrop (elementsFromPoint + styles) at most every SAMPLE_GAP_MS while scrolling, and once after. */
    private requestSampleWhileScrolling;
    /** Re-reads what is behind the glass on the next frame (scroll, theme or layout changed). */
    requestSample: () => void;
    /** The tone behind the glass when it should flip (adaptive tint), else null. Reads only. */
    private readBackdropTone;
    private applyBackdropTone;
    private onPressStart;
    private onPressMove;
    private onPressEnd;
    register(id: string, element: HTMLElement, options: GlassMemberOptions): () => void;
    /** A surface around this container came to rest (a dialog finished opening): measure again. */
    private onSettled;
    requestMeasure(): void;
    setPointer(point: {
        x: number;
        y: number;
    } | null): void;
    dispose(): void;
    /** Reads every bubble's layout box and moves the glass toward it. */
    measure(): void;
    /**
     * The part of the container `element`'s glass may paint in: the boxes of its ancestors below the
     * container that clip (overflow other than visible, clip-path, contain: paint), intersected. Also
     * whether one of them scrolled since the last measure.
     */
    private clipOf;
    /**
     * Where a bubble with an origin comes from and returns to, in the container's pixels
     * (`glassOrigin`: the origin's rect when it is glass, else a droplet at its centre); null when the
     * origin is gone.
     */
    private originRect;
    private clearOriginClip;
    private release;
    private scheduleDraw;
    private readDrawInput;
    /** Paints the current frame: element offsets, backdrop clip, edge, light and shadow. */
    draw(): void;
    private syncBackdrops;
    /**
     * The dark hairline outside each cluster (material.ts GLASS_HAIRLINE): per cluster, the ring and
     * the side slivers as even-odd SVG paths filled black at their strength, in their own layer above
     * the glass. On white that is exactly iOS 27's plus-darker; over darker content it darkens
     * proportionally (a backdrop-filter clipped to the band would be exact, but Chromium clips such
     * filters to the clip's bounding box inside glass, darkening the whole box). Bands are cached
     * per cluster shape and follow merged outlines.
     */
    private syncHairlines;
    /** Keep the same optical layer alive through motion, merges and adaptive tone changes. */
    private updateRefraction;
    /** Sampling a separate paint layer avoids Firefox's recursive element-image prohibition. */
    private elementSource;
    private positionElementSource;
    private applyRefraction;
    /** The colour scheme the glass paints in: the adaptive tone when it flipped, else the page's. */
    private scheme;
    private lightFor;
    /** True when `element`, or an ancestor below the container, runs a geometric animation. */
    private animatedBetween;
    /** The container on screen and the scale its ancestors apply to it. */
    private frame;
}
/** Resolve inherited paint tokens in the frame's read phase, before any geometry writes. */
/** Grey level (0–1, sRGB) of a computed colour: rgb(), color(srgb …) or oklab(); 1 if unknown. */
export declare function surfaceGrey(value: string): number;
//# sourceMappingURL=scene.d.ts.map