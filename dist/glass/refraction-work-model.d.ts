import type { GlassShape } from './geometry.js';
/** Geometry in material coordinates; the key identifies its exact optical configuration. */
export type RefractionWorkRequest = {
    key: string;
    width: number;
    height: number;
    shapes: readonly GlassShape[];
    spacing: number;
    profile: 'gentle' | 'measured';
};
/** Exact opaque Firefox map encoded as a BMP, ready for a Blob URL and image decoding. */
export type RefractionWorkResult = {
    key: string;
    scale: number;
    bytes: ArrayBuffer;
};
export type RefractionWorkerMessage = {
    id: number;
    request: RefractionWorkRequest;
};
export type RefractionWorkerReply = {
    id: number;
    result: RefractionWorkResult;
} | {
    id: number;
    error: string;
};
/** The worker and its CSP/unsupported-browser fallback use this same pixel calculation. */
export declare function buildRefractionBitmap(request: RefractionWorkRequest): RefractionWorkResult;
//# sourceMappingURL=refraction-work-model.d.ts.map