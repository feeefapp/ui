'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ComposerCard, ComposerHint as AnimatedHint } from '../composer/composer.js';
import { PopoverSurface } from '../ui.js';
import { MenuSurface } from '../menu/menu-surface.js';
import { useFloatingBoundary } from '../menu/boundary.js';
import { Button, RawInput } from '../ui.js';
import { useI18n } from '../i18n.js';
import { useServices } from '../services.js';
import { useEffect, useRef, useState, } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowUp, Brush, ClipboardPaste, History, LayoutTemplate, Lightbulb, Plus, SlidersHorizontal, Sparkle, Upload, WandSparkles, X, } from 'lucide-react';
import { useComposerLayout } from '../composer/composer.js';
import { PromptSettingsPanel } from './prompt-settings-panel.js';
import './prompt-composer.css';
/**
 * The image studio composer, after marchant `image_gen_view` `_buildComposer`: an attachment
 * row above a glass card that is one compact line until you type, then grows upward with its
 * controls on a second row. Model ladder, AI enhance, output settings and send are icon controls.
 */
export function ImagePromptComposer({ prompt, onPrompt, placeholder, maxLength, references, referenceLimit, onAddFiles, onRemoveReference, recent, onUseRecent, onEditPhoto, templates, templatesLabel, onTemplate, mode, templateName, onClearTemplate, onBrowseTemplates, ladder, settings, settingsLabel, settingsDisabled, onSettings, settingsActive, referenceNoun, wandLabel, enhancing, onEnhance, onSubmit, submitDisabled, submitting, submitLabel, caption, above, onKeyDown, }) {
    const { t } = useI18n();
    const resolvedTemplatesLabel = templatesLabel ?? t('lab.imgcomposer.startFromIdea');
    const resolvedReferenceNoun = referenceNoun ?? t('lab.imgcomposer.references');
    const { readClipboard } = useServices();
    const upload = useRef(null);
    const photo = useRef(null);
    const root = useRef(null);
    const settingsPanel = useRef(null);
    const [portalContainer, setPortalContainer] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [focused, setFocused] = useState(false);
    // Focus changes emphasis; text overflow or an explicit newline changes layout.
    const { card, layout, field, expanded } = useComposerLayout(prompt);
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
    const keyDown = (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented)
            return;
        // Enter sends, Shift+Enter breaks the line, like a chat.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!submitDisabled && !submitting)
                onSubmit();
        }
    };
    const canReference = !!referenceLimit;
    const full = !!referenceLimit && references.length >= referenceLimit.max;
    const wandMode = prompt.trim() ? 'enhance' : 'ideas';
    const wand = onEnhance ? (_jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", className: "lab-pc-icon lab-pc-wand", "aria-label": wandLabel ??
            (wandMode === 'enhance'
                ? t('lab.imgcomposer.improvePrompt')
                : t('lab.imgcomposer.suggestIdeas')), title: wandLabel ??
            (wandMode === 'enhance'
                ? t('lab.imgcomposer.improvePromptAi')
                : t('lab.imgcomposer.suggestThree')), disabled: !!enhancing, loading: !!enhancing, onClick: () => onEnhance?.(wandMode), children: !enhancing &&
            (wandMode === 'enhance' ? (_jsx(WandSparkles, { size: 18, strokeWidth: 1.6 })) : (_jsx(Lightbulb, { size: 18, strokeWidth: 1.6 }))) })) : null;
    const settingsControl = (chip) => onSettings ? (_jsxs(Button, { type: "button", variant: chip ? 'elevated' : 'ghost', appearance: chip ? 'default' : 'toolbar', controlSize: chip ? 'regular' : 'icon', className: chip ? 'lab-pc-chip' : 'lab-pc-icon', "aria-label": t('lab.imgcomposer.settingsWith', { label: settingsLabel }), title: settingsLabel, "aria-pressed": !!settingsActive, disabled: settingsDisabled, onClick: onSettings, children: [_jsx(SlidersHorizontal, { size: chip ? 15 : 18, strokeWidth: 1.6 }), chip && _jsx("span", { children: settingsLabel })] })) : (_jsxs(Popover.Root, { open: settingsOpen, onOpenChange: (next) => {
            if (next)
                updatePortal();
            setSettingsOpen(next);
        }, children: [_jsx(Popover.Trigger, { asChild: true, disabled: settingsDisabled, children: _jsxs(Button, { type: "button", variant: chip ? 'elevated' : 'ghost', appearance: chip ? 'default' : 'toolbar', controlSize: chip ? 'regular' : 'icon', className: chip ? 'lab-pc-chip' : 'lab-pc-icon', "aria-label": t('lab.imgcomposer.outputWith', { label: settingsLabel }), title: t('lab.imgcomposer.shapeResolutionFormat'), children: [_jsx(SlidersHorizontal, { size: chip ? 15 : 18, strokeWidth: 1.6 }), chip && _jsx("span", { children: settingsLabel })] }) }), _jsx(Popover.Portal, { container: portalContainer, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(Popover.Content, { className: "lab-pc-popover", side: "top", align: chip ? 'start' : 'end', sideOffset: 8, collisionPadding: 12, collisionBoundary: portalContainer ?? undefined, "aria-label": t('lab.imgcomposer.outputSettings'), onOpenAutoFocus: (event) => {
                            event.preventDefault();
                            requestAnimationFrame(() => {
                                const target = settingsPanel.current?.querySelector('.lab-scroll-content :is(input, button, textarea, [tabindex="0"])') ?? settingsPanel.current?.querySelector('button');
                                target?.focus({ preventScroll: true });
                            });
                        }, children: _jsx(PromptSettingsPanel, { ref: settingsPanel, onClose: () => setSettingsOpen(false), children: settings }) }) }) })] }));
    const send = (_jsx(Button, { type: "button", variant: "filled", controlSize: "icon", className: "lab-pc-send", "aria-label": submitLabel, title: submitLabel, disabled: submitDisabled || submitting, loading: submitting, onClick: onSubmit, children: !submitting && _jsx(ArrowUp, { size: 20, strokeWidth: 2, "aria-hidden": "true" }) }));
    const input = (_jsxs("div", { className: "lab-pc-field", children: [!prompt && _jsx(AnimatedHint, { text: placeholder }), _jsx(RawInput, { className: "lab-textarea", multiline: true, autoResize: false, ref: field, id: "lab-img-prompt", dir: "auto", rows: 1, value: prompt, maxLength: maxLength, "aria-label": mode === 'poster'
                    ? t('lab.imgcomposer.describeProductOffer')
                    : t('lab.imgcomposer.describeImage'), onChange: (e) => onPrompt(e.target.value), onPaste: pasteFiles, onKeyDown: keyDown, onFocus: () => setFocused(true), onBlur: () => setFocused(false) })] }));
    return (_jsxs("section", { ref: root, className: "lab-pc", "aria-label": mode === 'poster' ? t('lab.imgcomposer.posterComposer') : t('lab.imgcomposer.composer'), "data-dragging": dragging, onDragOver: (e) => {
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
        }, children: [_jsxs("div", { className: "lab-pc-attachments", hidden: !references.length && !templateName, children: [_jsx("input", { ref: upload, type: "file", hidden: true, multiple: true, accept: referenceLimit?.formats.join(',') || 'image/png,image/jpeg,image/webp', onChange: (e) => {
                            onAddFiles(Array.from(e.target.files ?? []));
                            e.target.value = '';
                        } }), _jsx("input", { ref: photo, type: "file", hidden: true, accept: "image/png,image/jpeg,image/webp", onChange: (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file)
                                onEditPhoto(file);
                        } }), templateName && (_jsxs("span", { className: "lab-pc-template-chip", children: [_jsx(Sparkle, { size: 13 }), " ", templateName, onClearTemplate && (_jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.imgcomposer.removeTemplate'), onClick: onClearTemplate, children: _jsx(X, { size: 20 }) }))] })), _jsx("div", { className: "lab-pc-strip", role: "list", "aria-label": t('lab.imgcomposer.referenceImages'), children: references.map((ref, index) => (_jsxs("span", { role: "listitem", className: "lab-pc-ref", "data-primary": index === 0, children: [_jsx("img", { src: ref.url, alt: "" }), _jsx("span", { className: "lab-pc-ref-name", children: index === 0 ? t('lab.imgcomposer.mainImage') : ref.name }), _jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.composer.removeItem', { name: ref.name }), onClick: () => onRemoveReference(ref.id), children: _jsx(X, { size: 20 }) })] }, ref.id))) })] }), above, _jsxs(ComposerCard, { ref: card, className: "lab-pc-card lab-light-edge", "data-focused": focused, onMouseDown: (e) => {
                    if (focused && e.target.closest('button'))
                        e.preventDefault();
                }, expanded: expanded, layoutRef: layout, layoutClassName: "lab-pc-layout", children: [_jsx("span", { className: "lab-pc-slot lab-pc-slot--add", children: _jsxs(Menu.Root, { modal: false, onOpenChange: (next) => next && updatePortal(), children: [_jsx(Menu.Trigger, { asChild: true, children: _jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", className: "lab-pc-icon", "aria-label": t('lab.imgcomposer.add'), title: t('lab.imgcomposer.addImages'), children: _jsx(Plus, { size: 18, strokeWidth: 1.7 }) }) }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, children: _jsxs(Menu.Content, { className: "lab-pc-menu", side: "top", align: "start", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: [_jsx(Menu.Label, { className: "lab-pc-menu-label", children: canReference
                                                        ? `${resolvedReferenceNoun} · up to ${referenceLimit.max}`
                                                        : t('lab.imgcomposer.modelNoReference') }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", disabled: !canReference || full, onSelect: () => upload.current?.click(), children: [_jsx(Upload, { size: 15 }), " Upload images"] }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", disabled: !canReference || full, onSelect: () => void pasteFromClipboard(), children: [_jsx(ClipboardPaste, { size: 15 }), " Paste from clipboard"] }), _jsx(Menu.Separator, { className: "lab-pc-menu-sep" }), recent.length > 0 && (_jsxs(Menu.Sub, { children: [_jsxs(Menu.SubTrigger, { className: "lab-pc-menu-item", disabled: !canReference || full, children: [_jsx(History, { size: 15 }), " From your images"] }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, cover: false, children: _jsx(Menu.SubContent, { className: "lab-pc-menu lab-pc-recent", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: recent.slice(0, 12).map((image) => (_jsx(Menu.Item, { className: "lab-pc-recent-item", onSelect: () => onUseRecent(image.id), "aria-label": image.prompt || t('lab.imgcomposer.generatedImage'), children: _jsx("img", { src: image.thumbUrl, alt: "", loading: "lazy" }) }, image.id))) }) }) })] })), onBrowseTemplates ? (_jsxs(Menu.Item, { className: "lab-pc-menu-item", onSelect: onBrowseTemplates, children: [_jsx(LayoutTemplate, { size: 15 }), " ", resolvedTemplatesLabel, "\u2026"] })) : (templates.length > 0 && (_jsxs(Menu.Sub, { children: [_jsxs(Menu.SubTrigger, { className: "lab-pc-menu-item", children: [_jsx(Sparkle, { size: 15 }), " ", resolvedTemplatesLabel] }), _jsx(Menu.Portal, { container: portalContainer, children: _jsx(MenuSurface, { asChild: true, cover: false, children: _jsx(Menu.SubContent, { className: "lab-pc-menu lab-pc-idea-menu", ...(portalContainer ? { collisionBoundary: portalContainer } : {}), children: templates.slice(0, 10).map((template) => (_jsxs(Menu.Item, { className: "lab-pc-menu-item lab-pc-idea", onSelect: () => onTemplate(template), children: [_jsx("b", { children: template.name }), _jsx("small", { children: template.description || template.prompt })] }, template.id))) }) }) })] }))), _jsx(Menu.Separator, { className: "lab-pc-menu-sep" }), _jsxs(Menu.Item, { className: "lab-pc-menu-item", onSelect: () => photo.current?.click(), children: [_jsx(Brush, { size: 15 }), " Edit a photo\u2026"] })] }) }) })] }) }), _jsx("span", { className: "lab-pc-slot lab-pc-slot--ladder", children: ladder('icon') }), input, _jsx("span", { className: "lab-pc-slot lab-pc-slot--settings", children: settingsControl(false) }), _jsx("span", { className: "lab-pc-slot lab-pc-slot--wand", children: wand }), _jsx("span", { className: "lab-pc-slot lab-pc-slot--send", children: send })] }), _jsx("p", { className: "lab-pc-caption", children: caption })] }));
}
//# sourceMappingURL=prompt-composer.js.map