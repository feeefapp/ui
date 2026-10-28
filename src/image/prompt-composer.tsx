'use client'

import {
  ComposerAttachment,
  ComposerAttachments,
  ComposerBar,
  ComposerField,
  ComposerSend,
} from '../composer/composer'
import { PopoverSurface, Button, IconButton } from '../ui'
import { MenuSurface } from '../menu/menu-surface'
import { useFloatingBoundary } from '../menu/boundary'
import { useI18n } from '../i18n'
import { useServices } from '../services'
import { useRef, useState, useEffect, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  Brush,
  ClipboardPaste,
  HardDrive,
  History,
  LayoutTemplate,
  Lightbulb,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { PromptSettingsPanel } from './prompt-settings-panel'
import './prompt-composer.css'

export type ComposerReference = { id: string; url: string; name: string }
export type ComposerTemplate = { id: string; name: string; prompt: string; description?: string }
export type RecentImage = { id: string; thumbUrl: string; prompt: string }

/**
 * The image studio composer, built from the composer parts (`ComposerBar`): a round + bubble with
 * the add menu, and a glass capsule holding the reference thumbnails (the first is marked "Main"),
 * the prompt and send. Empty and idle it is one calm line with the AI ideas button beside send;
 * with text or focus, a second row shows the model ladder and the output settings chip, and the
 * AI button turns into "Improve my prompt".
 */
export function ImagePromptComposer({
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
  onBrowseFiles,
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
  onStop,
  stopLabel,
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
  /** Attached reference images, shown as thumbnails inside the capsule. The first is the main image. */
  references: ComposerReference[]
  /** `null` when the selected model takes no image input. `max` is shown as "1 of 3". */
  referenceLimit: { max: number; formats: string[] } | null
  /** Called with files from upload, paste, clipboard or drop. The owner validates type and count. */
  onAddFiles(files: File[]): void
  /** Called when a reference's × badge is pressed. */
  onRemoveReference(id: string): void
  /** The user's earlier images for the "From your images" submenu (first 12). Empty hides it. */
  recent: RecentImage[]
  /** Called with the id of a recent image picked as a reference. */
  onUseRecent(id: string): void
  /** Opens the host's file library ("From your files" after Paste); the host adds the chosen
   * images with its own `onAddFiles`. Absent hides the item. */
  onBrowseFiles?(): void
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
  /** The poster template in use, shown as a wide tile before the references. */
  templateName?: string | null
  /** Shows the template tile's × badge. */
  onClearTemplate?(): void
  /** Replaces the template submenu with one entry that opens a full template browser. */
  onBrowseTemplates?(): void
  /** The model control on the second row, usually `<ModelLadder variant="compact" … />`. */
  ladder: ReactNode
  /** Content of the output settings popover (shape, resolution, format). */
  settings: ReactNode
  /** Short summary of the current settings ("1:1"), shown on the settings chip. */
  settingsLabel: string
  /** Disables the settings chip and closes its popover. */
  settingsDisabled?: boolean
  /** When set, the settings chip toggles a panel the page owns instead of a popover. */
  onSettings?(): void
  /** Pressed state of the settings chip when `onSettings` is set. */
  settingsActive?: boolean
  /** What attached images are called in the + menu ("References", "Product photos"). */
  referenceNoun?: string
  /** Overrides the AI button's label (posters suggest details instead of rewriting the prompt). */
  wandLabel?: string
  /** The AI request in flight, or `''` when idle. Shows a loader on the AI button. */
  enhancing: '' | 'enhance' | 'ideas'
  /** Improve the prompt, or suggest ideas when it is empty. Omit to hide the AI button. */
  onEnhance?(mode: 'enhance' | 'ideas'): void
  /** Called by send and by Enter (Shift+Enter breaks the line). */
  onSubmit(): void
  /** Disables sending. */
  submitDisabled: boolean
  /** A generation is being sent: send shows the loader. */
  submitting: boolean
  /** Accessible name of send, such as "Create image". */
  submitLabel: string
  /** While submitting, send becomes a stop button that calls this. */
  onStop?(): void
  /** Accessible name of send while it stops. Defaults to the localized "Stop". */
  stopLabel?: string
  /** Small text under the composer, such as price or allowance. */
  caption: ReactNode
  /** Suggestion cards shown right above the composer (AI proposals, conflicts). */
  above?: ReactNode
  /** Runs before the built-in Enter handling; call `preventDefault()` to skip it. */
  onKeyDown?(event: KeyboardEvent): void
}) {
  const { t } = useI18n()
  const ideasLabel = templatesLabel ?? t('lab.imgcomposer.startFromIdea')
  const noun = referenceNoun ?? t('lab.imgcomposer.references')
  const { readClipboard } = useServices()
  const upload = useRef<HTMLInputElement>(null)
  const photo = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const settingsPanel = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const boundary = useFloatingBoundary()
  const updatePortal = () => setPortalContainer(root.current?.closest('dialog') ?? boundary)
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
  const canReference = !!referenceLimit
  const full = !!referenceLimit && references.length >= referenceLimit.max
  const wandMode = prompt.trim() ? 'enhance' : 'ideas'

  const wand = onEnhance ? (
    <IconButton
      variant="ghost"
      appearance="toolbar"
      controlSize="small"
      className="lab-pc-wand"
      aria-label={
        wandLabel ?? (wandMode === 'enhance' ? t('lab.imgcomposer.improvePrompt') : t('lab.imgcomposer.suggestIdeas'))
      }
      title={
        wandLabel ?? (wandMode === 'enhance' ? t('lab.imgcomposer.improvePromptAi') : t('lab.imgcomposer.suggestThree'))
      }
      loading={!!enhancing}
      onClick={() => onEnhance?.(wandMode)}
    >
      {wandMode === 'enhance' ? <WandSparkles aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
    </IconButton>
  ) : null

  const settingsChip = (props: Record<string, unknown>) => (
    <Button
      type="button"
      variant="ghost"
      appearance="toolbar"
      controlSize="small"
      className="lab-pc-chip"
      title={t('lab.imgcomposer.shapeResolutionFormat')}
      disabled={settingsDisabled}
      {...props}
    >
      <SlidersHorizontal aria-hidden="true" />
      <span>{settingsLabel}</span>
    </Button>
  )
  const settingsControl = onSettings ? (
    settingsChip({
      'aria-label': t('lab.imgcomposer.settingsWith', { label: settingsLabel }),
      'aria-pressed': !!settingsActive,
      'onClick': onSettings,
    })
  ) : (
    <Popover.Root
      open={settingsOpen}
      onOpenChange={(next) => {
        if (next) updatePortal()
        setSettingsOpen(next)
      }}
    >
      <Popover.Trigger asChild disabled={settingsDisabled}>
        {settingsChip({ 'aria-label': t('lab.imgcomposer.outputWith', { label: settingsLabel }) })}
      </Popover.Trigger>
      <Popover.Portal container={portalContainer}>
        <PopoverSurface asChild>
          <Popover.Content
            className="lab-pc-popover"
            side="top"
            align="start"
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
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )

  const addMenu = (
    <Menu.Root modal={false} onOpenChange={(next) => next && updatePortal()}>
      <Menu.Trigger asChild>
        <IconButton variant="ghost" appearance="toolbar" aria-label={t('lab.imgcomposer.add')} title={t('lab.imgcomposer.addImages')}>
          <Plus aria-hidden="true" />
        </IconButton>
      </Menu.Trigger>
      <Menu.Portal container={portalContainer}>
        <MenuSurface asChild>
          <Menu.Content
            className="lab-pc-menu"
            side="top"
            align="start"
            {...(portalContainer ? { collisionBoundary: portalContainer } : {})}
          >
            <Menu.Label className="lab-pc-menu-label">
              {canReference
                ? t('lab.imgcomposer.upTo', { noun, max: referenceLimit!.max })
                : t('lab.imgcomposer.modelNoReference')}
            </Menu.Label>
            <Menu.Item className="lab-pc-menu-item" disabled={!canReference || full} onSelect={() => upload.current?.click()}>
              <Upload size={15} /> {t('lab.imgcomposer.uploadImages')}
            </Menu.Item>
            <Menu.Item
              className="lab-pc-menu-item"
              disabled={!canReference || full}
              onSelect={() => void pasteFromClipboard()}
            >
              <ClipboardPaste size={15} /> {t('lab.imgcomposer.pasteClipboard')}
            </Menu.Item>
            {onBrowseFiles && (
              <Menu.Item
                className="lab-pc-menu-item"
                disabled={!canReference || full}
                onSelect={onBrowseFiles}
              >
                <HardDrive size={15} /> {t('lab.imgcomposer.fromFiles')}
              </Menu.Item>
            )}
            <Menu.Separator className="lab-pc-menu-sep" />
            {recent.length > 0 && (
              <Menu.Sub>
                <Menu.SubTrigger className="lab-pc-menu-item" disabled={!canReference || full}>
                  <History size={15} /> {t('lab.imgcomposer.fromYourImages')}
                </Menu.SubTrigger>
                <Menu.Portal container={portalContainer}>
                  <MenuSurface asChild cover={false}>
                    <Menu.SubContent
                      className="lab-pc-menu lab-pc-recent"
                      {...(portalContainer ? { collisionBoundary: portalContainer } : {})}
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
                  </MenuSurface>
                </Menu.Portal>
              </Menu.Sub>
            )}
            {onBrowseTemplates ? (
              <Menu.Item className="lab-pc-menu-item" onSelect={onBrowseTemplates}>
                <LayoutTemplate size={15} /> {ideasLabel}…
              </Menu.Item>
            ) : (
              templates.length > 0 && (
                <Menu.Sub>
                  <Menu.SubTrigger className="lab-pc-menu-item">
                    <Sparkle size={15} /> {ideasLabel}
                  </Menu.SubTrigger>
                  <Menu.Portal container={portalContainer}>
                    <MenuSurface asChild cover={false}>
                      <Menu.SubContent
                        className="lab-pc-menu lab-pc-idea-menu"
                        {...(portalContainer ? { collisionBoundary: portalContainer } : {})}
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
                    </MenuSurface>
                  </Menu.Portal>
                </Menu.Sub>
              )
            )}
            <Menu.Separator className="lab-pc-menu-sep" />
            <Menu.Item className="lab-pc-menu-item" onSelect={() => photo.current?.click()}>
              <Brush size={15} /> {t('lab.imgcomposer.editPhoto')}
            </Menu.Item>
          </Menu.Content>
        </MenuSurface>
      </Menu.Portal>
    </Menu.Root>
  )

  const attachments =
    references.length > 0 || templateName ? (
      <ComposerAttachments
        label={t('lab.imgcomposer.referenceImages')}
        count={references.length}
        max={referenceLimit?.max}
      >
        {templateName && (
          <ComposerAttachment
            key="template"
            id="template"
            icon={<Sparkle aria-hidden="true" />}
            title={templateName}
            label={templateName}
            onRemove={onClearTemplate}
            removeLabel={t('lab.imgcomposer.removeTemplate')}
          />
        )}
        {references.map((ref, index) => (
          <ComposerAttachment
            key={ref.id}
            id={ref.id}
            src={ref.url}
            label={ref.name}
            badge={index === 0 ? t('lab.imgcomposer.main') : undefined}
            onRemove={() => onRemoveReference(ref.id)}
          />
        ))}
      </ComposerAttachments>
    ) : null

  return (
    <section
      ref={root}
      className="lab-composer lab-pc"
      aria-label={mode === 'poster' ? t('lab.imgcomposer.posterComposer') : t('lab.imgcomposer.composer')}
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
      {above}
      <ComposerBar
        leading={addMenu}
        attachments={attachments}
        hasText={!!prompt}
        dropActive={dragging}
        field={
          <ComposerField
            ref={field}
            id="lab-img-prompt"
            value={prompt}
            onValueChange={onPrompt}
            label={mode === 'poster' ? t('lab.imgcomposer.describeProductOffer') : t('lab.imgcomposer.describeImage')}
            placeholder={placeholder}
            maxLength={maxLength}
            onPaste={pasteFiles}
            onKeyDown={onKeyDown}
            onSubmit={() => {
              if (!submitDisabled && !submitting) onSubmit()
            }}
          />
        }
        tools={
          <>
            {ladder}
            {settingsControl}
          </>
        }
        actions={wand}
        send={
          <ComposerSend
            label={submitLabel}
            ready={!submitDisabled}
            submitting={submitting}
            onSend={onSubmit}
            onStop={onStop}
            stopLabel={stopLabel}
          />
        }
      />
      {caption != null && caption !== false && caption !== '' && <p className="lab-composer-caption">{caption}</p>}
    </section>
  )
}
