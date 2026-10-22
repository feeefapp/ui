'use client'

import { LabComposerCard, LabComposerHint as AnimatedHint } from '../composer/composer'
import { LabPopoverSurface } from '../ui'
import { LabButton, LabRawInput } from '../ui'
import { useLabI18n } from '../i18n'
import { useLabServices } from '../services'
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  ArrowUp,
  Brush,
  ClipboardPaste,
  History,
  LayoutTemplate,
  Lightbulb,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'
import { useComposerLayout } from '../composer/composer'
import { PromptSettingsPanel } from './prompt-settings-panel'
import './prompt-composer.css'

export type ComposerReference = { id: string; url: string; name: string }
export type ComposerTemplate = { id: string; name: string; prompt: string; description?: string }
export type RecentImage = { id: string; thumbUrl: string; prompt: string }

/**
 * The image studio composer, after marchant `image_gen_view` `_buildComposer`: an attachment
 * row above a glass card that is one compact line until you type, then grows upward with its
 * controls on a second row. Model ladder, AI enhance, output settings and send are icon controls.
 */
export function PromptComposer({
  prompt,
  onPrompt,
  placeholder,
  maxLength,
  references,
  referenceLimit,
  onAddFiles,
  onRemoveReference,
  recent,
  onUseRecent,
  onEditPhoto,
  templates,
  templatesLabel,
  onTemplate,
  mode,
  templateName,
  onClearTemplate,
  onBrowseTemplates,
  ladder,
  settings,
  settingsLabel,
  settingsDisabled,
  onSettings,
  settingsActive,
  referenceNoun,
  wandLabel,
  enhancing,
  onEnhance,
  onSubmit,
  submitDisabled,
  submitting,
  submitLabel,
  caption,
  above,
  onKeyDown,
}: {
  /** The prompt text (controlled). */
  prompt: string
  /** Called with the new text on every edit. */
  onPrompt(value: string): void
  /** Animated hint shown while the prompt is empty. */
  placeholder: string
  /** Maximum prompt length in characters. */
  maxLength: number
  /** Attached reference images, shown as chips above the card. The first is the main image. */
  references: ComposerReference[]
  /** `null` when the selected model takes no image input. */
  referenceLimit: { max: number; formats: string[] } | null
  /** Called with files from upload, paste, clipboard or drop. The owner validates type and count. */
  onAddFiles(files: File[]): void
  /** Called when a reference chip is removed. */
  onRemoveReference(id: string): void
  /** The user's earlier images for the "From your images" submenu (first 12). Empty hides it. */
  recent: RecentImage[]
  /** Called with the id of a recent image picked as a reference. */
  onUseRecent(id: string): void
  /** Called with the photo chosen from "Edit a photo…". */
  onEditPhoto(file: File): void
  /** Prompt ideas for the + menu (first 10). Empty hides the submenu. */
  templates: ComposerTemplate[]
  /** Label of the ideas submenu. Defaults to the localized "Start from an idea". */
  templatesLabel?: string
  /** Called with the idea the user picked. */
  onTemplate(template: ComposerTemplate): void
  /** Image makes one picture; Poster builds a tall landing-page image from the brief. */
  mode: 'image' | 'poster'
  /** The poster template in use, shown as a chip above the card. */
  templateName?: string | null
  onClearTemplate?(): void
  /** Replaces the template submenu with one entry that opens a full template browser. */
  onBrowseTemplates?(): void
  /** Renders the model control for a slot, usually a ModelLadder with that variant. */
  ladder(variant: 'icon' | 'chip'): ReactNode
  /** Content of the output settings popover (shape, resolution, format). */
  settings: ReactNode
  /** Short summary of the current settings, used in the settings button's label. */
  settingsLabel: string
  /** Disables the settings button and closes its popover. */
  settingsDisabled?: boolean
  /** When set, the settings button toggles a panel the page owns instead of a popover. */
  onSettings?(): void
  /** Pressed state of the settings button when `onSettings` is set. */
  settingsActive?: boolean
  /** What attached images are called in the + menu ("References", "Product photos"). */
  referenceNoun?: string
  /** Overrides the wand's label (posters suggest details instead of rewriting the prompt). */
  wandLabel?: string
  /** The AI wand request in flight, or `''` when idle. Shows a loader on the wand. */
  enhancing: '' | 'enhance' | 'ideas'
  /** Improve the prompt, or suggest ideas when it is empty. */
  onEnhance?(mode: 'enhance' | 'ideas'): void
  /** Called by the send button and by Enter (Shift+Enter breaks the line). */
  onSubmit(): void
  /** Disables sending. */
  submitDisabled: boolean
  /** A generation is being sent: the send button shows a loader and is disabled. */
  submitting: boolean
  /** Accessible name of the send button, such as "Create image". */
  submitLabel: string
  /** Small text under the card, such as price or allowance. */
  caption: ReactNode
  /** Suggestion cards shown right above the card (AI proposals, conflicts). */
  above?: ReactNode
  /** Runs before the built-in Enter handling; call `preventDefault()` to skip it. */
  onKeyDown?(event: KeyboardEvent): void
}) {
  const { t } = useLabI18n()
  const resolvedTemplatesLabel = templatesLabel ?? t('lab.imgcomposer.startFromIdea')
  const resolvedReferenceNoun = referenceNoun ?? t('lab.imgcomposer.references')
  const { readClipboard } = useLabServices()
  const upload = useRef<HTMLInputElement>(null)
  const photo = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLElement>(null)
  const settingsPanel = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  // Focus changes emphasis; text overflow or an explicit newline changes layout.
  const { card, layout, field, expanded } = useComposerLayout(prompt)
  const updatePortal = () => setPortalContainer(root.current?.closest('dialog') ?? null)
  useEffect(() => {
    if (settingsDisabled) setSettingsOpen(false)
  }, [settingsDisabled])

  const pasteFiles = (event: ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    event.preventDefault()
    onAddFiles(files)
  }
  const pasteFromClipboard = async () => {
    try {
      const items = await readClipboard()
      const files: File[] = []
      for (const item of items)
        for (const type of item.types)
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            files.push(new File([blob], `pasted.${type.split('/')[1]}`, { type }))
          }
      if (files.length) onAddFiles(files)
    } catch {
      field.current?.focus()
    }
  }
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    // Enter sends, Shift+Enter breaks the line, like a chat.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!submitDisabled && !submitting) onSubmit()
    }
  }
  const canReference = !!referenceLimit
  const full = !!referenceLimit && references.length >= referenceLimit.max
  const wandMode = prompt.trim() ? 'enhance' : 'ideas'

  const wand = onEnhance ? (
    <LabButton
      type="button"
      variant="ghost"
      appearance="toolbar"
      controlSize="icon"
      className="lab-pc-icon lab-pc-wand"
      aria-label={
        wandLabel ??
        (wandMode === 'enhance'
          ? t('lab.imgcomposer.improvePrompt')
          : t('lab.imgcomposer.suggestIdeas'))
      }
      title={
        wandLabel ??
        (wandMode === 'enhance'
          ? t('lab.imgcomposer.improvePromptAi')
          : t('lab.imgcomposer.suggestThree'))
      }
      disabled={!!enhancing}
      loading={!!enhancing}
      onClick={() => onEnhance?.(wandMode)}
    >
      {!enhancing &&
        (wandMode === 'enhance' ? (
          <WandSparkles size={18} strokeWidth={1.6} />
        ) : (
          <Lightbulb size={18} strokeWidth={1.6} />
        ))}
    </LabButton>
  ) : null
  const settingsControl = (chip: boolean) =>
    onSettings ? (
      <LabButton
        type="button"
        variant={chip ? 'elevated' : 'ghost'}
        appearance={chip ? 'default' : 'toolbar'}
        controlSize={chip ? 'regular' : 'icon'}
        className={chip ? 'lab-pc-chip' : 'lab-pc-icon'}
        aria-label={t('lab.imgcomposer.settingsWith', { label: settingsLabel })}
        title={settingsLabel}
        aria-pressed={!!settingsActive}
        disabled={settingsDisabled}
        onClick={onSettings}
      >
        <SlidersHorizontal size={chip ? 15 : 18} strokeWidth={1.6} />
        {chip && <span>{settingsLabel}</span>}
      </LabButton>
    ) : (
      <Popover.Root
        open={settingsOpen}
        onOpenChange={(next) => {
          if (next) updatePortal()
          setSettingsOpen(next)
        }}
      >
        <Popover.Trigger asChild disabled={settingsDisabled}>
          <LabButton
            type="button"
            variant={chip ? 'elevated' : 'ghost'}
            appearance={chip ? 'default' : 'toolbar'}
            controlSize={chip ? 'regular' : 'icon'}
            className={chip ? 'lab-pc-chip' : 'lab-pc-icon'}
            aria-label={t('lab.imgcomposer.outputWith', { label: settingsLabel })}
            title={t('lab.imgcomposer.shapeResolutionFormat')}
          >
            <SlidersHorizontal size={chip ? 15 : 18} strokeWidth={1.6} />
            {chip && <span>{settingsLabel}</span>}
          </LabButton>
        </Popover.Trigger>
        <Popover.Portal container={portalContainer}>
          <LabPopoverSurface asChild>
            <Popover.Content
              className="lab-pc-popover"
              side="top"
              align={chip ? 'start' : 'end'}
              sideOffset={8}
              collisionPadding={12}
              collisionBoundary={portalContainer ?? undefined}
              aria-label={t('lab.imgcomposer.outputSettings')}
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                requestAnimationFrame(() => {
                  const target =
                    settingsPanel.current?.querySelector<HTMLElement>(
                      '.lab-scroll-content :is(input, button, textarea, [tabindex="0"])'
                    ) ?? settingsPanel.current?.querySelector<HTMLElement>('button')
                  target?.focus({ preventScroll: true })
                })
              }}
            >
              <PromptSettingsPanel ref={settingsPanel} onClose={() => setSettingsOpen(false)}>
                {settings}
              </PromptSettingsPanel>
            </Popover.Content>
          </LabPopoverSurface>
        </Popover.Portal>
      </Popover.Root>
    )
  const send = (
    <LabButton
      type="button"
      variant="filled"
      controlSize="icon"
      className="lab-pc-send"
      aria-label={submitLabel}
      title={submitLabel}
      disabled={submitDisabled || submitting}
      loading={submitting}
      onClick={onSubmit}
    >
      {!submitting && <ArrowUp size={20} strokeWidth={2} aria-hidden="true" />}
    </LabButton>
  )
  const input = (
    <div className="lab-pc-field">
      {!prompt && <AnimatedHint text={placeholder} />}
      <LabRawInput
        className="lab-textarea"
        multiline
        autoResize={false}
        ref={field}
        id="lab-img-prompt"
        dir="auto"
        rows={1}
        value={prompt}
        maxLength={maxLength}
        aria-label={
          mode === 'poster'
            ? t('lab.imgcomposer.describeProductOffer')
            : t('lab.imgcomposer.describeImage')
        }
        onChange={(e) => onPrompt(e.target.value)}
        onPaste={pasteFiles}
        onKeyDown={keyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )

  return (
    <section
      ref={root}
      className="lab-pc"
      aria-label={
        mode === 'poster' ? t('lab.imgcomposer.posterComposer') : t('lab.imgcomposer.composer')
      }
      data-dragging={dragging}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragging(false)
        onAddFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <div className="lab-pc-attachments" hidden={!references.length && !templateName}>
        <input
          ref={upload}
          type="file"
          hidden
          multiple
          accept={referenceLimit?.formats.join(',') || 'image/png,image/jpeg,image/webp'}
          onChange={(e) => {
            onAddFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <input
          ref={photo}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onEditPhoto(file)
          }}
        />
        {templateName && (
          <span className="lab-pc-template-chip">
            <Sparkle size={13} /> {templateName}
            {onClearTemplate && (
              <LabButton
                type="button"
                variant="ghost"
                appearance="toolbar"
                controlSize="icon"
                aria-label={t('lab.imgcomposer.removeTemplate')}
                onClick={onClearTemplate}
              >
                <X size={20} />
              </LabButton>
            )}
          </span>
        )}
        <div className="lab-pc-strip" role="list" aria-label={t('lab.imgcomposer.referenceImages')}>
          {references.map((ref, index) => (
            <span key={ref.id} role="listitem" className="lab-pc-ref" data-primary={index === 0}>
              <img src={ref.url} alt="" />
              <span className="lab-pc-ref-name">
                {index === 0 ? t('lab.imgcomposer.mainImage') : ref.name}
              </span>
              <LabButton
                type="button"
                variant="ghost"
                appearance="toolbar"
                controlSize="icon"
                aria-label={t('lab.composer.removeItem', { name: ref.name })}
                onClick={() => onRemoveReference(ref.id)}
              >
                <X size={20} />
              </LabButton>
            </span>
          ))}
        </div>
      </div>

      {above}

      {/* One grid in both states, so the field never remounts and keeps focus and caret. */}
      <LabComposerCard ref={card}
className="lab-pc-card lab-light-edge"
data-focused={focused}
onMouseDown={(e) => {
          if (focused && (e.target as HTMLElement).closest('button')) e.preventDefault()
        }} expanded={expanded} layoutRef={layout} layoutClassName="lab-pc-layout">
          <span className="lab-pc-slot lab-pc-slot--add">
            <Menu.Root modal={false} onOpenChange={(next) => next && updatePortal()}>
              <Menu.Trigger asChild>
                <LabButton
                  type="button"
                  variant="ghost"
                  appearance="toolbar"
                  controlSize="icon"
                  className="lab-pc-icon"
                  aria-label={t('lab.imgcomposer.add')}
                  title={t('lab.imgcomposer.addImages')}
                >
                  <Plus size={18} strokeWidth={1.7} />
                </LabButton>
              </Menu.Trigger>
              <Menu.Portal container={portalContainer}>
                <LabPopoverSurface asChild>
                  <Menu.Content
                    className="lab-pc-menu"
                    side="top"
                    align="start"
                    sideOffset={8}
                    collisionPadding={12}
                    collisionBoundary={portalContainer ?? undefined}
                  >
                    <Menu.Label className="lab-pc-menu-label">
                      {canReference
                        ? `${resolvedReferenceNoun} · up to ${referenceLimit!.max}`
                        : t('lab.imgcomposer.modelNoReference')}
                    </Menu.Label>
                    <Menu.Item
                      className="lab-pc-menu-item"
                      disabled={!canReference || full}
                      onSelect={() => upload.current?.click()}
                    >
                      <Upload size={15} /> Upload images
                    </Menu.Item>
                    <Menu.Item
                      className="lab-pc-menu-item"
                      disabled={!canReference || full}
                      onSelect={() => void pasteFromClipboard()}
                    >
                      <ClipboardPaste size={15} /> Paste from clipboard
                    </Menu.Item>
                    <Menu.Separator className="lab-pc-menu-sep" />
                    {recent.length > 0 && (
                      <Menu.Sub>
                        <Menu.SubTrigger
                          className="lab-pc-menu-item"
                          disabled={!canReference || full}
                        >
                          <History size={15} /> From your images
                        </Menu.SubTrigger>
                        <Menu.Portal container={portalContainer}>
                          <LabPopoverSurface asChild>
                            <Menu.SubContent
                              className="lab-pc-menu lab-pc-recent"
                              sideOffset={6}
                              collisionPadding={12}
                              collisionBoundary={portalContainer ?? undefined}
                            >
                              {recent.slice(0, 12).map((image) => (
                                <Menu.Item
                                  key={image.id}
                                  className="lab-pc-recent-item"
                                  onSelect={() => onUseRecent(image.id)}
                                  aria-label={image.prompt || t('lab.imgcomposer.generatedImage')}
                                >
                                  <img src={image.thumbUrl} alt="" loading="lazy" />
                                </Menu.Item>
                              ))}
                            </Menu.SubContent>
                          </LabPopoverSurface>
                        </Menu.Portal>
                      </Menu.Sub>
                    )}
                    {onBrowseTemplates ? (
                      <Menu.Item className="lab-pc-menu-item" onSelect={onBrowseTemplates}>
                        <LayoutTemplate size={15} /> {resolvedTemplatesLabel}…
                      </Menu.Item>
                    ) : (
                      templates.length > 0 && (
                        <Menu.Sub>
                          <Menu.SubTrigger className="lab-pc-menu-item">
                            <Sparkle size={15} /> {resolvedTemplatesLabel}
                          </Menu.SubTrigger>
                          <Menu.Portal container={portalContainer}>
                            <LabPopoverSurface asChild>
                              <Menu.SubContent
                                className="lab-pc-menu lab-pc-idea-menu"
                                sideOffset={6}
                                collisionPadding={12}
                                collisionBoundary={portalContainer ?? undefined}
                              >
                                {templates.slice(0, 10).map((template) => (
                                  <Menu.Item
                                    key={template.id}
                                    className="lab-pc-menu-item lab-pc-idea"
                                    onSelect={() => onTemplate(template)}
                                  >
                                    <b>{template.name}</b>
                                    <small>{template.description || template.prompt}</small>
                                  </Menu.Item>
                                ))}
                              </Menu.SubContent>
                            </LabPopoverSurface>
                          </Menu.Portal>
                        </Menu.Sub>
                      )
                    )}
                    <Menu.Separator className="lab-pc-menu-sep" />
                    <Menu.Item className="lab-pc-menu-item" onSelect={() => photo.current?.click()}>
                      <Brush size={15} /> Edit a photo…
                    </Menu.Item>
                  </Menu.Content>
                </LabPopoverSurface>
              </Menu.Portal>
            </Menu.Root>
          </span>
          <span className="lab-pc-slot lab-pc-slot--ladder">{ladder('icon')}</span>
          {input}
          <span className="lab-pc-slot lab-pc-slot--settings">{settingsControl(false)}</span>
          <span className="lab-pc-slot lab-pc-slot--wand">{wand}</span>
          <span className="lab-pc-slot lab-pc-slot--send">{send}</span>
        </LabComposerCard>
      <p className="lab-pc-caption">{caption}</p>
    </section>
  )
}
