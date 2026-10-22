'use client'

import * as React from 'react'
import { LabMotionValue, prefersReducedMotion } from './motion-value'
import { LAB_SPRINGS, type LabSpring } from './spring'

type Box = { x: number; y: number; width: number; height: number }
type Track = { x: LabMotionValue; y: LabMotionValue; sx: LabMotionValue; sy: LabMotionValue; stop: () => void }

/** Running layout animations, per element, so a new layout change can take over their speed. */
const tracks = new WeakMap<HTMLElement, Track>()

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

/** Where each element is on screen now (transforms included), to animate from after a change. */
export function snapshotLayout(elements: Iterable<HTMLElement>) {
  const boxes = new Map<HTMLElement, Box>()
  for (const el of elements) boxes.set(el, boxOf(el))
  return boxes
}

/**
 * FLIP on springs: animates each element from its box in `before` to where layout now puts it.
 * Call it after the DOM changed (a layout effect). Elements mid-flight keep their speed. With
 * `size`, an element also scales from its old size (use it for media and plain shapes).
 */
export function animateLayoutFrom(
  before: Map<HTMLElement, Box>,
  options: { spring?: LabSpring; size?: (el: HTMLElement) => boolean } = {}
) {
  if (prefersReducedMotion()) return
  const spring = options.spring ?? LAB_SPRINGS.snappy
  for (const [el, first] of before) {
    if (!el.isConnected) continue
    const track = tracks.get(el)
    const speed = track
      ? { x: track.x.getVelocity(), y: track.y.getVelocity(), sx: track.sx.getVelocity(), sy: track.sy.getVelocity() }
      : null
    track?.stop()
    el.style.transform = ''
    const last = boxOf(el)
    const sized = options.size?.(el) ?? false
    const from = {
      dx: first.x - last.x,
      dy: first.y - last.y,
      sx: sized && last.width ? first.width / last.width : 1,
      sy: sized && last.height ? first.height / last.height : 1,
    }
    if (Math.abs(from.dx) < 0.5 && Math.abs(from.dy) < 0.5 && Math.abs(from.sx - 1) < 0.005 && Math.abs(from.sy - 1) < 0.005) {
      tracks.delete(el)
      continue
    }
    move(el, from, speed, spring)
  }
}

function move(
  el: HTMLElement,
  from: { dx: number; dy: number; sx: number; sy: number },
  speed: { x: number; y: number; sx: number; sy: number } | null,
  spring: LabSpring
) {
  const x = new LabMotionValue(from.dx, 0.25)
  const y = new LabMotionValue(from.dy, 0.25)
  const sx = new LabMotionValue(from.sx, 0.001)
  const sy = new LabMotionValue(from.sy, 0.001)
  const paint = () => {
    el.style.transformOrigin = '0 0'
    el.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) scale(${sx.get()}, ${sy.get()})`
  }
  const unsubscribe = [x, y, sx, sy].map((v) => v.subscribe(paint))
  let settled = 0
  const done = (arrived: boolean) => {
    if (!arrived || ++settled < 4) return
    unsubscribe.forEach((u) => u())
    el.style.transform = ''
    el.style.transformOrigin = ''
    tracks.delete(el)
  }
  tracks.set(el, {
    x,
    y,
    sx,
    sy,
    stop: () => {
      ;[x, y, sx, sy].forEach((v) => v.stop())
      unsubscribe.forEach((u) => u())
    },
  })
  paint()
  void x.animateTo(0, { spring, velocity: speed?.x ?? 0 }).then(done)
  void y.animateTo(0, { spring, velocity: speed?.y ?? 0 }).then(done)
  void sx.animateTo(1, { spring, velocity: speed?.sx ?? 0 }).then(done)
  void sy.animateTo(1, { spring, velocity: speed?.sy ?? 0 }).then(done)
}

function enter(el: HTMLElement, spring: LabSpring) {
  const p = new LabMotionValue(0, 0.002)
  const paint = (v: number) => {
    el.style.opacity = String(Math.min(1, Math.max(0, v)))
    el.style.transform = `scale(${0.94 + 0.06 * v})`
  }
  const unsubscribe = p.subscribe(paint)
  paint(0)
  void p.animateTo(1, { spring }).then(() => {
    unsubscribe()
    el.style.opacity = ''
    el.style.transform = ''
  })
}

export type LabLayoutGroupProps = {
  /** The subtree to watch. Elements with `data-lab-layout-id` move; ids must be unique in the group. */
  children: React.ReactNode
  /** Animate only when this value changes (cheaper on busy screens). Default: after every render. */
  layoutKey?: unknown
  /** Spring for movement. Default `snappy`. */
  spring?: LabSpring
  /** Elements that are new in a render fade and scale in. Default true. */
  animateEnter?: boolean
}

/**
 * Shared-element layout transitions (FLIP on springs): after each render, every element marked
 * `data-lab-layout-id` that moved animates from where it was to where it now is, even into
 * another container inside the group. Mark an element `data-lab-layout="size"` to animate its
 * size too (it scales, so prefer it for media and plain shapes). An interrupted move continues
 * from where it is on screen at the speed it had, so rapid changes never jump.
 */
export class LabLayoutGroup extends React.Component<LabLayoutGroupProps> {
  private root = React.createRef<HTMLDivElement>()

  private elements() {
    const root = this.root.current
    return root ? Array.from(root.querySelectorAll<HTMLElement>('[data-lab-layout-id]')) : []
  }

  getSnapshotBeforeUpdate(previous: LabLayoutGroupProps) {
    if ('layoutKey' in this.props && Object.is(previous.layoutKey, this.props.layoutKey)) return null
    const boxes = new Map<string, Box>()
    for (const el of this.elements()) boxes.set(el.dataset.labLayoutId!, boxOf(el))
    return boxes
  }

  componentDidUpdate(_: LabLayoutGroupProps, __: unknown, before: Map<string, Box> | null) {
    if (!before || prefersReducedMotion()) return
    const spring = this.props.spring ?? LAB_SPRINGS.snappy
    const moved = new Map<HTMLElement, Box>()
    for (const el of this.elements()) {
      const first = before.get(el.dataset.labLayoutId!)
      if (first) moved.set(el, first)
      else if (this.props.animateEnter !== false && !tracks.has(el)) enter(el, spring)
    }
    animateLayoutFrom(moved, { spring, size: (el) => el.dataset.labLayout === 'size' })
  }

  render() {
    return (
      <div ref={this.root} className="lab-layout-group" style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    )
  }
}
