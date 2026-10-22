'use client'

import { LabPopoverSurface } from '../ui'
import * as React from 'react'
import { useLabI18n } from '../i18n'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, ChevronRight, MoreHorizontal, Square, SquareCheck } from 'lucide-react'
import { cn } from '../utils'
import { LabButton } from '../ui'
import { PixelLoader } from '../pixel-art'
import { computeLabActionsLayout } from './layout'
import type { LabAction, LabGroupAction } from './types'
import { useMeasuredActions } from './use_measured_actions'
import { useLabActionsWidth } from './width-context'
import './actions.css'

export interface LabActionsBarProps {
  /** The action tree, in display order. Top-level entries spill into the overflow menu by `priority`. */
  actions: readonly LabAction[]
  /** Accessible name of the toolbar group. */
  label: string
  /** Which side the row hugs inside a wider host. */
  align?: 'start' | 'end'
  /** Control height: regular 44px or compact 40px. */
  size?: 'regular' | 'compact'
  /** Space between controls, in pixels. Included in the fit. */
  gap?: number
  /** Accessible name of the overflow trigger. Defaults to the localized "More actions". */
  overflowLabel?: string
  /** Class name for the bar. */
  className?: string
  /** Defaults to the nearest dialog, otherwise document.body. */
  portalContainer?: HTMLElement | null
  /** Application effects are injected; this primitive never calls business APIs. */
  onActionError?: (error: unknown, action: LabAction) => void
}

type ExecuteAction = (action: Exclude<LabAction, LabGroupAction>, checked?: boolean) => void
interface MenuContext {
  ownerId: string
  container: HTMLElement | null | undefined
  pending: ReadonlySet<string>
  execute: ExecuteAction
}

/**
 * Responsive, priority-based actions. Measures its real controls and moves the lowest-priority
 * ones into a "More actions" menu when they don't fit. Place inside a dock or any bounded slot.
 */
export function LabActionsBar({
  actions,
  label,
  align = 'end',
  size = 'regular',
  gap = 4,
  overflowLabel,
  className,
  portalContainer,
  onActionError,
}: LabActionsBarProps) {
  const { t } = useLabI18n()
  const resolvedOverflowLabel = overflowLabel ?? t('lab.common.moreActions')
  const ownerId = React.useId()
  const host = React.useRef<HTMLDivElement>(null)
  const measuringRow = React.useRef<HTMLDivElement>(null)
  const overflowTrigger = React.useRef<HTMLButtonElement>(null)
  const [container, setContainer] = React.useState<HTMLElement | null>()
  const [pending, setPending] = React.useState<ReadonlySet<string>>(new Set())
  const pendingRef = React.useRef(new Set<string>())
  const alive = React.useRef(true)
  const [errorLabel, setErrorLabel] = React.useState('')
  const [overflowOpen, setOverflowOpen] = React.useState(false)
  const inheritedWidth = useLabActionsWidth()
  const revision = React.useMemo(() => ({ actions, size, pending }), [actions, size, pending])
  const { measurements, focusAfterFit } = useMeasuredActions(host, measuringRow, revision)

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  React.useLayoutEffect(() => {
    setContainer(
      portalContainer === undefined ? (host.current?.closest('dialog') ?? null) : portalContainer
    )
  }, [portalContainer])

  const layout = React.useMemo(
    () =>
      measurements
        ? computeLabActionsLayout({
            actions,
            maxWidth: inheritedWidth ?? measurements.availableWidth,
            measure: (action) => measurements.widths.get(action.id) ?? measurements.overflowWidth,
            overflowWidth: measurements.overflowWidth,
            gap,
          })
        : { visible: [...actions], overflow: [], requiredWidth: 0 },
    [actions, gap, inheritedWidth, measurements]
  )

  React.useLayoutEffect(() => {
    const actionId = focusAfterFit.current
    focusAfterFit.current = null
    if (
      actionId &&
      layout.overflow.some((action) => action.id === actionId) &&
      !host.current?.contains(document.activeElement)
    ) {
      overflowTrigger.current?.focus()
    }
    if (!layout.overflow.length) setOverflowOpen(false)
  }, [layout, focusAfterFit])

  const execute: ExecuteAction = (action, checked) => {
    if (action.disabled || action.loading || pendingRef.current.has(action.id)) return
    pendingRef.current.add(action.id)
    setPending(new Set(pendingRef.current))
    setErrorLabel('')
    void (async () => {
      try {
        if (action.type === 'toggle') await action.onCheckedChange(checked ?? !action.checked)
        else await action.onAction()
      } catch (error) {
        if (alive.current) setErrorLabel(`${action.label} could not complete. Try again.`)
        onActionError?.(error, action)
      } finally {
        pendingRef.current.delete(action.id)
        if (alive.current) setPending(new Set(pendingRef.current))
      }
    })()
  }
  const menu: MenuContext = { container, pending, execute, ownerId }

  return (
    <div
      ref={host}
      data-lab-actions-owner={ownerId}
      className={cn('lab-actions-bar', className)}
      role="group"
      aria-label={label}
      hidden={!actions.length}
      data-align={align}
      data-size={size}
      data-measured={!!measurements}
      style={
        {
          '--lab-actions-gap': `${gap}px`,
          ...(inheritedWidth === undefined
            ? {}
            : { inlineSize: layout.requiredWidth, flex: 'none' }),
        } as React.CSSProperties
      }
    >
      <div className="lab-actions-bar__row">
        {layout.visible.map((action) => (
          <span key={action.id} className="lab-actions-bar__entry" data-lab-action-id={action.id}>
            {action.type === 'group' ? (
              <GroupControl action={action} size={size} menu={menu} />
            ) : (
              <ActionControl
                action={action}
                size={size}
                loading={pending.has(action.id)}
                onClick={() => execute(action)}
              />
            )}
          </span>
        ))}
        {!!layout.overflow.length && (
          <DropdownMenu.Root modal={false} open={overflowOpen} onOpenChange={setOverflowOpen}>
            <DropdownMenu.Trigger asChild>
              <LabButton
                ref={overflowTrigger}
                className="lab-actions-bar__control"
                variant="ghost"
                appearance="toolbar"
                controlSize="icon"
                aria-label={resolvedOverflowLabel}
                title={resolvedOverflowLabel}
              >
                <MoreHorizontal size={20} aria-hidden="true" />
              </LabButton>
            </DropdownMenu.Trigger>
            <MenuSurface menu={menu} label={resolvedOverflowLabel}>
              {layout.overflow.map((action) => (
                <MenuAction key={action.id} action={action} menu={menu} />
              ))}
            </MenuSurface>
          </DropdownMenu.Root>
        )}
      </div>
      {/* Real controls, inert and hidden, keep font/zoom/loading measurement exact. */}
      <div ref={measuringRow} className="lab-actions-bar__measure" aria-hidden="true" inert>
        {actions.map((action) => (
          <span key={action.id} className="lab-actions-bar__entry" data-lab-action-id={action.id}>
            <ActionControl action={action} size={size} loading={pending.has(action.id)} />
          </span>
        ))}
        <span className="lab-actions-bar__entry" data-lab-overflow-measure>
          <LabButton
            className="lab-actions-bar__control"
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            tabIndex={-1}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </LabButton>
        </span>
      </div>
      {errorLabel && (
        <span className="lab-actions-bar__error" role="alert">
          {errorLabel}
        </span>
      )}
    </div>
  )
}

interface ActionControlProps {
  action: LabAction
  size: 'regular' | 'compact'
  loading?: boolean
}

const ActionControl = React.forwardRef<
  HTMLButtonElement,
  ActionControlProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function LabActionControl({ action, size, loading, ...buttonProps }, ref) {
  const iconOnly = action.display === 'icon' && (action.type === 'toggle' || !!action.icon)
  const blocked = action.disabled || (action.type === 'group' && !action.actions.length)
  return (
    <LabButton
      {...buttonProps}
      ref={ref}
      className="lab-actions-bar__control"
      variant={
        action.destructive
          ? 'destructive'
          : (action.variant ?? (action.type === 'toggle' && action.checked ? 'elevated' : 'ghost'))
      }
      controlSize={iconOnly ? 'icon' : size}
      appearance={
        action.appearance ??
        (!action.destructive && (!action.variant || action.variant === 'ghost')
          ? 'toolbar'
          : 'default')
      }
      disabled={blocked}
      loading={loading || action.loading}
      aria-label={action.label}
      aria-pressed={action.type === 'toggle' ? action.checked : undefined}
      title={action.tooltip ?? (iconOnly ? action.label : undefined)}
    >
      {action.icon ? (
        <span className="lab-actions-bar__icon" aria-hidden="true">
          {action.icon}
        </span>
      ) : action.type === 'toggle' ? (
        action.checked ? (
          <SquareCheck size={18} aria-hidden="true" />
        ) : (
          <Square size={18} aria-hidden="true" />
        )
      ) : null}
      {!iconOnly && <span>{action.label}</span>}
      {action.type === 'group' && !iconOnly && <ChevronDown size={14} aria-hidden="true" />}
    </LabButton>
  )
})

function GroupControl({
  action,
  size,
  menu,
}: {
  action: LabGroupAction
  size: 'regular' | 'compact'
  menu: MenuContext
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenu.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        if (next && action.onOpen?.() === false) return
        setOpen(next)
      }}
    >
      <DropdownMenu.Trigger asChild>
        <ActionControl action={action} size={size} />
      </DropdownMenu.Trigger>
      <MenuSurface menu={menu} label={action.label}>
        {action.actions.map((child) => (
          <MenuAction key={child.id} action={child} menu={menu} />
        ))}
      </MenuSurface>
    </DropdownMenu.Root>
  )
}

function MenuSurface({
  menu,
  label,
  children,
}: {
  menu: MenuContext
  label: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu.Portal container={menu.container}>
      <LabPopoverSurface asChild>
        <DropdownMenu.Content
          className="lab-actions-menu"
          data-lab-actions-owner={menu.ownerId}
          data-lab-corners
          sideOffset={8}
          collisionBoundary={menu.container ?? undefined}
          collisionPadding={12}
          align="end"
          aria-label={label}
        >
          {children}
        </DropdownMenu.Content>
      </LabPopoverSurface>
    </DropdownMenu.Portal>
  )
}

function MenuAction({ action, menu }: { action: LabAction; menu: MenuContext }) {
  const loading = action.loading || menu.pending.has(action.id)
  const disabled = action.disabled || loading
  const content = (
    <>
      <span className="lab-actions-menu__leading" aria-hidden="true">
        {loading ? (
          <PixelLoader size={17} decorative />
        ) : action.type === 'toggle' ? (
          <DropdownMenu.ItemIndicator>
            <Check size={18} />
          </DropdownMenu.ItemIndicator>
        ) : (
          action.icon
        )}
      </span>
      <span className="lab-actions-menu__label">{action.label}</span>
    </>
  )
  if (action.type === 'group') return <SubmenuAction action={action} menu={menu} />
  if (action.type === 'toggle')
    return (
      <DropdownMenu.CheckboxItem
        className="lab-actions-menu__item"
        data-lab-corners
        data-destructive={action.destructive || action.variant === 'destructive' || undefined}
        disabled={disabled}
        checked={action.checked}
        onCheckedChange={(checked) => menu.execute(action, checked === true)}
        aria-busy={loading || undefined}
        textValue={action.label}
      >
        {content}
      </DropdownMenu.CheckboxItem>
    )
  return (
    <DropdownMenu.Item
      className="lab-actions-menu__item"
      data-lab-corners
      data-destructive={action.destructive || action.variant === 'destructive' || undefined}
      disabled={disabled}
      onSelect={() => menu.execute(action)}
      aria-busy={loading || undefined}
      textValue={action.label}
    >
      {content}
    </DropdownMenu.Item>
  )
}

function SubmenuAction({ action, menu }: { action: LabGroupAction; menu: MenuContext }) {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenu.Sub
      open={open}
      onOpenChange={(next) => {
        if (next && action.onOpen?.() === false) return
        setOpen(next)
      }}
    >
      <DropdownMenu.SubTrigger
        className="lab-actions-menu__item"
        data-lab-corners
        disabled={action.disabled || action.loading || !action.actions.length}
        aria-busy={action.loading || undefined}
        data-destructive={action.destructive || action.variant === 'destructive' || undefined}
        textValue={action.label}
      >
        <span className="lab-actions-menu__leading" aria-hidden="true">
          {action.loading ? <PixelLoader size={17} decorative /> : action.icon}
        </span>
        <span className="lab-actions-menu__label">{action.label}</span>
        <ChevronRight
          className="lab-actions-menu__chevron lab-dir-flip"
          size={16}
          aria-hidden="true"
        />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal container={menu.container}>
        <LabPopoverSurface asChild>
          <DropdownMenu.SubContent
            className="lab-actions-menu"
            data-lab-actions-owner={menu.ownerId}
            data-lab-corners
            sideOffset={4}
            collisionBoundary={menu.container ?? undefined}
            collisionPadding={12}
            aria-label={action.label}
          >
            {action.actions.map((child) => (
              <MenuAction key={child.id} action={child} menu={menu} />
            ))}
          </DropdownMenu.SubContent>
        </LabPopoverSurface>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  )
}
