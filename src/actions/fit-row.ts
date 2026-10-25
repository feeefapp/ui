'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { computeFitRow, type FitRowItem } from './layout'

/**
 * Rows of foldable controls (a segmented control that folds into its menu): every foldable control
 * in a row is fitted together, like `ActionsBar` spills actions, so they never fight over the same
 * space. The row is the nearest ancestor that doesn't hug its content (an app bar, a toolbar, a
 * stage). The free space is that row's width less its in-flow
 * children (and less the text they truncate, so a squeezed title counts at its full width); the
 * pure decision is `computeFitRow` (`layout.ts`).
 */
export interface FitRowMember {
  /** Lower priorities fold first; equal priorities fold from the end. */
  priority?: number
  /** The width its parent can give it, when the parent knows (a Dock's actions slot,
   * `useActionsWidth`): it then folds by that alone, never by its row's current width (a Dock
   * hugs its content, so a folded control would never see room to unfold). */
  room?: number
  /** Width unfolded and folded, or null while unmeasured (it stays as it is). */
  widths(): { full: number; compact: number } | null
  /** Folds or unfolds the control. */
  fold(folded: boolean): void
}

type Entry = { element: HTMLElement; member: RefObject<FitRowMember> }

const entries = new Set<Entry>()
const observed = new WeakSet<Element>()
let resize: ResizeObserver | null = null
let mutations: MutationObserver | null = null
let frame = 0

const isRow = (style: CSSStyleDeclaration) =>
  (style.display === 'flex' || style.display === 'inline-flex') &&
  style.flexDirection.startsWith('row') &&
  style.flexWrap === 'nowrap'

const px = (value: string) => Number.parseFloat(value) || 0

function inFlow(element: HTMLElement) {
  return [...element.children].filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) return false
    const style = getComputedStyle(child)
    return style.display !== 'none' && style.position !== 'absolute' && style.position !== 'fixed'
  })
}

/** Width in the row's own (unscaled) pixels. */
const widthIn = (scale: number) => (element: Element) => element.getBoundingClientRect().width / scale

function contentWidth(element: HTMLElement, style: CSSStyleDeclaration) {
  return element.clientWidth - px(style.paddingLeft) - px(style.paddingRight)
}

/** The keyword of `element`'s computed `width` ('auto', 'fit-content', …), or null for a length
 * (or when the browser can't tell: no `computedStyleMap`). */
function widthKeyword(element: HTMLElement): string | null | undefined {
  if (typeof element.computedStyleMap !== 'function') return undefined
  const value = element.computedStyleMap().get('width')
  return value && 'value' in value && typeof value.value === 'string' ? value.value : null
}

/** Whether `node`'s width comes from its content (it hugs it) rather than from its container:
 * then its width says nothing about the room the control has (folded, it shrinks with it). */
function hugs(node: HTMLElement, style: CSSStyleDeclaration): boolean {
  const keyword = widthKeyword(node)
  if (keyword === undefined) {
    // No typed computed styles (Firefox): it hugs when it is exactly as wide as its children.
    const scale = node.offsetWidth ? node.getBoundingClientRect().width / node.offsetWidth : 1
    const widths = inFlow(node).map(widthIn(scale))
    const used = isRow(style)
      ? widths.reduce((sum, width) => sum + width, 0) + px(style.columnGap) * Math.max(0, widths.length - 1)
      : Math.max(0, ...widths)
    return Math.abs(contentWidth(node, style) - used) <= 1
  }
  if (keyword === null) return false
  if (keyword === 'fit-content' || keyword === 'max-content' || keyword === 'min-content') return true
  // width: auto.
  if (style.position === 'absolute' || style.position === 'fixed' || style.float !== 'none') return true
  if (/^inline-|^table/.test(style.display)) return true
  const parent = node.parentElement
  if (!parent) return false
  const outer = getComputedStyle(parent)
  if (outer.display === 'flex' || outer.display === 'inline-flex') {
    if (outer.flexDirection.startsWith('row')) return parseFloat(style.flexGrow) === 0
    const align = style.alignSelf === 'auto' ? outer.alignItems : style.alignSelf
    return !/stretch|normal/.test(align)
  }
  if (outer.display === 'grid' || outer.display === 'inline-grid') {
    const justify = style.justifySelf === 'auto' ? outer.justifyItems : style.justifySelf
    return !/stretch|normal|legacy/.test(justify)
  }
  return false
}

/** The row a control is fitted in: the first ancestor whose width doesn't come from its content
 * (an app bar, a toolbar, a stage). Ancestors that hug it (a bubble, a glass scope around one, a
 * centred column) take their width from the control, so their width says nothing about its room. */
export function fitBoundary(element: HTMLElement): HTMLElement {
  let node = element.parentElement
  while (node && node !== node.ownerDocument.body) {
    if (!hugs(node, getComputedStyle(node))) return node
    node = node.parentElement
  }
  return node ?? element.ownerDocument.body
}

/** How much wider `element` would be without truncating its text (a squeezed title). */
function truncation(element: HTMLElement) {
  let most = 0
  const nodes = [element, ...element.querySelectorAll<HTMLElement>('*')].slice(0, 200)
  for (const node of nodes) {
    const over = node.scrollWidth - node.clientWidth
    if (over <= 1) continue
    const overflow = getComputedStyle(node).overflowX
    if (overflow === 'hidden' || overflow === 'clip') most = Math.max(most, over)
  }
  return most
}

function observe(element: Element) {
  if (observed.has(element)) return
  observed.add(element)
  resize?.observe(element)
}

function fitRow(boundary: HTMLElement, list: Entry[]) {
  const style = getComputedStyle(boundary)
  const scale = boundary.offsetWidth ? boundary.getBoundingClientRect().width / boundary.offsetWidth : 1
  const width = widthIn(scale)
  const room = contentWidth(boundary, style)
  const kids = inFlow(boundary)
  for (const child of boundary.children) observe(child)
  observe(boundary)
  mutations?.observe(boundary, { childList: true })
  const groups: { list: Entry[]; free: number }[] = []
  if (isRow(style)) {
    let used = kids.reduce((sum, kid) => sum + width(kid), 0) + px(style.columnGap) * Math.max(0, kids.length - 1)
    for (const kid of kids) if (!list.some((entry) => kid.contains(entry.element))) used += truncation(kid)
    groups.push({ list, free: room - used })
  } else {
    // Stacked children: each one that holds controls is a row of its own width.
    for (const kid of kids) {
      const inKid = list.filter((entry) => kid.contains(entry.element))
      if (inKid.length) groups.push({ list: inKid, free: room - width(kid) })
    }
  }
  for (const { list: group, free } of groups) {
    const items: FitRowItem[] = []
    for (const [index, entry] of group.entries()) {
      const widths = entry.member.current.widths()
      if (!widths) return
      items.push({ id: String(index), priority: entry.member.current.priority, ...widths, current: width(entry.element) })
    }
    const unfolded = computeFitRow(items, free)
    group.forEach((entry, index) => entry.member.current.fold(!unfolded.has(String(index))))
  }
}

/** How far past its room a control must be before it folds, and inside it before it unfolds. */
const HYSTERESIS = 1

function fitAll() {
  const rows = new Map<HTMLElement, Entry[]>()
  for (const entry of entries) {
    if (!entry.element.isConnected) continue
    observe(entry.element)
    const { room } = entry.member.current
    if (room !== undefined) {
      const widths = entry.member.current.widths()
      if (!widths) continue
      const folded = entry.element.hasAttribute('data-menu-folded')
      entry.member.current.fold(folded ? widths.full > room - HYSTERESIS : widths.full > room + HYSTERESIS)
      continue
    }
    const boundary = fitBoundary(entry.element)
    rows.set(boundary, [...(rows.get(boundary) ?? []), entry])
  }
  for (const [boundary, list] of rows) {
    list.sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    fitRow(boundary, list)
  }
}

/** Fits every foldable control again on the next frame (after a size or content change). */
export function scheduleFitRows() {
  if (frame || typeof requestAnimationFrame === 'undefined') return
  frame = requestAnimationFrame(() => {
    frame = 0
    fitAll()
  })
}

/**
 * Registers `element` (the control's root) as a foldable member of its row while `enabled`. The
 * first fit runs before paint, so a control that doesn't fit never shows unfolded. Call the returned
 * function after the control's own widths change (fonts, labels).
 */
export function useFitRow(element: RefObject<HTMLElement | null>, enabled: boolean, member: FitRowMember) {
  const live = useRef(member)
  live.current = member
  useLayoutEffect(() => {
    const node = element.current
    if (!enabled || !node || typeof ResizeObserver === 'undefined') return
    resize ??= new ResizeObserver(scheduleFitRows)
    mutations ??= new MutationObserver(scheduleFitRows)
    const entry: Entry = { element: node, member: live }
    entries.add(entry)
    fitAll()
    return () => {
      entries.delete(entry)
      scheduleFitRows()
    }
  }, [element, enabled])
}
