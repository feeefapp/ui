import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils'
import { PixelTexture } from '../pixel-art'
import './popover-surface.css'

export type PopoverSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Decorate the actual Radix/content host without adding a positioning wrapper. */
  asChild?: boolean
  /** Seed for the decorative pixel grain, so neighbouring surfaces don't look identical. */
  seed?: string
}

/**
 * The shared opaque material for menus and popovers: surface, border, group corners and a faint
 * animated pixel grain. Paint only; the owner (usually Radix) keeps positioning and interaction.
 */
export const PopoverSurface = React.forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  ({ asChild = false, seed = 'lab-popover', className, children, ...props }, ref) => {
    const decoration = (
      <div className="lab-popover-decoration" aria-hidden="true">
        <PixelTexture variant="grain" density="sparse" seed={seed} animated />
      </div>
    )
    const shared = {
      ...props,
      ref,
      'className': cn('lab-popover-surface', className),
      'data-lab-corners': true,
    }
    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        children?: React.ReactNode
      }>
      return (
        <Slot {...shared}>
          {React.cloneElement(
            child,
            undefined,
            <>
              {decoration}
              {child.props.children}
            </>
          )}
        </Slot>
      )
    }
    return (
      <div {...shared}>
        {decoration}
        {children}
      </div>
    )
  }
)
PopoverSurface.displayName = 'PopoverSurface'
