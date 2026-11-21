import { liveDisplacementMap, rgbaBmpBytes } from './refraction.js';
/** The worker and its CSP/unsupported-browser fallback use this same pixel calculation. */
export function buildRefractionBitmap(request) {
    const pixels = liveDisplacementMap(request.width, request.height, [request.shapes], request.spacing, request.profile, request.glintWidth, request.regularity);
    // Firefox clips the live element to the current CSS outline. An opaque map keeps an older
    // decoded lens from imposing its previous silhouette while the next shape is prepared.
    for (let pixel = 3; pixel < pixels.data.length; pixel += 4)
        pixels.data[pixel] = 255;
    const bytes = rgbaBmpBytes(pixels.width, pixels.height, pixels.data);
    return { key: request.key, scale: pixels.scale, bytes: bytes.buffer };
}
//# sourceMappingURL=refraction-work-model.js.map