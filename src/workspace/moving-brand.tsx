'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { FoAnimatedLogo } from '../brand/logo'
import { useScaffold } from './scaffold'
import './moving-brand.css'
import { reducedMotionQuery } from '../physics/motion-value'

const BRAND_WIDTH = 104
const BRAND_HEIGHT = 26

/** One persistent visual follows the real, accessible logo links as navigation changes. */
export function MovingBrand({
  host,
}: {
  /** Element containing the `[data-tool-brand-anchor="side"|"header"]` logo anchors to follow. */
  host: RefObject<HTMLElement | null>
}) {
  const state = useScaffold()
  const visual = useRef<HTMLDivElement>(null)
  const [portal, setPortal] = useState<HTMLDialogElement | null>(null)
  const position = useRef<{ x: number; y: number; scale: number } | null>(null)
  useEffect(() => {
    const root = host.current
    const layer = visual.current
    if (!root || !layer) return
    let frame = 0
    let last = 0
    let followUntil = 0
    const reduced = reducedMotionQuery()
    const target = () => {
      const inSidebar = state.drawerOpen || (!state.compact && state.sideMode === 'expanded')
      return root.querySelector<HTMLElement>(
        `[data-tool-brand-anchor="${inSidebar ? 'side' : 'header'}"]`
      )
    }
    const tick = (time: number) => {
      frame = 0
      const anchor = target()
      // No visible anchor (a narrow bar hides its logo): hide the visual instead of leaving it
      // where the logo last was, on top of whatever took that place.
      const hide = () => {
        layer.style.visibility = 'hidden'
        position.current = null
      }
      if (!anchor) return hide()
      const modal = anchor.closest('dialog')
      if (modal !== portal) {
        setPortal(modal)
        return
      }
      const rect = anchor.getBoundingClientRect()
      if (!rect.width || !rect.height) return hide()
      // Take the size of the logo the anchor holds (72×18 in a header, 104×26 in the sidebar), so
      // the visual never outgrows the bubble it sits in.
      const mark = anchor.querySelector('.fo-logo')?.getBoundingClientRect()
      const scale = mark?.height ? mark.height / BRAND_HEIGHT : 1
      const drawerTransform = modal ? new DOMMatrix(getComputedStyle(modal).transform) : null
      const goal = {
        x: rect.left + (rect.width - BRAND_WIDTH * scale) / 2 - (drawerTransform?.m41 ?? 0),
        y: rect.top + (rect.height - BRAND_HEIGHT * scale) / 2 - (drawerTransform?.m42 ?? 0),
        scale,
      }
      const current = position.current ?? goal
      const dt = Math.min(40, Math.max(1, time - (last || time - 16)))
      last = time
      const blend = reduced.matches ? 1 : 1 - Math.exp(-dt / 55)
      const next = {
        x: current.x + (goal.x - current.x) * blend,
        y: current.y + (goal.y - current.y) * blend,
        scale: current.scale + (goal.scale - current.scale) * blend,
      }
      position.current = next
      // Native dialogs form a top layer; keep the moving visual in that same layer.
      const transformed = portal && getComputedStyle(portal).transform !== 'none'
      const bounds = transformed ? portal.getBoundingClientRect() : null
      const origin =
        bounds && portal
          ? { left: bounds.left + portal.clientLeft, top: bounds.top + portal.clientTop }
          : { left: 0, top: 0 }
      layer.style.transform = `translate3d(${next.x - origin.left}px, ${next.y - origin.top}px, 0) scale(${next.scale})`
      layer.style.visibility = 'visible'
      root.dataset.movingBrand = 'ready'
      if (time < followUntil || Math.abs(next.x - goal.x) + Math.abs(next.y - goal.y) + Math.abs(next.scale - goal.scale) * 100 > 0.1)
        frame = requestAnimationFrame(tick)
    }
    const wake = () => {
      followUntil = performance.now() + (reduced.matches ? 0 : 450)
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const observer = new ResizeObserver(wake)
    observer.observe(root)
    const header = root.querySelector('.lab-tool-app-bar')
    if (header) observer.observe(header)
    window.addEventListener('resize', wake)
    reduced.addEventListener('change', wake)
    wake()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', wake)
      reduced.removeEventListener('change', wake)
    }
  }, [host, state.compact, state.sideMode, state.drawerOpen, portal])
  useEffect(
    () => () => {
      if (host.current) delete host.current.dataset.movingBrand
    },
    [host]
  )
  const logo = (
    <div ref={visual} className="lab-tool-moving-brand" aria-hidden="true">
      <FoAnimatedLogo width={BRAND_WIDTH} height={BRAND_HEIGHT} />
    </div>
  )
  return portal ? createPortal(logo, portal) : logo
}
