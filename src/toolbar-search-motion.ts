import { stepSpring, type SpringState } from './primitives/spring-core'
export function stepSearchMorph(state: SpringState, target: number, elapsed: number) {
  return stepSpring(state, target, elapsed, 360, 34)
}
const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t) }
/** Separate visibility windows keep returning controls out of the fading editor. */
export function searchMorphVisibility(progress: number) {
  return { editor: smooth((progress - .25) / .45), controls: 1 - smooth(progress / .12) }
}
