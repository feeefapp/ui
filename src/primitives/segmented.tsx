'use client'

import type { ReactNode } from 'react'
import { SelectionTrack } from './selection-track'

/** A status colour for an option's icon. */
export type SegmentTone = 'success' | 'warning' | 'danger'

/** One choice of a segmented control. */
export type SegmentOption<T extends string> = {
  /** Value reported to `onChange`. */
  value: T
  /** Visible text and accessible name. */
  label: string
  /** Decorative icon before the label. */
  icon?: ReactNode
  /** Colours the icon (only the icon) with a status token while the option isn't selected; the
   * selected option's icon takes the pill's ink. Never the only cue: keep it in the label too. */
  tone?: SegmentTone
  /** A short count or tag after the label ("21"), on a small neutral pill in tabular figures. It is
   * part of the option's accessible name ("New, 21"). */
  badge?: string
  /** Skipped by the keyboard and not clickable. */
  disabled?: boolean
}

/**
 * A single choice among short options, shown side by side in one row. A filled pill marks the
 * selection and slides to the next one; press it and it becomes a glass lens you can drag (or
 * press another option and drag: the pill comes to you). Radio semantics: one Tab stop, arrow keys
 * move and select. Options can carry a count (`badge`).
 *
 * Options that don't fit scroll sideways inside the control (never wrap or squeeze): its edges fade
 * where there is more, the selection scrolls into view whenever it changes, and a pill dragged near
 * an edge scrolls on. On touch a swipe scrolls; a drag that starts on the pill moves the pill.
 *
 * It paints no container: put it in glass (`ToolbarGroup`), on a box of your own (a surface-token
 * background; the root already has the capsule radius) or leave it bare. `TabView`'s tab bar is the
 * same control with tab semantics.
 */
export function SegmentedControl<const T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  equalWidth = false,
  className,
}: {
  /** The selected option's value. */
  value: T
  /** Called with the chosen value on a click or tap, when a dragged pill is released on another option, and on every arrow, Home or End key press. */
  onChange(value: NoInfer<T>): void
  /** Choices, in display order. */
  options: readonly SegmentOption<T>[]
  /** Accessible name of the radio group. */
  label: string
  /** Disables every option. */
  disabled?: boolean
  /** Fills the available width with one row of equal options whose labels end in an ellipsis (it
   * never scrolls). */
  equalWidth?: boolean
  /** Class name for the group (a background here fills the capsule behind the options). */
  className?: string
}) {
  return (
    <SelectionTrack
      semantics="radio"
      value={value}
      onSelect={(next) => onChange(next)}
      options={options}
      label={label}
      disabled={disabled}
      equalWidth={equalWidth}
      className={className}
    />
  )
}
