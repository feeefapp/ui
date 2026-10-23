'use client'

import * as React from 'react'
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react'
import { PixelShader, PixelTexture } from '../pixel-art'
import { IconButton } from '../primitives/button'
import { ScrollArea } from '../scroll'
import { Modal } from '../primitives/modal'
import { cn } from '../utils'
import './scaffold.css'
import { GlassScope } from '../glass/container'

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
 * Workspace layout: optional top row, a sidebar (expanded, rail or hidden) and one rounded content
 * panel with floating app bar and bottom slots. Fills its parent's height. Below the compact
 * breakpoint the sidebar moves into a modal drawer. Provider owns theme, services and portals.
 */
export function Scaffold({
  children,
  renderViewport,
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
  // The content is a card only when something frames it (a top row or a visible sidebar);
  // otherwise it fills the window edge to edge.
  const framed = Boolean(topSide) || visibleSide
  return (
    <WorkspaceScaffoldContext.Provider value={state}>
      <div
        ref={host}
        className={cn('lab-workspace-scaffold', className)}
        style={style}
        dir={dir}
        data-side-mode={visibleSide ? sideMode : 'hidden'}
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
            <div id={sideId} className="lab-workspace-side-content">
              {!compact && !drawerOpen && render(side)}
            </div>
          </div>
          <div ref={main} className="lab-workspace-main" tabIndex={-1}>
            {renderViewport ? (
              renderViewport({ appBar: render(appBar), bottom: render(bottom) })
            ) : (
              <ScrollArea
                ref={contentViewportRef}
                className="lab-workspace-route"
                label={contentLabel}
                top={appBar ? render(appBar) : undefined}
                bottom={bottom ? render(bottom) : undefined}
              >
                {render(children)}
              </ScrollArea>
            )}
          </div>
        </div>
        {compact && (
          <Modal
            open={drawerOpen}
            label={drawerLabel}
            returnFocusRef={drawerReturnFocusRef}
            close={() => setDrawerOpen(false)}
            className="lab-workspace-drawer"
          >
            <span className="lab-workspace-drawer-paint" aria-hidden="true">
              <PixelTexture variant="grain" seed="workspace-drawer" density="sparse" />
            </span>
            <div dir={dir} className="lab-workspace-drawer-side">
              {render(side)}
            </div>
          </Modal>
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
  return (
    <aside className={cn('lab-workspace-side', className)} aria-label="Workspace sidebar">
      {/* The ScrollArea's default shell gap G: from the window, between the header/footer and the
          items, and (as the content panel's start margin is 0 beside it) between the items and the panel. */}
      <ScrollArea
        className="lab-workspace-side-main"
        label="Sidebar navigation content"
        top={leading ? <div className="lab-workspace-side-leading">{leading}</div> : undefined}
        bottom={
          trailing ? <div className="lab-workspace-side-trailing">{trailing}</div> : undefined
        }
      >
        {children}
      </ScrollArea>
    </aside>
  )
}
/** Transparent bar for the content panel's `appBar` slot; put controls in ToolbarGroups. */
export function ScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots) {
  return (
    <GlassScope as="header" className={cn('lab-workspace-app-bar', className)}>
      <div className="lab-workspace-app-leading">{leading}</div>
      <div className="lab-workspace-app-title">{children}</div>
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
