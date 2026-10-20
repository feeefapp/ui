'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { useLabI18n } from './i18n.js';
import { installFoPixelFallback } from './brand/pixel-fallback.js';
import './pixel-art.css';
import { voiceFingerprint } from './avatar-fingerprint.js';
function seedNumber(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index++) {
        result = Math.imul(result ^ value.charCodeAt(index), 16777619);
    }
    return result >>> 0;
}
function randomSequence(value) {
    let state = seedNumber(value);
    return () => {
        state += 0x6d2b79f5;
        let next = Math.imul(state ^ (state >>> 15), 1 | state);
        next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
        return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
}
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function artworkPixels(variant, seed) {
    if (variant === 'voice')
        return voiceFingerprint(seed);
    const random = randomSequence(seed);
    const phase = random() * Math.PI * 2;
    const columns = variant === 'wave' ? 32 : 24;
    const rows = variant === 'wave' ? 16 : 24;
    const pixels = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = ((column + 0.5) / columns) * 2 - 1;
            const y = ((row + 0.5) / rows) * 2 - 1;
            const radius = Math.hypot(x, y);
            const angle = Math.atan2(y, x);
            let strength = 0;
            if (variant === 'wave') {
                const crest = Math.sin(x * Math.PI * 2.3 + phase) * 0.22;
                const envelope = Math.pow(Math.max(0, 1 - x * x), 0.6);
                const amplitude = 0.12 + 0.46 * envelope * (0.55 + 0.45 * Math.sin(x * 11 + phase) ** 2);
                strength = Math.max(0, 1 - Math.abs(y - crest) / amplitude);
                strength *= 0.72 + 0.28 * Math.cos(column * Math.PI);
            }
            else if (variant === 'orbit') {
                const ring = Math.max(0, 1 - Math.abs(radius - 0.62) / 0.17);
                const diagonal = Math.max(0, 1 - Math.abs(y + x * 0.47) / 0.13);
                const core = Math.max(0, 1 - Math.hypot(x - 0.16, y + 0.03) / 0.2);
                strength = Math.max(ring * (0.55 + 0.45 * Math.sin(angle + phase) ** 2), diagonal * 0.67, core);
                if (radius > 0.92)
                    strength = 0;
            }
            else {
                const cross = Math.max(0, 1 - Math.min(Math.abs(x), Math.abs(y)) / 0.13);
                const diagonal = Math.max(0, 1 - Math.min(Math.abs(x + y), Math.abs(x - y)) / 0.095);
                const taper = Math.max(0, 1 - radius / 0.86);
                strength = Math.max(cross * taper * 1.45, diagonal * taper * 0.7);
            }
            const threshold = (bayer[(row % 4) * 4 + (column % 4)] + 0.5) / 16;
            if (strength > threshold * 0.81 + 0.055) {
                pixels.push({
                    x: column * 4,
                    y: row * 4,
                    opacity: strength > 0.72 ? 1 : strength > 0.44 ? 0.7 : 0.35,
                });
            }
        }
    }
    return { pixels, width: columns * 4, height: rows * 4 };
}
export function PixelArtwork({ variant = 'voice', seed = 'feeef', size = 48, tone = 'ink', animated = false, className = '', style, title, }) {
    const art = useMemo(() => artworkPixels(variant, seed), [variant, seed]);
    return (_jsx("svg", { className: `lab-pixel-art lab-pixel-tone-${tone} ${animated ? 'lab-pixel-art-animated' : ''} ${className}`, width: size, height: (size * art.height) / art.width, viewBox: `0 0 ${art.width} ${art.height}`, fill: "currentColor", "aria-hidden": title ? undefined : true, "aria-label": title, role: title ? 'img' : undefined, focusable: "false", style: style, children: art.pixels.map((pixel) => (_jsx("rect", { x: pixel.x, y: pixel.y, width: "3", height: "3", opacity: pixel.opacity, fill: pixel.color }, `${pixel.x}-${pixel.y}`))) }));
}
function texturePixels(variant, seed, density) {
    const random = randomSequence(seed);
    const threshold = density === 'dense' ? 0.6 : density === 'medium' ? 0.39 : 0.23;
    const pixels = [];
    for (let row = 0; row < 24; row++) {
        for (let column = 0; column < 64; column++) {
            const x = column / 63;
            const y = row / 23;
            let field = 1;
            if (variant === 'corner')
                field = Math.pow(x, 1.7) * (0.35 + Math.pow(1 - y, 1.4) * 0.65);
            if (variant === 'wave')
                field = Math.max(0, 1 - Math.abs(y - 0.5 - Math.sin(x * 8) * 0.24) * 3);
            if (random() < field * threshold) {
                pixels.push({ x: column * 4, y: row * 4, opacity: 0.25 + random() * 0.75 });
            }
        }
    }
    return pixels;
}
/** Overlay inside a positioned, clipped surface. It inherits the surface's ink color. */
export function PixelTexture({ variant = 'corner', seed = 'feeef-surface', density = 'medium', tone, animated = false, className = '', style, }) {
    const pixels = useMemo(() => texturePixels(variant, seed, density), [variant, seed, density]);
    return (_jsx("svg", { className: `lab-pixel-texture ${tone ? `lab-pixel-tone-${tone}` : ''} ${animated ? 'lab-pixel-texture-animated' : ''} ${className}`, viewBox: "0 0 256 96", preserveAspectRatio: "xMidYMid slice", fill: "currentColor", "aria-hidden": "true", focusable: "false", style: style, children: pixels.map((pixel) => (_jsx("rect", { x: pixel.x, y: pixel.y, width: "2", height: "2", opacity: pixel.opacity }, `${pixel.x}-${pixel.y}`))) }));
}
/** A nine-pixel loading wave; use decorative when adjacent text already announces status. */
export function PixelLoader({ size = 20, label, decorative = false, className = '', }) {
    const { t } = useLabI18n();
    const resolvedLabel = label ?? t('lab.common.loading');
    return (_jsx("span", { className: `lab-pixel-loader ${className}`, role: decorative ? undefined : 'status', "aria-label": decorative ? undefined : resolvedLabel, "aria-hidden": decorative || undefined, style: { '--pixel-loader-size': `${size}px` }, children: Array.from({ length: 9 }, (_, index) => (_jsx("span", { className: "lab-pixel-loader-cell", style: {
                '--pixel-delay': `${(index % 3) * 110 + Math.floor(index / 3) * 80}ms`,
            } }, index))) }));
}
/** The CPU renderer keeps Feeef's transparent pixel field consistent across browser GPU drivers. */
export function PixelShader({ className = '', density = 1.2, speed = 0.35, style, }) {
    const canvas = useRef(null);
    useEffect(() => {
        if (canvas.current)
            return installFoPixelFallback(canvas.current, { density, speed });
    }, [density, speed]);
    return (_jsx("canvas", { ref: canvas, className: `lab-shader lab-pixel-shader ${className}`, "aria-hidden": "true", style: style }));
}
//# sourceMappingURL=pixel-art.js.map