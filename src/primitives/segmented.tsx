import { useRef, type ReactNode, type KeyboardEvent } from 'react'
import { Button } from './button'
import { cn } from '../utils'
import { revealScrollChild } from '../scroll/reveal'
import './segmented.css'

/** One choice of a segmented control. */
export type SegmentOption<T extends string> = {
  /** Value reported to `onChange`. */
  value: T
  /** Visible text and accessible name. */
  label: string
  /** Decorative icon before the label. */
  icon?: ReactNode
  /** Skipped by the keyboard and not clickable. */
  disabled?: boolean
}
/**
 * A single choice among two to five short options, shown side by side. Radio semantics: one Tab
 * stop, arrow keys move and select.
 */
export function SegmentedControl<const T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className,
  appearance = 'grouped',
}: {
  /** The selected option's value. */
  value: T
  /** Called with the chosen value on click and on every arrow, Home or End key press. */
  onChange(value: NoInfer<T>): void
  /** Choices, in display order. */
  options: readonly SegmentOption<T>[]
  /** Accessible name of the radio group. */
  label: string
  /** Disables every option. */
  disabled?: boolean
  /** Class name for the group. */
  className?: string
  /** `grouped` draws its own glass container; `plain` sits directly on an existing surface. */
  appearance?: 'grouped' | 'plain'
}) {
  const group = useRef<HTMLDivElement>(null)
  const enabled = options.filter((option) => !disabled && !option.disabled)
  const tabValue = enabled.some((option) => option.value === value) ? value : enabled[0]?.value
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) ||
      !enabled.length
    )
      return
    event.preventDefault()
    const rtl = group.current && getComputedStyle(group.current).direction === 'rtl'
    const index = enabled.findIndex((option) => option.value === value)
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const delta =
      (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) *
      (horizontal && rtl ? -1 : 1)
    const next =
      event.key === 'Home'
        ? enabled[0]
        : event.key === 'End'
          ? enabled[enabled.length - 1]
          : enabled[(Math.max(0, index) + delta + enabled.length) % enabled.length]
    onChange(next.value)
    const position = options.findIndex((option) => option.value === next.value)
    const button = group.current?.querySelectorAll<HTMLButtonElement>('button')[position]
    button?.focus({ preventScroll: true })
    revealScrollChild(group.current, button, { block: false })
    revealScrollChild(group.current?.closest<HTMLElement>('.lab-scroll-viewport'), button, {
      inline: false,
    })
  }
  return (
    <div
      ref={group}
      className={cn('lab-segmented', appearance === 'grouped' && 'lab-light-edge', className)}
      data-appearance={appearance}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={navigate}
      data-lab-corners
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          appearance="toolbar"
          controlSize="regular"
          className="lab-segmented-option"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === tabValue ? 0 : -1}
          disabled={disabled || option.disabled}
          data-state={option.value === value ? 'on' : 'off'}
          onClick={() => onChange(option.value)}
        >
          {option.icon && (
            <span className="lab-segmented-icon" aria-hidden="true">
              {option.icon}
            </span>
          )}
          <span className="lab-segmented-label">{option.label}</span>
        </Button>
      ))}
    </div>
  )
}
