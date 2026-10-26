'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { Button } from '../primitives/button'
import { PixelTexture } from '../pixel-art'
import { revealScrollChild } from '../scroll'
import { useI18n } from '../i18n'
import './speech.css'
import { useSpeechReorder } from './reorder'

/**
 * One card in a speech script: a drag handle, a toolbar and the block's editor. Only the handle
 * drags; text editing, selection and viewport scrolling stay native. Blocks must be siblings.
 */
export function SpeechBlock({
  children,
  toolbar,
  index,
  count,
  onMove,
  seed,
  reorderDisabled = false,
}: {
  /** The block's editor, usually a multiline text field. */
  children: ReactNode
  /** Controls next to the drag handle (speaker, style, delete). Defaults to a "Speech block N" caption. */
  toolbar?: ReactNode
  /** Position of this block in the list, from 0. */
  index: number
  /** Number of blocks in the list. Reordering is off below 2. */
  count: number
  /** Stable id that picks the corner texture, usually the block id. */
  seed: string
  /** Disables the drag handle, for example while a generation runs. */
  reorderDisabled?: boolean
  /** Called once on drop (or arrow key) with the old and new index. */
  onMove: (from: number, to: number) => void
}) {
  const { t } = useI18n()
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
        <Button
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
        </Button>
        {toolbar ?? <span className="lab-speech-block-caption">{t('lab.speech.block', { index: index + 1 })}</span>}
      </div>
      <span id={hint} className="lab-sr-only">
        {t('lab.speech.hint')}
      </span>
      <span className="lab-sr-only" role="status">
        {announcement}
      </span>
      {children}
    </section>
  )
}
