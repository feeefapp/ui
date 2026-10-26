import { useMemo, useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Option, Select } from '@feeef.dev/ui/primitives/select'
import { Slider, SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Code } from './code'
import { Stage } from './example'
import { GlassScope } from '@feeef.dev/ui/glass'

export type Control =
  | {
      type: 'select'
      label?: string
      options: readonly string[]
      default: string
    }
  | { type: 'boolean'; label?: string; default: boolean }
  | { type: 'text'; label?: string; default: string }
  | {
      type: 'number'
      label?: string
      min: number
      max: number
      step?: number
      default: number
    }

type ValueOf<C extends Control> = C extends { type: 'boolean' }
  ? boolean
  : C extends { type: 'number' }
    ? number
    : string

export type Values<C extends Record<string, Control>> = {
  [K in keyof C]: ValueOf<C[K]>
}

const defaultsOf = <C extends Record<string, Control>>(controls: C) =>
  Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.default])) as Values<C>

const humanize = (name: string) => name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/**
 * Interactive demo: knobs on the side, the live component on the stage and the matching JSX
 * below, which updates as the knobs change.
 */
export function Playground<C extends Record<string, Control>>({
  controls,
  render,
  code,
}: {
  controls: C
  render: (values: Values<C>) => ReactNode
  code: (values: Values<C>) => string
}) {
  const initial = useMemo(() => defaultsOf(controls), [controls])
  const [values, setValues] = useState(initial)
  const set = (key: keyof C, value: unknown) => setValues((v) => ({ ...v, [key]: value }))
  return (
    <div className="docs-playground">
      <div className="docs-playground-main">
        <Stage>{render(values)}</Stage>
        <form
          className="docs-playground-controls"
          aria-label="Playground controls"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="docs-playground-controls-head">
            <strong>Controls</strong>
            <GlassScope className="docs-glass-row">
            <ToolbarGroup label="Controls actions">
              <IconButton
              variant="text"
                appearance="toolbar"
              aria-label="Reset controls"
              title="Reset controls"
              onClick={() => setValues(initial)}
            >
              <RotateCcw size={16} />
            </IconButton>
            </ToolbarGroup>
            </GlassScope>
          </div>
          {Object.entries(controls).map(([key, control]) => {
            const label = control.label ?? humanize(key)
            const value = values[key as keyof C]
            switch (control.type) {
              case 'select':
                return (
                  <Select
                    key={key}
                    hint={label}
                    controlSize="small"
                    value={String(value)}
                    onValueChange={(next) => set(key, next)}
                  >
                    {control.options.map((option) => (
                      <Option key={option} value={option}>
                        {option}
                      </Option>
                    ))}
                  </Select>
                )
              case 'boolean':
                return (
                  <div key={key} className="docs-playground-row">
                    <span aria-hidden="true">{label}</span>
                    <SlideSwitch
                      label={label}
                      checked={Boolean(value)}
                      onCheckedChange={(next) => set(key, next)}
                    />
                  </div>
                )
              case 'text':
                return (
                  <TextField
                    key={key}
                    hint={label}
                    controlSize="small"
                    value={String(value)}
                    onValueChange={(next) => set(key, next)}
                  />
                )
              case 'number':
                return (
                  <div key={key} className="docs-playground-slider">
                    <span aria-hidden="true">
                      {label} <output>{String(value)}</output>
                    </span>
                    <Slider
                      label={label}
                      controlSize="small"
                      min={control.min}
                      max={control.max}
                      step={control.step ?? 1}
                      value={Number(value)}
                      onValueChange={(next) => set(key, next)}
                    />
                  </div>
                )
            }
          })}
        </form>
      </div>
      <Code code={code(values)} title="JSX" className="docs-playground-code" />
    </div>
  )
}

/** A prop value; `{ expr }` is written verbatim inside braces (`leadingIcon={<Search />}`). */
export type JsxValue = string | number | boolean | null | undefined | { expr: string }

/**
 * Formats a JSX element the way a person would write it: string props quoted, `true` as a bare
 * attribute, `{ expr }` verbatim in braces, omitted when undefined/false or equal to `defaults`,
 * wrapped when it gets long.
 */
export function jsx(
  tag: string,
  props: Record<string, JsxValue>,
  children?: string,
  defaults: Record<string, JsxValue> = {}
) {
  const attrs = Object.entries(props)
    .filter(
      ([key, value]) => value !== undefined && value !== null && value !== false && value !== defaults[key]
    )
    .map(([key, value]) =>
      value === true
        ? key
        : typeof value === 'string'
          ? `${key}="${value}"`
          : typeof value === 'object'
            ? `${key}={${value!.expr}}`
            : `${key}={${value}}`
    )
  const oneLine = `<${tag}${attrs.map((a) => ' ' + a).join('')}`
  const open = oneLine.length > 72 ? `<${tag}\n${attrs.map((a) => '  ' + a).join('\n')}\n` : oneLine
  if (!children) return `${open}${open.endsWith('\n') ? '' : ' '}/>`
  return `${open}>\n  ${children.split('\n').join('\n  ')}\n</${tag}>`
}
