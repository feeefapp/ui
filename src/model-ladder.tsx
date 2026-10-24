'use client'

import { ToolbarSearch } from './toolbar-search'
import { PopoverSurface, Slider } from './ui'
import { useFloatingBoundary } from './menu/boundary'

import { Button } from './ui'
import { ScrollArea, revealScrollChild } from './scroll'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeft, Brain, Check, ChevronDown, RotateCcw, Zap } from 'lucide-react'
import { useI18n } from './i18n'
import './model-ladder.css'

import {
  clamp,
  displayName,
  fireCell,
  FIRE_CELL as CELL,
  FIRE_PALETTE as PALETTE,
  formatUsd,
  heatAt,
  visibleLabel,
  type AspectReadout,
  type LadderCopy,
  type LadderStop,
} from './model-ladder-core'
import { prefersReducedMotion } from './physics/motion-value'

export * from './model-ladder-core'

// ---------------------------------------------------------------------------------- trigger

/** Localized ladder copy; an explicit `copy` prop still wins (docs fixtures, tests). */
function useLadderCopy(copy?: LadderCopy): LadderCopy {
  const { t } = useI18n()
  if (copy) return copy
  return {
    quality: t('lab.ladder.quality'),
    reset: t('lab.ladder.reset'),
    fast: t('lab.ladder.fast'),
    balanced: t('lab.ladder.balanced'),
    best: t('lab.ladder.best'),
    pickModel: t('lab.ladder.pickModel'),
    searchModels: t('lab.ladder.searchModels'),
    noMatches: t('lab.ladder.noMatches'),
    back: t('lab.ladder.back'),
    typical: (price: string) => t('lab.ladder.typical', { price }),
  }
}

/**
 * Quality picker: a trigger (chip or icon) that opens a popover with the ladder card. Moves
 * between curated models with one slider, cheapest first; the title opens the full model list.
 */
export function ModelLadder({
  stops,
  index,
  defaultIndex = 0,
  onChange,
  enabled = true,
  canvas,
  belowModel,
  catalog,
  onPickModel,
  onBrowseModels,
  onOpenChange,
  selectedModel,
  copy,
  variant = 'chip',
  align = 'start',
  side = 'top',
  className,
}: {
  /** The quality rungs, cheapest first. Nothing renders when empty. */
  stops: LadderStop[]
  /** Selected rung (controlled). Clamped to the stops. */
  index: number
  /** The rung "Reset to default" returns to. */
  defaultIndex?: number
  /** Called with the new rung index. */
  onChange(index: number): void
  /** `false` disables the trigger so the popover cannot open. */
  enabled?: boolean
  /** Size and aspect readout of the output canvas, shown under the title. */
  canvas?: AspectReadout | null
  /** Extra controls under the model switch (e.g. a length or shape picker). */
  belowModel?: ReactNode
  /** Every model the user may pick from the title list; defaults to the ladder rungs. */
  catalog?: LadderStop[]
  /** Called when the user picks a catalog model that is not one of the rungs. */
  onPickModel?(modelId: string): void
  /** Replaces the built-in model list: the title button closes the popover and calls this. */
  onBrowseModels?(): void
  /** Called when the popover opens or closes. */
  onOpenChange?(open: boolean): void
  /** A specific catalog choice outside the curated quality ladder. */
  selectedModel?: LadderStop
  /** Overrides the localized strings. */
  copy?: LadderCopy
  /**
   * `chip` shows the tier and model name; `icon` is a compact brain button like marchant;
   * `compact` is one small-control line (brain, tier, chevron) for composer and toolbar rows.
   */
  variant?: 'chip' | 'icon' | 'compact'
  /** Popover alignment against the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Which side of the trigger the popover opens on. */
  side?: 'top' | 'bottom'
  className?: string
}) {
  copy = useLadderCopy(copy)
  const [open, setOpen] = useState(false)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const boundary = useFloatingBoundary()
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  if (!stops.length) return null
  const safe = clamp(index, 0, stops.length - 1)
  const current = selectedModel ?? stops[safe]
  const tier = selectedModel
    ? displayName(current, safe, stops.length, copy)
    : visibleLabel(current, safe, stops.length, copy)
  const name = displayName(current, safe, stops.length, copy)
  const top = safe === stops.length - 1 && stops.length > 1
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        // Inside a top-layer <dialog> the popover must portal into it, or it renders underneath.
        if (next) setContainer(trigger.current?.closest('dialog') ?? boundary)
        setOpen(next)
        onOpenChange?.(next)
      }}
    >
      <Popover.Trigger asChild disabled={!enabled}>
        {variant === 'compact' ? (
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            appearance="toolbar"
            controlSize="small"
            className={`lab-ladder-compact ${className ?? ''}`}
            data-top={top}
            aria-label={`${copy.quality}: ${tier}${tier === name ? '' : `, ${name}`}`}
            title={`${tier}${tier === name ? '' : ` · ${name}`}`}
          >
            <Brain aria-hidden="true" />
            <span key={tier} className="lab-ladder-compact-label lab-ladder-swap">
              {tier}
            </span>
            <ChevronDown className="lab-ladder-compact-chevron" aria-hidden="true" />
          </Button>
        ) : (
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          appearance="toolbar"
          controlSize={variant === 'icon' ? 'icon' : 'regular'}
          className={`lab-ladder-trigger lab-ladder-trigger--${variant} ${className ?? ''}`}
          data-top={top}
          aria-label={`${copy.quality}: ${tier}${tier === name ? '' : `, ${name}`}`}
          title={`${tier}${tier === name ? '' : ` · ${name}`}`}
        >
          <span className="lab-ladder-trigger-icon" aria-hidden="true">
            <Brain size={variant === 'icon' ? 18 : 16} strokeWidth={1.6} />
          </span>
          {variant === 'chip' && (
            <span className="lab-ladder-trigger-text">
              <b key={tier} className="lab-ladder-swap">
                {tier}
              </b>
              <small>{name}</small>
            </span>
          )}
          {variant === 'chip' && <ChevronDown size={14} aria-hidden="true" />}
        </Button>
        )}
      </Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>
        <PopoverSurface asChild>
          <Popover.Content
            ref={popover}
            className="lab-ladder-popover"
            side={side}
            align={align}
            sideOffset={8}
            collisionPadding={12}
            collisionBoundary={container ?? undefined}
            onEscapeKeyDown={(event) => {
              const target = event.target
              // Radix handles Escape during document capture. Let the focused
              // model list return to quality before the popover itself closes.
              if (
                target instanceof Element &&
                popover.current?.contains(target) &&
                target.closest('[data-lab-model-list]')
              )
                event.preventDefault()
            }}
            onOpenAutoFocus={(event) => {
              // Focus the slider, not the first button, so arrows move the ladder right away.
              event.preventDefault()
              requestAnimationFrame(() => {
                const surface = popover.current
                const initial =
                  surface?.querySelector<HTMLElement>('[role="slider"]') ??
                  surface?.querySelector<HTMLButtonElement>('button:not(:disabled)')
                initial?.focus()
              })
            }}
          >
            <ModelLadderCard
              stops={stops}
              index={safe}
              defaultIndex={defaultIndex}
              onChange={onChange}
              canvas={canvas}
              belowModel={belowModel}
              catalog={catalog}
              onPickModel={onPickModel}
              onBrowseModels={onBrowseModels ? () => {setOpen(false);onBrowseModels()} : undefined}
              selectedModel={selectedModel}
              copy={copy}
            />
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ------------------------------------------------------------------------------------ card

/** The ladder card: tier title, model switch, canvas readout, extra controls and the track. */
export function ModelLadderCard({
  stops,
  index,
  defaultIndex = 0,
  onChange,
  canvas,
  belowModel,
  catalog,
  onPickModel,
  onBrowseModels,
  selectedModel,
  copy,
  pickable = true,
}: {
  /** The quality rungs, cheapest first. Needs at least one. */
  stops: LadderStop[]
  /** Selected rung (controlled). Clamped to the stops. */
  index: number
  /** The rung "Reset to default" returns to. */
  defaultIndex?: number
  /** Called with the new rung index. */
  onChange(index: number): void
  /** Size and aspect readout of the output canvas, shown under the title. */
  canvas?: AspectReadout | null
  /** Extra controls between the readout and the track. */
  belowModel?: ReactNode
  /** Every model the user may pick from the title list; defaults to the ladder rungs. */
  catalog?: LadderStop[]
  /** Called when the user picks a catalog model that is not one of the rungs. */
  onPickModel?(modelId: string): void
  /** Replaces the built-in model list: the title button calls this instead. */
  onBrowseModels?(): void
  /** A specific catalog choice outside the curated quality ladder. */
  selectedModel?: LadderStop
  /** Overrides the localized strings. */
  copy?: LadderCopy
  /** `false` turns the title into a plain label with no model list. */
  pickable?: boolean
}) {
  const { t } = useI18n()
  copy = useLadderCopy(copy)
  const [view, setView] = useState<'ladder' | 'pick'>('ladder')
  const titleButton = useRef<HTMLButtonElement>(null)
  const restoreTitleFocus = useRef(false)
  useLayoutEffect(() => {
    if (view === 'ladder' && restoreTitleFocus.current) {
      restoreTitleFocus.current = false
      titleButton.current?.focus({ preventScroll: true })
    }
  }, [view])
  const returnToLadder = () => {
    restoreTitleFocus.current = true
    setView('ladder')
  }
  const count = stops.length
  const safe = clamp(index, 0, count - 1)
  const stop = selectedModel ?? stops[safe]
  const last = safe >= count - 1 && count > 1
  const title = selectedModel
    ? displayName(stop, safe, count, copy)
    : visibleLabel(stop, safe, count, copy)
  const name = displayName(stop, safe, count, copy)
  const showName = name !== title
  const safeDefault = clamp(defaultIndex, 0, count - 1)

  if (view === 'pick')
    return (
      <ModelList
        items={catalog?.length ? catalog : stops}
        tiers={stops}
        selectedId={stop.modelId}
        copy={copy}
        onBack={returnToLadder}
        onPick={(modelId) => {
          const rung = stops.findIndex((row) => row.modelId === modelId)
          if (rung >= 0) onChange(rung)
          else onPickModel?.(modelId)
          returnToLadder()
        }}
      />
    )

  return (
    <div className="lab-ladder-card lab-light-edge">
      <div className="lab-ladder-head">
        <Zap className="lab-ladder-bolt" size={18} strokeWidth={1.5} aria-hidden="true" />
        <Button
          ref={titleButton}
          type="button"
          variant="ghost"
          appearance="toolbar"
          controlSize="regular"
          className="lab-ladder-title"
          onClick={pickable && (count > 1 || !!catalog?.length || !!onBrowseModels) ? () => onBrowseModels ? onBrowseModels() : setView('pick') : undefined}
          disabled={!pickable || (count <= 1 && !catalog?.length && !onBrowseModels)}
          aria-label={`${copy.pickModel}. ${title}${title === name ? '' : `, ${name}`}`}
        >
          <span className="lab-ladder-title-text">
            <span className="lab-ladder-tier-row">
              <span className="lab-ladder-tier" data-top={last} key={title} aria-live="polite">
                {title}
              </span>
              {stop.access && (
                <span className="lab-model-access" data-access={stop.access}>
                  {stop.access === 'free' ? t('lab.common.free') : t('lab.common.pro')}
                </span>
              )}
            </span>
            {showName && <span className="lab-ladder-name">{name}</span>}
          </span>
          {pickable && (count > 1 || !!catalog?.length || !!onBrowseModels) && (
            <ChevronDown size={14} aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          appearance="toolbar"
          controlSize="icon"
          className="lab-ladder-reset"
          title={copy.reset}
          aria-label={copy.reset}
          disabled={!selectedModel && safe === safeDefault}
          onClick={() => onChange(safeDefault)}
        >
          <RotateCcw size={16} strokeWidth={1.6} />
        </Button>
      </div>
      {stop.priceUsd && stop.access !== 'free' ? (
        <p className="lab-ladder-price">{copy.typical(formatUsd(stop.priceUsd))}</p>
      ) : null}
      {canvas && (
        <div className="lab-ladder-canvas">
          <AspectBox widthOverHeight={canvas.widthOverHeight} />
          <span className="lab-ladder-size">{canvas.size}</span>
          <span className="lab-ladder-aspect">{canvas.aspect}</span>
        </div>
      )}
      {belowModel && <div className="lab-ladder-below">{belowModel}</div>}
      {!selectedModel && (
        <LadderTrack
          count={count}
          index={safe}
          onChange={onChange}
          label={copy.quality}
          valueText={(i) =>
            `${visibleLabel(stops[i], i, count, copy)}, ${displayName(stops[i], i, count, copy)}`
          }
        />
      )}
    </div>
  )
}

/** A rectangle at the true proportions, fitted inside a square so every ratio lines up. */
export function AspectBox({
  widthOverHeight,
  box = 20,
}: {
  /** Aspect ratio as width divided by height. */
  widthOverHeight: number
  /** Side of the square it is fitted into, in pixels. */
  box?: number
}) {
  const ratio = widthOverHeight > 0 ? widthOverHeight : 1
  const w = ratio >= 1 ? box : box * ratio
  const h = ratio >= 1 ? box / ratio : box
  return (
    <span className="lab-ladder-aspect-box" style={{ width: box, height: box }} aria-hidden="true">
      <i style={{ width: Math.max(4, w), height: Math.max(4, h) }} />
    </span>
  )
}

// ----------------------------------------------------------------------------------- track

/** Domain decoration on the shared slider; the interaction engine lives in primitives. */
function LadderTrack({
  count,
  index,
  onChange,
  label,
  valueText,
}: {
  count: number
  index: number
  onChange(index: number): void
  label: string
  valueText(index: number): string
}) {
  return (
    <Slider
      className="lab-ladder-track"
      label={label}
      min={0}
      max={Math.max(0, count - 1)}
      step={1}
      value={index}
      disabled={count <= 1}
      onValueChange={onChange}
      getValueText={valueText}
      showStops
      renderFill={({ position }) => {
        const heat = heatAt(position, count)
        return (
          <span className="lab-ladder-fire" style={{ opacity: heat }}>
            {heat > 0 && <PixelFire />}
          </span>
        )
      }}
    />
  )
}

// ------------------------------------------------------------------------------------ fire

/** Square cells flicker and rise through fire colours, about 12 steps a second. */
function PixelFire() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let frame = -1
    const draw = (step: number) => {
      const { width, height } = canvas.getBoundingClientRect()
      if (canvas.width !== Math.ceil(width) || canvas.height !== Math.ceil(height)) {
        canvas.width = Math.ceil(width)
        canvas.height = Math.ceil(height)
      }
      ctx.fillStyle = PALETTE[0]
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const cols = Math.ceil(canvas.width / CELL)
      const rows = Math.ceil(canvas.height / CELL)
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const idx = fireCell(col, row, rows, step)
          if (idx < 0) continue
          ctx.fillStyle = PALETTE[idx]
          ctx.fillRect(col * CELL, row * CELL, CELL - 1, CELL - 1)
        }
    }
    if (prefersReducedMotion()) {
      draw(0)
      return
    }
    const tick = (now: number) => {
      const step = Math.floor(now / 83)
      if (step !== frame) {
        frame = step
        draw(step % 12)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="lab-ladder-fire-canvas" aria-hidden="true" />
}

// ------------------------------------------------------------------------------------ list

function ModelList({
  items,
  tiers,
  selectedId,
  copy,
  onBack,
  onPick,
}: {
  items: LadderStop[]
  /** Ladder rungs, so catalog rows on the ladder show their tier. */
  tiers: LadderStop[]
  selectedId: string
  copy: LadderCopy
  onBack(): void
  onPick(modelId: string): void
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(selectedId)
  const listId = useId()
  const titleId = useId()
  const input = useRef<HTMLInputElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const optionButtons = useRef(new Map<string, HTMLButtonElement>())
  const count = items.length
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .map((stop, i) => {
        const rung = tiers.findIndex((row) => row.modelId === stop.modelId)
        const tier = rung >= 0 ? visibleLabel(tiers[rung], rung, tiers.length, copy) : ''
        return {
          stop,
          name: displayName(stop, i, count, copy),
          tier: tier.toLowerCase() === stop.access ? '' : tier,
        }
      })
      .filter(
        (row) =>
          !q ||
          row.name.toLowerCase().includes(q) ||
          row.tier.toLowerCase().includes(q) ||
          row.stop.modelId.toLowerCase().includes(q) ||
          (row.stop.description ?? '').toLowerCase().includes(q)
      )
  }, [items, tiers, query, count, copy])
  const tabStop = rows.some((row) => row.stop.modelId === activeId)
    ? activeId
    : (rows.find((row) => row.stop.modelId === selectedId)?.stop.modelId ?? rows[0]?.stop.modelId)
  useEffect(() => {
    if (count > 6) input.current?.focus()
    else {
      const initial =
        optionButtons.current.get(selectedId) ?? optionButtons.current.values().next().value
      initial?.focus({ preventScroll: true })
      revealScrollChild(viewport.current, initial, { inline: false })
    }
  }, [count, selectedId])
  const focusOption = (index: number) => {
    const next = rows[index]?.stop.modelId
    if (!next) return
    setActiveId(next)
    const option = optionButtons.current.get(next)
    option?.focus({ preventScroll: true })
    revealScrollChild(viewport.current, option, { inline: false })
  }
  const navigateOptions = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!rows.length) return
    const index = Math.max(
      0,
      rows.findIndex((row) => row.stop.modelId === tabStop)
    )
    if (event.key === 'ArrowDown') focusOption((index + 1) % rows.length)
    else if (event.key === 'ArrowUp') focusOption((index - 1 + rows.length) % rows.length)
    else if (event.key === 'Home') focusOption(0)
    else if (event.key === 'End') focusOption(rows.length - 1)
    else return
    event.preventDefault()
  }
  return (
    <div
      className="lab-ladder-card lab-ladder-list lab-light-edge"
      data-lab-model-list
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onBack()
      }}
    >
      <ScrollArea
        ref={viewport}
        className="lab-ladder-list-scroll"
        label={copy.pickModel}
        contentPadding={12}
        viewportProps={{ tabIndex: -1 }}
        top={
          <div className="lab-ladder-list-tools">
            <div className="lab-ladder-list-head">
              <Button
                type="button"
                variant="elevated"
                controlSize="icon"
                aria-label={copy.back}
                title={copy.back}
                onClick={onBack}
              >
                <ArrowLeft size={20} strokeWidth={1.75} className="lab-dir-flip" />
              </Button>
              <b id={titleId}>{copy.pickModel}</b>
            </div>
            {count > 6 && (
              <div className="lab-ladder-search">
                {/* Open from the start: a collapsed editor is inert, so the focus call above
                    would land nowhere, and search is the point of a long list. */}
                <ToolbarSearch
                  defaultExpanded
                  label={copy.searchModels}
                  value={query}
                  onValueChange={setQuery}
                  inputRef={input}
                  onInputKeyDown={(event) => {
                    if (!rows.length || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
                    event.preventDefault()
                    focusOption(event.key === 'ArrowDown' ? 0 : rows.length - 1)
                  }}
                />
              </div>
            )}
          </div>
        }
      >
        <div
          className="lab-ladder-options"
          id={listId}
          role="listbox"
          aria-labelledby={titleId}
          onKeyDown={navigateOptions}
        >
          {rows.length === 0 && <p className="lab-ladder-empty">{copy.noMatches}</p>}
          {rows.map(({ stop, name, tier }) => (
            <Button
              key={stop.modelId}
              ref={(button) => {
                if (button) optionButtons.current.set(stop.modelId, button)
                else optionButtons.current.delete(stop.modelId)
              }}
              type="button"
              variant="ghost"
              appearance="toolbar"
              controlSize="regular"
              role="option"
              aria-selected={stop.modelId === selectedId}
              tabIndex={stop.modelId === tabStop ? 0 : -1}
              className="lab-ladder-option"
              onFocus={() => setActiveId(stop.modelId)}
              onClick={() => onPick(stop.modelId)}
            >
              <span className="lab-ladder-option-copy">
                <b>{name}</b>
                <small>
                  {tier && tier !== name ? tier : null}
                  {tier && tier !== name && stop.description ? ' · ' : null}
                  {stop.description}
                </small>
              </span>
              {stop.access && (
                <span className="lab-model-access" data-access={stop.access}>
                  {stop.access === 'free' ? t('lab.common.free') : t('lab.common.pro')}
                </span>
              )}
              {stop.priceUsd && stop.access !== 'free' ? (
                <em className="lab-ladder-option-price">{formatUsd(stop.priceUsd)}</em>
              ) : null}
              {stop.modelId === selectedId && <Check size={15} aria-hidden="true" />}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
