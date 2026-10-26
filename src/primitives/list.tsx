'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, GripVertical } from 'lucide-react'
import { attachPan } from '../physics/gesture'
import { animateLayoutFrom, snapshotLayout } from '../physics/layout-group'
import { MotionValue } from '../physics/motion-value'
import { SPRINGS, rubberBand, rubberBandClamp } from '../physics/spring'
import {
  reorderLanding,
  reorderShifts,
  reorderTarget,
  swipeIsFull,
  swipeRelease,
  type SwipeSides,
} from './list-model'
import { SquareSlot } from './square-slot'
import { cn } from '../utils'
import './list.css'

type ReorderContext = { enabled: boolean }
const Reorder = React.createContext<ReorderContext>({ enabled: false })

/**
 * A group of rows on one rounded card, with an optional header above and footer below: the
 * inset-grouped list of iOS Settings and Mail. Rows are separated by hairlines that start after
 * their leading icon. With `onReorder`, every row gets a grip: drag it (any pointer) or focus it
 * and press the arrow keys.
 */
export function ListSection({
  header,
  footer,
  children,
  className,
  label,
  onReorder,
}: {
  /** Short label above the card, in sentence case. */
  header?: React.ReactNode
  /** Help text under the card. */
  footer?: React.ReactNode
  /** ListRow elements. */
  children: React.ReactNode
  className?: string
  /** Accessible name when there is no visible header. */
  label?: string
  /** Makes the rows reorderable. Move item `from` to index `to` in your data; the list animates the rest. */
  onReorder?: (from: number, to: number) => void
}) {
  const id = React.useId()
  const card = React.useRef<HTMLDivElement>(null)
  const pending = React.useRef<ReturnType<typeof snapshotLayout> | null>(null)
  const [announcement, setAnnouncement] = React.useState('')
  const live = React.useRef(onReorder)
  live.current = onReorder

  // After a reorder renders, items start from where they were on screen and spring into place.
  React.useLayoutEffect(() => {
    if (!pending.current) return
    const snapshot = pending.current
    pending.current = null
    animateLayoutFrom(snapshot, { spring: SPRINGS.snappy })
  })

  const items = () => (card.current ? (Array.from(card.current.children) as HTMLElement[]) : [])
  const commit = (from: number, to: number) => {
    pending.current = snapshotLayout(items())
    live.current?.(from, to)
    setAnnouncement(`Moved to position ${to + 1} of ${items().length}.`)
  }

  // Drag by the grip: the row lifts and follows the pointer, the others part around it.
  React.useEffect(() => {
    const el = card.current
    if (!el || !onReorder) return
    type Drag = {
      from: number
      to: number
      heights: number[]
      nodes: HTMLElement[]
      offsets: MotionValue[]
      scroller: HTMLElement | null
      scrollStart: number
      dy: number
      bounds: [number, number]
      frame: number
      pointerY: number
    }
    let drag: Drag | null = null
    let grip: Element | null = null
    const paint = (node: HTMLElement, value: number, lifted: boolean) => {
      node.style.transform = lifted ? `translate3d(0, ${value}px, 0) scale(1.02)` : `translate3d(0, ${value}px, 0)`
    }
    const update = () => {
      const d = drag
      if (!d) return
      const scrolled = (d.scroller?.scrollTop ?? 0) - d.scrollStart
      const delta = rubberBandClamp(d.dy + scrolled, d.bounds[0], d.bounds[1], 200)
      d.offsets[d.from].set(delta)
      const to = reorderTarget(d.heights, d.from, delta)
      if (to !== d.to) {
        d.to = to
        reorderShifts(d.heights, d.from, to).forEach((shift, j) => {
          if (j !== d.from) void d.offsets[j].animateTo(shift, { spring: SPRINGS.snappy })
        })
      }
    }
    // Near the scroller's edges, scroll toward the pointer, faster the closer it is.
    const autoScroll = () => {
      const d = drag
      if (!d) return
      d.frame = requestAnimationFrame(autoScroll)
      if (!d.scroller) return
      const box = d.scroller.getBoundingClientRect()
      const zone = 64
      const speed =
        d.pointerY < box.top + zone
          ? -((box.top + zone - d.pointerY) / zone) * 14
          : d.pointerY > box.bottom - zone
            ? ((d.pointerY - (box.bottom - zone)) / zone) * 14
            : 0
      if (speed) {
        d.scroller.scrollTop += speed
        update()
      }
    }
    return attachPan(el, () => ({
      axis: 'y',
      threshold: 2,
      canBegin: ({ target }) => {
        grip = target?.closest('[data-lab-reorder-handle]') ?? null
        return !!grip
      },
      onStart: ({ originY }) => {
        const nodes = items()
        const from = nodes.findIndex((n) => !!grip && n.contains(grip))
        if (from < 0) return
        const heights = nodes.map((n) => n.getBoundingClientRect().height)
        let scroller: HTMLElement | null = el.parentElement
        while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
        const above = heights.slice(0, from).reduce((a, b) => a + b, 0)
        const below = heights.slice(from + 1).reduce((a, b) => a + b, 0)
        drag = {
          from,
          to: from,
          heights,
          nodes,
          offsets: nodes.map((node, j) => {
            const value = new MotionValue(0, 0.25)
            value.subscribe((v) => paint(node, v, j === from))
            return value
          }),
          scroller,
          scrollStart: scroller?.scrollTop ?? 0,
          dy: 0,
          bounds: [-above, below],
          frame: 0,
          pointerY: originY,
        }
        nodes[from].dataset.lifted = ''
        el.dataset.reordering = ''
        paint(nodes[from], 0, true)
        drag.frame = requestAnimationFrame(autoScroll)
      },
      onMove: ({ dy, originY }) => {
        if (!drag) return
        drag.dy = dy
        drag.pointerY = originY + dy
        update()
      },
      onEnd: () => {
        const d = drag
        drag = null
        if (!d) return
        cancelAnimationFrame(d.frame)
        const finish = () => {
          delete d.nodes[d.from].dataset.lifted
          delete el.dataset.reordering
          d.offsets.forEach((o) => o.stop())
          if (d.to !== d.from) commit(d.from, d.to)
          d.nodes.forEach((n) => {
            if (d.to === d.from) n.style.transform = ''
          })
        }
        const landing = reorderLanding(d.heights, d.from, d.to)
        void d.offsets[d.from].animateTo(landing, { spring: SPRINGS.release }).then((arrived) => arrived && finish())
      },
    }))
  }, [Boolean(onReorder)])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const handle = (event.target as HTMLElement).closest('[data-lab-reorder-handle]')
    if (!handle || !onReorder || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    const all = items()
    const from = all.findIndex((n) => n.contains(handle))
    const to = from + (event.key === 'ArrowUp' ? -1 : 1)
    if (from < 0 || to < 0 || to >= all.length) return
    event.preventDefault()
    commit(from, to)
  }

  return (
    <section
      className={cn('lab-list-section', className)}
      aria-labelledby={header ? id : undefined}
      aria-label={header ? undefined : label}
    >
      {header && (
        <h3 id={id} className="lab-list-header">
          {header}
        </h3>
      )}
      <Reorder.Provider value={{ enabled: !!onReorder }}>
        <div ref={card} className="lab-list-card" role="list" onKeyDown={onReorder ? onKeyDown : undefined}>
          {children}
        </div>
      </Reorder.Provider>
      {footer && <p className="lab-list-footer">{footer}</p>}
      {onReorder && (
        <span className="lab-sr-only" role="status">
          {announcement}
        </span>
      )}
    </section>
  )
}

/** An action revealed by swiping a row. */
export type RowAction = {
  /** Short verb: “Confirm”, “Archive”, “Delete”. */
  label: string
  icon?: React.ReactNode
  /** `destructive` (red), `primary` (brand) or `neutral` (gray, default). */
  tone?: 'neutral' | 'primary' | 'destructive'
  onAction: () => void
}

export type ListRowProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
  /** Main text. */
  title: React.ReactNode
  /** Second line in muted text. */
  subtitle?: React.ReactNode
  /** Icon, avatar or thumbnail at the start. */
  leading?: React.ReactNode
  /** Value, badge or control at the end. */
  trailing?: React.ReactNode
  /** Shows a disclosure chevron: the row opens another page. */
  chevron?: boolean
  /** Marks the row as the current selection (a split view's open item). */
  selected?: boolean
  /** Renders your own element (a router link) as the row, keeping the row's look and layout. */
  asChild?: boolean
  /** Without `onClick`, `href` or `asChild`, the row is static text. */
  static?: boolean
  /** Actions revealed by swiping toward the end (they sit at the start). The first runs on a long swipe. */
  leadingActions?: readonly RowAction[]
  /** Actions revealed by swiping toward the start (they sit at the end). The first runs on a long swipe. */
  trailingActions?: readonly RowAction[]
  /** Whether a long swipe runs the first action. Default true. */
  fullSwipe?: boolean
  /** Accessible name of the reorder grip. Defaults to “Reorder” plus the title when it is text. */
  reorderLabel?: string
}

const ACTION_WIDTH = 76
/** Only one row shows its actions at a time. */
let closeOpenRow: (() => void) | null = null

/**
 * One row of a list: a full-width button (or your link with `asChild`) with leading media, title,
 * subtitle, trailing value and an optional chevron. Swipe actions reveal behind it, and inside a
 * reorderable ListSection it gets a grip.
 */
export const ListRow = React.forwardRef<HTMLButtonElement, ListRowProps>(function ListRow(
  {
    title,
    subtitle,
    leading,
    trailing,
    chevron,
    selected,
    asChild,
    static: isStatic,
    leadingActions,
    trailingActions,
    fullSwipe = true,
    reorderLabel,
    className,
    children,
    ...props
  },
  ref
) {
  const reorder = React.useContext(Reorder)
  const item = React.useRef<HTMLDivElement>(null)
  const swipeable = !!(leadingActions?.length || trailingActions?.length)
  const [open, setOpen] = React.useState<'leading' | 'trailing' | null>(null)
  const [full, setFull] = React.useState<'leading' | 'trailing' | null>(null)
  const offset = React.useRef<MotionValue | null>(null)
  if (!offset.current) offset.current = new MotionValue(0, 0.25)
  const live = React.useRef({ leadingActions, trailingActions, fullSwipe })
  live.current = { leadingActions, trailingActions, fullSwipe }

  const rtl = () => !!item.current && getComputedStyle(item.current).direction === 'rtl'
  const sides = (): SwipeSides => ({
    leading: (live.current.leadingActions?.length ?? 0) * ACTION_WIDTH,
    trailing: (live.current.trailingActions?.length ?? 0) * ACTION_WIDTH,
    row: item.current?.clientWidth ?? 360,
    fullLeading: live.current.fullSwipe,
    fullTrailing: live.current.fullSwipe,
  })
  // `offset` is logical (positive shows leading actions); painted mirrored in RTL.
  React.useLayoutEffect(() => {
    if (!swipeable) return
    return offset.current!.subscribe((v) => {
      const el = item.current
      if (!el) return
      el.style.setProperty('--lab-row-swipe', `${Math.abs(v)}px`)
      const row = el.querySelector<HTMLElement>(':scope > .lab-list-row')
      if (row) row.style.transform = v ? `translate3d(${rtl() ? -v : v}px, 0, 0)` : ''
      el.dataset.swiping = v > 0.5 ? 'leading' : v < -0.5 ? 'trailing' : ''
      const isFull = swipeIsFull(v, sides())
      setFull(isFull ? (v > 0 ? 'leading' : 'trailing') : null)
    })
  }, [swipeable])

  const settle = (target: number, velocity?: number) =>
    offset.current!.animateTo(target, { spring: SPRINGS.release, velocity })
  const close = React.useCallback(() => {
    setOpen(null)
    void settle(0)
  }, [])
  const run = (action: RowAction) => {
    close()
    action.onAction()
  }

  React.useEffect(() => {
    const el = item.current
    if (!el || !swipeable) return
    let start = 0
    return attachPan(el, () => ({
      axis: 'x',
      threshold: 8,
      canBegin: ({ target }) => !target?.closest('.lab-list-actions, [data-lab-reorder-handle]'),
      onStart: () => {
        if (closeOpenRow && closeOpenRow !== close) closeOpenRow()
        offset.current!.stop()
        start = offset.current!.get()
      },
      onMove: ({ dx, time }) => {
        const s = sides()
        const raw = start + (rtl() ? -dx : dx)
        const max = s.leading ? s.row : 0,
          min = s.trailing ? -s.row : 0
        offset.current!.track(raw > max ? max + rubberBand(raw - max, 120) : raw < min ? min + rubberBand(raw - min, 120) : raw, time)
      },
      onEnd: ({ time, cancelled }) => {
        const velocity = offset.current!.getVelocity(time)
        const landing = cancelled ? { offset: 0, commit: null } : swipeRelease(offset.current!.get(), velocity, sides())
        const L = live.current
        if (landing.commit) {
          const action = (landing.commit === 'leading' ? L.leadingActions : L.trailingActions)![0]
          void settle(landing.offset, velocity).then(() => {
            action.onAction()
            // A row that stays (archive, mark read) slides home; a removed one is gone already.
            if (item.current?.isConnected) void settle(0)
          })
          setOpen(null)
          return
        }
        setOpen(landing.offset > 0 ? 'leading' : landing.offset < 0 ? 'trailing' : null)
        closeOpenRow = landing.offset ? close : null
        void settle(landing.offset, velocity)
      },
    }))
  }, [swipeable, close])

  // Keyboard: arrows on the row reveal a side's actions and focus the first; Escape closes.
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    props.onKeyDown?.(event as React.KeyboardEvent<HTMLButtonElement>)
    if (!swipeable || event.defaultPrevented) return
    const towardEnd = event.key === (rtl() ? 'ArrowLeft' : 'ArrowRight')
    const towardStart = event.key === (rtl() ? 'ArrowRight' : 'ArrowLeft')
    const side = towardStart && trailingActions?.length ? 'trailing' : towardEnd && leadingActions?.length ? 'leading' : null
    if (!side) return
    event.preventDefault()
    const width = (side === 'leading' ? leadingActions!.length : trailingActions!.length) * ACTION_WIDTH
    setOpen(side)
    closeOpenRow = close
    // Visible now, so the first action can take focus before the slide has painted.
    if (item.current) item.current.dataset.swiping = side
    void settle(side === 'leading' ? width : -width)
    requestAnimationFrame(() =>
      item.current?.querySelector<HTMLElement>(`.lab-list-actions[data-side="${side}"] button`)?.focus()
    )
  }

  const body = (
    <>
      {leading && <SquareSlot className="lab-list-row-leading">{leading}</SquareSlot>}
      <span className="lab-list-row-text">
        <span className="lab-list-row-title">{title}</span>
        {subtitle && <span className="lab-list-row-subtitle">{subtitle}</span>}
      </span>
      {trailing && <span className="lab-list-row-trailing">{trailing}</span>}
      {chevron && <ChevronRight className="lab-list-row-chevron lab-dir-flip" aria-hidden="true" />}
    </>
  )
  const common = {
    'className': cn('lab-list-row', className),
    'data-selected': selected || undefined,
  }
  const actions = (side: 'leading' | 'trailing', list?: readonly RowAction[]) =>
    list?.length ? (
      <div
        className="lab-list-actions"
        data-side={side}
        data-full={full === side || undefined}
        aria-hidden={open !== side || undefined}
      >
        {list.map((action) => (
          <button
            key={action.label}
            type="button"
            className="lab-list-action"
            data-tone={action.tone ?? 'neutral'}
            tabIndex={open === side ? 0 : -1}
            onClick={() => run(action)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              close()
              item.current?.querySelector<HTMLElement>(':scope > .lab-list-row')?.focus()
            }}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    ) : null
  const titleText = typeof title === 'string' ? title : undefined
  return (
    <div
      ref={item}
      role="listitem"
      className="lab-list-item"
      data-leading={leading ? '' : undefined}
      data-swipe={swipeable || undefined}
      data-reorder={reorder.enabled || undefined}
    >
      {actions('leading', leadingActions)}
      {actions('trailing', trailingActions)}
      {isStatic ? (
        <div {...common} data-static="">
          {body}
        </div>
      ) : asChild ? (
        <Slot {...common} {...(props as React.HTMLAttributes<HTMLElement>)} aria-current={selected ? 'true' : undefined} onKeyDown={onKeyDown}>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, {}, body)
            : children}
        </Slot>
      ) : (
        <button
          ref={ref}
          type="button"
          {...common}
          {...props}
          aria-current={selected ? 'true' : undefined}
          onKeyDown={onKeyDown}
          onClickCapture={(event) => {
            // A tap on an open row closes it instead of opening the row.
            if (open) {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
          }}
        >
          {body}
        </button>
      )}
      {reorder.enabled && (
        <button
          type="button"
          className="lab-list-grip"
          data-lab-reorder-handle=""
          aria-label={reorderLabel ?? (titleText ? `Reorder ${titleText}` : 'Reorder')}
          aria-description="Drag, or use the up and down arrow keys."
        >
          <GripVertical aria-hidden="true" />
        </button>
      )}
    </div>
  )
})
