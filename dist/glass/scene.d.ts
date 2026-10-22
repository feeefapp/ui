import type { GlassMemberOptions } from './context.js';
/** How far (px) the material may reach past the container, for overshoot and growing bubbles. */
export declare const GLASS_MARGIN = 32;
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
    private shapes;
    private measured;
    private measureQueued;
    private drawHook;
    private dirty;
    private resize;
    private mutations;
    private pointer;
    private cache;
    private uid;
    private pressed;
    private glow;
    spacing: number;
    reduceMotion: boolean;
    followPointer: boolean;
    /** Bubbles swell, stretch and glow under a press (Apple's interactive glass). */
    interactive: boolean;
    constructor(host: HTMLElement, backdrop: HTMLElement, paint: SVGSVGElement, shadow: SVGSVGElement, uid: string);
    private onPressStart;
    private onPressMove;
    private onPressEnd;
    register(id: string, element: HTMLElement, options: GlassMemberOptions): () => void;
    requestMeasure(): void;
    setPointer(point: {
        x: number;
        y: number;
    } | null): void;
    dispose(): void;
    /** Reads every bubble's layout box and moves the glass toward it. */
    measure(): void;
    private release;
    private scheduleDraw;
    /** Paints the current frame: element offsets, backdrop clip, edge, light and shadow. */
    draw(): void;
    private lightFor;
}
//# sourceMappingURL=scene.d.ts.map