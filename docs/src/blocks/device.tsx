import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { FloatingBoundary } from '@feeef.dev/ui/menu'
import '../styles/device.css'

const SIZES = {
  phone: { width: 390, height: 760 },
  tablet: { width: 820, height: 640 },
  desktop: { width: 1180, height: 700 },
} as const

/**
 * A pretend screen for container demos. It lays its content out at a real phone, tablet or
 * desktop size (so containers measure true widths) and scales the whole screen down to fit the
 * docs column. Containers inside convert finger movement for the scale themselves. The screen is a
 * FloatingBoundary: menus, popovers and tooltips opened inside it stay inside it.
 */
export function Device({
  kind = 'phone',
  label,
  height,
  children,
}: {
  kind?: keyof typeof SIZES
  label: string
  /** Overrides the screen height in CSS px. */
  height?: number
  /** Content, or a function of the screen element (a container for sheets rendered inside it). */
  children: ReactNode | ((screen: HTMLElement | null) => ReactNode)
}) {
  const [screen, setScreen] = useState<HTMLElement | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const size = { ...SIZES[kind], ...(height ? { height } : {}) }
  const scale = available ? Math.min(1, available / size.width) : 1
  return (
    <div ref={ref} className="docs-device" data-kind={kind} style={{ height: Math.round(size.height * scale) }}>
      <FloatingBoundary
        ref={setScreen}
        className="docs-device-screen"
        role="group"
        aria-label={label}
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`,
          insetInlineStart: Math.max(0, (available - size.width * scale) / 2),
        }}
      >
        {typeof children === 'function' ? children(screen) : children}
      </FloatingBoundary>
    </div>
  )
}
