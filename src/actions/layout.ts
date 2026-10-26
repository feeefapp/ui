/** Width-only contract, independent of React and browser measurement. */
export interface ActionLayoutItem {
  id: string
  /** Lower priorities enter overflow first. Equal priorities spill from the end. */
  priority?: number
}

export interface ActionsLayout<T> {
  visible: T[]
  overflow: T[]
  /** The space the result needs, including the menu trigger when present. */
  requiredWidth: number
}

/**
 * Fit complete top-level entries; nested groups remain intact. Both result
 * lists preserve source order. A host narrower than the overflow trigger still
 * receives that trigger, so every action remains reachable.
 */
export function computeActionsLayout<T extends ActionLayoutItem>({
  actions,
  maxWidth,
  measure,
  overflowWidth = 40,
  gap = 4,
}: {
  actions: readonly T[]
  maxWidth: number
  measure: (action: T) => number
  overflowWidth?: number
  gap?: number
}): ActionsLayout<T> {
  if (Number.isNaN(maxWidth) || maxWidth < 0) {
    throw new RangeError('Actions maxWidth must be non-negative.')
  }
  for (const [name, value] of [
    ['overflowWidth', overflowWidth],
    ['gap', gap],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Lab actions ${name} must be finite and non-negative.`)
    }
  }
  if (!actions.length) return { visible: [], overflow: [], requiredWidth: 0 }

  const widths = actions.map((action) => {
    const width = measure(action)
    if (!Number.isFinite(width) || width < 0) {
      throw new RangeError(`Lab action ${action.id} needs a finite, non-negative width.`)
    }
    return width
  })
  const completeWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (actions.length - 1)
  if (completeWidth <= maxWidth) {
    return { visible: [...actions], overflow: [], requiredWidth: completeWidth }
  }

  const spillOrder = actions
    .map((action, index) => ({
      index,
      priority: Number.isFinite(action.priority) ? action.priority! : 0,
    }))
    .sort((a, b) => a.priority - b.priority || b.index - a.index)
  const spilled = new Set<number>()
  let requiredWidth = completeWidth + gap + overflowWidth
  for (const { index } of spillOrder) {
    spilled.add(index)
    requiredWidth -= widths[index] + gap
    if (requiredWidth <= maxWidth) break
  }

  return {
    visible: actions.filter((_, index) => !spilled.has(index)),
    overflow: actions.filter((_, index) => spilled.has(index)),
    requiredWidth: Math.max(overflowWidth, requiredWidth),
  }
}

/**
 * Whether a menu of `actions` reserves the leading slot on every row: some row has an icon, is a
 * toggle (its check) or is loading. A menu of plain labels has no empty slot. The Flutter twin is
 * `menuHasLeading` in `actions/layout.dart`.
 */
export function menuHasLeading(
  actions: readonly { id: string; type: string; icon?: unknown; loading?: boolean }[],
  pending: ReadonlySet<string>
) {
  return actions.some(
    (action) => !!action.icon || action.type === 'toggle' || !!action.loading || pending.has(action.id)
  )
}

/** A control in a row that can fold to a compact form (a segmented control into its menu). */
export interface FitRowItem extends ActionLayoutItem {
  /** Width unfolded (every option showing). */
  full: number
  /** Width folded (the selection and a chevron). */
  compact: number
  /** Width it has right now (either, or between while it springs). */
  current: number
}

/**
 * Which foldable controls of one row stay unfolded. `free` is the row's room left over right now
 * (negative when it overflows); each item may take `full - compact` more than folded. Items fold
 * like actions spill (`computeActionsLayout`): lowest `priority` first, equal priorities from the
 * end. The answer depends only on the row and the items' full and compact widths, never on which
 * are folded now (their `current` cancels out), so folding never flips back on the next measure.
 * Returns the ids that stay unfolded.
 */
export function computeFitRow(items: readonly FitRowItem[], free: number, tolerance = 0.5): Set<string> {
  if (!items.length) return new Set()
  const room = free + items.reduce((sum, item) => sum + item.current - item.compact, 0) - tolerance
  const layout = computeActionsLayout({
    actions: items,
    maxWidth: Math.max(0, room),
    measure: (item) => Math.max(0, item.full - item.compact),
    overflowWidth: 0,
    gap: 0,
  })
  return new Set(room < 0 ? [] : layout.visible.map((item) => item.id))
}
