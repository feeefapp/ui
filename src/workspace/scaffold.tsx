'use client'

import * as React from 'react'
import { PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react'
import { PixelShader, PixelTexture } from '../pixel-art'
import { IconButton } from '../primitives/button'
import { ScrollArea } from '../scroll'
import { PresentationHost } from '../presentation/host'
import { usePresence } from '../motion'
import { useI18n } from '../i18n'
import { cn } from '../utils'
import './scaffold.css'
import { GlassContainer, GlassScope } from '../glass/container'
import { ToolbarOrientationContext } from '../toolbar'
import { LayoutGroup } from '../physics/layout-group'

/** Sidebar width: `expanded` (304px), `rail` (64px icons) or `hidden` (0). */
export type ScaffoldSideMode = 'expanded' | 'rail' | 'hidden'
/** What `useScaffold()` and function slots receive. */
export type ScaffoldState = {
  /** True below the compact breakpoint: the sidebar is replaced by a modal drawer. */
  compact: boolean
  /** Current sidebar mode (ignored while compact). */
  sideMode: ScaffoldSideMode
  /** Sets the sidebar mode and calls `onSideModeChange`. */
  setSideMode: (mode: ScaffoldSideMode) => void
  /** Steps expanded → rail → hidden → expanded. */
  cycleSide: () => void
  /** Whether the compact drawer is open. */
  drawerOpen: boolean
  /** Opens or closes the compact drawer. */
  setDrawerOpen: (open: boolean) => void
  /** Id of the sidebar region, for `aria-controls`. */
  sideId: string
}
const WorkspaceScaffoldContext = React.createContext<ScaffoldState | null>(null)
/** Reads the nearest Scaffold's state. Throws outside a scaffold. */
export function useScaffold() {
  const context = React.useContext(WorkspaceScaffoldContext)
  if (!context) throw new Error('useScaffold requires Scaffold')
  return context
}
type ScaffoldSlot = React.ReactNode | ((state: ScaffoldState) => React.ReactNode)
export type ScaffoldProps = {
  /**
   * Replaces the default content scroll area. Receives the rendered `appBar` and `bottom` so an
   * editor with its own ScrollArea can float them itself; `children` is then not rendered.
   */
  renderViewport?: (slots: { appBar: React.ReactNode; bottom: React.ReactNode }) => React.ReactNode
  /** Outer content paint when glassSidebar is false. Defaults to `card`; use `none` for independently painted Panels.
   * Shell spacing and focus remain in either mode, independently of `renderViewport`. */
  contentSurface?: 'card' | 'none'
  /** Enabled by default. Float navigation on glass and give the main viewport the full unframed area.
   * Page-owned panels and the floating toolbar's safe spacing remain independent. */
  glassSidebar?: boolean
  /** Page content, rendered inside the content panel's scroll area. Can be a function of the state. */
  children: ScaffoldSlot
  /** Sidebar content, usually a ScaffoldSide. Rendered in the drawer when compact. */
  side?: ScaffoldSlot
  /** Full-width row above the sidebar and content, usually a ScaffoldTopBar. */
  topSide?: ScaffoldSlot
  /** Floats over the top of the content panel, usually a ScaffoldAppBar. */
  appBar?: ScaffoldSlot
  /** Floats over the bottom of the content panel, usually a Dock. */
  bottom?: ScaffoldSlot
  /** Ref to the content scroll viewport (the element that scrolls). */
  contentViewportRef?: React.Ref<HTMLDivElement>
  /** Accessible name of the content scroll region. */
  contentLabel?: string
  /** Controlled sidebar mode. Pair with `onSideModeChange`. */
  sideMode?: ScaffoldSideMode
  /** Initial sidebar mode when uncontrolled. */
  defaultSideMode?: ScaffoldSideMode
  /** Called whenever the sidebar mode changes (toggle button, `setSideMode`, `cycleSide`). */
  onSideModeChange?: (mode: ScaffoldSideMode) => void
  /** Override for embedded previews; otherwise the host's width selects compact mode. */
  compact?: boolean
  /** Host width in px below which the scaffold becomes compact. */
  compactBreakpoint?: number
  /** Element that receives focus when the compact drawer closes. */
  drawerReturnFocusRef?: React.RefObject<HTMLElement | null>
  /** Accessible name of the compact drawer dialog. */
  drawerLabel?: string
  className?: string
  style?: React.CSSProperties
  /** Text direction for the scaffold and its drawer. Inherited when omitted. */
  dir?: 'ltr' | 'rtl'
}

/**
 * Workspace layout: optional top row, a sidebar (expanded, rail or hidden) and a content viewport
 * (edge to edge by default) with floating app bar and bottom slots. Fills its parent's height. Below the compact
 * breakpoint the sidebar moves into a modal drawer. Provider owns theme, services and portals.
 */
export function Scaffold({
  children,
  renderViewport,
  contentSurface = 'card',
  glassSidebar = true,
  side,
  topSide,
  appBar,
  bottom,
  contentLabel = 'Workspace content',
  contentViewportRef,
  sideMode: controlledMode,
  defaultSideMode = 'expanded',
  onSideModeChange,
  compact: compactOverride,
  compactBreakpoint = 720,
  drawerLabel = 'Workspace navigation',
  drawerReturnFocusRef,
  className,
  style,
  dir,
}: ScaffoldProps) {
  const host = React.useRef<HTMLDivElement>(null)
  const main = React.useRef<HTMLDivElement>(null)
  const [localMode, setLocalMode] = React.useState(defaultSideMode)
  const [measuredCompact, setMeasuredCompact] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const sideId = React.useId()
  const compact = compactOverride ?? measuredCompact
  const sideMode = controlledMode ?? localMode
  const setSideMode = React.useCallback(
    (mode: ScaffoldSideMode) => {
      if (typeof document !== 'undefined') {
        const sidebar = host.current?.querySelector('.lab-workspace-side-boundary')
        const top = host.current?.querySelector('.lab-workspace-top-side')
        if (
          (mode === 'hidden' && sidebar?.contains(document.activeElement)) ||
          (mode === 'expanded' && top?.contains(document.activeElement))
        )
          main.current?.focus({ preventScroll: true })
      }
      setLocalMode(mode)
      onSideModeChange?.(mode)
    },
    [onSideModeChange]
  )
  React.useLayoutEffect(() => {
    if (!host.current) return
    const element = host.current
    const measure = () => setMeasuredCompact(element.clientWidth < compactBreakpoint)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [compactBreakpoint])
  React.useEffect(() => {
    if (!compact) setDrawerOpen(false)
  }, [compact])
  const cycleSide = React.useCallback(() => {
    // Move keyboard focus before the sidebar containing the toggle becomes inert.
    if (sideMode === 'rail') main.current?.focus({ preventScroll: true })
    setSideMode(sideMode === 'expanded' ? 'rail' : sideMode === 'rail' ? 'hidden' : 'expanded')
  }, [sideMode, setSideMode])
  const state = React.useMemo<ScaffoldState>(
    () => ({ compact, sideMode, setSideMode, cycleSide, drawerOpen, setDrawerOpen, sideId }),
    [compact, sideMode, setSideMode, cycleSide, drawerOpen, sideId]
  )
  const render = (slot: ScaffoldSlot) => (typeof slot === 'function' ? slot(state) : slot)
  const visibleSide = Boolean(side) && !compact && !drawerOpen && sideMode !== 'hidden'
  // The default card is inset only when something frames it (a top row or visible sidebar).
  // Surface-free viewports retain shell spacing so independent Panels sit clear of the window.
  const framed = Boolean(topSide) || visibleSide
  return (
    <WorkspaceScaffoldContext.Provider value={state}>
      <div
        ref={host}
        className={cn('lab-workspace-scaffold', className)}
        style={style}
        dir={dir}
        data-side-mode={visibleSide ? sideMode : 'hidden'}
        data-glass-sidebar={glassSidebar || undefined}
        data-framed={framed}
        data-compact={compact}
        // A full-height Sheet makes the workspace recede behind it.
        data-lab-sheet-backdrop=""
      >
        <PixelShader className="lab-workspace-scaffold-pixels" density={0.8} speed={0.18} />
        {topSide && <div className="lab-workspace-top-side">{render(topSide)}</div>}
        <div className="lab-workspace-scaffold-row">
          <div
            className="lab-workspace-side-boundary"
            inert={!visibleSide || undefined}
            aria-hidden={!visibleSide || undefined}
          >
            {glassSidebar && visibleSide && <SidebarGlass />}
            <div id={sideId} className="lab-workspace-side-content">
              {!compact && !drawerOpen && render(side)}
            </div>
          </div>
          <div ref={main} className="lab-workspace-main" data-content-surface={glassSidebar ? 'none' : contentSurface} tabIndex={-1}>
            {renderViewport ? (
              renderViewport({ appBar: render(appBar), bottom: render(bottom) })
            ) : (
              <ScrollArea
                ref={contentViewportRef}
                className="lab-workspace-route"
                label={contentLabel}
                contentPadding={glassSidebar ? 0 : undefined}
                top={appBar ? render(appBar) : undefined}
                bottom={bottom ? render(bottom) : undefined}
              >
                {render(children)}
              </ScrollArea>
            )}
          </div>
        </div>
        {compact && (
          <WorkspaceDrawer
            glassSidebar={glassSidebar}
            open={drawerOpen}
            label={drawerLabel}
            returnFocusRef={drawerReturnFocusRef}
            onClose={() => setDrawerOpen(false)}
          >
            <div dir={dir} className="lab-workspace-drawer-side">
              {render(side)}
            </div>
          </WorkspaceDrawer>
        )}
      </div>
    </WorkspaceScaffoldContext.Provider>
  )
}

type ThreeSlots = {
  /** Start content: a brand, back button or toggle. Pinned at the top in a sidebar. */
  leading?: React.ReactNode
  /** Main content: navigation in a sidebar, the title in a bar. */
  children?: React.ReactNode
  /** End content: actions, or the account tile pinned at the bottom of a sidebar. */
  trailing?: React.ReactNode
  className?: string
}
/** Sidebar body: a scroll area with `leading` floating at the top and `trailing` at the bottom. */
export function ScaffoldSide({ leading, children, trailing, className }: ThreeSlots) {
  // In the rail the sidebar is one toolbar bubble wide: bottom groups stack their controls, and a
  // layout transition carries each control from its place in the row to its place in the column.
  const rail = React.useContext(WorkspaceScaffoldContext)?.sideMode === 'rail'
  const trailingRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    trailingRef.current
      ?.querySelectorAll<HTMLElement>('.lab-toolbar-group > *')
      .forEach((control, i) => {
        control.dataset.labLayoutId ??= `side-trailing-${i}`
      })
  })
  return (
    <aside className={cn('lab-workspace-side', className)} aria-label="Workspace sidebar">
      {/* The ScrollArea's default shell gap G: from the window, between the header/footer and the
          items, and (as the content panel's start margin is 0 beside it) between the items and the panel. */}
      <ScrollArea
        className="lab-workspace-side-main"
        label="Sidebar navigation content"
        top={leading ? <div className="lab-workspace-side-leading">{leading}</div> : undefined}
        bottom={
          trailing ? (
            <div ref={trailingRef} className="lab-workspace-side-trailing">
              <ToolbarOrientationContext.Provider value={rail ? 'vertical' : 'horizontal'}>
                <LayoutGroup layoutKey={rail} animateEnter={false}>
                  {trailing}
                </LayoutGroup>
              </ToolbarOrientationContext.Provider>
            </div>
          ) : undefined
        }
      >
        {children}
      </ScrollArea>
    </aside>
  )
}
/** Narrower than this (px), a title squeezed by the bar's other groups leaves instead of showing a
 * sliver: its glass flows into the neighbouring bubble. Flutter: `appBarTitleMinWidth`. */
export const APP_BAR_TITLE_MIN_WIDTH = 64

/** Transparent bar for the content panel's `appBar` slot; put controls in ToolbarGroups. A title
 * squeezed below `APP_BAR_TITLE_MIN_WIDTH` hides until there is room again. */
export function ScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots) {
  const title = React.useRef<HTMLDivElement>(null)
  const [squeezed, setSqueezed] = React.useState(false)
  React.useLayoutEffect(() => {
    const slot = title.current
    if (!slot || typeof ResizeObserver === 'undefined') return
    // The slot keeps its flex size while hidden (visibility only), so this never flips back.
    const truncated = (node: Element) => node.scrollWidth > node.clientWidth + 1
    const check = () =>
      setSqueezed(
        slot.clientWidth < APP_BAR_TITLE_MIN_WIDTH && (truncated(slot) || [...slot.querySelectorAll('*')].some(truncated))
      )
    check()
    const observer = new ResizeObserver(check)
    observer.observe(slot)
    for (const child of slot.children) observer.observe(child)
    const mutations = new MutationObserver(() => {
      for (const child of slot.children) observer.observe(child)
      check()
    })
    mutations.observe(slot, { childList: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])
  return (
    <GlassScope as="header" className={cn('lab-workspace-app-bar', className)}>
      <div className="lab-workspace-app-leading">{leading}</div>
      <div
        ref={title}
        className="lab-workspace-app-title"
        data-squeezed={squeezed || undefined}
        data-glass-hidden={squeezed ? '' : undefined}
      >
        {children}
      </div>
      <div className="lab-workspace-app-trailing">{trailing}</div>
    </GlassScope>
  )
}
/** Three-column bar for the `topSide` slot: start, centered brand, end. */
export function ScaffoldTopBar({ leading, children, trailing, className }: ThreeSlots) {
  return (
    <GlassScope as="header" className={cn('lab-workspace-top-bar', className)}>
      <div>{leading}</div>
      <div className="lab-workspace-top-brand">{children}</div>
      <div>{trailing}</div>
    </GlassScope>
  )
}
/** Icon button that drives the nearest Scaffold's sidebar; opens the drawer when compact. */
export function ScaffoldToggleButton({
  action = 'cycle',
  label,
}: {
  /** `cycle` steps expanded → rail → hidden, `restore` expands, `drawer` always opens the drawer. */
  action?: 'cycle' | 'restore' | 'drawer'
  /** Accessible name. Defaults to a description of what the click does. */
  label?: string
}) {
  const state = useScaffold()
  const drawer = action === 'drawer' || state.compact
  const accessibleLabel =
    label ||
    (drawer
      ? 'Open workspace navigation'
      : action === 'restore' || state.sideMode === 'hidden'
        ? 'Expand workspace sidebar'
        : state.sideMode === 'expanded'
          ? 'Minimize workspace sidebar'
          : 'Hide workspace sidebar')
  return (
    <IconButton
      variant="text"
      aria-label={accessibleLabel}
      aria-haspopup={drawer ? 'dialog' : undefined}
      aria-controls={drawer ? undefined : state.sideId}
      aria-expanded={drawer ? state.drawerOpen : state.sideMode !== 'hidden'}
      onClick={() =>
        drawer
          ? state.setDrawerOpen(true)
          : action === 'restore'
            ? state.setSideMode('expanded')
            : state.cycleSide()
      }
    >
      {drawer ? (
        <Menu />
      ) : state.sideMode === 'expanded' ? (
        <PanelLeftClose className="lab-dir-flip" />
      ) : (
        <PanelLeftOpen className="lab-dir-flip" />
      )}
    </IconButton>
  )
}

// Keep the stationary material behind navigation. Its links, search and floating
// controls retain their own focus, press feedback and glass membership.
function subscribeWindowFocus(update: () => void) {
  window.addEventListener('focus', update)
  window.addEventListener('blur', update)
  return () => {
    window.removeEventListener('focus', update)
    window.removeEventListener('blur', update)
  }
}
const windowFocused = () => document.hasFocus()
const initialFocus = () => true

function SidebarGlass({ drawer = false }: { drawer?: boolean }) {
  const focused = React.useSyncExternalStore(subscribeWindowFocus, windowFocused, initialFocus)
  return (
    <div aria-hidden="true" className="lab-workspace-sidebar-glass" data-focused={focused}>
      <GlassContainer solo={{ motion: 'follow' }} highlightWidth={2} material={drawer ? 'menu' : 'regular'} interactive={false} adaptive={false} />
    </div>
  )
}

/** The compact navigation drawer: a full-height panel from the logical start over a dimmed page. */
function WorkspaceDrawer({
  glassSidebar,
  open,
  label,
  returnFocusRef,
  onClose,
  children,
}: {
  glassSidebar: boolean
  open: boolean
  label: string
  returnFocusRef?: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const { mounted, state } = usePresence(open, 240)
  if (!mounted) return null
  const close = () => {
    if (state === 'open') onClose()
  }
  return (
    <PresentationHost kind="drawer" label={label} returnFocusRef={returnFocusRef} onEscape={close}>
      <div className="lab-presentation-scrim lab-workspace-drawer-scrim" data-state={state} aria-hidden="true" onClick={close} />
      <div className="lab-workspace-drawer" data-state={state} data-glass-sidebar={glassSidebar || undefined}>
        {glassSidebar ? <SidebarGlass drawer /> : (
          <span className="lab-workspace-drawer-paint" aria-hidden="true">
            <PixelTexture variant="grain" seed="workspace-drawer" density="sparse" />
          </span>
        )}
        <IconButton
          variant="ghost"
          controlSize="regular"
          className="lab-workspace-drawer-close"
          aria-label={t('lab.common.close')}
          onClick={close}
        >
          <X size={18} />
        </IconButton>
        {children}
      </div>
    </PresentationHost>
  )
}
