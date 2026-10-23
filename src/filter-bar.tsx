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
  X,
} from 'lucide-react'
import { ToolbarSearch } from './toolbar-search'
import { ToolbarGroup } from './toolbar'
import { IconButton, Button } from './primitives/button'
import { TextField } from './primitives/text-field'
import { PopoverSurface } from './primitives/popover-surface'
import { useFloatingBoundary } from './menu/boundary'
import { Modal } from './primitives/modal'
import { ScrollArea } from './scroll'
import { Dock } from './dock'
import { TemporalFilterEditor } from './filters/temporal-editor'
import { TemporalDialog } from './filters/temporal-dialog'
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
  /** Shows a back button before the filter controls, e.g. to leave a filtered view. */
  onBack?: () => void
  /** Content at the end of the bar, usually a ToolbarGroup of view actions. */
  trailing?: ReactNode
}
function summary(option: FilterOption, value: FilterValue) {
  if (value == null) return 'Any'
  if (option.type === 'custom' && option.formatValue) return option.formatValue(value)
  if (typeof value === 'object') return `${value.from || 'Any date'} → ${value.to || 'Any date'}`
  if (option.type === 'enum')
    return option.choices.find((choice) => choice.value === value)?.label || 'Any'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
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
  onBack,
  trailing,
}: FilterBarProps) {
  const formId = useId()
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
      activeElement.getAttribute('aria-label')?.startsWith('Unpin ')
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
        (button) => button.getAttribute('aria-label') === `Edit ${option.label} filter`
      ) ??
      host.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]') ??
      null
    setDraft(read(option))
    setEditError('')
    setEditing(option.id)
    setCatalog(false)
  }
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
  return (
    <GlassScope ref={host} className="lab-filter-bar" role="group" aria-label={label}>
      {onBack && (
        <ToolbarGroup label="Filter navigation">
          <IconButton
            variant="text"
            appearance="toolbar"
            controlSize="regular"
            aria-label="Back from filtered view"
            onClick={onBack}
          >
            <ArrowLeft className="lab-dir-flip" />
          </IconButton>
        </ToolbarGroup>
      )}
      <ToolbarGroup label="Filter controls">
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
              aria-label={`Choose filters${active ? ` (${active} active)` : ''}`}
            >
              <ListFilter />
            </IconButton>
          </Popover.Trigger>
          <Popover.Portal container={container}>
            <PopoverSurface asChild>
              <Popover.Content
                dir={dir}
                className="lab-filter-panel lab-filter-catalog"
                aria-label="Available filters"
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
                  label="Filter catalog rows"
                  top={
                    <ToolbarSearch label="Find a filter" value={query} onValueChange={setQuery} inputRef={search} defaultExpanded/>

                  }
                  bottom={
                    <Dock
                      label="Filter catalog actions"
                      content={
                        <span>
                          {active} active · {pins.length} pinned
                        </span>
                      }
                    >
                      <Button
                        variant="text"
                        controlSize="regular"
                        disabled={!active}
                        onClick={clearAll}
                      >
                        Clear values
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
                                    ? 'On / off'
                                    : option.type === 'enum'
                                      ? 'Choose a value'
                                      : 'Open editor')}
                              </small>
                            </span>
                            <span className="lab-filter-row-value">
                              {summary(option, read(option))}
                            </span>
                          </Button>
                          <IconButton
                            variant="text"
                            controlSize="regular"
                            aria-label={`${pins.includes(option.id) ? 'Unpin' : 'Pin'} ${option.label}`}
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
                    ) && <p role="status">No matching filters.</p>}
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
                aria-label="Create filter from natural language"
              >
                <Sparkles />
              </IconButton>
            </Popover.Trigger>
            <Popover.Portal container={container}>
              <PopoverSurface asChild>
                <Popover.Content
                  dir={dir}
                  className="lab-filter-panel lab-filter-natural"
                  aria-label="Describe a filter"
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
                    label="Natural filter description"
                    contentPadding={12}
                    bottom={
                      <Dock label="Natural filter actions">
                        <Button
                          type="submit"
                          form={`${formId}-natural`}
                          variant="filled"
                          controlSize="regular"
                          loading={busy}
                          disabled={busy || !text.trim()}
                        >
                          Apply filters
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
                            throw new Error('Choose a supported on/off filter.')
                          if (!ids.length) clearAll()
                          else onChange([...new Set(ids)])
                          setPins([...new Set([...pins, ...ids])])
                          setNatural(false)
                        } catch (reason) {
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : 'Could not create this filter.'
                          )
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      <strong>Describe what you want</strong>
                      <TextField
                        ref={naturalInput}
                        hint="Filter description"
                        leadingIcon={<Sparkles />}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        error={error}
                        supportingText={`Available: ${options
                          .filter((option) => !option.type || option.type === 'boolean')
                          .map((option) => option.label)
                          .join(', ')}.`}
                      />
                    </form>
                  </ScrollArea>
                </Popover.Content>
              </PopoverSurface>
            </Popover.Portal>
          </Popover.Root>
        )}
      </ToolbarGroup>
      {!!pins.length && (
        <div className="lab-filter-pins" role="group" aria-label="Pinned filters">
          {options
            .filter((option) => pins.includes(option.id))
            .map((option) => (
              <ToolbarGroup key={option.id} label={`${option.label} filter`}>
                <Button
                  variant="text"
                  appearance="toolbar"
                  controlSize="regular"
                  aria-label={`Edit ${option.label} filter`}
                  onClick={(event) => edit(option, event.currentTarget)}
                >
                  {option.label}
                  <span className="lab-filter-chip-value">{summary(option, read(option))}</span>
                </Button>
                <IconButton
                  variant="text"
                  appearance="toolbar"
                  controlSize="regular"
                  aria-label={`Clear ${option.label} value`}
                  disabled={read(option) == null}
                  onClick={(event) => {
                    event.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>('button')
                      ?.focus({ preventScroll: true })
                    change(option, null)
                  }}
                >
                  <X size={16} />
                </IconButton>
                <IconButton
                  variant="text"
                  appearance="toolbar"
                  controlSize="regular"
                  aria-label={`Unpin ${option.label}`}
                  onClick={() => setPins(pins.filter((id) => id !== option.id))}
                >
                  <PinOff size={16} />
                </IconButton>
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
              aria-label={smallSelected ? `Edit ${smallSelected.label} filter` : 'Edit filter'}
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
                  label={`${smallSelected.label} options`}
                  top={
                    smallSelected.type === 'enum' ? (
                      <ToolbarSearch label={`Search ${smallSelected.label.toLowerCase()}`} value={choiceQuery} onValueChange={setChoiceQuery} inputRef={enumSearch} defaultExpanded/>

                    ) : undefined
                  }
                  bottom={
                    <Dock label="Filter value actions">
                      <Button
                        variant="text"
                        controlSize="regular"
                        onClick={() => {
                          change(smallSelected, null)
                          pin(smallSelected.id)
                          setEditing(null)
                        }}
                      >
                        Clear value
                      </Button>
                      {isTemporalType(smallSelected.type) && (
                        <Button
                          variant="filled"
                          type="submit"
                          form={`${formId}-date`}
                          controlSize="regular"
                        >
                          Apply
                        </Button>
                      )}
                    </Dock>
                  }
                >
                  {smallSelected.type === 'enum' ? (
                    <div
                      className="lab-filter-options"
                      role="group"
                      aria-label={`${smallSelected.label} choices`}
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
                      ) && <p role="status">No matching options.</p>}
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
                          {next ? 'On' : 'Any'}
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
                          validateTemporal(config, next) || smallSelected.validate?.(next)
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
          label={`Edit ${dialogSelected.label} filter`}
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
          clearLabel="Clear value"
          onClear={() => {
            change(selected, null)
            pin(selected.id)
            setEditing(null)
          }}
          applyLabel="Apply filter"
          onSubmit={(event) => {
            event.preventDefault()
            const config = selected as FilterOption & TemporalConfig
            const next = readTemporalForm(config.type, new FormData(event.currentTarget))
            const message = validateTemporal(config, next) || selected.validate?.(next)
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
        label={dialogSelected ? `Edit ${dialogSelected.label} filter` : 'Edit filter'}
        close={() => setEditing(null)}
        scrollable
        fitContent
        className="lab-filter-editor-dialog"
        bottom={
          <Dock label="Filter editor actions">
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
              Clear value
            </Button>
            <Button variant="filled" type="submit" form={`${formId}-editor`}>
              Apply filter
            </Button>
          </Dock>
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
              {selected.description || 'Set a value, or clear it while keeping this filter pinned.'}
            </p>
            {selected.type === 'custom' ? selected.renderEditor(draft, setDraft) : null}
            {editError && <p role="alert">{editError}</p>}
          </form>
        )}
      </Modal>
    </GlassScope>
  )
}
