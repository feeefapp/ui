'use client'

import { useRef, useState, useId, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  ArrowLeft,
  ListFilter,
  Sparkles,
  Pin,
  PinOff,
  SlidersHorizontal,
  CalendarDays,
  ToggleLeft,
} from 'lucide-react'
import { ToolbarSearch } from './toolbar-search'
import { ToolbarGroup } from './toolbar'
import { IconButton, Button } from './primitives/button'
import { TextField } from './primitives/text-field'
import { PopoverSurface } from './primitives/popover-surface'
import { useFloatingBoundary } from './menu/boundary'
import { Modal, PresentationDock } from './presentation'
import { ScrollArea } from './scroll'
import { Dock } from './dock'
import { TemporalFilterEditor } from './filters/temporal-editor'
import { TemporalDialog } from './filters/temporal-dialog'
import { temporalSummary } from './filters/temporal-format'
import { useI18n } from './i18n'
import type { Translate } from './i18n-core'
import {
  isTemporalType,
  isTemporalRange,
  validateTemporal,
  readTemporalForm,
  type TemporalConfig,
  type TemporalValue,
} from './filters/temporal'
import './filter-bar.css'
import { GlassScope } from './glass/container'

/** A filter's value: `true` for on/off filters, a string, a `{from, to}` range, or `null` (any). */
export type FilterValue = string | boolean | { from: string; to: string } | null
/**
 * One filter in the catalog. `type` picks the editor: omitted/`boolean` (on/off), `enum` (choice
 * list), a temporal type (`date`, `time`, `datetime`, `dateRange`, `timeRange`, `datetimeRange`)
 * or `custom` (your own editor in a dialog).
 */
export type FilterOption = {
  /** Stable id; the key in `value` / `values` / `pinned`. */
  id: string
  /** Name shown in the catalog and on the pinned chip. */
  label: string
  /** Second line in the catalog row. */
  description?: string
  /** Catalog row icon. Defaults to one per type. */
  icon?: ReactNode
  /** Extra words the catalog search matches. */
  keywords?: readonly string[]
  /** Returns an error message to block Apply, or null. Runs after the built-in temporal checks. */
  validate?: (value: FilterValue) => string | null
} & (
  | { type?: 'boolean' }
  | {
      type: 'enum'
      /** The choices; the stored value is the choice's `value`. */
      choices: readonly { value: string; label: string }[]
    }
  | TemporalConfig
  | {
      type: 'custom'
      /** Renders the editor inside the filter dialog. Call `onChange` with the draft value. */
      renderEditor: (value: FilterValue, onChange: (value: FilterValue) => void) => ReactNode
      /** Text for the chip and catalog row. Defaults to the raw value. */
      formatValue?: (value: FilterValue) => string
    }
)
export type FilterBarProps = {
  /** Accessible name of the bar. */
  label: string
  /** The filter catalog. */
  options: readonly FilterOption[]
  /** Enabled boolean filters. */
  value: readonly string[]
  /** Called with the new list of enabled boolean filter ids. */
  onChange: (value: string[]) => void
  /** Non-boolean values can be controlled independently from pinned shortcuts. */
  values?: Readonly<Record<string, FilterValue>>
  /** Called with every non-boolean value after an edit; cleared filters are `null`. */
  onValuesChange?: (values: Record<string, FilterValue>) => void
  /** Ids shown as chips in the bar (controlled). Pinning never changes a value. */
  pinned?: readonly string[]
  /** Called when filters are pinned or unpinned. Editing or toggling a filter also pins it. */
  onPinnedChange?: (ids: string[]) => void
  /**
   * Adds a "describe a filter" button. Return the boolean filter ids to enable (an empty list clears
   * all) or throw an Error whose message is shown under the field. You supply the parser or model.
   */
  onNaturalFilter?: (text: string) => Promise<readonly string[]> | readonly string[]
  /** Example descriptions under the natural-language field; choosing one fills the field. */
  naturalSuggestions?: readonly string[]
  /** Shows a back button before the filter controls, e.g. to leave a filtered view. */
  onBack?: () => void
  /** Content at the end of the bar, usually a ToolbarGroup of view actions. */
  trailing?: ReactNode
}
function summary(option: FilterOption, value: FilterValue, locale: string, t: Translate) {
  if (value == null) return t('lab.filter.any')
  if (option.type === 'custom' && option.formatValue) return option.formatValue(value)
  if (isTemporalType(option.type) && typeof value !== 'boolean')
    return temporalSummary(option as FilterOption & TemporalConfig, value, locale, undefined, t)
  if (typeof value === 'object')
    return `${value.from || t('lab.filter.anyDate')} → ${value.to || t('lab.filter.anyDate')}`
  if (option.type === 'enum')
    return option.choices.find((choice) => choice.value === value)?.label || t('lab.filter.any')
  if (typeof value === 'boolean') return value ? t('lab.filter.on') : t('lab.filter.off')
  return value
}
/**
 * Filter toolbar: a searchable catalog button, an optional natural-language button, pinned filter
 * chips and trailing actions. Pinning controls shortcuts, clearing controls query values.
 */
export function FilterBar({
  label,
  options,
  value,
  onChange,
  values: controlledValues,
  onValuesChange,
  pinned: controlledPins,
  onPinnedChange,
  onNaturalFilter,
  naturalSuggestions,
  onBack,
  trailing,
}: FilterBarProps) {
  const formId = useId()
  const i18n = useI18n()
  const t = i18n.t
  const host = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null)
  const enumSearch = useRef<HTMLInputElement>(null)
  const naturalInput = useRef<HTMLInputElement>(null)
  const anchor = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => new DOMRect(),
  })
  const [choiceQuery, setChoiceQuery] = useState('')
  const returnFocus = useRef<HTMLElement | null>(null)
  const [localValues, setLocalValues] = useState<Record<string, FilterValue>>({})
  const [localPins, setLocalPins] = useState<string[]>([])
  const values = controlledValues ?? localValues,
    pins = controlledPins ?? localPins
  const [container, setContainer] = useState<HTMLElement>()
  const boundary = useFloatingBoundary()
  const [dir, setDir] = useState<'rtl' | 'ltr'>('ltr')
  const [catalog, setCatalog] = useState(false),
    [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null),
    [draft, setDraft] = useState<FilterValue>(null),
    [editError, setEditError] = useState('')
  const [natural, setNatural] = useState(false),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const read = (option: FilterOption): FilterValue =>
    !option.type || option.type === 'boolean'
      ? value.includes(option.id)
        ? true
        : null
      : (values[option.id] ?? null)
  const change = (option: FilterOption, next: FilterValue) => {
    if (!option.type || option.type === 'boolean')
      onChange(
        next === true ? [...new Set([...value, option.id])] : value.filter((id) => id !== option.id)
      )
    else {
      const normalized = next && typeof next === 'object' && !next.from && !next.to ? null : next
      const updated = { ...values, [option.id]: normalized }
      setLocalValues(updated)
      onValuesChange?.(updated)
    }
  }
  const setPins = (next: string[]) => {
    const activeElement = host.current?.ownerDocument.activeElement
    if (
      activeElement instanceof HTMLElement &&
      activeElement.hasAttribute('data-filter-unpin')
    )
      host.current
        ?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')
        ?.focus({ preventScroll: true })
    setLocalPins(next)
    onPinnedChange?.(next)
  }
  const pin = (id: string) => setPins([...new Set([...pins, id])])
  const prepare = (open: boolean) => {
    if (open) {
      setContainer(host.current?.closest('dialog') || boundary || undefined)
      setDir(host.current && getComputedStyle(host.current).direction === 'rtl' ? 'rtl' : 'ltr')
    }
  }
  const edit = (option: FilterOption, target?: HTMLElement) => {
    prepare(true)
    const chip =
      target ?? host.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')
    const rect = chip?.getBoundingClientRect() ?? new DOMRect()
    anchor.current = { getBoundingClientRect: () => rect }
    setChoiceQuery('')
    returnFocus.current =
      Array.from(host.current?.querySelectorAll<HTMLButtonElement>('button') || []).find(
        (button) =>
          button.getAttribute('data-filter-edit') === option.id &&
          !button.closest('.lab-filter-pins-measure')
      ) ??
      host.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]') ??
      null
    setDraft(read(option))
    setEditError('')
    setEditing(option.id)
    setCatalog(false)
  }
  // Pinned chips sit in one row that scrolls sideways when they don't fit.
  const pinnedOptions = options.filter((option) => pins.includes(option.id))
  const selected = options.find((option) => option.id === editing)
  const dialogSelected =
    (isTemporalType(selected?.type) &&
      isTemporalRange(selected!.type as TemporalConfig['type'])) ||
    selected?.type === 'custom'
      ? selected
      : undefined
  const smallSelected = selected && !dialogSelected ? selected : undefined
  const active = options.filter((option) => read(option) != null).length
  const clearAll = () => {
    onChange([])
    const cleared = Object.fromEntries(
      options
        .filter((option) => option.type && option.type !== 'boolean')
        .map((option) => [option.id, null])
    )
    setLocalValues(cleared)
    onValuesChange?.(cleared)
  }
  const unpin = (option: FilterOption) => {
    // Its chip goes away: the editor hands focus to the catalog button instead.
    returnFocus.current = host.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]') ?? null
    setPins(pins.filter((id) => id !== option.id))
    setEditing(null)
  }
  const unpinButton = (option: FilterOption | undefined, appearance?: 'toolbar') =>
    option && pins.includes(option.id) ? (
      <Button
        variant="text"
        appearance={appearance}
        controlSize="regular"
        aria-label={t('lab.filter.unpinNamed', { name: option.label })}
        data-filter-unpin=""
        onClick={() => unpin(option)}
      >
        <PinOff />
        {t('lab.filter.unpin')}
      </Button>
    ) : null
  // One short text per chip: the value when set ("Last 7 days"), the filter's name when not
  // ("Status"). On/off filters always show their name; set chips are tinted. The full
  // "name: value" stays in the accessible name and the tooltip.
  const chip = (option: FilterOption) => {
    const current = read(option)
    const set = current != null
    const text = set && option.type && option.type !== 'boolean' ? summary(option, current, i18n.locale, t) : option.label
    const full = set ? `${option.label}: ${summary(option, current, i18n.locale, t)}` : option.label
    return (
      <Button
        variant="text"
        appearance="toolbar"
        controlSize="regular"
        aria-label={t('lab.filter.edit', { name: option.label })}
        aria-description={set ? full : undefined}
        title={full}
        data-filter-edit={option.id}
        data-filter-set={set || undefined}
        onClick={(event) => edit(option, event.currentTarget)}
      >
        <span className="lab-filter-chip-value" dir="auto">
          {text}
        </span>
      </Button>
    )
  }
  return (
    <GlassScope ref={host} className="lab-filter-bar" role="group" aria-label={label}>
      {onBack && (
        <ToolbarGroup label={t('lab.filter.navigation')}>
          <IconButton
            variant="text"
            appearance="toolbar"
            controlSize="regular"
            aria-label={t('lab.filter.back')}
            onClick={onBack}
          >
            <ArrowLeft className="lab-dir-flip" />
          </IconButton>
        </ToolbarGroup>
      )}
      <ToolbarGroup label={t('lab.filter.controls')}>
        <Popover.Root
          open={catalog}
          onOpenChange={(open) => {
            prepare(open)
            setCatalog(open)
            if (open) setQuery('')
          }}
        >
          <Popover.Trigger asChild>
            <IconButton
              variant="text"
              appearance="toolbar"
              controlSize="regular"
              aria-label={active ? t('lab.filter.chooseActive', { count: active }) : t('lab.filter.choose')}
            >
              <ListFilter />
            </IconButton>
          </Popover.Trigger>
          <Popover.Portal container={container}>
            <PopoverSurface asChild>
              <Popover.Content
                dir={dir}
                className="lab-filter-panel lab-filter-catalog"
                aria-label={t('lab.filter.available')}
                sideOffset={8}
                collisionPadding={12}
                collisionBoundary={container}
                align="start"
                onOpenAutoFocus={(event) => {
                  event.preventDefault()
                  search.current?.focus()
                }}
                onCloseAutoFocus={(event) => {
                  if (editing) event.preventDefault()
                }}
              >
                <ScrollArea
                  label={t('lab.filter.catalogRows')}
                  top={
                    <ToolbarSearch label={t('lab.filter.find')} value={query} onValueChange={setQuery} inputRef={search} defaultExpanded/>

                  }
                  bottom={
                    <Dock
                      label={t('lab.filter.catalogActions')}
                      content={
                        <span>{t('lab.filter.catalogStatus', { active, pinned: pins.length })}</span>
                      }
                    >
                      <Button
                        variant="text"
                        controlSize="regular"
                        disabled={!active}
                        onClick={clearAll}
                      >
                        {t('lab.filter.clearValues')}
                      </Button>
                    </Dock>
                  }
                >
                  <div className="lab-filter-catalog-list">
                    {options
                      .filter((option) =>
                        `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                          .toLowerCase()
                          .includes(query.toLowerCase())
                      )
                      .map((option) => (
                        <div
                          key={option.id}
                          className="lab-filter-row"
                          data-active={read(option) != null}
                        >
                          <Button
                            variant="text"
                            className="lab-filter-row-main"
                            onClick={() => {
                              if (!option.type || option.type === 'boolean') {
                                change(option, read(option) == null ? true : null)
                                pin(option.id)
                              } else edit(option)
                            }}
                          >
                            {option.icon ??
                              (option.type === 'enum' ? (
                                <SlidersHorizontal />
                              ) : option.type?.startsWith('date') ? (
                                <CalendarDays />
                              ) : (
                                <ToggleLeft />
                              ))}
                            <span>
                              <strong>{option.label}</strong>
                              <small>
                                {option.description ||
                                  (!option.type || option.type === 'boolean'
                                    ? t('lab.filter.kindBoolean')
                                    : option.type === 'enum'
                                      ? t('lab.filter.kindEnum')
                                      : t('lab.filter.kindEditor'))}
                              </small>
                            </span>
                            <span className="lab-filter-row-value">
                              {summary(option, read(option), i18n.locale, t)}
                            </span>
                          </Button>
                          <IconButton
                            variant="text"
                            controlSize="regular"
                            aria-label={t(pins.includes(option.id) ? 'lab.filter.unpinNamed' : 'lab.filter.pinNamed', { name: option.label })}
                            aria-pressed={pins.includes(option.id)}
                            onClick={() =>
                              pins.includes(option.id)
                                ? setPins(pins.filter((id) => id !== option.id))
                                : pin(option.id)
                            }
                          >
                            {pins.includes(option.id) ? <PinOff /> : <Pin />}
                          </IconButton>
                        </div>
                      ))}
                    {!options.some((option) =>
                      `${option.label} ${option.description || ''} ${option.keywords?.join(' ') || ''}`
                        .toLowerCase()
                        .includes(query.toLowerCase())
                    ) && <p role="status">{t('lab.filter.noFilters')}</p>}
                  </div>
                </ScrollArea>
              </Popover.Content>
            </PopoverSurface>
          </Popover.Portal>
        </Popover.Root>
        {onNaturalFilter && (
          <Popover.Root
            open={natural}
            onOpenChange={(open) => {
              prepare(open)
              setNatural(open)
              setError('')
            }}
          >
            <Popover.Trigger asChild>
              <IconButton
                variant="text"
                appearance="toolbar"
                controlSize="regular"
                aria-label={t('lab.filter.naturalOpen')}
              >
                <Sparkles />
              </IconButton>
            </Popover.Trigger>
            <Popover.Portal container={container}>
              <PopoverSurface asChild>
                <Popover.Content
                  dir={dir}
                  className="lab-filter-panel lab-filter-natural"
                  aria-label={t('lab.filter.naturalTitle')}
                  sideOffset={8}
                  collisionPadding={12}
                  collisionBoundary={container}
                  align="start"
                  onOpenAutoFocus={(event) => {
                    // Start in the description field, not on the scroll region.
                    event.preventDefault()
                    naturalInput.current?.focus()
                  }}
                >
                  <ScrollArea
                    label={t('lab.filter.naturalBody')}
                    contentPadding={12}
                    bottom={
                      <Dock label={t('lab.filter.naturalActions')}>
                        <Button
                          type="submit"
                          form={`${formId}-natural`}
                          variant="filled"
                          controlSize="regular"
                          loading={busy}
                          disabled={busy || !text.trim()}
                        >
                          {t('lab.filter.applyFilters')}
                        </Button>
                      </Dock>
                    }
                  >
                    <form
                      id={`${formId}-natural`}
                      onSubmit={async (event) => {
                        event.preventDefault()
                        if (busy || !text.trim()) return
                        setBusy(true)
                        setError('')
                        try {
                          const ids = await onNaturalFilter(text.trim())
                          if (
                            ids.some(
                              (id) =>
                                !options.some(
                                  (option) =>
                                    option.id === id && (!option.type || option.type === 'boolean')
                                )
                            )
                          )
                            throw new Error(t('lab.filter.naturalUnsupported'))
                          if (!ids.length) clearAll()
                          else onChange([...new Set(ids)])
                          setPins([...new Set([...pins, ...ids])])
                          setNatural(false)
                        } catch (reason) {
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : t('lab.filter.naturalFailed')
                          )
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      <strong>{t('lab.filter.naturalPrompt')}</strong>
                      <TextField
                        ref={naturalInput}
                        hint={t('lab.filter.naturalHint')}
                        leadingIcon={<Sparkles />}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        error={error}
                        // Examples say more than the list of switches, so they replace it.
                        supportingText={
                          naturalSuggestions?.length
                            ? undefined
                            : t('lab.filter.naturalAvailable', {
                                names: options
                                  .filter((option) => !option.type || option.type === 'boolean')
                                  .map((option) => option.label)
                                  .join(', '),
                              })
                        }
                      />
                      {naturalSuggestions?.length ? (
                        <div className="lab-filter-suggestions" role="group" aria-label={t('lab.filter.naturalSuggestions')}>
                          {naturalSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              type="button"
                              variant="tonal"
                              controlSize="small"
                              onClick={() => {
                                setText(suggestion)
                                setError('')
                                naturalInput.current?.focus()
                              }}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </form>
                  </ScrollArea>
                </Popover.Content>
              </PopoverSurface>
            </Popover.Portal>
          </Popover.Root>
        )}
      </ToolbarGroup>
      {!!pinnedOptions.length && (
        // One bubble per chip: its value, or its name while unset. Clearing and unpinning live
        // in the chip's editor. Chips that don't fit scroll sideways (no wrapping, no folding).
        <div className="lab-filter-pins" role="group" aria-label={t('lab.filter.pinned')}>
          {pinnedOptions.map((option) => (
            <ToolbarGroup key={option.id} label={t('lab.filter.named', { name: option.label })}>
              {chip(option)}
            </ToolbarGroup>
          ))}
        </div>
      )}
      {trailing && <div className="lab-filter-trailing">{trailing}</div>}
      <Popover.Root
        open={!!smallSelected}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <Popover.Anchor virtualRef={anchor} />
        <Popover.Portal container={container}>
          <PopoverSurface asChild>
            <Popover.Content
              dir={dir}
              className="lab-filter-panel lab-filter-value-menu"
              aria-label={smallSelected ? t('lab.filter.edit', { name: smallSelected.label }) : t('lab.filter.editAny')}
              align="start"
              sideOffset={8}
              collisionPadding={12}
              collisionBoundary={container}
              onOpenAutoFocus={(event) => {
                if (smallSelected?.type === 'enum') {
                  event.preventDefault()
                  enumSearch.current?.focus()
                }
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                returnFocus.current?.focus({ preventScroll: true })
              }}
            >
              {smallSelected && (
                <ScrollArea
                  label={t('lab.filter.options', { name: smallSelected.label })}
                  top={
                    smallSelected.type === 'enum' ? (
                      <ToolbarSearch label={t('lab.filter.search', { name: smallSelected.label })} value={choiceQuery} onValueChange={setChoiceQuery} inputRef={enumSearch} defaultExpanded/>

                    ) : undefined
                  }
                  bottom={
                    <Dock label={t('lab.filter.valueActions')}>
                      {unpinButton(smallSelected)}
                      <Button
                        variant="text"
                        controlSize="regular"
                        onClick={() => {
                          change(smallSelected, null)
                          pin(smallSelected.id)
                          setEditing(null)
                        }}
                      >
                        {t('lab.filter.clearValue')}
                      </Button>
                      {isTemporalType(smallSelected.type) && (
                        <Button
                          variant="filled"
                          type="submit"
                          form={`${formId}-date`}
                          controlSize="regular"
                        >
                          {t('lab.filter.apply')}
                        </Button>
                      )}
                    </Dock>
                  }
                >
                  {smallSelected.type === 'enum' ? (
                    <div
                      className="lab-filter-options"
                      role="group"
                      aria-label={t('lab.filter.choices', { name: smallSelected.label })}
                    >
                      {smallSelected.choices
                        .filter((choice) =>
                          choice.label.toLowerCase().includes(choiceQuery.toLowerCase())
                        )
                        .map((choice) => (
                          <Button
                            key={choice.value}
                            variant="text"
                            className="lab-filter-choice"
                            aria-pressed={read(smallSelected) === choice.value}
                            onClick={() => {
                              change(smallSelected, choice.value)
                              pin(smallSelected.id)
                              setEditing(null)
                            }}
                          >
                            {choice.label}
                            {read(smallSelected) === choice.value && (
                              <span aria-hidden="true">✓</span>
                            )}
                          </Button>
                        ))}
                      {!smallSelected.choices.some((choice) =>
                        choice.label.toLowerCase().includes(choiceQuery.toLowerCase())
                      ) && <p role="status">{t('lab.filter.noOptions')}</p>}
                    </div>
                  ) : !smallSelected.type || smallSelected.type === 'boolean' ? (
                    <div className="lab-filter-options">
                      {[true, null].map((next, index) => (
                        <Button
                          key={index}
                          variant="text"
                          aria-pressed={read(smallSelected) === next}
                          onClick={() => {
                            change(smallSelected, next)
                            pin(smallSelected.id)
                            setEditing(null)
                          }}
                        >
                          {next ? t('lab.filter.on') : t('lab.filter.any')}
                        </Button>
                      ))}
                    </div>
                  ) : isTemporalType(smallSelected.type) ? (
                    <form
                      id={`${formId}-date`}
                      onSubmit={(event) => {
                        event.preventDefault()
                        const config = smallSelected as FilterOption & TemporalConfig
                        const next = readTemporalForm(
                          config.type,
                          new FormData(event.currentTarget)
                        )
                        const message =
                          validateTemporal(config, next, t) || smallSelected.validate?.(next)
                        if (message) {
                          setEditError(message)
                          return
                        }
                        change(smallSelected, next)
                        pin(smallSelected.id)
                        setEditing(null)
                      }}
                    >
                      <TemporalFilterEditor
                        config={smallSelected as FilterOption & TemporalConfig}
                        value={draft as TemporalValue}
                        onChange={(next) => {
                          setDraft(next)
                          setEditError('')
                        }}
                      />
                      {editError && (
                        <p role="alert" className="lab-filter-error">
                          {editError}
                        </p>
                      )}
                    </form>
                  ) : null}
                </ScrollArea>
              )}
            </Popover.Content>
          </PopoverSurface>
        </Popover.Portal>
      </Popover.Root>
      {dialogSelected && selected && isTemporalType(selected.type) && (
        <TemporalDialog
          open
          label={t('lab.filter.edit', { name: dialogSelected.label })}
          close={() => setEditing(null)}
          returnFocusRef={returnFocus}
          formId={`${formId}-editor`}
          config={selected as FilterOption & TemporalConfig}
          value={draft as TemporalValue}
          onChange={(next) => {
            setDraft(next)
            setEditError('')
          }}
          intro={selected.description}
          error={editError || undefined}
          clearLabel={t('lab.filter.clearValue')}
          actions={unpinButton(selected, 'toolbar')}
          onClear={() => {
            change(selected, null)
            pin(selected.id)
            setEditing(null)
          }}
          applyLabel={t('lab.filter.applyFilter')}
          onSubmit={(event) => {
            event.preventDefault()
            const config = selected as FilterOption & TemporalConfig
            const next = readTemporalForm(config.type, new FormData(event.currentTarget))
            const message = validateTemporal(config, next, t) || selected.validate?.(next)
            if (message) {
              setDraft(next)
              setEditError(message)
              return
            }
            change(selected, next)
            pin(selected.id)
            setEditing(null)
          }}
        />
      )}
      <Modal
        returnFocusRef={returnFocus}
        open={!!dialogSelected && !(selected && isTemporalType(selected.type))}
        label={dialogSelected ? t('lab.filter.edit', { name: dialogSelected.label }) : t('lab.filter.editAny')}
        title={dialogSelected ? t('lab.filter.edit', { name: dialogSelected.label }) : t('lab.filter.editAny')}
        onOpenChange={() => setEditing(null)}
        className="lab-filter-editor-dialog"
        dock={
          <PresentationDock label={t('lab.filter.editorActions')}>
            {unpinButton(dialogSelected)}
            <Button
              variant="text"
              onClick={() => {
                if (selected) {
                  change(selected, null)
                  pin(selected.id)
                }
                setEditing(null)
              }}
            >
              {t('lab.filter.clearValue')}
            </Button>
            <Button variant="filled" type="submit" form={`${formId}-editor`}>
              {t('lab.filter.applyFilter')}
            </Button>
          </PresentationDock>
        }
      >
        {dialogSelected && selected && (
          <form
            id={`${formId}-editor`}
            className="lab-filter-editor-form"
            onSubmit={(event) => {
              event.preventDefault()
              const message = selected.validate?.(draft)
              if (message) {
                setEditError(message)
                return
              }
              change(selected, draft)
              pin(selected.id)
              setEditing(null)
            }}
          >
            <p>
              {selected.description || t('lab.filter.editorHint')}
            </p>
            {selected.type === 'custom' ? selected.renderEditor(draft, setDraft) : null}
            {editError && <p role="alert">{editError}</p>}
          </form>
        )}
      </Modal>
    </GlassScope>
  )
}
