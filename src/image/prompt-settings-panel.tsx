'use client'

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { LabButton } from '../ui'
import { LabScrollArea } from '../scroll'
import { scrollContentReserve } from '../scroll/metrics'
import { useLabI18n } from '../i18n'
import './prompt-composer.css'

const EDGE_GAP = 12
const CONTENT_PADDING = 12

/** Settings hug their contents until the available popover height requires scrolling. */
export const PromptSettingsPanel = forwardRef<
  HTMLDivElement,
  {
    /** The settings controls. */
    children: ReactNode
    /** Called by the panel's close button. */
    onClose(): void
  }
>(function PromptSettingsPanel({ children, onClose }, ref) {
  const { t } = useLabI18n()
  const host = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => host.current!, [])
  useLayoutEffect(() => {
    const measure = () => {
      if (!host.current || !content.current || !header.current) return
      const style = getComputedStyle(host.current)
      const border =
        Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)
      const height =
        content.current.offsetHeight +
        scrollContentReserve(header.current.offsetHeight, EDGE_GAP, CONTENT_PADDING) +
        CONTENT_PADDING +
        border
      host.current.style.setProperty('--lab-pc-settings-height', `${height}px`)
    }
    const observer = new ResizeObserver(measure)
    if (content.current) observer.observe(content.current)
    if (header.current) observer.observe(header.current)
    measure()
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={host} className="lab-pc-panel lab-light-edge" data-lab-corners>
      <LabScrollArea
        label={t('lab.imgcomposer.outputSettings')}
        edgeGap={EDGE_GAP}
        contentPadding={CONTENT_PADDING}
        top={
          <div ref={header} className="lab-pc-panel-head">
            <strong>{t('lab.imgcomposer.outputSettings')}</strong>
            <LabButton
              variant="ghost"
              appearance="toolbar"
              controlSize="icon"
              aria-label={t('lab.imgcomposer.closeSettings')}
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </LabButton>
          </div>
        }
      >
        <div ref={content} className="lab-pc-panel-content">
          {children}
        </div>
      </LabScrollArea>
    </div>
  )
})
