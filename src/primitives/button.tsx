import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils'
import { PixelTexture, PixelLoader } from '../pixel-art'
import type { ControlVariant } from './control-variants'
import { legacyButtonHasTexture } from './button-compat'
import { glassGlowRadius } from '../glass/press'
import '../system.css'
import './control-variants.css'

/** Material common-button types, rendered with Feeef Lab's visual system. */
export type ButtonVariant = ControlVariant | 'destructive' | 'primary' | 'secondary' | 'ghost'
/**
 * Height. `small` 30px, `regular` 36px, `large` 52px at comfortable density (the iOS control sizes;
 * ThemeConfig `metrics.controlHeight` changes them), `inline` fits running text, `icon` is square.
 */
export type ControlSize = 'small' | 'regular' | 'large' | 'inline' | 'icon'
export type ButtonAppearance = 'default' | 'toolbar'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Render the single child (an `<a>` or router link) with button styling instead of a `<button>`. */
  asChild?: boolean
  /** Compatibility sizing for older consumers; new callers use controlSize. */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Shows a pixel loader, sets `aria-busy` and blocks activation until it clears. */
  loading?: boolean
  /** Emphasis. Use filled for primary actions. The primary spelling is deprecated. */
  variant?: ButtonVariant
  /** Height: `small` 30px, `regular` 36px, `large` 52px, `inline` fits running text; `icon` is square. On touch screens every size keeps its look and gains an invisible hit area of at least 44 × 44px. */
  controlSize?: ControlSize
  /** Square icon geometry when `controlSize` is `icon`: `small`, `regular` or `large` (the button heights), or `inline`. */
  iconSize?: 'small' | 'regular' | 'large' | 'inline'
  /** Toolbar controls share their enclosing material instead of adding another raised surface. */
  appearance?: ButtonAppearance
}

/** Variants whose painted shape grows a little while pressed (CONTENT_PRESS_SCALE). */
const CONTENT_PRESS = new Set(['filled', 'tonal', 'elevated', 'outlined', 'destructive', 'secondary'])

/**
 * Puts the touch glow of a pressed glass button under the pointer: its centre in the button's own
 * pixels and how far it spreads (`glassGlowRadius`). The press itself is CSS (`:active`, system.css).
 */
function placePressGlow(event: React.PointerEvent<HTMLElement>) {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1
  el.style.setProperty('--lab-press-x', `${(event.clientX - rect.left) / scale}px`)
  el.style.setProperty('--lab-press-y', `${(event.clientY - rect.top) / scale}px`)
  el.style.setProperty('--lab-press-glow-to', `${glassGlowRadius(el.offsetWidth)}px`)
}

/**
 * A native `<button>` (or, with `asChild`, your link) painted by one of the emphasis variants. A
 * press answers like iOS: toolbar (glass) buttons swell and glow under the finger, filled, tonal,
 * elevated, outlined and destructive buttons grow a little; inside a glass bubble the bubble answers
 * instead. Reduced motion turns it off.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      loading,
      variant,
      controlSize = 'regular',
      iconSize = 'regular',
      appearance = 'default',
      type = 'button',
      size,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = variant === 'primary' ? 'filled' : variant
    const filled =
      variant === 'primary' ||
      variant === 'filled' ||
      (!variant && legacyButtonHasTexture(className))
    // Filled (primary) and destructive buttons are iOS 27's prominent glass (control-variants.css).
    const prominent = resolvedVariant === 'filled' || variant === 'destructive'
    const disabled = Boolean(props.disabled || loading)
    const press = !variant
      ? undefined
      : appearance === 'toolbar'
        ? 'glass'
        : CONTENT_PRESS.has(variant)
          ? 'content'
          : undefined
    const Component = asChild ? Slot : 'button'
    const nativeButton = !asChild || (React.isValidElement(children) && children.type === 'button')
    // Slot normally invokes child handlers first. Guard the actual child during
    // capture so a disabled link cannot navigate or run either owner's action.
    const stopActivation = (event: React.SyntheticEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const stopActivationKey = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') stopActivation(event)
    }
    let content = children
    if (asChild && disabled) {
      const child = React.Children.only(children) as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { href?: string }
      >
      content = React.cloneElement(child, {
        'href': undefined,
        'tabIndex': -1,
        'aria-disabled': true,
        'onClickCapture': stopActivation,
        'onAuxClickCapture': stopActivation,
        'onKeyDownCapture': (event) => {
          if (event.key === 'Enter' || event.key === ' ') stopActivation(event)
          else child.props.onKeyDownCapture?.(event)
        },
      })
    }
    return (
      <Component
        ref={ref}
        type={nativeButton ? type : undefined}
        className={cn('lab-control', className)}
        {...props}
        data-legacy-size={!variant ? size : undefined}
        data-variant={resolvedVariant}
        data-surface-variant={
          resolvedVariant &&
          ['filled', 'tonal', 'elevated', 'outlined', 'text'].includes(resolvedVariant)
            ? resolvedVariant
            : undefined
        }
        data-control-size={variant ? controlSize : undefined}
        data-icon-size={controlSize === 'icon' ? iconSize : undefined}
        data-control-appearance={variant ? appearance : undefined}
        data-loading={loading || undefined}
        data-press={press}
        data-prominent={prominent || undefined}
        onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
          if (press === 'glass') placePressGlow(event)
          props.onPointerDown?.(event)
        }}
        disabled={nativeButton ? disabled : undefined}
        onClickCapture={disabled ? stopActivation : props.onClickCapture}
        onAuxClickCapture={disabled ? stopActivation : props.onAuxClickCapture}
        onKeyDownCapture={disabled ? stopActivationKey : props.onKeyDownCapture}
        aria-disabled={disabled || props['aria-disabled']}
        data-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        data-lab-corners
      >
        {asChild ? (
          content
        ) : (
          <>
            {filled && <PixelTexture variant="corner" seed={className || 'control'} />}
            {loading && <PixelLoader size={16} decorative />}
            {loading && controlSize === 'icon' ? null : withLabels(loading ? withoutLeadingIcon(children) : children)}
          </>
        )}
      </Component>
    )
  }
)

Button.displayName = 'Button'

/**
 * While loading, the loader takes the leading icon's place: the first child goes when it is an
 * icon (an svg, a component such as a lucide icon, or an `aria-hidden` wrapper) before more
 * content, never a label. The Flutter Button does the same.
 */
function withoutLeadingIcon(children: React.ReactNode) {
  const [first, ...rest] = React.Children.toArray(children)
  const icon =
    rest.length > 0 &&
    React.isValidElement<{ 'aria-hidden'?: unknown }>(first) &&
    first.type !== React.Fragment &&
    (first.type === 'svg' || typeof first.type !== 'string' || Boolean(first.props['aria-hidden']))
  return icon ? rest : children
}

/**
 * Wraps each run of text children (strings and numbers, like `Save {count}`) in one
 * `.lab-control-label`, so the label can end in an ellipsis when the button's width is bounded.
 */
function withLabels(children: React.ReactNode) {
  const out: React.ReactNode[] = []
  let run: Array<string | number> = []
  const flush = () => {
    if (run.length)
      out.push(
        <span key={`label-${out.length}`} className="lab-control-label">
          {run}
        </span>
      )
    run = []
  }
  // toArray keys every element, so the returned list never warns.
  for (const child of React.Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number') run.push(child)
    else {
      flush()
      out.push(child)
    }
  }
  flush()
  return out
}

export type IconButtonProps = Omit<ButtonProps, 'controlSize' | 'iconSize' | 'size'> & {
  /** Required: the icon is the button's only content, so this is its accessible name. */
  'aria-label': string
  /** Square size: `small` 30px, `regular` 36px, `large` 52px, `inline` for text runs. */
  'controlSize'?: 'small' | 'regular' | 'large' | 'inline'
}

/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ controlSize = 'regular', variant = 'text', ...props }, ref) => (
    <Button {...props} ref={ref} variant={variant} controlSize="icon" iconSize={controlSize} />
  )
)
IconButton.displayName = 'IconButton'
