import type { GlassLight } from './light.js';
export declare function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K];
/** sRGB equivalent of the regular fragment shader. The two feImages read the same
 * decoded bitmap. Only the projection matrix changes when the pointer turns the light. */
export declare class RegularGlassFilter {
    readonly lit: boolean;
    readonly normals: SVGFEImageElement;
    private readonly face;
    private readonly curve;
    private readonly projection;
    private readonly weight;
    private readonly delta;
    private materialKey;
    private direction;
    constructor(filter: SVGFilterElement, lit: boolean);
    material(tint: number, dark: boolean, strength: number): void;
    light(light: GlassLight): void;
}
//# sourceMappingURL=regular-filter.d.ts.map