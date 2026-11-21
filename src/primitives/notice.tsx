import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Check, CircleAlert, Info, TriangleAlert } from 'lucide-react'
import './notice.css'

const icons = { info: Info, success: Check, warning: TriangleAlert, danger: CircleAlert }
export type NoticeProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
  /** Meaning of the accent and default icon. Defaults to info. */
  tone?: keyof typeof icons
  /** Optional short heading above the body. */
  title?: ReactNode
  /** Decorative icon override. Pass null to omit it. */
  icon?: ReactNode
  /** Message, guidance, or actions displayed in the notice. */
  children: ReactNode
}

/** Inline feedback with an inset accent stripe. Set role="status" or "alert" for live updates. */
export function Notice({ tone = 'info', title, icon, children, className, ...props }: NoticeProps) {
  const Icon = icons[tone]
  const glyph = icon === null ? null : <span className="lab-notice-icon" aria-hidden="true">{icon ?? <Icon size={16} />}</span>
  return (
    <div {...props} className={['lab-notice', className].filter(Boolean).join(' ')} data-tone={tone}>
      {title != null ? <div className="lab-notice-heading">{glyph}<strong>{title}</strong></div> : glyph}
      <div className="lab-notice-body">{children}</div>
    </div>
  )
}
