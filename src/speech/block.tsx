'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { LabButton } from '../primitives/button'
import { PixelTexture } from '../pixel-art'
import { revealScrollChild } from '../scroll'
import { useLabI18n } from '../i18n'
import './speech.css'
import { useSpeechReorder } from './reorder'

/** Only the handle drags. Text editing, selection and viewport scrolling stay native. */
export function LabSpeechBlock({
  children,
  toolbar,
  index,
  count,
  onMove,
  seed,
  reorderDisabled = false,
}: {
  children: ReactNode
  toolbar?: ReactNode
  index: number
  count: number
  seed: string
  reorderDisabled?: boolean
  onMove: (from: number, to: number) => void
}) {
  const { t } = useLabI18n()
  const root = useRef<HTMLElement>(null)
  const [announcement, announce] = useState('')
  const hint = useId()
  const reorder = useSpeechReorder({ root, index, count, onMove, announce })
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(typingTimer.current), [])
  useLayoutEffect(() => {
    const focused = root.current?.ownerDocument.activeElement
    if (
      !root.current?.parentElement?.dataset.speechReordering &&
      focused instanceof HTMLElement &&
      root.current?.contains(focused)
    )
      revealScrollChild(root.current.closest<HTMLElement>('.lab-scroll-viewport'), focused, {
        inline: false,
      })
  }, [index])
  return (
    <section
      ref={root}
      className="lab-paragraph lab-voice-paragraph lab-light-edge"
      data-speech-block
      data-lab-corners
      data-typing={typing || undefined}
      onInput={() => {
        setTyping(true)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(false), 420)
      }}
      aria-label={t('lab.speech.block', { index: index + 1 })}
    >
      <div className="lab-speech-block-texture">
        <PixelTexture variant="corner" density="sparse" seed={seed} />
      </div>
      <div className="lab-speech-block-toolbar">
        <LabButton
          variant="ghost"
          appearance="toolbar"
          controlSize="icon"
          className="lab-speech-drag"
          aria-label={t('lab.speech.reorder', { index: index + 1 })}
          aria-describedby={hint}
          disabled={count < 2 || reorderDisabled}
          {...reorder}
        >
          <GripVertical size={20} />
        </LabButton>
        {toolbar ?? <span className="lab-speech-block-caption">{t('lab.speech.block', { index: index + 1 })}</span>}
      </div>
      <span id={hint} className="sr-only">
        {t('lab.speech.hint')}
      </span>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      {children}
    </section>
  )
}
