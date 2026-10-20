'use client'

import * as React from 'react'
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react'
import { PixelShader, PixelTexture } from '../pixel-art'
import { LabIconButton } from '../primitives/button'
import { LabScrollArea } from '../scroll'
import { LabModal } from '../primitives/modal'
import { cn } from '../utils'
import './scaffold.css'

export type LabScaffoldSideMode = 'expanded' | 'rail' | 'hidden'
export type LabScaffoldState = {
  compact: boolean
  sideMode: LabScaffoldSideMode
  setSideMode: (mode: LabScaffoldSideMode) => void
  cycleSide: () => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  sideId: string
}
const WorkspaceScaffoldContext = React.createContext<LabScaffoldState | null>(null)
export function useLabScaffold() {
  const context = React.useContext(WorkspaceScaffoldContext)
  if (!context) throw new Error('useLabScaffold requires LabScaffold')
  return context
}
type ScaffoldSlot = React.ReactNode | ((state: LabScaffoldState) => React.ReactNode)
export type LabScaffoldProps = {
  /** Editors with an existing LabScrollArea receive the floating slots directly. */
  renderViewport?: (slots: { appBar: React.ReactNode; bottom: React.ReactNode }) => React.ReactNode
  children: ScaffoldSlot
  side?: ScaffoldSlot
  topSide?: ScaffoldSlot
  appBar?: ScaffoldSlot
  bottom?: ScaffoldSlot
  contentViewportRef?: React.Ref<HTMLDivElement>
  contentLabel?: string
  sideMode?: LabScaffoldSideMode
  defaultSideMode?: LabScaffoldSideMode
  onSideModeChange?: (mode: LabScaffoldSideMode) => void
  /** Override for embedded previews; otherwise the host's width selects compact mode. */
  compact?: boolean
  compactBreakpoint?: number
  drawerReturnFocusRef?: React.RefObject<HTMLElement | null>
  drawerLabel?: string
  className?: string
  style?: React.CSSProperties
  dir?: 'ltr' | 'rtl'
}

/** Shared workspace structure. LabProvider owns theme, services and portals. */
export function LabScaffold({
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
}: LabScaffoldProps) {
  const host = React.useRef<HTMLDivElement>(null)
  const main = React.useRef<HTMLDivElement>(null)
  const [localMode, setLocalMode] = React.useState(defaultSideMode)
  const [measuredCompact, setMeasuredCompact] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const sideId = React.useId()
  const compact = compactOverride ?? measuredCompact
  const sideMode = controlledMode ?? localMode
  const setSideMode = React.useCallback(
    (mode: LabScaffoldSideMode) => {
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
  const state = React.useMemo<LabScaffoldState>(
    () => ({ compact, sideMode, setSideMode, cycleSide, drawerOpen, setDrawerOpen, sideId }),
    [compact, sideMode, setSideMode, cycleSide, drawerOpen, sideId]
  )
  const render = (slot: ScaffoldSlot) => (typeof slot === 'function' ? slot(state) : slot)
  const visibleSide = Boolean(side) && !compact && !drawerOpen && sideMode !== 'hidden'
  return (
    <WorkspaceScaffoldContext.Provider value={state}>
      <div
        ref={host}
        className={cn('lab-workspace-scaffold', className)}
        style={style}
        dir={dir}
        data-side-mode={visibleSide ? sideMode : 'hidden'}
        data-compact={compact}
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
              <LabScrollArea
                ref={contentViewportRef}
                className="lab-workspace-route"
                label={contentLabel}
                contentPadding={compact ? 16 : 24}
                top={appBar ? render(appBar) : undefined}
                bottom={bottom ? render(bottom) : undefined}
              >
                {render(children)}
              </LabScrollArea>
            )}
          </div>
        </div>
        {compact && (
          <LabModal
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
          </LabModal>
        )}
      </div>
    </WorkspaceScaffoldContext.Provider>
  )
}

type ThreeSlots = {
  leading?: React.ReactNode
  children?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}
export function LabScaffoldSide({ leading, children, trailing, className }: ThreeSlots) {
  return (
    <aside className={cn('lab-workspace-side', className)} aria-label="Workspace sidebar">
      <LabScrollArea
        className="lab-workspace-side-main"
        label="Sidebar navigation content"
        contentPadding={10}
        edgeGap={10}
        top={leading ? <div className="lab-workspace-side-leading">{leading}</div> : undefined}
        bottom={
          trailing ? <div className="lab-workspace-side-trailing">{trailing}</div> : undefined
        }
      >
        {children}
      </LabScrollArea>
    </aside>
  )
}
export function LabScaffoldAppBar({ leading, children, trailing, className }: ThreeSlots) {
  return (
    <header className={cn('lab-workspace-app-bar', className)}>
      <div className="lab-workspace-app-leading">{leading}</div>
      <div className="lab-workspace-app-title">{children}</div>
      <div className="lab-workspace-app-trailing">{trailing}</div>
    </header>
  )
}
export function LabScaffoldTopBar({ leading, children, trailing, className }: ThreeSlots) {
  return (
    <header className={cn('lab-workspace-top-bar', className)}>
      <div>{leading}</div>
      <div className="lab-workspace-top-brand">{children}</div>
      <div>{trailing}</div>
    </header>
  )
}
export function LabScaffoldToggleButton({
  action = 'cycle',
  label,
}: {
  action?: 'cycle' | 'restore' | 'drawer'
  label?: string
}) {
  const state = useLabScaffold()
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
    <LabIconButton
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
    </LabIconButton>
  )
}
