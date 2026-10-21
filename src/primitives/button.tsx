import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils'
import { PixelTexture, PixelLoader } from '../pixel-art'
import type { LabControlVariant } from './control-variants'
import { legacyButtonHasTexture } from './button-compat'
import '../system.css'
import './control-variants.css'

/** Material common-button types, rendered with Feeef Lab's visual system. */
export type LabButtonVariant = LabControlVariant | 'destructive' | 'primary' | 'secondary' | 'ghost'
export type LabControlSize = 'regular' | 'compact' | 'inline' | 'icon'
export type LabButtonAppearance = 'default' | 'toolbar'

export type LabButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  /** Compatibility sizing for older consumers; new callers use controlSize. */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  /** Use filled for primary actions. The primary spelling is deprecated. */
  variant?: LabButtonVariant
  controlSize?: LabControlSize
  /** Square icon geometry; compact retains a 44px minimum on coarse pointers. */
  iconSize?: 'regular' | 'compact' | 'inline'
  /** Toolbar controls share their enclosing material instead of adding another raised surface. */
  appearance?: LabButtonAppearance
}

export const LabButton = React.forwardRef<HTMLButtonElement, LabButtonProps>(
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
    const disabled = Boolean(props.disabled || loading)
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
            {loading && controlSize === 'icon' ? null : children}
          </>
        )}
      </Component>
    )
  }
)

LabButton.displayName = 'LabButton'

export type LabIconButtonProps = Omit<LabButtonProps, 'controlSize' | 'iconSize' | 'size'> & {
  'aria-label': string
  'controlSize'?: 'regular' | 'compact' | 'inline'
}

/** Icon-only actions reuse the button emphasis, loading and surface engines. */
export const LabIconButton = React.forwardRef<HTMLButtonElement, LabIconButtonProps>(
  ({ controlSize = 'regular', variant = 'text', ...props }, ref) => (
    <LabButton {...props} ref={ref} variant={variant} controlSize="icon" iconSize={controlSize} />
  )
)
LabIconButton.displayName = 'LabIconButton'
