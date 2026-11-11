type ResizeDragOptions = {
  paint: (value: number) => void
  commit: (value: number) => void
  restore: () => void
  requestFrame?: (callback: () => void) => number
  cancelFrame?: (id: number) => void
}

/** Transient layout, not a gesture recognizer: ResizeDivider still owns the shared pan.
 * animation_level: 1. Only schedules frames with pending direct input, even under motion:none.
 * No spring/idle clock; reduced motion never changes direct pointer tracking.
 */
export function createResizeDrag({ paint, commit, restore,
  requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
}: ResizeDragOptions) {
  let frame: number | null = null
  let value: number | undefined
  let active = true
  return {
    move(next: number) {
      if (!active) return
      value = next
      if (frame === null) frame = requestFrame(() => {
        frame = null
        if (active && value !== undefined) paint(value)
      })
    },
    finish(cancelled: boolean) {
      if (!active) return
      active = false
      if (frame !== null) cancelFrame(frame)
      frame = null
      restore()
      if (!cancelled && value !== undefined) commit(value)
    },
  }
}
