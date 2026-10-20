import { useRef, type ReactNode, type KeyboardEvent } from 'react'
import { LabButton } from './button'
import { cn } from '../utils'
import { revealScrollChild } from '../scroll/reveal'
import './segmented.css'

export type LabSegmentOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
}
export function LabSegmentedControl<const T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className,
  appearance = 'grouped',
}: {
  value: T
  onChange(value: NoInfer<T>): void
  options: readonly LabSegmentOption<T>[]
  label: string
  disabled?: boolean
  className?: string
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
        <LabButton
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
          {option.icon && <span aria-hidden="true">{option.icon}</span>}
          {option.label}
        </LabButton>
      ))}
    </div>
  )
}
