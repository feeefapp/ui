'use client'

import { Button } from '../ui'
import { useI18n } from '../i18n'
import { GlassGroup } from '../scaffold'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Maximize, Minus, Plus, RefreshCw, Trash2, X, Star } from 'lucide-react'
import { PixelArtwork, PixelLoader } from '../pixel-art'
import { revealCovered } from './freeform-frame'
import { elapsed, stageRatio, takeErrorText } from './board-utils'
import type { ImageTake } from './types'
import './freeform-board.css'
import { GlassScope } from '../glass/container'
import { prefersReducedMotion } from '../physics/motion-value'

export type Insets = { top: number; right: number; bottom: number; left: number }
type View = { x: number; y: number; scale: number }
type Card = { take: ImageTake; x: number; y: number; w: number; h: number; number: number }

/** World height of every card; widths follow each image's proportions. */
const CARD_H = 560
const GAP = 72
const MIN_SCALE = 0.08
const MAX_SCALE = 4
const SCENE_PADDING = 16

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Lay the versions out left to right, oldest first, centred on the origin row. */
/** `google/gemini-3-pro-image-preview` → `Gemini 3 Pro Image Preview`. */
export function humanModel(id: string) {
  return (id.split('/').pop() || id)
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim()
}

export function layoutCards(takes: ImageTake[], ratios: Record<string, number>): Card[] {
  const ordered = [...takes].reverse()
  let x = 0
  return ordered.map((take, i) => {
    const ratio = clamp(ratios[take.id] ?? stageRatio(undefined, take.options), 1 / 100, 100)
    const w = Math.round(CARD_H * ratio)
    const card = { take, x, y: -CARD_H / 2, w, h: CARD_H, number: i + 1 }
    x += w + GAP
    return card
  })
}

/** Scale and offset that fit a world rect into the visible area between floating panels. */
export function fitView(
  rect: { x: number; y: number; w: number; h: number },
  viewport: { w: number; h: number },
  insets: Insets,
  padding = 28,
  maxScale = 1
): View {
  const availW = Math.max(120, viewport.w - insets.left - insets.right - padding * 2)
  const availH = Math.max(120, viewport.h - insets.top - insets.bottom - padding * 2)
  const scale = clamp(Math.min(availW / rect.w, availH / rect.h, maxScale), MIN_SCALE, MAX_SCALE)
  const cx = insets.left + padding + availW / 2
  const cy = insets.top + padding + availH / 2
  return { scale, x: cx - (rect.x + rect.w / 2) * scale, y: cy - (rect.y + rect.h / 2) * scale }
}

/**
 * Freeform-style board: an endless dotted canvas behind every panel. Versions sit side by side;
 * the selected one glides into the free area between the floating panels. Drag to pan, scroll to
 * pan, pinch or ⌘/Ctrl+scroll to zoom, double-click a card to fit it.
 */
export function FreeformBoard({
  embedded = false,
  takes,
  selectedId,
  onSelect,
  insets,
  now,
  signedIn,
  starters,
  onStarter,
  onRetry,
  onRemove,
  emptyContent,
  emptyScene,
  modelLabel,
}: {
  /** Display name of a take's model for its card label ("{model} #{n}"). Defaults to a tidied id. */
  modelLabel?(modelId: string): string | undefined
  /** Fills its positioned parent instead of the whole window (`position: fixed`). */
  embedded?: boolean
  /** Versions to show, newest first; they are laid out oldest to newest, left to right. */
  takes: ImageTake[]
  /** The selected take; the board glides it into view. Defaults to the newest. */
  selectedId: string | undefined
  /** Called with a take id when its card is clicked (not dragged). */
  onSelect(id: string): void
  /** Room taken by floating chrome on each edge, in pixels; cards fit between them. */
  insets: Insets
  /** Current time in ms, for the elapsed timer on pending cards. Tick it while work runs. */
  now: number
  /** Picks the empty-board hint for signed-in or signed-out users. */
  signedIn: boolean
  /** Starter prompts on the empty board. */
  starters: { label: string; prompt: string }[]
  /** Called with the prompt of the starter the user clicked. */
  onStarter(prompt: string): void
  /** Called from a failed card's "Try again". */
  onRetry(take: ImageTake): void
  /** Called from a failed card's "Remove". */
  onRemove(take: ImageTake): void
  /** Replaces the default welcome with content fixed to the viewport. */
  emptyContent?: ReactNode
  /** Interactive content at the world origin. The board fits its measured bounds on entry and resize. */
  emptyScene?: { content: ReactNode; maxWidth: number }
}) {
  const { t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sceneSize, setSceneSize] = useState({ w: 0, h: 0 })
  // 0 × 0 until the board is measured: nothing is fitted to a guessed size.
  const [size, setSize] = useState({ w: 0, h: 0 })
  const fittedOnce = useRef(false)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const [animate, setAnimate] = useState(false)
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const drag = useRef<{
    id: number
    x: number
    y: number
    vx: number
    vy: number
    moved: boolean
    card?: string
  } | null>(null)
  const pinch = useRef(new Map<number, { x: number; y: number }>())
  const suppressSceneClick = useRef(false)
  const [grabbing, setGrabbing] = useState(false)
  const cards = useMemo(() => layoutCards(takes, ratios), [takes, ratios])
  const selected = cards.find((card) => card.take.id === selectedId) ?? cards[cards.length - 1]
  const scene = cards.length === 0 ? emptyScene : undefined
  const hasScene = scene != null
  const roomW = size.w - insets.left - insets.right
  const roomH = size.h - insets.top - insets.bottom
  const sceneWidth = Math.max(0, Math.min(scene?.maxWidth ?? 0, roomW - SCENE_PADDING * 2))
  const sceneReady =
    sceneWidth > 0 && roomH > 0 && sceneSize.h > 0 && Math.abs(sceneSize.w - sceneWidth) < 1

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSceneSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasScene])

  const glide = useCallback((next: View, instant = false) => {
    setAnimate(!instant && !prefersReducedMotion())
    setView(next)
  }, [])
  const fitCard = useCallback(
    (card: Card | undefined, instant = false) => {
      if (!card) return
      const fitted = fitView(card, size, insets, 28, card.take.status === 'completed' ? 1.4 : 1)
      // Centering the selection leaves the poster beside it under the rail
      // whenever the free area is wider than the card. Pull that neighbor clear.
      glide(revealCovered(fitted, cards, card, size, insets, 28), instant)
    },
    [glide, size, insets, cards]
  )
  const fitAll = () => {
    if (!cards.length) return
    const last = cards[cards.length - 1]
    glide(fitView({ x: 0, y: -CARD_H / 2, w: last.x + last.w, h: CARD_H }, size, insets))
  }

  // Bring the selection (or a new version) into the free area whenever it, the panels or the window change.
  const layoutKey = cards.map((card) => `${card.take.id}:${card.x}:${card.w}`).join('|')
  const key = `${selected?.take.id}:${layoutKey}:${size.w}x${size.h}:${insets.left},${insets.top},${insets.right},${insets.bottom}:${scene ? `${sceneWidth},${sceneSize.h},${sceneReady}` : ''}`
  useLayoutEffect(() => {
    if (scene) {
      if (!sceneReady) return
      const scale = Math.min(1, (roomH - Math.min(SCENE_PADDING * 2, roomH / 4)) / sceneSize.h)
      glide(
        {
          x: insets.left + (roomW - sceneWidth * scale) / 2,
          y: insets.top + (roomH - sceneSize.h * scale) / 2,
          scale,
        },
        true
      )
      fittedOnce.current = true
      return
    }
    // Unmeasured or hidden (a viewport no bigger than the chrome around it): nothing to fit yet. The
    // first real fit snaps into place; later ones glide.
    if (roomW <= 56 || roomH <= 56) return
    const instant = !fittedOnce.current
    fittedOnce.current = true
    if (selected) fitCard(selected, instant)
    else
      glide(
        {
          x: insets.left + roomW / 2,
          y: insets.top + roomH / 2,
          scale: 1,
        },
        instant
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const zoomAt = (factor: number, px: number, py: number) => {
    setAnimate(false)
    setView((old) => {
      const scale = clamp(old.scale * factor, MIN_SCALE, MAX_SCALE)
      const k = scale / old.scale
      return { scale, x: px - (px - old.x) * k, y: py - (py - old.y) * k }
    })
  }
  const zoomCentre = (factor: number) => {
    setAnimate(true)
    zoomAt(
      factor,
      insets.left + (size.w - insets.left - insets.right) / 2,
      insets.top + (size.h - insets.top - insets.bottom) / 2
    )
  }

  // Native wheel listener: React's is passive, and pinch/scroll must not move the page.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const wheel = (event: WheelEvent) => {
      // An overlay may own its own scrolling; scene content uses the board gestures.
      const inPanel = (event.target as Element | null)?.closest?.('[data-ff-scroll]')
      if (inPanel && !event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      if (inPanel) return
      const rect = el.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        zoomAt(
          Math.exp(-event.deltaY * 0.0045),
          event.clientX - rect.left,
          event.clientY - rect.top
        )
      } else {
        setAnimate(false)
        setView((old) => ({ ...old, x: old.x - event.deltaX, y: old.y - event.deltaY }))
      }
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const down = (event: ReactPointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return
    if (pinch.current.size === 0) suppressSceneClick.current = false
    else suppressSceneClick.current = true
    pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const target = event.target as Element
    // Capture on the scene target so a tap retains native focus and click behavior.
    const capture = target.closest('[data-ff-scene]') ? target : event.currentTarget
    capture.setPointerCapture(event.pointerId)
    if (pinch.current.size === 1)
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        vx: view.x,
        vy: view.y,
        moved: false,
        // Captured pointers report the board as their target on release, so the card is read here.
        card: (event.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card,
      }
    setAnimate(false)
  }
  const move = (event: ReactPointerEvent) => {
    const points = pinch.current
    if (!points.has(event.pointerId)) return
    const before = [...points.values()]
    points.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (points.size === 2) {
      const [a, b] = before
      const [c, d] = [...points.values()]
      const dist = (p: any, q: any) => Math.hypot(p.x - q.x, p.y - q.y)
      const rect = root.current!.getBoundingClientRect()
      zoomAt(
        dist(c, d) / Math.max(1, dist(a, b)),
        (c.x + d.x) / 2 - rect.left,
        (c.y + d.y) / 2 - rect.top
      )
      if (drag.current) drag.current.moved = true
      return
    }
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dx = event.clientX - d.x
    const dy = event.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    suppressSceneClick.current = true
    setGrabbing(true)
    setView((old) => ({ ...old, x: d.vx + dx, y: d.vy + dy }))
  }
  const up = (event: ReactPointerEvent) => {
    pinch.current.delete(event.pointerId)
    const d = drag.current
    if (d?.id === event.pointerId) {
      // A click (no drag) on a card selects it.
      if (!d.moved && d.card) onSelect(d.card)
      drag.current = null
      setGrabbing(false)
    }
  }

  const percent = Math.round(view.scale * 100)
  const dot = 24 * view.scale
  return (
    <div
      ref={root}
      className="lab-ff lab-workspace-canvas"
      data-embedded={embedded || undefined}
      data-grabbing={grabbing}
      style={{
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={(event) => {
        if (
          event.detail &&
          suppressSceneClick.current &&
          (event.target as Element).closest('[data-ff-scene]')
        ) {
          event.stopPropagation()
          event.preventDefault()
        }
      }}
      onDoubleClick={(event) => {
        const id = (event.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card
        const card = cards.find((row) => row.take.id === id)
        if (card) fitCard(card)
      }}
      role="application"
      aria-label={t('lab.board.canvasHint')}
    >
      <div
        className="lab-ff-world"
        data-animate={animate}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) setAnimate(false)
        }}
      >
        {scene && (
          <div
            ref={sceneRef}
            className="lab-ff-scene"
            data-ff-scene=""
            style={{ width: sceneWidth, visibility: sceneReady ? undefined : 'hidden' }}
          >
            {scene.content}
          </div>
        )}
        {cards.map((card) => {
          const take = card.take
          const busy = take.status === 'pending' || take.status === 'processing'
          return (
            <figure
              key={take.id}
              data-card={take.id}
              className="lab-ff-card"
              data-status={take.status}
              aria-current={take.id === selected?.take.id}
              style={{ left: card.x, top: card.y, width: card.w, height: card.h }}
            >
              {take.status === 'completed' ? (
                <img
                  src={take.fileUrl}
                  alt={take.prompt || t('lab.board.generatedImage')}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    const r = img.naturalWidth / Math.max(1, img.naturalHeight)
                    if (Number.isFinite(r) && Math.abs((ratios[take.id] ?? 0) - r) > 0.01)
                      setRatios((old) => ({ ...old, [take.id]: r }))
                  }}
                />
              ) : busy ? (
                <div className="lab-ff-state" role="status">
                  <PixelLoader size={40} label={t('lab.board.creating')} />
                  <b>{t('lab.board.takingShape')}</b>
                  <small>{elapsed(take.createdAt, now)} · {t('lab.board.usually')}</small>
                </div>
              ) : (
                <div className="lab-ff-state" role="alert">
                  <b>{t('lab.board.didntWork')}</b>
                  <small>{takeErrorText(take, t, t('lab.board.tryAnother'))}</small>
                  <span className="lab-ff-state-actions">
                    <Button
                      type="button"
                      variant="elevated"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onRetry(take)}
                    >
                      <RefreshCw size={18} /> {t('lab.canvas.tryAgain')}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onRemove(take)}
                    >
                      <Trash2 size={18} /> {t('lab.canvas.remove')}
                    </Button>
                  </span>
                </div>
              )}
              <figcaption
                className="lab-ff-label"
                style={{ transform: `scale(${1 / view.scale})` }}
              >
                {take.starred && <Star size={11} fill="currentColor" />}
                <span className="lab-ff-label-text">
                  {(take.model && (modelLabel?.(take.model) || humanModel(take.model))) ||
                    t(`lab.canvas.op_${take.operation}`)}{' '}
                  #{card.number}
                </span>
                {take.status === 'failed' && <X size={11} />}
              </figcaption>
            </figure>
          )
        })}
      </div>

      {!cards.length && !scene && (
        <div
          className="lab-ff-empty-frame"
          style={{
            top: insets.top,
            right: insets.right,
            bottom: insets.bottom,
            left: insets.left,
          }}
        >
          {emptyContent ?? (
            <div className="lab-ff-empty">
              <PixelArtwork variant="orbit" seed="image-canvas" size={84} tone="muted" animated />
              <b>{t('lab.board.endless')}</b>
              <small>
                {signedIn
                  ? t('lab.board.describeBelow')
                  : t('lab.board.describeSignIn')}
              </small>
              <span className="lab-ff-starters">
                {starters.map((starter) => (
                  <Button
                    key={starter.label}
                    type="button"
                    variant="elevated"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onStarter(starter.prompt)}
                  >
                    {starter.label}
                  </Button>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
      {cards.length > 0 && (
        <GlassScope className="lab-ff-zoom-layer" style={{ right: insets.right + 14 }}>
        <GlassGroup
          className="lab-ff-zoom"
          onPointerDown={(e) => e.stopPropagation()}
          role="toolbar"
          aria-label={t('lab.board.zoom')}
        >
          <Button
            type="button"
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            aria-label={t('lab.board.zoomOut')}
            onClick={() => zoomCentre(1 / 1.25)}
          >
            <Minus size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            className="lab-ff-percent"
            aria-label={t('lab.board.fitSelection')}
            title={t('lab.board.fitSelection')}
            onClick={() => fitCard(selected)}
          >
            {percent}%
          </Button>
          <Button
            type="button"
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            aria-label={t('lab.board.zoomIn')}
            onClick={() => zoomCentre(1.25)}
          >
            <Plus size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            appearance="toolbar"
            controlSize="icon"
            aria-label={t('lab.board.showAllVersions')}
            title={t('lab.board.showAll')}
            onClick={fitAll}
            disabled={cards.length < 2}
          >
            <Maximize size={20} />
          </Button>
        </GlassGroup>
        </GlassScope>
      )}
    </div>
  )
}
