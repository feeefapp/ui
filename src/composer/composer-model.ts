/**
 * Pure rules of the composer family (PromptComposer, ImagePromptComposer). The Flutter twin is
 * `flutter/lib/composer/composer_model.dart`; `tests/composer.test.ts` and its Dart twin keep them
 * in step.
 */

/** The places inside the capsule, top to bottom: attachments, the field, then tools · actions · send. */
export type ComposerSlotName = 'attachments' | 'field' | 'tools' | 'actions' | 'send'

/** Where a slot is drawn, in the capsule's own pixels: its offset, height and opacity. */
export type ComposerSlotBox = { x: number; y: number; height: number; opacity: number }

/** The capsule at one moment: its height and every slot that is on screen. */
export type ComposerLayoutSnapshot = {
  height: number
  slots: Partial<Record<ComposerSlotName, ComposerSlotBox>>
}

/**
 * Whether the capsule shows its second row (tools beside the actions and send). Calm while empty
 * and idle; open while it has text, while focus is inside, or while one of its menus or panels is
 * open (`pinned`), so a control never disappears under the pointer.
 */
export function composerExpanded(state: { hasText: boolean; focusWithin: boolean; pinned: boolean }) {
  return state.hasText || state.focusWithin || state.pinned
}

/** What the send button shows: a quiet neutral circle, the primary arrow, a loader, or a loader that stops. */
export type ComposerSendState = 'idle' | 'ready' | 'sending' | 'stop'

export function composerSendState(state: { ready: boolean; submitting: boolean; stoppable: boolean }): ComposerSendState {
  if (state.submitting) return state.stoppable ? 'stop' : 'sending'
  return state.ready ? 'ready' : 'idle'
}

const mix = (from: number, to: number, p: number) => from + (to - from) * p

/**
 * One frame of a layout change, driven by one spring progress `p` (0 → 1, may overshoot): the
 * capsule's height and, per slot in `to`, how far to draw it from its laid-out place and how tall
 * and opaque. Mixing in the capsule's own coordinates keeps anchoring right: a capsule pinned at
 * its top grows down and its send button moves down; one pinned at its bottom (a floating
 * composer) grows up and its send button stays still. A slot new in `to` fades in where it lands.
 */
export function composerFrame(from: ComposerLayoutSnapshot, to: ComposerLayoutSnapshot, p: number) {
  const slots: Partial<Record<ComposerSlotName, { dx: number; dy: number; height: number; opacity: number }>> = {}
  for (const name of Object.keys(to.slots) as ComposerSlotName[]) {
    const end = to.slots[name]!
    const start = from.slots[name] ?? { ...end, opacity: 0 }
    slots[name] = {
      dx: mix(start.x, end.x, p) - end.x,
      dy: mix(start.y, end.y, p) - end.y,
      height: Math.max(0, mix(start.height, end.height, p)),
      opacity: Math.min(1, Math.max(0, mix(start.opacity, end.opacity, p))),
    }
  }
  return { height: Math.max(0, mix(from.height, to.height, p)), slots }
}

/** True when two snapshots draw the same (nothing worth animating). */
export function composerSameLayout(a: ComposerLayoutSnapshot, b: ComposerLayoutSnapshot) {
  if (Math.abs(a.height - b.height) > 0.5) return false
  const names = new Set([...Object.keys(a.slots), ...Object.keys(b.slots)]) as Set<ComposerSlotName>
  for (const name of names) {
    const x = a.slots[name]
    const y = b.slots[name]
    if (!x || !y) return false
    if (Math.abs(x.x - y.x) > 0.5 || Math.abs(x.y - y.y) > 0.5 || Math.abs(x.height - y.height) > 0.5) return false
    if (Math.abs(x.opacity - y.opacity) > 0.01) return false
  }
  return true
}

/** The current frame as a snapshot, so an interrupted change continues from what is on screen. */
export function composerFrameSnapshot(from: ComposerLayoutSnapshot, to: ComposerLayoutSnapshot, p: number): ComposerLayoutSnapshot {
  const frame = composerFrame(from, to, p)
  const slots: ComposerLayoutSnapshot['slots'] = {}
  for (const name of Object.keys(frame.slots) as ComposerSlotName[]) {
    const end = to.slots[name]!
    const f = frame.slots[name]!
    slots[name] = { x: end.x + f.dx, y: end.y + f.dy, height: f.height, opacity: f.opacity }
  }
  return { height: frame.height, slots }
}
