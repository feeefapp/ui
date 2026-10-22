import { MotionValue, onAnimationFrame } from '../physics/motion-value.js';
import { SPRINGS } from '../physics/spring.js';
import { boundsOf, glassPaths } from './geometry.js';
import { DEFAULT_GLASS_LIGHT, glassLightToward, rimGradient } from './light.js';
import { planGlassTransition, sameRect } from './transitions.js';
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
        return {
            x: this.x.get() + (this.width.get() - w) / 2,
            y: this.y.get() + (this.height.get() - h) / 2,
            width: w,
            height: h,
            radius: this.radius * s,
        };
    }
    values() {
        return [this.x, this.y, this.width, this.height, this.scale];
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
    spacing = 8;
    reduceMotion = false;
    followPointer = true;
    constructor(host, backdrop, paint, shadow, uid) {
        this.host = host;
        this.backdrop = backdrop;
        this.paint = paint;
        this.shadow = shadow;
        this.uid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
        if (typeof ResizeObserver !== 'undefined') {
            this.resize = new ResizeObserver(() => this.measure());
            this.resize.observe(host);
        }
        if (typeof MutationObserver !== 'undefined') {
            // Bubbles hidden with `inert` (collapsed toolbars, search taking over) leave the glass.
            this.mutations = new MutationObserver(() => this.requestMeasure());
            this.mutations.observe(host, { subtree: true, attributes: true, attributeFilter: ['inert', 'hidden'] });
        }
    }
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
        this.resize?.disconnect();
        this.mutations?.disconnect();
        this.drawHook?.();
        for (const shape of this.shapes.values())
            for (const value of shape.values())
                value.stop();
    }
    /** Reads every bubble's layout box and moves the glass toward it. */
    measure() {
        const origin = this.host.getBoundingClientRect();
        const targets = new Map();
        const unions = new Map();
        const unionRadius = new Map();
        for (const [id, member] of this.members) {
            const { element, options } = member;
            if (!element.isConnected || element.closest('[inert],[hidden]'))
                continue;
            const box = element.getBoundingClientRect();
            if (!box.width || !box.height)
                continue;
            const shape = this.shapes.get(id);
            const offset = shape?.offset ?? { x: 0, y: 0 };
            const rect = {
                x: box.left - origin.left - offset.x,
                y: box.top - origin.top - offset.y,
                width: box.width,
                height: box.height,
            };
            const radius = radiusOf(element);
            if (options.union) {
                const key = `union:${options.union}`;
                unions.set(key, [...(unions.get(key) ?? []), rect]);
                unionRadius.set(key, Math.min(unionRadius.get(key) ?? Infinity, radius));
            }
            else
                targets.set(id, { rect, radius, member });
        }
        for (const [key, rects] of unions)
            targets.set(key, { rect: boundsOf(rects), radius: unionRadius.get(key), member: null });
        const instant = this.reduceMotion || !this.measured;
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
                if (shape.token === token && shape.leaving)
                    this.shapes.delete(death.id);
                this.scheduleDraw();
            };
            if (instant)
                this.shapes.delete(death.id);
            else if (death.kind === 'absorb')
                void shape.animate(death.into, false).then(done);
            else
                void shape.scale.animateTo(0, { spring: SPRING }).then(done);
        }
        for (const [id, target] of targets) {
            const shape = this.shapes.get(id);
            shape.leaving = false;
            shape.radius = target.radius;
            const follow = target.member?.options.motion === 'follow';
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
        this.draw();
        this.scheduleDraw();
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
            const moving = [...this.shapes.values()].some((shape) => shape.values().some((v) => v.isAnimating()));
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
        const visuals = [];
        for (const [id, shape] of this.shapes) {
            visuals.push({ ...shape.visual(), id });
            const member = this.members.get(id);
            if (!member || shape.leaving || !shape.layout)
                continue;
            // Content rides with its glass (centre to centre) while the bubble moves.
            const dx = shape.carry ? shape.x.get() + shape.width.get() / 2 - (shape.layout.x + shape.layout.width / 2) : 0;
            const dy = shape.carry ? shape.y.get() + shape.height.get() / 2 - (shape.layout.y + shape.layout.height / 2) : 0;
            const x = Math.abs(dx) < 0.05 ? 0 : dx;
            const y = Math.abs(dy) < 0.05 ? 0 : dy;
            if (x !== shape.offset.x || y !== shape.offset.y) {
                member.element.style.translate = x || y ? `${x}px ${y}px` : '';
                shape.offset = { x, y };
            }
        }
        const m = GLASS_MARGIN;
        const placed = visuals.map((v) => ({ ...v, x: v.x + m, y: v.y + m }));
        const key = `${this.spacing}|${placed.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.width.toFixed(1)},${v.height.toFixed(1)},${v.radius.toFixed(1)}`).join(';')}`;
        if (key !== this.cache.key)
            this.cache = { key, paths: glassPaths(placed, this.spacing) };
        const paths = this.cache.paths;
        const d = paths.map((p) => p.d).join('');
        this.backdrop.style.clipPath = d ? `path("${d}")` : 'inset(50%)';
        const origin = this.host.getBoundingClientRect();
        const lights = paths.map((p) => this.lightFor(p.bounds, origin));
        renderPaint(this.paint, paths, lights, this.uid);
        renderShadow(this.shadow, d, this.uid);
        this.host.toggleAttribute('data-glass-ready', true);
    }
    lightFor(bounds, origin) {
        if (!this.followPointer || this.reduceMotion || !this.pointer)
            return DEFAULT_GLASS_LIGHT;
        const centre = {
            x: origin.left - GLASS_MARGIN + bounds.x + bounds.width / 2,
            y: origin.top - GLASS_MARGIN + bounds.y + bounds.height / 2,
        };
        return glassLightToward(centre, this.pointer);
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
function renderPaint(svg, paths, lights, uid) {
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