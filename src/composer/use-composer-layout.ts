'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion, reducedMotionQuery } from '../physics/motion-value'

type Box = { x: number; y: number; width: number }
type Snapshot = {
  width: number
  height: number
  fieldHeight: number
  children: Map<HTMLElement, Box>
}

/** Animate the shell and layout slots; the editable node stays mounted and untransformed. */
export function useComposerLayout(prompt: string, contentRevision?: unknown) {
  const [expanded, setExpanded] = useState(false)
  const measureExpansion = useRef(() => {})
  const textMeasure = useRef<CanvasRenderingContext2D | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const layout = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const previous = useRef<Snapshot | null>(null)
  const animations = useRef<Animation[]>([])
  const frame = useRef(0)
  const serial = useRef(0)
  const update = useRef(() => {})

  // Measure the compact row, even while expanded, so resize and deletion can collapse it.
  useLayoutEffect(() => {
    measureExpansion.current = () => {
      const grid = layout.current
      const textarea = field.current
      if (!grid || !textarea) return
      const style = getComputedStyle(textarea)
      const slots = Array.from(grid.querySelectorAll<HTMLElement>('.lab-pc-slot'))
      const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0
      const available =
        grid.clientWidth -
        slots.reduce((sum, slot) => sum + slot.getBoundingClientRect().width, 0) -
        slots.length * gap -
        (Number.parseFloat(style.paddingLeft) || 0) -
        (Number.parseFloat(style.paddingRight) || 0)
      textMeasure.current ??= document.createElement('canvas').getContext('2d')
      const context = textMeasure.current
      if (!context) {
        setExpanded(prompt.includes('\n'))
        return
      }
      context.font = style.font
      const spacing = Number.parseFloat(style.letterSpacing) || 0
      const width =
        context.measureText(prompt).width + Math.max(0, Array.from(prompt).length - 1) * spacing
      const minimum = context.measureText('MMMMMMMM').width
      setExpanded(available < minimum || prompt.includes('\n') || (!!prompt && width > Math.max(0, available) + 0.5))
    }
    measureExpansion.current()
  }, [prompt, contentRevision])

  useLayoutEffect(() => {
    const shell = card.current
    const grid = layout.current
    const textarea = field.current
    if (!shell || !grid || !textarea) return
    const slots = Array.from(grid.children).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches('.lab-pc-slot, .lab-pc-field')
    )
    const read = (): Snapshot => {
      const parent = shell.getBoundingClientRect()
      return {
        width: parent.width,
        height: parent.height,
        fieldHeight: textarea.getBoundingClientRect().height,
        children: new Map(
          slots.map((node) => {
            const rect = node.getBoundingClientRect()
            return [
              node,
              { x: rect.left - parent.left, y: rect.top - parent.top, width: rect.width },
            ]
          })
        ),
      }
    }
    update.current = () => {
      const run = ++serial.current
      const before = previous.current
      cancelAnimationFrame(frame.current)
      animations.current.forEach((animation) => animation.cancel())
      animations.current = []
      grid.style.gridTemplateRows = ''
      const scrollTop = textarea.scrollTop
      textarea.style.height = '0px'
      const metrics = getComputedStyle(textarea)
      const minimum = Number.parseFloat(metrics.minHeight) || 40
      const maximum = Number.parseFloat(metrics.maxHeight) || 168
      const border =
        metrics.boxSizing === 'border-box'
          ? (Number.parseFloat(metrics.borderTopWidth) || 0) +
            (Number.parseFloat(metrics.borderBottomWidth) || 0)
          : 0
      const natural = textarea.scrollHeight + border
      textarea.style.height = `${Math.min(maximum, Math.max(minimum, natural))}px`
      // Browser wrapping is authoritative when canvas/font metrics disagree.
      if (!expanded && prompt && natural > minimum + 1) setExpanded(true)
      textarea.scrollTop = scrollTop
      shell.style.height = 'auto'
      const after = read()
      shell.style.height = `${after.height}px`
      previous.current = after
      if (
        !before ||
        // A resized parent invalidates the old horizontal coordinates. Replaying
        // them briefly sends actions outside the new shell on narrow screens.
        Math.abs(before.width - after.width) > 0.5 ||
        prefersReducedMotion() ||
        !shell.animate
      )
        return

      const timing: KeyframeAnimationOptions = { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
      const play = (node: HTMLElement, keyframes: Keyframe[]) => {
        animations.current.push(node.animate(keyframes, timing))
      }
      const heightChanged = Math.abs(before.height - after.height) > 0.5
      const moved = slots.some((node) => {
        const from = before.children.get(node)
        const to = after.children.get(node)!
        return (
          from &&
          (Math.abs(from.x - to.x) > 0.5 ||
            Math.abs(from.y - to.y) > 0.5 ||
            Math.abs(from.width - to.width) > 0.5)
        )
      })
      if (!heightChanged && !moved) return

      // Growing text takes its natural geometry immediately. Morphing an editable
      // width/height rewraps and clips its content mid-transition, even when the
      // final measurement is correct. Only collapse unused shell space.
      if (heightChanged && after.height < before.height)
        play(shell, [{ height: `${before.height}px` }, { height: `${after.height}px` }])
      for (const node of slots) {
        if (node.classList.contains('lab-pc-field')) continue
        const from = before.children.get(node)
        const to = after.children.get(node)!
        if (!from || (Math.abs(from.x - to.x) <= 0.5 && Math.abs(from.y - to.y) <= 0.5)) continue
        // Enter at the final row instead of sweeping controls through the prompt.
        play(node, [
          { opacity: 0.5, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ])
      }
      // Keep the visible position for interrupted transitions, including rapid typing/reversal.
      const sample = () => {
        previous.current = read()
        frame.current = requestAnimationFrame(sample)
      }
      sample()
      void Promise.all(
        animations.current.map((animation) => animation.finished.catch(() => {}))
      ).then(() => {
        if (run !== serial.current) return
        cancelAnimationFrame(frame.current)
        animations.current = []
        grid.style.gridTemplateRows = ''
        previous.current = read()
      })
    }
    update.current()
  }, [prompt, expanded, contentRevision])

  useLayoutEffect(() => {
    const grid = layout.current
    if (!grid) return
    let width = grid.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const next = grid.getBoundingClientRect().width
      if (Math.abs(next - width) <= 0.5) return
      width = next
      measureExpansion.current()
      update.current()
    })
    observer.observe(grid)
    const reduced = reducedMotionQuery()
    const finish = () => {
      if (reduced.matches) animations.current.forEach((animation) => animation.finish())
    }
    reduced.addEventListener('change', finish)
    let mounted = true
    const fontsLoaded = () => {
      if (mounted) {
        measureExpansion.current()
        update.current()
      }
    }
    document.fonts.addEventListener('loadingdone', fontsLoaded)
    void document.fonts.ready.then(fontsLoaded)
    return () => {
      mounted = false
      ++serial.current
      observer.disconnect()
      reduced.removeEventListener('change', finish)
      document.fonts.removeEventListener('loadingdone', fontsLoaded)
      cancelAnimationFrame(frame.current)
      animations.current.forEach((animation) => animation.cancel())
    }
  }, [])

  return { card, layout, field, expanded }
}
