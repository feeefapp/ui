import { MotionValue, onAnimationFrame } from '../physics/motion-value.js';
import { SPRINGS } from '../physics/spring.js';
import { boundsOf, clampRadius, glassPaths, hostFrame, toLocalPoint, toLocalRect, toScreenPoint, translatePath, } from './geometry.js';
import { DEFAULT_GLASS_LIGHT, glassLightToward, rimGradient } from './light.js';
import { planGlassTransition, sameRect } from './transitions.js';
import { adaptiveGlassTone, backdropTone } from './adaptive.js';
import { GLASS_REFRACTION, displacementMap, supportsRefraction } from './refraction.js';
import { GLASS_CONTENT_FOLLOW, GLASS_PRESS_SCALE, glassStretch, pressedShape } from './press.js';
/** How far (px) the material may reach past the container, for overshoot and growing bubbles. */
export const GLASS_MARGIN = 32;
const SPRING = SPRINGS.snappy;
const SVG = 'http://www.w3.org/2000/svg';
/** One bubble's glass: an animated rect, its corner radius and, while alive, its element. */
class Shape {
    x;
    y;
    width;
    height;
    scale;
    /** Press response: swell and stretch toward a dragging finger. */
    press = new MotionValue(1, 0.0005);
    stretchX = new MotionValue(0, 0.05);
    stretchY = new MotionValue(0, 0.05);
    radius = 0;
    layout = null;
    /** Translation written to the element so its content rides with the glass. */
    offset = { x: 0, y: 0 };
    /** Content follows the glass only for moves of the same bubble, not while growing out of another. */
    carry = true;
    leaving = false;
    token = 0;
    constructor(rect, scale = 1) {
        this.x = new MotionValue(rect.x, 0.05);
        this.y = new MotionValue(rect.y, 0.05);
        this.width = new MotionValue(rect.width, 0.05);
        this.height = new MotionValue(rect.height, 0.05);
        this.scale = new MotionValue(scale, 0.001);
    }
    rect() {
        return { x: this.x.get(), y: this.y.get(), width: this.width.get(), height: this.height.get() };
    }
    /** The rect drawn this frame (scaled around its centre while materializing). */
    visual() {
        const s = Math.max(0, this.scale.get());
        const w = this.width.get() * s;
        const h = this.height.get() * s;
        const base = {
            x: this.x.get() + (this.width.get() - w) / 2,
            y: this.y.get() + (this.height.get() - h) / 2,
            width: w,
            height: h,
            radius: this.radius * s,
        };
        return pressedShape(base, this.press.get(), this.stretchX.get(), this.stretchY.get());
    }
    values() {
        return [this.x, this.y, this.width, this.height, this.scale, this.press, this.stretchX, this.stretchY];
    }
    set(rect) {
        this.x.set(rect.x);
        this.y.set(rect.y);
        this.width.set(rect.width);
        this.height.set(rect.height);
    }
    animate(rect, instant) {
        return Promise.all([
            this.x.animateTo(rect.x, { spring: SPRING, instant }),
            this.y.animateTo(rect.y, { spring: SPRING, instant }),
            this.width.animateTo(rect.width, { spring: SPRING, instant }),
            this.height.animateTo(rect.height, { spring: SPRING, instant }),
        ]).then((done) => done.every(Boolean));
    }
}
/** Animated properties that move or resize a box (opacity and colour don't). */
const GEOMETRY = /^(all|transform|translate|scale|rotate|width|height|min-|max-|top|left|right|bottom|inset|margin|padding|offset|grid|flex|zoom)/;
/** True when `animation` is running and changes geometry (CSS transition, keyframes or WAAPI). */
export function movesGeometry(animation) {
    if (animation.playState !== 'running')
        return false;
    const transition = animation.transitionProperty;
    if (transition)
        return GEOMETRY.test(transition);
    const effect = animation.effect;
    // Keyframe objects also carry bookkeeping keys (offset, easing, composite); skip those.
    const properties = (effect?.getKeyframes?.().flatMap((frame) => Object.keys(frame)) ?? []).filter((name) => !['offset', 'computedOffset', 'easing', 'composite'].includes(name));
    return properties.some((name) => GEOMETRY.test(name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())));
}
const radiusOf = (element) => {
    const value = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
    return Number.isFinite(value) ? value : 0;
};
/**
 * The engine behind GlassContainer: tracks bubbles, springs their glass between layouts, plans
 * splits and merges, and paints one material (a backdrop clipped to the blended outline, plus an
 * SVG for edge, light and shadow). DOM-only; React just hands it elements.
 */
export class GlassScene {
    host;
    backdrop;
    paint;
    shadow;
    members = new Map();
    shapes = new Map();
    measured = false;
    measureQueued = false;
    drawHook = null;
    dirty = false;
    resize = null;
    mutations = null;
    pointer = null;
    cache = { key: '', paths: [] };
    uid;
    pressed = null;
    glow = null;
    spacing = 8;
    reduceMotion = false;
    followPointer = true;
    /** Bubbles swell, stretch and glow under a press (Apple's interactive glass). */
    interactive = true;
    /** Small glass flips light/dark to stay legible over what is behind it. */
    adaptive = true;
    /** `canvas` adds refraction (displacement maps) once the glass settles, where supported. */
    renderer = 'fill';
    refractKey = '';
    refractTimer = null;
    filters = [];
    filterHost = null;
    disposed = false;
    mountedAt = typeof performance === 'undefined' ? 0 : performance.now();
    /** True while some bubble (or an ancestor up to the container) runs a geometric animation. */
    tracking = false;
    /** One backdrop element per cluster: a lone bubble clips with border-radius, which every
     * browser applies to backdrop-filter; only merging bubbles need a path clip, in their own box. */
    pieces = [];
    sampleFrame = 0;
    themeObserver = null;
    visibility = null;
    sampleTimer = null;
    constructor(host, backdrop, paint, shadow, uid) {
        this.host = host;
        this.backdrop = backdrop;
        this.paint = paint;
        this.shadow = shadow;
        this.uid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
        backdrop.replaceChildren();
        if (typeof ResizeObserver !== 'undefined') {
            this.resize = new ResizeObserver(() => this.measure());
            this.resize.observe(host);
        }
        if (typeof MutationObserver !== 'undefined') {
            // Bubbles hidden with `inert`, `hidden` or `data-glass-hidden` (collapsed toolbars, search
            // taking over, a title scrolled away) leave the glass.
            this.mutations = new MutationObserver(() => this.requestMeasure());
            this.mutations.observe(host, { subtree: true, attributes: true, attributeFilter: ['inert', 'hidden', 'data-glass-hidden'] });
        }
        host.addEventListener('pointerdown', this.onPressStart, { passive: true });
        window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
        if (typeof MutationObserver !== 'undefined') {
            this.themeObserver = new MutationObserver(this.requestSample);
            this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lab-theme'] });
        }
        // Content can change behind still glass (a photo loads, a tab switches): re-check twice a
        // second, only while the glass is on screen and the page visible.
        if (typeof IntersectionObserver !== 'undefined') {
            this.visibility = new IntersectionObserver(([entry]) => {
                if (this.sampleTimer)
                    clearInterval(this.sampleTimer);
                this.sampleTimer = entry?.isIntersecting
                    ? setInterval(() => {
                        if (this.adaptive && document.visibilityState === 'visible')
                            this.requestSample();
                    }, 500)
                    : null;
            });
            this.visibility.observe(host);
        }
    }
    /** Any scroll changes what is behind the glass; a scroller inside the container also moves bubbles. */
    onScroll = (event) => {
        this.requestSample();
        if (event.target instanceof Node && event.target !== this.host && this.host.contains(event.target))
            this.requestMeasure();
    };
    /** Re-reads what is behind the glass on the next frame (scroll, theme or layout changed). */
    requestSample = () => {
        if (this.sampleFrame || typeof requestAnimationFrame === 'undefined')
            return;
        this.sampleFrame = requestAnimationFrame(() => {
            this.sampleFrame = 0;
            this.sampleBackdrop();
        });
    };
    sampleBackdrop() {
        const paths = this.cache.paths;
        let tone = null;
        if (this.adaptive && paths.length && typeof document.elementsFromPoint === 'function') {
            const frame = this.frame();
            const tones = paths.map((path) => {
                const { x, y } = toScreenPoint(frame, path.bounds.x - GLASS_MARGIN + path.bounds.width / 2, path.bounds.y - GLASS_MARGIN + path.bounds.height / 2);
                const samples = document
                    .elementsFromPoint(x, y)
                    .filter((element) => !this.host.contains(element))
                    .map((element) => ({
                    tone: element.closest('[data-lab-backdrop]')?.getAttribute('data-lab-backdrop'),
                    color: getComputedStyle(element).backgroundColor,
                }));
                return backdropTone(samples);
            });
            const mode = document.documentElement.getAttribute('data-lab-theme') === 'dark' ? 'dark' : 'light';
            tone = adaptiveGlassTone(tones, mode, Math.max(...paths.map((path) => path.bounds.height)));
        }
        if (tone)
            this.host.setAttribute('data-glass-backdrop', tone);
        else
            this.host.removeAttribute('data-glass-backdrop');
    }
    onPressStart = (event) => {
        if (!this.interactive || this.reduceMotion || event.button > 0 || this.pressed)
            return;
        const target = event.target;
        if (!target || target.closest('input, textarea, select, [contenteditable="true"]'))
            return;
        const element = target.closest('[data-glass-member]');
        const id = element && [...this.members].find(([, member]) => member.element === element)?.[0];
        const shape = id ? this.shapes.get(id) : undefined;
        if (!id || !shape || shape.leaving)
            return;
        this.pressed = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY };
        // Large surfaces (docks, panels) glow but don't swell.
        if (shape.height.get() <= 64)
            void shape.press.animateTo(GLASS_PRESS_SCALE, { spring: SPRING });
        const point = toLocalPoint(this.frame(), event.clientX, event.clientY);
        const glow = { x: point.x, y: point.y, radius: new MotionValue(8, 0.5), opacity: new MotionValue(1, 0.005) };
        this.glow = glow;
        void glow.radius.animateTo(Math.max(120, shape.width.get()), { spring: SPRINGS.smooth });
        window.addEventListener('pointermove', this.onPressMove, { passive: true });
        window.addEventListener('pointerup', this.onPressEnd, { passive: true });
        window.addEventListener('pointercancel', this.onPressEnd, { passive: true });
        this.scheduleDraw();
    };
    onPressMove = (event) => {
        const pressed = this.pressed;
        if (!pressed || event.pointerId !== pressed.pointer)
            return;
        const shape = this.shapes.get(pressed.id);
        if (!shape)
            return;
        const frame = this.frame();
        const stretch = glassStretch((event.clientX - pressed.x) / frame.scaleX, (event.clientY - pressed.y) / frame.scaleY);
        shape.stretchX.track(stretch.x, event.timeStamp);
        shape.stretchY.track(stretch.y, event.timeStamp);
        if (this.glow) {
            const point = toLocalPoint(frame, event.clientX, event.clientY);
            this.glow.x = point.x;
            this.glow.y = point.y;
        }
        this.scheduleDraw();
    };
    onPressEnd = (event) => {
        const pressed = this.pressed;
        if (!pressed || event.pointerId !== pressed.pointer)
            return;
        this.pressed = null;
        window.removeEventListener('pointermove', this.onPressMove);
        window.removeEventListener('pointerup', this.onPressEnd);
        window.removeEventListener('pointercancel', this.onPressEnd);
        const shape = this.shapes.get(pressed.id);
        if (shape) {
            void shape.press.animateTo(1, { spring: SPRINGS.bouncy });
            void shape.stretchX.animateTo(0, { spring: SPRINGS.bouncy });
            void shape.stretchY.animateTo(0, { spring: SPRINGS.bouncy });
        }
        const glow = this.glow;
        if (glow)
            void glow.opacity.animateTo(0, { spring: SPRINGS.smooth }).then(() => {
                if (this.glow === glow)
                    this.glow = null;
                this.scheduleDraw();
            });
        this.scheduleDraw();
    };
    register(id, element, options) {
        this.members.set(id, { element, options });
        this.resize?.observe(element);
        this.requestMeasure();
        return () => {
            if (this.members.get(id)?.element === element)
                this.members.delete(id);
            this.resize?.unobserve(element);
            this.requestMeasure();
        };
    }
    requestMeasure() {
        if (this.measureQueued)
            return;
        this.measureQueued = true;
        // Microtasks run after React's layout effects and before the browser paints.
        queueMicrotask(() => {
            this.measureQueued = false;
            this.measure();
        });
    }
    setPointer(point) {
        this.pointer = point;
        this.scheduleDraw();
    }
    dispose() {
        this.host.removeEventListener('pointerdown', this.onPressStart);
        window.removeEventListener('scroll', this.onScroll, { capture: true });
        this.themeObserver?.disconnect();
        this.visibility?.disconnect();
        if (this.refractTimer)
            clearTimeout(this.refractTimer);
        this.filterHost?.remove();
        if (this.sampleTimer)
            clearInterval(this.sampleTimer);
        if (this.sampleFrame)
            cancelAnimationFrame(this.sampleFrame);
        window.removeEventListener('pointermove', this.onPressMove);
        window.removeEventListener('pointerup', this.onPressEnd);
        window.removeEventListener('pointercancel', this.onPressEnd);
        this.resize?.disconnect();
        this.mutations?.disconnect();
        this.drawHook?.();
        this.drawHook = null;
        for (const shape of this.shapes.values())
            for (const value of shape.values())
                value.stop();
        // Leave nothing painted behind: a remounted container (hot reload, React's development
        // double mount, a parent remount) starts from a clean layer.
        for (const piece of this.pieces)
            piece.remove();
        this.pieces = [];
        this.paint.replaceChildren();
        this.shadow.replaceChildren();
        for (const member of this.members.values()) {
            member.element.style.translate = '';
            member.element.style.scale = '';
        }
        this.host.removeAttribute('data-glass-backdrop');
        this.disposed = true;
    }
    /** Reads every bubble's layout box and moves the glass toward it. */
    measure() {
        if (this.disposed)
            return;
        const frame = this.frame();
        let tracking = false;
        const targets = new Map();
        const unions = new Map();
        const unionRadius = new Map();
        for (const [id, member] of this.members) {
            const { element, options } = member;
            if (!element.isConnected || element.closest('[inert],[hidden],[data-glass-hidden]'))
                continue;
            // Never a bubble inside a bubble: a grouped control inside a toolbar group joins its glass.
            if (element.parentElement?.closest('[data-glass-member]'))
                continue;
            const box = element.getBoundingClientRect();
            if (!box.width || !box.height)
                continue;
            const shape = this.shapes.get(id);
            const offset = shape?.offset ?? { x: 0, y: 0 };
            const animated = this.animatedBetween(element);
            if (animated)
                tracking = true;
            // In the container's own pixels (ancestors may scale it), minus our own content offset.
            const local = toLocalRect(frame, box);
            const rect = { x: local.x - offset.x, y: local.y - offset.y, width: local.width, height: local.height };
            const radius = radiusOf(element);
            if (options.union) {
                const key = `union:${options.union}`;
                unions.set(key, [...(unions.get(key) ?? []), rect]);
                unionRadius.set(key, Math.min(unionRadius.get(key) ?? Infinity, radius));
            }
            else
                targets.set(id, { rect, radius, member, animated });
        }
        for (const [key, rects] of unions)
            targets.set(key, { rect: boundsOf(rects), radius: unionRadius.get(key), member: null });
        // Bubbles present when the page appears just appear: no growing in on load, even when they
        // register a little after the container (lazy or conditional content).
        const instant = this.reduceMotion || !this.measured || performance.now() - this.mountedAt < 300;
        const previous = new Map([...this.shapes].map(([id, shape]) => [id, shape.rect()]));
        const next = new Map([...targets].map(([id, target]) => [id, target.rect]));
        const plan = planGlassTransition(previous, next, this.spacing);
        for (const birth of plan.births) {
            const target = targets.get(birth.id);
            const grow = birth.kind === 'grow' && !instant;
            const shape = new Shape(grow ? birth.from : target.rect, grow || instant ? 1 : 0);
            shape.carry = !grow;
            this.shapes.set(birth.id, shape);
            if (!instant && target.member)
                fadeIn(target.member.element);
        }
        for (const death of plan.deaths) {
            const shape = this.shapes.get(death.id);
            if (!shape || shape.leaving)
                continue;
            shape.leaving = true;
            shape.layout = null;
            this.release(shape, death.id);
            const token = ++shape.token;
            const done = () => {
                if (shape.token === token && shape.leaving && this.shapes.get(death.id) === shape)
                    this.shapes.delete(death.id);
                this.scheduleDraw();
            };
            if (instant)
                this.shapes.delete(death.id);
            else {
                if (death.kind === 'absorb')
                    void shape.animate(death.into, false).then(done);
                else
                    void shape.scale.animateTo(0, { spring: SPRING }).then(done);
                // Springs only advance on animation frames, which a hidden or background tab pauses:
                // never leave a departed bubble's glass behind for longer than this.
                setTimeout(done, 900);
            }
        }
        for (const [id, target] of targets) {
            const shape = this.shapes.get(id);
            shape.leaving = false;
            shape.radius = target.radius;
            // Bubbles that animate their own size, or that something else is animating right now, are
            // followed exactly instead of sprung, so the glass never lags behind them.
            const follow = target.member?.options.motion === 'follow' || !!target.animated;
            const changed = !shape.layout || !sameRect(shape.layout, target.rect);
            shape.layout = target.rect;
            if (shape.scale.getTarget() !== 1)
                void shape.scale.animateTo(1, { spring: SPRING, instant });
            if (follow || instant)
                shape.set(target.rect);
            else if (changed || !sameRect(shape.rect(), target.rect)) {
                const token = ++shape.token;
                void shape.animate(target.rect, false).then((arrived) => {
                    if (arrived && shape.token === token)
                        shape.carry = true;
                    this.scheduleDraw();
                });
            }
        }
        this.measured = true;
        this.tracking = tracking;
        this.draw();
        this.scheduleDraw();
        this.requestSample();
    }
    release(shape, id) {
        const member = this.members.get(id);
        if (member)
            member.element.style.translate = '';
        shape.offset = { x: 0, y: 0 };
    }
    scheduleDraw() {
        this.dirty = true;
        if (this.drawHook)
            return;
        this.drawHook = onAnimationFrame(() => {
            const glow = this.glow;
            const moving = [...this.shapes.values()].some((shape) => shape.values().some((v) => v.isAnimating())) ||
                (glow !== null && (glow.radius.isAnimating() || glow.opacity.isAnimating()));
            // Transforms and transitions don't fire ResizeObserver: re-measure every frame while they run.
            if (this.tracking) {
                this.measure();
                return;
            }
            if (this.dirty || moving) {
                this.dirty = false;
                this.draw();
            }
            else {
                this.drawHook?.();
                this.drawHook = null;
            }
        });
    }
    /** Paints the current frame: element offsets, backdrop clip, edge, light and shadow. */
    draw() {
        if (this.disposed)
            return;
        const visuals = [];
        for (const [id, shape] of this.shapes) {
            visuals.push({ ...shape.visual(), id });
            const member = this.members.get(id);
            if (!member || shape.leaving || !shape.layout)
                continue;
            // Content rides with its glass (centre to centre) while the bubble moves.
            const dx = shape.carry ? shape.x.get() + shape.width.get() / 2 - (shape.layout.x + shape.layout.width / 2) : 0;
            const dy = shape.carry ? shape.y.get() + shape.height.get() / 2 - (shape.layout.y + shape.layout.height / 2) : 0;
            const fx = dx + shape.stretchX.get() * GLASS_CONTENT_FOLLOW;
            const fy = dy + shape.stretchY.get() * GLASS_CONTENT_FOLLOW;
            const x = Math.abs(fx) < 0.05 ? 0 : fx;
            const y = Math.abs(fy) < 0.05 ? 0 : fy;
            if (x !== shape.offset.x || y !== shape.offset.y) {
                member.element.style.translate = x || y ? `${x}px ${y}px` : '';
                shape.offset = { x, y };
            }
            const press = shape.press.get();
            member.element.style.scale = Math.abs(press - 1) < 0.001 ? '' : String(press);
        }
        const m = GLASS_MARGIN;
        const placed = visuals.map((v) => ({ ...v, x: v.x + m, y: v.y + m }));
        const key = `${this.spacing}|${placed.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.width.toFixed(1)},${v.height.toFixed(1)},${v.radius.toFixed(1)}`).join(';')}`;
        if (key !== this.cache.key)
            this.cache = { key, paths: glassPaths(placed, this.spacing) };
        const paths = this.cache.paths;
        const d = paths.map((p) => p.d).join('');
        this.syncBackdrops(paths);
        const frame = this.frame();
        const lights = paths.map((p) => this.lightFor(p.bounds, frame));
        const glow = this.glow;
        renderPaint(this.paint, paths, lights, this.uid, glow ? { x: glow.x + m, y: glow.y + m, radius: glow.radius.get(), opacity: glow.opacity.get() } : null);
        renderShadow(this.shadow, d, this.uid);
        this.host.toggleAttribute('data-glass-ready', true);
        this.updateRefraction(key);
    }
    syncBackdrops(paths) {
        while (this.pieces.length < paths.length) {
            const piece = document.createElement('div');
            piece.className = 'lab-glass-backdrop';
            this.backdrop.append(piece);
            this.pieces.push(piece);
        }
        while (this.pieces.length > paths.length)
            this.pieces.pop().remove();
        paths.forEach((path, i) => {
            const { x, y, width, height } = path.bounds;
            const style = this.pieces[i].style;
            style.left = `${x}px`;
            style.top = `${y}px`;
            style.width = `${width}px`;
            style.height = `${height}px`;
            if (path.shapes.length === 1) {
                style.borderRadius = `${clampRadius(path.shapes[0])}px`;
                style.clipPath = '';
            }
            else {
                style.borderRadius = '';
                style.clipPath = `path("${translatePath(path.d, -x, -y)}")`;
            }
        });
    }
    /**
     * Canvas renderer: CSS glass while anything moves; once the outline has been still for a moment,
     * build a displacement map for it and bend the backdrop at the glass edges (Chromium).
     */
    updateRefraction(key) {
        const wanted = this.renderer === 'canvas' &&
            supportsRefraction() &&
            document.documentElement.getAttribute('data-lab-glass') !== 'solid' &&
            !window.matchMedia?.('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches;
        const moving = [...this.shapes.values()].some((shape) => shape.values().some((v) => v.isAnimating()));
        if (!wanted || moving || key !== this.refractKey) {
            for (const piece of this.pieces)
                if (piece.style.backdropFilter) {
                    piece.style.backdropFilter = '';
                    piece.style.removeProperty('-webkit-backdrop-filter');
                }
            if (this.refractKey !== key || !wanted)
                this.refractKey = '';
        }
        if (!wanted || moving || this.refractKey === key)
            return;
        if (this.refractTimer)
            clearTimeout(this.refractTimer);
        this.refractTimer = setTimeout(() => {
            this.refractTimer = null;
            if (this.cache.key === key)
                this.applyRefraction(key);
        }, 120);
    }
    applyRefraction(key) {
        if (!this.filterHost) {
            // Its own hidden SVG: the paint and shadow layers are rebuilt every frame.
            this.filterHost = node('svg', { 'width': 0, 'height': 0, 'aria-hidden': 'true', 'class': 'lab-glass-filters' });
            this.backdrop.parentElement?.append(this.filterHost);
        }
        this.cache.paths.forEach((path, i) => {
            const piece = this.pieces[i];
            if (!piece)
                return;
            const { x, y, width, height } = path.bounds;
            const shifted = path.shapes.map((shape) => ({ ...shape, x: shape.x - x, y: shape.y - y }));
            const map = displacementMap(Math.ceil(width), Math.ceil(height), [shifted], this.spacing);
            const canvas = document.createElement('canvas');
            canvas.width = map.width;
            canvas.height = map.height;
            const context = canvas.getContext('2d');
            if (!context)
                return;
            context.putImageData(new ImageData(map.data, map.width, map.height), 0, 0);
            let filter = this.filters[i];
            if (!filter) {
                filter = node('filter', { 'id': `${this.uid}-r${i}`, 'color-interpolation-filters': 'sRGB', 'filterUnits': 'userSpaceOnUse', 'x': 0, 'y': 0 });
                // Bend, blur and tint the backdrop, then keep only the glass shape (the map's alpha).
                filter.append(node('feImage', { result: 'map', preserveAspectRatio: 'none', x: 0, y: 0 }), node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: GLASS_REFRACTION * 2, result: 'bent' }), node('feGaussianBlur', { in: 'bent', stdDeviation: 6, result: 'soft' }), node('feColorMatrix', { in: 'soft', type: 'saturate', values: 1.15, result: 'tone' }), node('feComposite', { in: 'tone', in2: 'map', operator: 'in' }));
                this.filterHost.append(filter);
                this.filters[i] = filter;
            }
            for (const element of [filter, filter.firstElementChild]) {
                element.setAttribute('width', String(map.width));
                element.setAttribute('height', String(map.height));
            }
            filter.firstElementChild.setAttribute('href', canvas.toDataURL());
            const value = `url(#${this.uid}-r${i})`;
            piece.style.backdropFilter = value;
            piece.style.setProperty('-webkit-backdrop-filter', value);
        });
        this.refractKey = key;
    }
    lightFor(bounds, frame) {
        if (!this.followPointer || this.reduceMotion || !this.pointer)
            return DEFAULT_GLASS_LIGHT;
        const centre = toScreenPoint(frame, bounds.x - GLASS_MARGIN + bounds.width / 2, bounds.y - GLASS_MARGIN + bounds.height / 2);
        return glassLightToward(centre, this.pointer);
    }
    /** True when `element`, or an ancestor below the container, runs a geometric animation. */
    animatedBetween(element) {
        for (let node = element; node && node !== this.host; node = node.parentElement)
            if (node.getAnimations?.().some(movesGeometry))
                return true;
        return false;
    }
    /** The container on screen and the scale its ancestors apply to it. */
    frame() {
        return hostFrame(this.host.getBoundingClientRect(), this.host.offsetWidth, this.host.offsetHeight);
    }
}
function fadeIn(element) {
    element.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 80, easing: 'ease-out', fill: 'backwards' });
}
const node = (tag, attrs) => {
    const el = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attrs))
        el.setAttribute(name, String(value));
    return el;
};
/** Edge and light, one clipped group per cluster so each bubble is lit on its own. */
function renderPaint(svg, paths, lights, uid, glow) {
    const defs = node('defs', {});
    const parts = [defs];
    paths.forEach((path, i) => {
        const clip = node('clipPath', { id: `${uid}-c${i}` });
        clip.append(node('path', { d: path.d }));
        const g = rimGradient(path.bounds, lights[i]);
        const gradient = node('linearGradient', { id: `${uid}-g${i}`, gradientUnits: 'userSpaceOnUse', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 });
        for (const [offset, stop] of [
            [0, 'lab-glass-stop-light'],
            [0.22, 'lab-glass-stop-low'],
            [0.48, 'lab-glass-stop-none'],
            [0.72, 'lab-glass-stop-none'],
            [1, 'lab-glass-stop-low'],
        ])
            gradient.append(node('stop', { offset, class: stop }));
        defs.append(clip, gradient);
        const group = node('g', { 'clip-path': `url(#${uid}-c${i})` });
        group.append(node('path', { d: path.d, class: 'lab-glass-edge' }), node('path', { d: path.d, class: 'lab-glass-rim', stroke: `url(#${uid}-g${i})` }));
        parts.push(group);
    });
    if (glow && glow.opacity > 0.01 && paths.length) {
        // Light from under the finger, spilling onto every bubble it reaches (clipped to all glass).
        const clip = node('clipPath', { id: `${uid}-gc` });
        clip.append(node('path', { d: paths.map((p) => p.d).join('') }));
        const gradient = node('radialGradient', { id: `${uid}-gg`, gradientUnits: 'userSpaceOnUse', cx: glow.x, cy: glow.y, r: Math.max(1, glow.radius) });
        gradient.append(node('stop', { offset: 0, class: 'lab-glass-glow-stop' }), node('stop', { offset: 1, class: 'lab-glass-glow-stop', 'stop-opacity': 0 }));
        defs.append(clip, gradient);
        const group = node('g', { 'clip-path': `url(#${uid}-gc)`, opacity: glow.opacity });
        group.append(node('circle', { cx: glow.x, cy: glow.y, r: Math.max(1, glow.radius), fill: `url(#${uid}-gg)` }));
        parts.push(group);
    }
    svg.replaceChildren(...parts);
}
/** A soft shadow outside the glass only (masked), like CSS box-shadow. */
function renderShadow(svg, d, uid) {
    if (!d) {
        svg.replaceChildren();
        return;
    }
    const defs = node('defs', {});
    const mask = node('mask', { id: `${uid}-m`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: '100%', height: '100%' });
    mask.append(node('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'white' }), node('path', { d, fill: 'black' }));
    const blur = node('filter', { id: `${uid}-b`, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: '100%', height: '100%' });
    blur.append(node('feGaussianBlur', { stdDeviation: 7 }));
    defs.append(mask, blur);
    const group = node('g', { mask: `url(#${uid}-m)` });
    group.append(node('path', { d, class: 'lab-glass-shadow-shape', transform: 'translate(0 6)', filter: `url(#${uid}-b)` }));
    svg.replaceChildren(defs, group);
}
//# sourceMappingURL=scene.js.map