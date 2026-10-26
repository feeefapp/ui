import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

/**
 * Re-renders whenever the theme on `<html>` changes (mode, palette, density, radius), so live
 * readings of computed styles follow the Customize panel.
 */
export function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    const observer = new MutationObserver(bump)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-lab-theme', 'data-lab-palette', 'data-lab-density', 'style', 'dir'],
    })
    const media = matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', bump)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', bump)
    }
  }, [])
  return version
}

/** Reads one computed property from an element after every theme change. */
export function useComputed<T extends HTMLElement>(property: string) {
  const ref = useRef<T>(null)
  const version = useThemeVersion()
  const [value, setValue] = useState('')
  useLayoutEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).getPropertyValue(property).trim())
  }, [version, property])
  return [ref, value] as const
}

/** Measures an element's rendered height in CSS pixels, live. */
export function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(Math.round(el.getBoundingClientRect().height)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, height] as const
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')

/** `rgb(…)`, `rgba(…)` or `color(srgb …)` → `#rrggbb` (+ alpha %). Anything else is returned as is. */
export function toHex(color: string) {
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(color)
  const srgb = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(color)
  let channels: number[] | null = null
  let alpha = 1
  const parseAlpha = (a?: string) =>
    a === undefined ? 1 : a.endsWith('%') ? Number.parseFloat(a) / 100 : Number.parseFloat(a)
  if (rgb) {
    channels = [rgb[1], rgb[2], rgb[3]].map(Number)
    alpha = parseAlpha(rgb[4])
  } else if (srgb) {
    channels = [srgb[1], srgb[2], srgb[3]].map((c) => Number(c) * 255)
    alpha = parseAlpha(srgb[4])
  }
  if (!channels) return color
  const hex = `#${channels.map(hex2).join('')}`
  return alpha < 1 ? `${hex} · ${Math.round(alpha * 100)}%` : hex
}

/** A live color chip painted with `var(<token>)`, labelled with the value it resolves to now. */
export function Swatch({ token, role }: { token: string; role?: ReactNode }) {
  const [ref, color] = useComputed<HTMLDivElement>('background-color')
  return (
    <figure className="fd-swatch">
      <div ref={ref} className="fd-swatch-chip" style={{ background: `var(${token})` }} />
      <figcaption>
        <code>{token}</code>
        <span className="fd-swatch-value">{toHex(color)}</span>
        {role && <span className="fd-swatch-role">{role}</span>}
      </figcaption>
    </figure>
  )
}

/** A small static chip for a color value (used in the palette comparison table). */
export function Chip({ color, label }: { color: string; label?: string }) {
  return (
    <span className="fd-chip">
      <span className="fd-chip-dot" style={{ background: color } as CSSProperties} aria-hidden="true" />
      <code>{label ?? color}</code>
    </span>
  )
}

/** Shows the live computed value of `property` on an element styled with `style`. */
export function LiveValue({
  style,
  property,
  className,
  children,
}: {
  style: CSSProperties
  property: string
  className?: string
  children?: ReactNode
}) {
  const [ref, value] = useComputed<HTMLDivElement>(property)
  return (
    <div className={className}>
      <div ref={ref} style={style} className="fd-live-shape">
        {children}
      </div>
      <output className="fd-live-value">{value}</output>
    </div>
  )
}

/** A token name that never wraps (first column of token tables). */
export function Tok({ children }: { children: string }) {
  return <code className="docs-inline-code fd-token-name">{children}</code>
}
