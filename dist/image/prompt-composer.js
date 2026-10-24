'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ComposerAttachment, ComposerAttachments, ComposerBar, ComposerField, ComposerSend, } from '../composer/composer.js';
import { PopoverSurface, Button, IconButton } from '../ui.js';
import { MenuSurface } from '../menu/menu-surface.js';
import { useFloatingBoundary } from '../menu/boundary.js';
import { useI18n } from '../i18n.js';
import { useServices } from '../services.js';
import { useRef, useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Brush, ClipboardPaste, History, LayoutTemplate, Lightbulb, Plus, SlidersHorizontal, Sparkle, Upload, WandSparkles, } from 'lucide-react';
import { PromptSettingsPanel } from './prompt-settings-panel.js';
import './prompt-composer.css';
/**
 * The image studio composer, built from the composer parts (`ComposerBar`): a round + bubble with
 * the add menu, and a glass capsule holding the reference thumbnails (the first is marked "Main"),
 * the prompt and send. Empty and idle it is one calm line with the AI ideas button beside send;
 * with text or focus, a second row shows the model ladder and the output settings chip, and the
 * AI button turns into "Improve my prompt".
 */
export function ImagePromptComposer({ prompt, onPrompt, placeholder, maxLength, references, referenceLimit, onAddFiles, onRemoveReference, recent, onUseRecent, onEditPhoto, templates, templatesLabel, onTemplate, mode, templateName, onClearTemplate, onBrowseTemplates, ladder, settings, settingsLabel, settingsDisabled, onSettings, settingsActive, referenceNoun, wandLabel, enhancing, onEnhance, onSubmit, submitDisabled, submitting, submitLabel, onStop, stopLabel, caption, above, onKeyDown, }) {
    const { t } = useI18n();
    const ideasLabel = templatesLabel ?? t('lab.imgcomposer.startFromIdea');
    const noun = referenceNoun ?? t('lab.imgcomposer.references');
    const { readClipboard } = useServices();
    const upload = useRef(null);
    const photo = useRef(null);
    const root = useRef(null);
    const field = useRef(null);
    const settingsPanel = useRef(null);
    const [portalContainer, setPortalContainer] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const boundary = useFloatingBoundary();
    const updatePortal = () => setPortalContainer(root.current?.closest('dialog') ?? boundary);
    useEffect(() => {
        if (settingsDisabled)
            setSettingsOpen(false);
    }, [settingsDisabled]);
    const pasteFiles = (event) => {
        const files = Array.from(event.clipboardData.files).filter((f) => f.type.startsWith('image/'));
        if (!files.length)
            return;
        event.preventDefault();
        onAddFiles(files);
    };
    const pasteFromClipboard = async () => {
        try {
            const items = await readClipboard();
            const files = [];
            for (const item of items)
                for (const type of item.types)
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        files.push(new File([blob], `pasted.${type.split('/')[1]}`, { type }));
                    }
            if (files.length)
                onAddFiles(files);
        }
        catch {
            field.current?.focus();
        }
    };
    const canReference = !!referenceLimit;
    const full = !!referenceLimit && references.length >= referenceLimit.max;
    const wandMode = prompt.trim() ? 'enhance' : 'ideas';
    const wand = onEnhance ? (_jsx(IconButton, { variant: "ghost", appearance: "toolbar", controlSize: "small", className: "lab-pc-wand", "aria-label": wandLabel ?? (wandMode === 'enhance' ? t('lab.imgcomposer.improvePrompt') : t('lab.imgcomposer.suggestIdeas')), title: wandLabel ?? (wandMode === 'enhance' ? t('lab.imgcomposer.improvePromptAi') : t('lab.imgcomposer.suggestThree')), loading: !!enhancing, onClick: () => onEnhance?.(wandMode), children: wandMode === 'enhance' ? _jsx(WandSparkles, { "aria-hidden": "true" }) : _jsx(Lightbulb, { "aria-hidden": "true" }) })) : null;
    const settingsChip = (props) => (_jsxs(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "small", className: "lab-pc-chip", title: t('lab.imgcomposer.shapeResolutionFormat'), disabled: settingsDisabled, ...props, children: [_jsx(SlidersHorizontal, { "aria-hidden": "true" }), _jsx("span", { children: settingsLabel })] }));
    const settingsControl = onSettings ? (settingsChip({
        'aria-label': t('lab.imgcomposer.settingsWith', { label: settingsLabel }),
        'aria-pressed': !!settingsActive,
        'onClick': onSettings,
    })) : (_jsxs(Popover.Root, { open: settingsOpen, onOpenChange: (next) => {
            if (next)
                updatePortal();
            setSettingsOpen(next);
        }, children: [_jsx(Popover.Trigger, { asChild: true, disabled: settingsDisabled, children: settingsChip({ 'aria-label': t('lab.imgcomposer.outputWith', { label: settingsLabel }) }) }), _jsx(Popover.Portal, { container: portalContainer, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { className: "lab-pc-popover", side: "top", align: "start", sideOffset: 8, collisionPadding: 12, collisionBoundary: portalContainer ?? undefined, "aria-label": t('lab.imgcomposer.outputSettings'), onOpenAutoFocus: (event) => {
                            event.preventDefault();
                            requestAnimationFrame(() => {
                                const target = settingsPanel.current?.querySelector('.lab-scroll-content :is(input, button, textarea, [tabindex="0"])') ?? settingsPanel.current?.querySelector('button');
                                target?.focus({ preventScroll: true });
                            });
                        }, children: _jsx(PromptSettingsPanel, { ref: settingsPanel, onClose: () => setSettingsOpen(false), children: settings }) }) }) })] }));
    const addMenu = (_jsxs(Menu.Root, { modal: false, onOpenChange: (next) => next && updatePortal(), children: [_jsx(Menu.Trigger, { asChild: true, children: _jsx(IconButton, { variant: "ghost", appearance: "toolbar", "aria-label": t('lab.imgcomposer.add'), title: t('lab.imgcomposer.addImages'), children: _jsx(Plus, { "aria-hidden": "true" }) }) }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, children: _jsxs(Menu.Content, { className: "lab-pc-menu", side: "top", align: "start", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: [_jsx(Menu.Label, { className: "lab-pc-menu-label", children: canReference
                                    ? t('lab.imgcomposer.upTo', { noun, max: referenceLimit.max })
                                    : t('lab.imgcomposer.modelNoReference') }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", disabled: !canReference || full, onSelect: () => upload.current?.click(), children: [_jsx(Upload, { size: 15 }), " ", t('lab.imgcomposer.uploadImages')] }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", disabled: !canReference || full, onSelect: () => void pasteFromClipboard(), children: [_jsx(ClipboardPaste, { size: 15 }), " ", t('lab.imgcomposer.pasteClipboard')] }), _jsx(Menu.Separator, { className: "lab-pc-menu-sep" }), recent.length > 0 && (_jsxs(Menu.Sub, { children: [_jsxs(Menu.SubTrigger, { className: "lab-pc-menu-item", disabled: !canReference || full, children: [_jsx(History, { size: 15 }), " ", t('lab.imgcomposer.fromYourImages')] }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, cover: false, children: _jsx(Menu.SubContent, { className: "lab-pc-menu lab-pc-recent", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: recent.slice(0, 12).map((image) => (_jsx(Menu.Item, { className: "lab-pc-recent-item", onSelect: () => onUseRecent(image.id), "aria-label": image.prompt || t('lab.imgcomposer.generatedImage'), children: _jsx("img", { src: image.thumbUrl, alt: "", loading: "lazy" }) }, image.id))) }) }) })] })), onBrowseTemplates ? (_jsxs(Menu.Item, { className: "lab-pc-menu-item", onSelect: onBrowseTemplates, children: [_jsx(LayoutTemplate, { size: 15 }), " ", ideasLabel, "\u2026"] })) : (templates.length > 0 && (_jsxs(Menu.Sub, { children: [_jsxs(Menu.SubTrigger, { className: "lab-pc-menu-item", children: [_jsx(Sparkle, { size: 15 }), " ", ideasLabel] }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, cover: false, children: _jsx(Menu.SubContent, { className: "lab-pc-menu lab-pc-idea-menu", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: templates.slice(0, 10).map((template) => (_jsxs(Menu.Item, { className: "lab-pc-menu-item lab-pc-idea", onSelect: () => onTemplate(template), children: [_jsx("b", { children: template.name }), _jsx("small", { children: template.description || template.prompt })] }, template.id))) }) }) })] }))), _jsx(Menu.Separator, { className: "lab-pc-menu-sep" }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", onSelect: () => photo.current?.click(), children: [_jsx(Brush, { size: 15 }), " ", t('lab.imgcomposer.editPhoto')] })] }) }) })] }));
    const attachments = references.length > 0 || templateName ? (_jsxs(ComposerAttachments, { label: t('lab.imgcomposer.referenceImages'), count: references.length, max: referenceLimit?.max, children: [templateName && (_jsx(ComposerAttachment, { id: "template", icon: _jsx(Sparkle, { "aria-hidden": "true" }), title: templateName, label: templateName, onRemove: onClearTemplate, removeLabel: t('lab.imgcomposer.removeTemplate') }, "template")), references.map((ref, index) => (_jsx(ComposerAttachment, { id: ref.id, src: ref.url, label: ref.name, badge: index === 0 ? t('lab.imgcomposer.main') : undefined, onRemove: () => onRemoveReference(ref.id) }, ref.id)))] })) : null;
    return (_jsxs("section", { ref: root, className: "lab-composer lab-pc", "aria-label": mode === 'poster' ? t('lab.imgcomposer.posterComposer') : t('lab.imgcomposer.composer'), onDragOver: (e) => {
            if (!e.dataTransfer.types.includes('Files'))
                return;
            e.preventDefault();
            setDragging(true);
        }, onDragLeave: (e) => e.currentTarget.contains(e.relatedTarget) || setDragging(false), onDrop: (e) => {
            if (!e.dataTransfer.files.length)
                return;
            e.preventDefault();
            setDragging(false);
            onAddFiles(Array.from(e.dataTransfer.files));
        }, children: [_jsx("input", { ref: upload, type: "file", hidden: true, multiple: true, accept: referenceLimit?.formats.join(',') || 'image/png,image/jpeg,image/webp', onChange: (e) => {
                    onAddFiles(Array.from(e.target.files ?? []));
                    e.target.value = '';
                } }), _jsx("input", { ref: photo, type: "file", hidden: true, accept: "image/png,image/jpeg,image/webp", onChange: (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file)
                        onEditPhoto(file);
                } }), above, _jsx(ComposerBar, { leading: addMenu, attachments: attachments, hasText: !!prompt, dropActive: dragging, field: _jsx(ComposerField, { ref: field, id: "lab-img-prompt", value: prompt, onValueChange: onPrompt, label: mode === 'poster' ? t('lab.imgcomposer.describeProductOffer') : t('lab.imgcomposer.describeImage'), placeholder: placeholder, maxLength: maxLength, onPaste: pasteFiles, onKeyDown: onKeyDown, onSubmit: () => {
                        if (!submitDisabled && !submitting)
                            onSubmit();
                    } }), tools: _jsxs(_Fragment, { children: [ladder, settingsControl] }), actions: wand, send: _jsx(ComposerSend, { label: submitLabel, ready: !submitDisabled, submitting: submitting, onSend: onSubmit, onStop: onStop, stopLabel: stopLabel }) }), caption != null && caption !== false && caption !== '' && _jsx("p", { className: "lab-composer-caption", children: caption })] }));
}
//# sourceMappingURL=prompt-composer.js.map