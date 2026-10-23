'use client'

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** The default shell gap G in px, before a theme's `metrics.shellGap` resolves. */
export const SHELL_GAP_DEFAULT = 8

/**
 * `--lab-shell-gap` (the one chrome gap G) in px as `element` resolves it (the document root
 * without one); themes change it through `metrics.shellGap`. Re-read after every render, so a
 * theme change that re-renders picks it up.
 */
export function useShellGap(element?: RefObject<HTMLElement | null>) {
  const [gap, setGap] = useState(SHELL_GAP_DEFAULT)
  useIsomorphicLayoutEffect(() => {
    const node = element ? element.current : document.documentElement
    if (!node) return
    const value = Number.parseFloat(getComputedStyle(node).getPropertyValue('--lab-shell-gap'))
    if (Number.isFinite(value) && value >= 0) setGap(value)
  })
  return gap
}
