/** The resource loading surface used by the live lens. Injectable for deterministic queue tests. */
type DecodableImage = {
    src: string;
    decode(): Promise<void>;
};
type ImageFactory = () => DecodableImage;
/**
 * Keep a live lens image in place while its replacement is decoded. SVG feImage can briefly
 * paint transparent pixels when a new href is assigned before Firefox has decoded it. A decoded
 * HTML image shares the resource cache with feImage; holding that image retains its pixels.
 *
 * At most one decode runs at a time, with one replaceable pending frame. A ready frame commits
 * even when a newer shape is pending, so a continuous gesture advances the lens instead of
 * waiting for the gesture to stop. The scene remains responsible for the live outline clip.
 */
export declare class DecodedRefractionMap<T extends {
    href: string;
}> {
    private commit;
    private createImage;
    private release;
    private active;
    private pending;
    private cache;
    private disposed;
    private committed;
    private failed;
    constructor(commit: (frame: T) => void, createImage?: ImageFactory, release?: (href: string) => void);
    /** Request the newest geometry; replaces any unstarted decode rather than growing a queue. */
    request(frame: T): void;
    /** Drop retained resources and make an already-running decode harmless when the scene leaves. */
    dispose(): void;
    private start;
    private publish;
    private releaseUnused;
}
export {};
//# sourceMappingURL=decoded-refraction-map.d.ts.map