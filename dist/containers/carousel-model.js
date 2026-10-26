/** Pure carousel math: how far each slide is from the center, and which slide a flick lands on. */
import { projectMomentum } from '../physics/spring.js';
/**
 * Signed distance of a slide from the track's center, in slide steps (slide width + gap):
 * 0 = centered, ±1 = the neighbor's place. Physical (screen) axis.
 */
export function slideProgress(slideCenter, trackCenter, step) {
    return step > 0 ? (slideCenter - trackCenter) / step : 0;
}
/** Index of the slide closest to the center. */
export function centeredIndex(progress) {
    let best = 0;
    for (let i = 1; i < progress.length; i++)
        if (Math.abs(progress[i]) < Math.abs(progress[best]))
            best = i;
    return best;
}
/**
 * Where a flicked track settles: the scroll offset projected with momentum, snapped to the
 * nearest slide's offset. Never skips more than `maxSkip` slides from `current`.
 */
export function flickTarget(scroll, velocity, offsets, current, maxSkip = 3) {
    const projected = projectMomentum(scroll, velocity, 0.998);
    let best = 0;
    for (let i = 1; i < offsets.length; i++)
        if (Math.abs(offsets[i] - projected) < Math.abs(offsets[best] - projected))
            best = i;
    return Math.max(current - maxSkip, Math.min(current + maxSkip, best));
}
/** The built-in scroll transition for a slide at `progress`. */
export function slideEffect(effect, progress) {
    const d = Math.min(1.5, Math.abs(progress));
    switch (effect) {
        case 'scale':
            return { transform: `scale(${1 - 0.08 * Math.min(1, d)})`, opacity: 1 };
        case 'fade':
            return { transform: '', opacity: 1 - 0.55 * Math.min(1, d) };
        case 'parallax':
            return { transform: '', opacity: 1 };
        default:
            return { transform: '', opacity: 1 };
    }
}
//# sourceMappingURL=carousel-model.js.map