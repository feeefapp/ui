import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') window.addEventListener('popstate', emit)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function navigate(to: string) {
  const next = new URL(to, location.href)
  const samePage = next.pathname === location.pathname
  if (samePage && next.hash === location.hash) return
  history.pushState(null, '', to)
  emit()
  // A new page scrolls itself (App); on the same page only the fragment moves.
  if (samePage && next.hash)
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView())
}

/** Current pathname without a trailing slash (`/` stays `/`). */
export function usePath() {
  return useSyncExternalStore(
    subscribe,
    () => location.pathname.replace(/(.)\/$/, '$1'),
    () => '/'
  )
}

export function Link({
  to,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target
    )
      return
    event.preventDefault()
    navigate(to)
  }
  return <a {...props} href={to} onClick={handle} />
}
