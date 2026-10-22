'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../ui.js';
import { useI18n } from '../i18n.js';
import { GlassGroup } from '../scaffold.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { Maximize, Minus, Plus, RefreshCw, Trash2, X, Star } from 'lucide-react';
import { PixelArtwork, PixelLoader } from '../pixel-art.js';
import { revealCovered } from './freeform-frame.js';
import { elapsed, stageRatio, takeErrorText } from './board-utils.js';
import './freeform-board.css';
/** World height of every card; widths follow each image's proportions. */
const CARD_H = 560;
const GAP = 72;
const MIN_SCALE = 0.08;
const MAX_SCALE = 4;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
/** Lay the versions out left to right, oldest first, centred on the origin row. */
export function layoutCards(takes, ratios) {
    const ordered = [...takes].reverse();
    let x = 0;
    return ordered.map((take, i) => {
        const ratio = clamp(ratios[take.id] ?? stageRatio(undefined, take.options), 0.25, 4);
        const w = Math.round(CARD_H * ratio);
        const card = { take, x, y: -CARD_H / 2, w, h: CARD_H, number: i + 1 };
        x += w + GAP;
        return card;
    });
}
/** Scale and offset that fit a world rect into the visible area between floating panels. */
export function fitView(rect, viewport, insets, padding = 28, maxScale = 1) {
    const availW = Math.max(120, viewport.w - insets.left - insets.right - padding * 2);
    const availH = Math.max(120, viewport.h - insets.top - insets.bottom - padding * 2);
    const scale = clamp(Math.min(availW / rect.w, availH / rect.h, maxScale), MIN_SCALE, MAX_SCALE);
    const cx = insets.left + padding + availW / 2;
    const cy = insets.top + padding + availH / 2;
    return { scale, x: cx - (rect.x + rect.w / 2) * scale, y: cy - (rect.y + rect.h / 2) * scale };
}
/**
 * Freeform-style board: an endless dotted canvas behind every panel. Versions sit side by side;
 * the selected one glides into the free area between the floating panels. Drag to pan, scroll to
 * pan, pinch or ⌘/Ctrl+scroll to zoom, double-click a card to fit it.
 */
export function FreeformBoard({ embedded = false, takes, selectedId, onSelect, insets, now, signedIn, starters, onStarter, onRetry, onRemove, emptyContent, }) {
    const { t } = useI18n();
    const root = useRef(null);
    const [size, setSize] = useState({ w: 1280, h: 800 });
    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
    const [animate, setAnimate] = useState(false);
    const [ratios, setRatios] = useState({});
    const drag = useRef(null);
    const pinch = useRef(new Map());
    const [grabbing, setGrabbing] = useState(false);
    const cards = useMemo(() => layoutCards(takes, ratios), [takes, ratios]);
    const selected = cards.find((card) => card.take.id === selectedId) ?? cards[cards.length - 1];
    useLayoutEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    const glide = useCallback((next) => {
        setAnimate(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        setView(next);
    }, []);
    const fitCard = useCallback((card) => {
        if (!card)
            return;
        const fitted = fitView(card, size, insets, 28, card.take.status === 'completed' ? 1.4 : 1);
        // Centering the selection leaves the poster beside it under the rail
        // whenever the free area is wider than the card. Pull that neighbor clear.
        glide(revealCovered(fitted, cards, card, size, insets, 28));
    }, [glide, size, insets, cards]);
    const fitAll = () => {
        if (!cards.length)
            return;
        const last = cards[cards.length - 1];
        glide(fitView({ x: 0, y: -CARD_H / 2, w: last.x + last.w, h: CARD_H }, size, insets));
    };
    // Bring the selection (or a new version) into the free area whenever it, the panels or the window change.
    const layoutKey = cards.map((card) => `${card.take.id}:${card.x}:${card.w}`).join('|');
    const key = `${selected?.take.id}:${layoutKey}:${size.w}x${size.h}:${insets.left},${insets.top},${insets.right},${insets.bottom}`;
    useEffect(() => {
        if (selected)
            fitCard(selected);
        else
            glide({
                x: insets.left + (size.w - insets.left - insets.right) / 2,
                y: insets.top + (size.h - insets.top - insets.bottom) / 2,
                scale: 1,
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    const zoomAt = (factor, px, py) => {
        setAnimate(false);
        setView((old) => {
            const scale = clamp(old.scale * factor, MIN_SCALE, MAX_SCALE);
            const k = scale / old.scale;
            return { scale, x: px - (px - old.x) * k, y: py - (py - old.y) * k };
        });
    };
    const zoomCentre = (factor) => {
        setAnimate(true);
        zoomAt(factor, insets.left + (size.w - insets.left - insets.right) / 2, insets.top + (size.h - insets.top - insets.bottom) / 2);
    };
    // Native wheel listener: React's is passive, and pinch/scroll must not move the page.
    useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const wheel = (event) => {
            // Scrollable panels on the board (the template gallery) scroll natively.
            const inPanel = event.target?.closest?.('[data-ff-scroll]');
            if (inPanel && !event.ctrlKey && !event.metaKey)
                return;
            event.preventDefault();
            if (inPanel)
                return;
            const rect = el.getBoundingClientRect();
            if (event.ctrlKey || event.metaKey) {
                zoomAt(Math.exp(-event.deltaY * 0.0045), event.clientX - rect.left, event.clientY - rect.top);
            }
            else {
                setAnimate(false);
                setView((old) => ({ ...old, x: old.x - event.deltaX, y: old.y - event.deltaY }));
            }
        };
        el.addEventListener('wheel', wheel, { passive: false });
        return () => el.removeEventListener('wheel', wheel);
    }, []);
    const down = (event) => {
        if (event.button !== 0 && event.button !== 1)
            return;
        pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture(event.pointerId);
        if (pinch.current.size === 1)
            drag.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                vx: view.x,
                vy: view.y,
                moved: false,
                // Captured pointers report the board as their target on release, so the card is read here.
                card: event.target.closest('[data-card]')?.dataset.card,
            };
        setAnimate(false);
    };
    const move = (event) => {
        const points = pinch.current;
        if (!points.has(event.pointerId))
            return;
        const before = [...points.values()];
        points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.size === 2) {
            const [a, b] = before;
            const [c, d] = [...points.values()];
            const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
            const rect = root.current.getBoundingClientRect();
            zoomAt(dist(c, d) / Math.max(1, dist(a, b)), (c.x + d.x) / 2 - rect.left, (c.y + d.y) / 2 - rect.top);
            if (drag.current)
                drag.current.moved = true;
            return;
        }
        const d = drag.current;
        if (!d || d.id !== event.pointerId)
            return;
        const dx = event.clientX - d.x;
        const dy = event.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4)
            return;
        d.moved = true;
        setGrabbing(true);
        setView((old) => ({ ...old, x: d.vx + dx, y: d.vy + dy }));
    };
    const up = (event) => {
        pinch.current.delete(event.pointerId);
        const d = drag.current;
        if (d?.id === event.pointerId) {
            // A click (no drag) on a card selects it.
            if (!d.moved && d.card)
                onSelect(d.card);
            drag.current = null;
            setGrabbing(false);
        }
    };
    const percent = Math.round(view.scale * 100);
    const dot = 24 * view.scale;
    return (_jsxs("div", { ref: root, className: "lab-ff lab-workspace-canvas", "data-embedded": embedded || undefined, "data-grabbing": grabbing, style: {
            backgroundSize: `${dot}px ${dot}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
        }, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onDoubleClick: (event) => {
            const id = event.target.closest('[data-card]')?.dataset.card;
            const card = cards.find((row) => row.take.id === id);
            if (card)
                fitCard(card);
        }, role: "application", "aria-label": t('lab.board.canvasHint'), children: [_jsx("div", { className: "lab-ff-world", "data-animate": animate, style: { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }, onTransitionEnd: () => setAnimate(false), children: cards.map((card) => {
                    const take = card.take;
                    const busy = take.status === 'pending' || take.status === 'processing';
                    return (_jsxs("figure", { "data-card": take.id, className: "lab-ff-card", "data-status": take.status, "aria-current": take.id === selected?.take.id, style: { left: card.x, top: card.y, width: card.w, height: card.h }, children: [take.status === 'completed' ? (_jsx("img", { src: take.fileUrl, alt: take.prompt || t('lab.board.generatedImage'), draggable: false, onLoad: (e) => {
                                    const img = e.currentTarget;
                                    const r = img.naturalWidth / Math.max(1, img.naturalHeight);
                                    if (Number.isFinite(r) && Math.abs((ratios[take.id] ?? 0) - r) > 0.01)
                                        setRatios((old) => ({ ...old, [take.id]: r }));
                                } })) : busy ? (_jsxs("div", { className: "lab-ff-state", role: "status", children: [_jsx(PixelLoader, { size: 40, label: t('lab.board.creating') }), _jsx("b", { children: t('lab.board.takingShape') }), _jsxs("small", { children: [elapsed(take.createdAt, now), " \u00B7 ", t('lab.board.usually')] })] })) : (_jsxs("div", { className: "lab-ff-state", role: "alert", children: [_jsx("b", { children: t('lab.board.didntWork') }), _jsx("small", { children: takeErrorText(take, t, t('lab.board.tryAnother')) }), _jsxs("span", { className: "lab-ff-state-actions", children: [_jsxs(Button, { type: "button", variant: "elevated", onPointerDown: (e) => e.stopPropagation(), onClick: () => onRetry(take), children: [_jsx(RefreshCw, { size: 18 }), " ", t('lab.canvas.tryAgain')] }), _jsxs(Button, { type: "button", variant: "destructive", onPointerDown: (e) => e.stopPropagation(), onClick: () => onRemove(take), children: [_jsx(Trash2, { size: 18 }), " ", t('lab.canvas.remove')] })] })] })), _jsxs("figcaption", { className: "lab-ff-label", style: { transform: `scale(${1 / view.scale})` }, children: [take.starred && _jsx(Star, { size: 11, fill: "currentColor" }), t(`lab.canvas.op_${take.operation}`), " #", card.number, take.status === 'failed' && _jsx(X, { size: 11 })] })] }, take.id));
                }) }), !cards.length && (_jsx("div", { className: "lab-ff-empty-frame", style: {
                    top: insets.top,
                    right: insets.right,
                    bottom: insets.bottom,
                    left: insets.left,
                }, children: emptyContent ?? (_jsxs("div", { className: "lab-ff-empty", children: [_jsx(PixelArtwork, { variant: "orbit", seed: "image-canvas", size: 84, tone: "muted", animated: true }), _jsx("b", { children: t('lab.board.endless') }), _jsx("small", { children: signedIn
                                ? t('lab.board.describeBelow')
                                : t('lab.board.describeSignIn') }), _jsx("span", { className: "lab-ff-starters", children: starters.map((starter) => (_jsx(Button, { type: "button", variant: "elevated", onPointerDown: (e) => e.stopPropagation(), onClick: () => onStarter(starter.prompt), children: starter.label }, starter.label))) })] })) })), cards.length > 0 && (_jsxs(GlassGroup, { className: "lab-ff-zoom", style: { right: insets.right + 14 }, onPointerDown: (e) => e.stopPropagation(), role: "toolbar", "aria-label": t('lab.board.zoom'), children: [_jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.board.zoomOut'), onClick: () => zoomCentre(1 / 1.25), children: _jsx(Minus, { size: 20 }) }), _jsxs(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", className: "lab-ff-percent", "aria-label": t('lab.board.fitSelection'), title: t('lab.board.fitSelection'), onClick: () => fitCard(selected), children: [percent, "%"] }), _jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.board.zoomIn'), onClick: () => zoomCentre(1.25), children: _jsx(Plus, { size: 20 }) }), _jsx(Button, { type: "button", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": t('lab.board.showAllVersions'), title: t('lab.board.showAll'), onClick: fitAll, disabled: cards.length < 2, children: _jsx(Maximize, { size: 20 }) })] }))] }));
}
//# sourceMappingURL=freeform-board.js.map