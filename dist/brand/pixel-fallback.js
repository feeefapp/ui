import { onMeasureFrame, onRenderFrame, reducedMotionQuery } from '../physics/motion-value.js';
/** Draws per second while animating. */
const FPS = 18;
/** Cell pitch in canvas pixels; each cell paints a 3 × 3 square. */
const STEP = 4;
/** How far from its ring a pointer ripple still lights squares: 6.5 ring widths. */
const RING_REACH = 6.5 * 0.045;
const BAYER = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
    28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
    7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
/**
 * One clock for every animated field on the page: a timer wakes it at the draw rate, then the
 * kit's shared frame reads every field's styles (with the other layout reads) and paints them
 * (with the other writes). Nothing runs between draws, and nothing at all while no field animates.
 */
const fields = new Set();
let timer = null;
let stopFrame = null;
function wake() {
    if (timer || stopFrame || !fields.size)
        return;
    // Wait out the draw interval, then paint on the next frame: at most FPS draws a second, on vsync.
    timer = setTimeout(() => {
        timer = null;
        let stopPaint = () => { };
        const stopRead = onMeasureFrame(() => {
            stopRead();
            for (const field of fields)
                field.read();
            stopPaint = onRenderFrame((now) => {
                stopPaint();
                stopFrame = null;
                for (const field of [...fields])
                    field.paint(now);
                wake();
            });
        });
        stopFrame = () => {
            stopRead();
            stopPaint();
        };
    }, 1000 / FPS);
}
function animateField(field, on) {
    if (on) {
        fields.add(field);
        wake();
        return;
    }
    fields.delete(field);
    if (fields.size)
        return;
    if (timer)
        clearTimeout(timer);
    stopFrame?.();
    timer = null;
    stopFrame = null;
}
/** Ordered 8×8 dithering, inspired by the Wave reference; transparent CPU paint avoids GPU driver artifacts. */
export function installFoPixelFallback(original, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = original.className;
    canvas.style.cssText = original.style.cssText;
    canvas.setAttribute('aria-hidden', 'true');
    original.after(canvas);
    const display = original.style.display;
    original.style.display = 'none';
    const context = canvas.getContext('2d');
    if (!context) {
        canvas.remove();
        original.style.display = display;
        return () => { };
    }
    const reduced = reducedMotionQuery();
    const density = Math.min(1.35, options.density ?? 1.2);
    let last = 0, time = 1.7, visible = true, dead = false, ink = '';
    const ripples = [];
    // The painted cells, so a draw only touches the squares that changed since the last one.
    let columns = 0, rows = 0, lit = new Uint8Array(0), next = new Uint8Array(0), fade = new Float32Array(0), painted = false;
    function layout() {
        const width = canvas.width, height = canvas.height;
        columns = Math.ceil(width / STEP);
        rows = Math.ceil(height / STEP);
        lit = new Uint8Array(columns * rows);
        next = new Uint8Array(columns * rows);
        fade = new Float32Array(columns * rows);
        for (let row = 0; row < rows; row++)
            for (let column = 0; column < columns; column++) {
                const u = (column * STEP) / Math.max(1, width), v = (row * STEP) / Math.max(1, height);
                fade[row * columns + column] = Math.min(1, Math.min(u, v, 1 - u, 1 - v) / 0.09);
            }
        painted = false;
    }
    function field() {
        const width = canvas.width, height = canvas.height, w = Math.max(1, width), h = Math.max(1, height);
        // Terms that depend on one axis only, computed once per column and row.
        const crest = new Float64Array(columns), foldSin = new Float64Array(columns), foldCos = new Float64Array(columns);
        for (let column = 0; column < columns; column++) {
            const u = (column * STEP) / w;
            crest[column] = 0.48 + 0.22 * Math.sin(u * 7.2 + time) + 0.11 * Math.sin(u * 13.1 - time * 0.63);
            foldSin[column] = Math.sin(u * 11 - time * 0.42);
            foldCos[column] = Math.cos(u * 11 - time * 0.42);
        }
        // Below this squared band distance a square stays dark whatever its fold and dither: the band
        // alone cannot reach the lowest threshold. Skipping those squares changes nothing drawn.
        const bandCut = Math.log((0.61 * density) / (0.5 / 64)) + 0.01;
        // A ripple only reaches squares near its ring: beyond 6.5 ring widths it adds < 1e-19.
        const rings = ripples.map((ripple) => {
            const age = time - ripple.time, radius = age * 0.16, inner = Math.max(0, radius - RING_REACH), outer = radius + RING_REACH;
            return { x: ripple.x, y: ripple.y, radius, decay: Math.exp(-age * 2), inner: inner * inner, outer: outer * outer };
        });
        for (let row = 0; row < rows; row++) {
            const y = row * STEP, v = y / h, rowSin = Math.sin(v * 5), rowCos = Math.cos(v * 5), bayerRow = (row % 8) * 8;
            for (let column = 0; column < columns; column++) {
                const index = row * columns + column;
                const z = (v - crest[column]) / 0.22;
                if (!rings.length && z * z > bandCut) {
                    next[index] = 0;
                    continue;
                }
                const band = Math.exp(-(z ** 2));
                // sin(u·11 + v·5 − t·0.42), by angle addition.
                const fold = 0.5 + 0.5 * (foldSin[column] * rowCos + foldCos[column] * rowSin);
                let strength = band * (0.23 + fold * 0.38) * density;
                if (rings.length) {
                    const x = column * STEP;
                    for (const ring of rings) {
                        const dx = (x - ring.x) / w, dy = (y - ring.y) / h, squared = dx * dx + dy * dy;
                        if (squared < ring.inner || squared > ring.outer)
                            continue;
                        const distance = Math.hypot(dx, dy);
                        strength += Math.exp(-(((distance - ring.radius) / 0.045) ** 2)) * ring.decay * 0.35;
                    }
                }
                next[index] = strength > (BAYER[bayerRow + (column % 8)] + 0.5) / 64 ? 1 : 0;
            }
        }
    }
    function readInk() {
        const color = getComputedStyle(canvas).getPropertyValue('--lab-pixel-ink').trim() || '#86e672';
        // A new ink (theme) repaints every square; otherwise only the ones that changed.
        if (color !== ink) {
            ink = color;
            painted = false;
        }
    }
    function draw() {
        const ctx = context;
        field();
        ctx.fillStyle = ink;
        if (!painted)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alpha = -1;
        for (let index = 0; index < next.length; index++) {
            const on = next[index];
            if (painted && on === lit[index])
                continue;
            lit[index] = on;
            const x = (index % columns) * STEP, y = Math.floor(index / columns) * STEP;
            if (!on) {
                if (painted)
                    ctx.clearRect(x, y, 3, 3);
                continue;
            }
            if (fade[index] !== alpha)
                ctx.globalAlpha = alpha = fade[index];
            ctx.fillRect(x, y, 3, 3);
        }
        painted = true;
        canvas.dataset.foPixelReady = 'true';
        canvas.dataset.foPixelRenderer = '2d-bayer8';
    }
    const animation = {
        read: readInk,
        paint(now) {
            if (dead)
                return;
            time += Math.min((now - last) / 1000, 0.1) * (options.speed ?? 0.35);
            last = now;
            while (ripples.length && time - ripples[0].time > 3)
                ripples.shift();
            draw();
        },
    };
    /** Draws now, and keeps animating only while on screen, in a visible tab, with full motion. */
    function resume() {
        last = performance.now();
        const live = !dead && visible && !document.hidden;
        if (live) {
            readInk();
            draw();
        }
        animateField(animation, live && !reduced.matches);
    }
    function resize() {
        const rect = canvas.getBoundingClientRect(), scale = Math.min(1, 1200 / Math.max(1, rect.width));
        canvas.width = Math.max(1, Math.round(rect.width * scale));
        canvas.height = Math.max(1, Math.round(rect.height * scale));
        layout();
        readInk();
        draw();
    }
    function ripple(event) {
        if (reduced.matches)
            return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return;
        ripples.push({
            x: ((event.clientX - rect.left) * canvas.width) / rect.width,
            y: ((event.clientY - rect.top) * canvas.height) / rect.height,
            time,
        });
        if (ripples.length > 8)
            ripples.shift();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
    });
    visibility.observe(canvas);
    const theme = new MutationObserver(resume);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lab-theme'] });
    resize();
    resume();
    document.addEventListener('pointerdown', ripple, { passive: true });
    document.addEventListener('visibilitychange', resume);
    reduced.addEventListener('change', resume);
    return () => {
        dead = true;
        animateField(animation, false);
        resizeObserver.disconnect();
        visibility.disconnect();
        theme.disconnect();
        document.removeEventListener('pointerdown', ripple);
        document.removeEventListener('visibilitychange', resume);
        reduced.removeEventListener('change', resume);
        canvas.remove();
        original.style.display = display;
    };
}
//# sourceMappingURL=pixel-fallback.js.map