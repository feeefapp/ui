import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../utils'
import { GlassContainer } from '../glass/container'
import { useGlassMember } from '../glass/member'
import './popover-surface.css'

export type PopoverSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Decorate the actual Radix/content host without adding a positioning wrapper. */
  asChild?: boolean
}

/** The popover's one glass shape: it fills the surface, behind its content. */
function PopoverGlassShape() {
  const element = React.useRef<HTMLDivElement | null>(null)
  const member = useGlassMember(element)
  return <div ref={element} className="lab-popover-glass__shape" data-glass-member={member ? '' : undefined} />
}

/**
 * The shared material for popovers (pickers, editors, settings panels, the model ladder): one glass
 * shape in the thick menu material (GlassContainer `material="menu"`: hairline, rim light and lens,
 * veiled enough to carry text over anything), drawn behind the content. Paint only; the owner
 * (usually Radix) keeps positioning and interaction. Menus (a trigger that opens a list of choices)
 * use `MenuSurface`.
 */
export const PopoverSurface = React.forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  ({ asChild = false, className, children, ...props }, ref) => {
    const glass = (
      <GlassContainer className="lab-popover-glass" material="menu" interactive={false} adaptive={false} aria-hidden="true">
        <PopoverGlassShape />
      </GlassContainer>
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
              {glass}
              {child.props.children}
            </>
          )}
        </Slot>
      )
    }
    return (
      <div {...shared}>
        {glass}
        {children}
      </div>
    )
  }
)
PopoverSurface.displayName = 'PopoverSurface'
