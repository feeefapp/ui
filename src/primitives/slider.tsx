'use client'

import * as React from 'react'
import { cn } from '../utils'
import { sliderRange, sliderValue, sliderFraction, sliderPointer, sliderKey } from './slider-core'
import './slider.css'
import { useSliderMotion } from './slider-motion'

export type LabSliderState = {
  value: number
  /** Smooth pointer position, useful for progressive effects between discrete stops. */
  position: number
  fraction: number
  dragging: boolean
  disabled: boolean
}
export type LabSliderMark = { value: number; label?: React.ReactNode }
export type LabSliderProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | 'onChange'
  | 'defaultValue'
  | 'children'
  | 'role'
  | 'aria-valuenow'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-checked'
> & {
  controlSize?: 'regular' | 'compact'
  trackStyle?: 'thick' | 'thin'
  label: string
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onValueChange?: (value: number) => void
  onValueCommit?: (value: number) => void
  getValueText?: (value: number) => string
  showStops?: boolean
  marks?: LabSliderMark[]
  renderTrack?: (state: LabSliderState) => React.ReactNode
  renderFill?: (state: LabSliderState) => React.ReactNode
  renderThumb?: (state: LabSliderState) => React.ReactNode
  name?: string
  form?: string
}

/** Large single-value slider. Decoration slots share one interaction/geometry engine. */
export const LabSlider = React.forwardRef<HTMLDivElement, LabSliderProps>((props, ref) => (
  <SliderControl {...props} forwardedRef={ref} />
))
LabSlider.displayName = 'LabSlider'

type ControlProps = LabSliderProps & {
  forwardedRef?: React.ForwardedRef<HTMLDivElement>
  switchMode?: boolean
  checkedText?: (value: number) => string | undefined
}
function SliderControl({
  label,
  controlSize = 'regular',
  trackStyle = 'thick',
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
  onValueCommit,
  getValueText,
  showStops = false,
  marks,
  renderTrack,
  renderFill,
  renderThumb,
  name,
  form,
  forwardedRef,
  switchMode = false,
  checkedText,
  className,
  style,
  onKeyDown,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...hostProps
}: ControlProps) {
  const range = sliderRange(min, max, step)
  const normalize = (next: number) => sliderValue(next, range.min, range.max, range.step)
  const [internal, setInternal] = React.useState(() => normalize(defaultValue ?? range.min))
  const current = normalize(value ?? internal)
  const currentRef = React.useRef(current)
  currentRef.current = current
  const host = React.useRef<HTMLDivElement | null>(null)
  const [pressed, setPressed] = React.useState(false)
  const [tracking, setTracking] = React.useState(false)
  const hidden = React.useRef<HTMLInputElement>(null)
  const gesture = React.useRef<{
    id: number
    start: number
    value: number
    x: number
    moved: boolean
  } | null>(null)
  const [position, setPosition] = React.useState<number | null>(null)
  const inert = disabled || range.max <= range.min
  const publish = (next: number) => {
    next = normalize(next)
    if (next === currentRef.current) return next
    currentRef.current = next
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
    return next
  }
  const atPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = sliderPointer(
      event.clientX,
      rect.left,
      rect.width,
      getComputedStyle(event.currentTarget).direction === 'rtl',
      Number.parseFloat(
        getComputedStyle(event.currentTarget).getPropertyValue('--lab-slider-inset')
      ) || 22
    )
    return range.min + fraction * (range.max - range.min)
  }
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const raw = atPointer(event)
    setPosition(raw)
    const next = publish(raw)
    if (gesture.current) gesture.current.value = next
  }
  const cancel = () => {
    const active = gesture.current
    gesture.current = null
    setPressed(false)
    setTracking(false)
    setPosition(null)
    if (active) publish(active.start)
  }
  React.useEffect(() => {
    if (inert) {
      gesture.current = null
      setPressed(false)
      setTracking(false)
      setPosition(null)
    }
  }, [inert])
  React.useEffect(() => {
    const owner = hidden.current?.form
    const reset = () => {
      gesture.current = null
      setPressed(false)
      setTracking(false)
      setPosition(null)
      if (value === undefined) setInternal(normalize(defaultValue ?? range.min))
    }
    owner?.addEventListener('reset', reset)
    return () => owner?.removeEventListener('reset', reset)
  }, [value, defaultValue, range.min, range.max, range.step, form])
  const displayPosition = inert ? current : (position ?? current)
  const fraction = sliderFraction(displayPosition, range.min, range.max)
  useSliderMotion(host, fraction, tracking, pressed, trackStyle === 'thin', inert)
  const state: LabSliderState = {
    value: current,
    position: displayPosition,
    fraction,
    dragging: position !== null,
    disabled: inert,
  }
  const stopCount = Math.ceil((range.max - range.min) / range.step) + 1
  const stops =
    marks ??
    (showStops && stopCount <= 101
      ? Array.from({ length: stopCount }, (_, index) => ({
          value: Math.min(range.max, range.min + index * range.step),
        }))
      : [])
  const description = getValueText?.(current)
  return (
    <>
      <div
        {...hostProps}
        ref={(el) => {
          host.current = el
          if (typeof forwardedRef === 'function') forwardedRef(el)
          else if (forwardedRef) forwardedRef.current = el
        }}
        className={cn('lab-slider', className)}
        style={{ ...style, '--lab-slider-fraction': fraction } as React.CSSProperties}
        role={switchMode ? 'switch' : 'slider'}
        tabIndex={inert ? -1 : (hostProps.tabIndex ?? 0)}
        aria-label={label}
        aria-disabled={inert || undefined}
        aria-valuemin={switchMode ? undefined : range.min}
        aria-valuemax={switchMode ? undefined : range.max}
        aria-valuenow={switchMode ? undefined : current}
        aria-valuetext={switchMode ? undefined : description}
        aria-checked={switchMode ? current === 1 : undefined}
        data-dragging={position !== null}
        data-pressed={pressed && !inert}
        data-tracking={tracking && !inert}
        data-disabled={inert || undefined}
        data-switch={switchMode || undefined}
        data-control-size={controlSize}
        data-track-style={trackStyle}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          if (
            event.defaultPrevented ||
            inert ||
            event.button !== 0 ||
            !event.isPrimary ||
            gesture.current
          )
            return
          setTracking(false)
          setPressed(true)
          event.currentTarget.focus({ preventScroll: true })
          gesture.current = {
            id: event.pointerId,
            start: current,
            value: current,
            x: event.clientX,
            moved: false,
          }
          event.currentTarget.setPointerCapture(event.pointerId)
          if (!switchMode) move(event)
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event)
          const active = gesture.current
          if (event.defaultPrevented || active?.id !== event.pointerId) return
          if (Math.abs(event.clientX - active.x) > 4) {
            active.moved = true
            setTracking(true)
          }
          if (!switchMode || active.moved) move(event)
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          if (gesture.current?.id !== event.pointerId) return
          if (inert || event.defaultPrevented) {
            cancel()
            return
          }
          if (switchMode && !gesture.current.moved)
            gesture.current.value = publish(1 - gesture.current.start)
          else move(event)
          const next = gesture.current.value
          setPressed(false)
          setTracking(false)
          gesture.current = null
          setPosition(null)
          event.currentTarget.releasePointerCapture(event.pointerId)
          onValueCommit?.(next)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          if (gesture.current?.id === event.pointerId) cancel()
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event)
          if (gesture.current?.id === event.pointerId) cancel()
        }}
        onClick={(event) => {
          onClick?.(event)
          // Assistive technology activates the switch with a click without pointer events.
          if (!event.defaultPrevented && !inert && switchMode && event.detail === 0) {
            const next = publish(1 - current)
            onValueCommit?.(next)
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || inert) return
          if (event.key === 'Escape' && gesture.current) {
            event.preventDefault()
            cancel()
            return
          }
          const next =
            switchMode && [' ', 'Enter'].includes(event.key)
              ? 1 - current
              : sliderKey(
                  event.key,
                  current,
                  range.min,
                  range.max,
                  range.step,
                  getComputedStyle(event.currentTarget).direction === 'rtl'
                )
          if (next === null) return
          event.preventDefault()
          publish(next)
          onValueCommit?.(next)
        }}
      >
        <span className="lab-slider-track-decoration" aria-hidden="true">
          {renderTrack?.(state)}
        </span>
        <span className="lab-slider-rail" aria-hidden="true" />
        <span className="lab-slider-fill" aria-hidden="true">
          {renderFill?.(state)}
        </span>
        {stops
          .filter((mark) => mark.value >= range.min && mark.value <= range.max)
          .map((mark, index) => (
            <span
              key={index}
              className="lab-slider-stop"
              aria-hidden="true"
              data-active={mark.value <= current}
              style={
                {
                  '--lab-slider-stop': sliderFraction(mark.value, range.min, range.max),
                } as React.CSSProperties
              }
            />
          ))}
        <span className="lab-slider-thumb" aria-hidden="true">
          {renderThumb?.(state)}
        </span>
        {switchMode && (
          <span className="lab-slider-switch-text" aria-hidden="true">
            {checkedText?.(current)}
          </span>
        )}
      </div>
      {marks?.some((mark) => mark.label != null) && (
        <div
          className="lab-slider-marks"
          data-control-size={controlSize}
          data-track-style={trackStyle}
          aria-hidden="true"
        >
          {marks
            .filter((mark) => mark.value >= range.min && mark.value <= range.max)
            .map((mark, index) => (
              <span
                key={index}
                style={
                  {
                    '--lab-slider-stop': sliderFraction(mark.value, range.min, range.max),
                  } as React.CSSProperties
                }
              >
                {mark.label}
              </span>
            ))}
        </div>
      )}
      <input
        ref={hidden}
        type="hidden"
        name={name}
        form={form}
        value={current}
        disabled={disabled}
      />
    </>
  )
}

export type LabSlideSwitchProps = Omit<
  LabSliderProps,
  | 'value'
  | 'defaultValue'
  | 'min'
  | 'max'
  | 'step'
  | 'onValueChange'
  | 'onValueCommit'
  | 'getValueText'
  | 'showStops'
  | 'marks'
> & {
  loading?: boolean
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onCheckedCommit?: (checked: boolean) => void
  onText?: string
  offText?: string
}
/** Same track, thumb, pointer and animation engine; boolean state maps exactly to 0/1. */
export const LabSlideSwitch = React.forwardRef<HTMLDivElement, LabSlideSwitchProps>(
  (
    {
      checked,
      loading,
      defaultChecked = false,
      onCheckedChange,
      onCheckedCommit,
      onText,
      offText,
      ...props
    },
    ref
  ) => {
    return (
      <SliderControl
        {...props}
        forwardedRef={ref}
        switchMode
        disabled={props.disabled || loading}
        aria-busy={loading || undefined}
        min={0}
        max={1}
        step={1}
        value={checked === undefined ? undefined : Number(checked)}
        defaultValue={Number(defaultChecked)}
        onValueChange={(next) => onCheckedChange?.(next === 1)}
        onValueCommit={(next) => onCheckedCommit?.(next === 1)}
        checkedText={(next) => (next === 1 ? onText : offText)}
      />
    )
  }
)
LabSlideSwitch.displayName = 'LabSlideSwitch'

/** Noninteractive menu decoration with the same geometry and spring, never nested switch semantics. */
export function LabSlideSwitchIndicator({
  checked,
  loading,
  controlSize = 'compact',
}: {
  checked: boolean
  loading?: boolean
  controlSize?: 'regular' | 'compact'
}) {
  const host = React.useRef<HTMLDivElement | null>(null)
  useSliderMotion(host, Number(checked), false, false, false, Boolean(loading))
  return (
    <div
      ref={host}
      className="lab-slider lab-slide-switch-indicator"
      data-checked={checked}
      data-switch
      data-control-size={controlSize}
      data-disabled={loading || undefined}
      aria-hidden="true"
      style={{ '--lab-slider-fraction': Number(checked) } as React.CSSProperties}
    >
      <span className="lab-slider-rail" />
      <span className="lab-slider-fill" />
      <span className="lab-slider-thumb" />
    </div>
  )
}
