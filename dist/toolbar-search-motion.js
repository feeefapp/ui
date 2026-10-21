import { stepSpring } from './primitives/spring-core.js';
export function stepSearchMorph(state, target, elapsed) {
    return stepSpring(state, target, elapsed, 360, 34);
}
const smooth = (value) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };
/** Separate visibility windows keep returning controls out of the fading editor. */
export function searchMorphVisibility(progress) {
    return { editor: smooth((progress - .25) / .45), controls: 1 - smooth(progress / .12) };
}
//# sourceMappingURL=toolbar-search-motion.js.map