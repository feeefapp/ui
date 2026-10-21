'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { LabButton } from '../primitives/button.js';
import { PixelTexture } from '../pixel-art.js';
import { revealScrollChild } from '../scroll/index.js';
import { useLabI18n } from '../i18n.js';
import './speech.css';
import { useSpeechReorder } from './reorder.js';
/** Only the handle drags. Text editing, selection and viewport scrolling stay native. */
export function LabSpeechBlock({ children, toolbar, index, count, onMove, seed, reorderDisabled = false, }) {
    const { t } = useLabI18n();
    const root = useRef(null);
    const [announcement, announce] = useState('');
    const hint = useId();
    const reorder = useSpeechReorder({ root, index, count, onMove, announce });
    const [typing, setTyping] = useState(false);
    const typingTimer = useRef(undefined);
    useEffect(() => () => clearTimeout(typingTimer.current), []);
    useLayoutEffect(() => {
        const focused = root.current?.ownerDocument.activeElement;
        if (!root.current?.parentElement?.dataset.speechReordering &&
            focused instanceof HTMLElement &&
            root.current?.contains(focused))
            revealScrollChild(root.current.closest('.lab-scroll-viewport'), focused, {
                inline: false,
            });
    }, [index]);
    return (_jsxs("section", { ref: root, className: "lab-paragraph lab-voice-paragraph lab-light-edge", "data-speech-block": true, "data-lab-corners": true, "data-typing": typing || undefined, onInput: () => {
            setTyping(true);
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(false), 420);
        }, "aria-label": t('lab.speech.block', { index: index + 1 }), children: [_jsx("div", { className: "lab-speech-block-texture", children: _jsx(PixelTexture, { variant: "corner", density: "sparse", seed: seed }) }), _jsxs("div", { className: "lab-speech-block-toolbar", children: [_jsx(LabButton, { variant: "ghost", appearance: "toolbar", controlSize: "icon", className: "lab-speech-drag", "aria-label": t('lab.speech.reorder', { index: index + 1 }), "aria-describedby": hint, disabled: count < 2 || reorderDisabled, ...reorder, children: _jsx(GripVertical, { size: 20 }) }), toolbar ?? _jsx("span", { className: "lab-speech-block-caption", children: t('lab.speech.block', { index: index + 1 }) })] }), _jsx("span", { id: hint, className: "sr-only", children: t('lab.speech.hint') }), _jsx("span", { className: "sr-only", role: "status", children: announcement }), children] }));
}
//# sourceMappingURL=block.js.map