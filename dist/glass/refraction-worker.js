import { buildRefractionBitmap } from './refraction-work-model.js';
// Keep the worker entry independent of the DOM-facing broker so bundlers do not recursively
// include the worker constructor in its own module graph.
const scope = self;
scope.onmessage = ({ data: { id, request } }) => {
    try {
        const result = buildRefractionBitmap(request);
        scope.postMessage({ id, result }, [result.bytes]);
    }
    catch (error) {
        scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    }
};
//# sourceMappingURL=refraction-worker.js.map