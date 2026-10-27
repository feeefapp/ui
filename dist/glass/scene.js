import { MotionValue, onMeasureFrame, onRenderFrame } from '../physics/motion-value.js';
import { SPRINGS } from '../physics/spring.js';
import { boundsOf, clampRadius, clipAxes, clipInset, clippedGlassPaths, hostFrame, memberClip, openClip, shapePath, toLocalPoint, toLocalRect, toScreenPoint, translatePath, } from './geometry.js';
import { DEFAULT_GLASS_LIGHT, glassLightToward, surfaceReflection, surfaceShade, highlightSurface } from './light.js';
import { glassMemberRect } from './member-bounds.js';
import { GLASS_FOLLOW_ATTRIBUTE, GLASS_INSTANT_ATTRIBUTE, GLASS_ORIGIN_SPRINGS, GLASS_SETTLED_EVENT, glassChangesAtOnce, glassOrigin, planGlassTransition, sameRect } from './transitions.js';
import { adaptiveGlassTone, backdropTone, parseCssColor } from './adaptive.js';
import { liveDisplacementMap, rgbaBmpDataUrl, elementImagePlacement, supportsElementRefraction, supportsRefraction } from './refraction.js';
import { DecodedRefractionMap } from './decoded-refraction-map.js';
import { RefractionWork } from './refraction-work.js';
import { obsoleteRimRegions, rimBufferCapacity } from './rim-buffer.js';
import { GLASS_MENU, GLASS_RIM_MAX_WIDTH, GLASS_SHADOW, glassEdgeTerms, glassHairline, glassKindBlur, glassMaterial, glassMenuMaterial, glassRim, glassSize, rimLayer } from './material.js';
import { bandPath, hairlineBands } from './hairline.js';
import { GLASS_CONTENT_FOLLOW, GLASS_GLOW_START, GLASS_PRESS_SCALE, glassGlowRadius, glassLayoutRect, glassStretch, pressedShape } from './press.js';
import { cornerFit, cssCornerRadius, cssCornerShape, trueCornerRadius } from '../brand/corner-fit.js';
/** How far (px) a member may reach past the container and still be drawn (overshoot, growing bubbles). */
export const GLASS_MARGIN = 32;
const SPRING = SPRINGS.snappy;
const SVG = 'http://www.w3.org/2000/svg';
/** Least time between backdrop samples while scrolling. */
const SAMPLE_GAP_MS = 120;
/**
 * What sits behind still glass changes only through the page: its DOM (content, classes, backdrop
 * tones, the theme), images loading, transitions and animations settling, and the window's size.
 * One page-wide watch hears those and tells every scene, which re-reads its backdrop if it is on
 * screen (throttled like scrolling). Nothing polls, so a still page does no glass work at all.
 * Changes made inside glass containers (their own painting) are ignored.
 */
const backdropListeners = new Set();
let backdropObserver = null;
const BACKDROP_ATTRIBUTES = ['class', 'data-lab-backdrop', 'data-lab-theme', 'hidden', 'open', 'src'];
const BACKDROP_EVENTS = ['load', 'transitionend', 'animationend'];
const outsideGlass = (node) => {
    const element = node instanceof Element ? node : node?.parentElement;
    return !!element && !element.closest('[data-glass-container]');
};
const notifyBackdrop = () => {
    for (const listener of backdropListeners)
        listener();
};
const onBackdropEvent = (event) => {
    if (outsideGlass(event.target))
        notifyBackdrop();
};
function watchBackdrop(listener) {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined')
        return () => { };
    if (!backdropListeners.size) {
        backdropObserver = new MutationObserver((records) => {
            if (records.some((record) => outsideGlass(record.target)))
                notifyBackdrop();
        });
        backdropObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: BACKDROP_ATTRIBUTES });
        for (const type of BACKDROP_EVENTS)
            document.addEventListener(type, onBackdropEvent, { capture: true, passive: true });
        window.addEventListener('resize', notifyBackdrop, { passive: true });
    }
    backdropListeners.add(listener);
    return () => {
        backdropListeners.delete(listener);
        if (backdropListeners.size)
            return;
        backdropObserver?.disconnect();
        backdropObserver = null;
        for (const type of BACKDROP_EVENTS)
            document.removeEventListener(type, onBackdropEvent, { capture: true });
        window.removeEventListener('resize', notifyBackdrop);
    };
}
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
    cornerExponent;
    layout = null;
    /** The part of the container this bubble may paint in (its clipping ancestors); undefined when unclipped. */
    clip;
    /** Translation written to the element so its content rides with the glass. */
    offset = { x: 0, y: 0 };
    /** The scale actually written to the content, which may lag the spring's next value. */
    contentScale = 1;
    /** Content follows the glass only for moves of the same bubble, not while growing out of another. */
    carry = true;
    /** Growing out of a neighbour: springs to its place even while its element is animated, so a
     * bubble that fades in with a transition is still born out of the neighbour, not popped in place. */
    growing = false;
    leaving = false;
    token = 0;
    /** The control it was born out of and returns into (GlassMemberOptions `origin`). */
    origin = null;
    /** The spring its next move uses: the origin's while it grows out of it, else the container's. */
    spring = SPRING;
    /** Its element's box while it is leaving (`layout` is gone by then), for its content's clip. */
    home = null;
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
    /** Where its springs are heading (its rect when at rest). */
    target() {
        return { x: this.x.getTarget(), y: this.y.getTarget(), width: this.width.getTarget(), height: this.height.getTarget() };
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
            ...(this.cornerExponent === undefined ? {} : { cornerExponent: this.cornerExponent }),
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
    animate(rect, instant, spring = this.spring) {
        return Promise.all([
            this.x.animateTo(rect.x, { spring, instant }),
            this.y.animateTo(rect.y, { spring, instant }),
            this.width.animateTo(rect.width, { spring, instant }),
            this.height.animateTo(rect.height, { spring, instant }),
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
    cornerFit = 1;
    shapes = new Map();
    /** When the container was first measured with a box (null while it has never been rendered). */
    shownAt = null;
    measureQueued = false;
    drawHook = null;
    wasMoving = false;
    drawInput = null;
    dirty = false;
    resize = null;
    mutations = null;
    pointer = null;
    cache = { key: '', paths: [] };
    /** The backdrop pieces drawn for `cache.paths` (see `backdropPaths`). */
    piecePaths = [];
    /** Scrollers inside the container that scrolled since the last measure: their bubbles follow exactly. */
    scrolled = new Set();
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
    /** ThemeConfig `glassTint`: 0 clear … 1 tinted (the CSS reads `--lab-glass-tint`; the refraction filter needs the numbers). */
    cornerShape = 'superellipse';
    tint = 0;
    /** Which material it paints (GlassContainer `material`): regular glass, or menus' thick glass. */
    material = 'regular';
    /** ThemeConfig `glassBlur`: the measured backdrop blur, sized per cluster. */
    blur = false;
    /** ThemeConfig `glassRefraction`: bend the backdrop continuously at the edges, where supported. */
    refraction = true;
    backdropSource;
    highlightWidth = 1;
    highlightProfile = 'rim';
    highlightStrength = 1;
    refractionProfile = 'gentle';
    refractionStrength = 1;
    /** Grey level (0–1) of the veil's colour, `--lab-surface`, for the edge terms. */
    surfaceGrey = 1;
    sourceFrame = null;
    refractKey = '';
    refractionMaps = [];
    refractionWork = [];
    refractionRequests = [];
    decodedMaps = [];
    decodedScales = [];
    filters = [];
    filterHost = null;
    disposed = false;
    /** True while some bubble (or an ancestor up to the container) runs a geometric animation. */
    tracking = false;
    /** One backdrop element per cluster: a lone bubble clips with border-radius, which every
     * browser applies to backdrop-filter; only merging bubbles need a path clip, in their own box. */
    pieces = [];
    /** Per cluster, the hairline's ring and sliver paths, in their own SVG layer above the glass. */
    hairlines = [];
    hairlineHost = null;
    /** Cancels a queued backdrop read (and the write that follows it). */
    stopSample = null;
    visibility = null;
    unwatchBackdrop = null;
    /** False while the container is off screen: scrolls and pointer moves then cost nothing. */
    onScreen = true;
    lastSample = 0;
    sampleLater = null;
    constructor(host, backdrop, paint, shadow, uid) {
        this.host = host;
        this.backdrop = backdrop;
        this.paint = paint;
        this.shadow = shadow;
        this.uid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
        backdrop.replaceChildren();
        if (typeof ResizeObserver !== 'undefined') {
            this.resize = new ResizeObserver(() => this.requestMeasure());
            this.resize.observe(host);
        }
        if (typeof MutationObserver !== 'undefined') {
            // Bubbles hidden with `inert`, `hidden` or `data-glass-hidden` (collapsed toolbars, search
            // taking over, a title scrolled away) leave the glass.
            this.mutations = new MutationObserver(() => this.requestMeasure());
            this.mutations.observe(host, { subtree: true, attributes: true, attributeFilter: ['inert', 'hidden', 'data-glass-hidden'] });
        }
        host.addEventListener('pointerdown', this.onPressStart, { passive: true });
        host.ownerDocument?.addEventListener(GLASS_SETTLED_EVENT, this.onSettled);
        window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
        // Content can change behind still glass (a photo loads, a tab switches, the theme flips): the
        // page-wide watch re-reads the backdrop on those changes, only while this glass is on screen.
        this.unwatchBackdrop = watchBackdrop(this.onBackdropChange);
        if (typeof IntersectionObserver !== 'undefined') {
            this.visibility = new IntersectionObserver(([entry]) => {
                const wasOnScreen = this.onScreen;
                this.onScreen = !!entry?.isIntersecting;
                // Coming back on screen: catch up on what changed behind it while it was away.
                if (this.onScreen && !wasOnScreen) {
                    this.requestSample();
                    this.scheduleDraw();
                }
            });
            this.visibility.observe(host);
        }
    }
    /**
     * The page changed somewhere (a dialog opened, content loaded): read the backdrop once things
     * settle, never in the frame of the change, which is often busy (a presentation's first frame).
     */
    onBackdropChange = () => {
        if (!this.onScreen || !this.adaptive || this.disposed)
            return;
        if (this.sampleLater)
            clearTimeout(this.sampleLater);
        this.sampleLater = setTimeout(() => {
            this.sampleLater = null;
            this.lastSample = performance.now();
            this.requestSample();
        }, SAMPLE_GAP_MS);
    };
    /** Any scroll changes what is behind the glass; a scroller inside the container also moves bubbles. */
    onScroll = (event) => {
        if (!this.onScreen)
            return;
        if (event.target instanceof Element && event.target !== this.host && this.host.contains(event.target)) {
            this.scrolled.add(event.target);
            this.requestMeasure();
        }
        this.requestSampleWhileScrolling();
        // A Firefox lens samples a sibling layer: keep its image under the glass when either moves.
        // Elsewhere the backdrop filter reads the live page, so a scroll needs no repaint.
        if (this.backdropSource && supportsElementRefraction())
            this.scheduleDraw();
    };
    /** Reading the backdrop (elementsFromPoint + styles) at most every SAMPLE_GAP_MS while scrolling, and once after. */
    requestSampleWhileScrolling() {
        const now = performance.now();
        if (now - this.lastSample >= SAMPLE_GAP_MS) {
            this.lastSample = now;
            this.requestSample();
        }
        if (this.sampleLater)
            clearTimeout(this.sampleLater);
        this.sampleLater = setTimeout(() => {
            this.sampleLater = null;
            this.lastSample = performance.now();
            this.requestSample();
        }, SAMPLE_GAP_MS);
    }
    /** Re-reads what is behind the glass on the next frame (scroll, theme or layout changed). */
    requestSample = () => {
        if (this.stopSample || this.disposed || typeof requestAnimationFrame === 'undefined')
            return;
        // Read in the shared measure phase, with every other glass read, and write in the render
        // phase: the read never forces a style or layout pass after another scene has painted.
        let stopRender = () => { };
        const stopMeasure = onMeasureFrame(() => {
            stopMeasure();
            const tone = this.readBackdropTone();
            stopRender = onRenderFrame(() => {
                stopRender();
                this.stopSample = null;
                this.applyBackdropTone(tone);
            });
        });
        this.stopSample = () => {
            stopMeasure();
            stopRender();
        };
    };
    /** The tone behind the glass when it should flip (adaptive tint), else null. Reads only. */
    readBackdropTone() {
        const paths = this.cache.paths;
        let tone = null;
        if (this.adaptive && this.material === 'regular' && paths.length && typeof document.elementsFromPoint === 'function') {
            const frame = this.frame();
            const tones = paths.map((path) => {
                const { x, y } = toScreenPoint(frame, path.bounds.x + path.bounds.width / 2, path.bounds.y + path.bounds.height / 2);
                const samples = document
                    .elementsFromPoint(x, y)
                    .filter((element) => !this.host.contains(element) && !element.closest('[data-glass-container]'))
                    .map((element) => ({
                    tone: element.closest('[data-lab-backdrop]')?.getAttribute('data-lab-backdrop'),
                    color: getComputedStyle(element).backgroundColor,
                }));
                return backdropTone(samples);
            });
            const mode = document.documentElement.getAttribute('data-lab-theme') === 'dark' ? 'dark' : 'light';
            tone = adaptiveGlassTone(tones, mode, Math.max(...paths.map((path) => path.bounds.height)));
        }
        return tone;
    }
    applyBackdropTone(tone) {
        if (this.disposed || (tone ?? null) === this.host.getAttribute('data-glass-backdrop'))
            return;
        if (tone)
            this.host.setAttribute('data-glass-backdrop', tone);
        else
            this.host.removeAttribute('data-glass-backdrop');
        // Update material uniforms without remeasuring geometry or replacing the optical layer.
        this.scheduleDraw();
    }
    onPressStart = (event) => {
        if (!this.interactive || this.reduceMotion || event.button > 0 || this.pressed)
            return;
        const target = event.target;
        // Fields, and controls that answer a press with glass of their own (a segmented control's lens).
        if (!target || target.closest('input, textarea, select, [contenteditable="true"], [data-glass-own-press]'))
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
        const glow = { x: point.x, y: point.y, radius: new MotionValue(GLASS_GLOW_START, 0.5), opacity: new MotionValue(1, 0.005) };
        this.glow = glow;
        void glow.radius.animateTo(glassGlowRadius(shape.width.get()), { spring: SPRINGS.smooth });
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
    /** A surface around this container came to rest (a dialog finished opening): measure again. */
    onSettled = (event) => {
        if (!(event.target instanceof Node) || !event.target.contains(this.host))
            return;
        // Growth that started while the surface rode its transform ends here: an unchanged layout
        // starts no spring whose arrival would end it, and a growing bubble draws as part of its
        // neighbour. The measure below restores its slot's clip.
        for (const shape of this.shapes.values()) {
            if (!shape.growing || !shape.layout || shape.leaving)
                continue;
            ++shape.token;
            shape.set(shape.layout);
            shape.carry = true;
            shape.growing = false;
        }
        this.requestMeasure();
    };
    requestMeasure() {
        if (this.disposed || this.measureQueued)
            return;
        this.measureQueued = true;
        // React and ResizeObserver can report several changes before the same refresh. Read the
        // final layout once, in the shared read phase, after all of those changes have landed.
        this.scheduleDraw();
    }
    setPointer(point) {
        this.pointer = point;
        // Off-screen glass catches up with the light when it comes back (the visibility observer).
        if (this.onScreen)
            this.scheduleDraw();
    }
    dispose() {
        this.host.removeEventListener('pointerdown', this.onPressStart);
        this.host.ownerDocument?.removeEventListener(GLASS_SETTLED_EVENT, this.onSettled);
        window.removeEventListener('scroll', this.onScroll, { capture: true });
        this.unwatchBackdrop?.();
        this.unwatchBackdrop = null;
        this.visibility?.disconnect();
        this.filterHost?.remove();
        for (const work of this.refractionWork)
            work.dispose();
        for (const map of this.decodedMaps)
            map.dispose();
        if (this.sampleLater)
            clearTimeout(this.sampleLater);
        this.stopSample?.();
        this.stopSample = null;
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
        this.hairlineHost?.remove();
        this.hairlineHost = null;
        this.hairlines = [];
        reflectionLayers.get(this.paint)?.remove();
        reflectionLayers.delete(this.paint);
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
        const unionViews = new Map();
        const unionRadius = new Map();
        // Shapes keep the true continuous radius; without corner-shape the CSS radius of a smoothed
        // corner is shrunk (never a capsule's or circle's: trueCornerRadius).
        this.cornerFit = this.cornerShape === 'round' ? 1 : cornerFit();
        const size = { width: this.host.offsetWidth, height: this.host.offsetHeight };
        const viewport = { width: window.innerWidth / frame.scaleX, height: window.innerHeight / frame.scaleY };
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
            // A broken layout (an error box overflowing by thousands of px) is not glass, and nothing
            // is ever drawn past the material's reach around the container.
            const rect = glassMemberRect(glassLayoutRect(local, offset, shape?.contentScale), size, viewport, GLASS_MARGIN);
            if (!rect)
                continue;
            const radius = trueCornerRadius(radiusOf(element), rect.width, rect.height, this.cornerFit);
            const view = this.clipOf(element, frame);
            if (options.union) {
                const key = `union:${options.union}`;
                unions.set(key, [...(unions.get(key) ?? []), rect]);
                unionViews.set(key, [...(unionViews.get(key) ?? []), view]);
                unionRadius.set(key, Math.min(unionRadius.get(key) ?? Infinity, radius));
            }
            else
                targets.set(id, { rect, radius, member, animated, ...view });
        }
        this.scrolled.clear();
        for (const [key, rects] of unions) {
            const views = unionViews.get(key);
            const clips = views.map((view) => view.clip);
            targets.set(key, {
                rect: boundsOf(rects),
                radius: unionRadius.get(key),
                member: null,
                clip: clips.every((clip) => clip) ? boundsOf(clips) : undefined,
                scrolled: views.some((view) => view.scrolled),
            });
        }
        // Bubbles present when the glass appears just appear: no growing in on load (or when a
        // closed dialog or hidden panel first shows), even when they register a little after the
        // container (lazy content). Glass on a surface that is entering or leaving rides it as is.
        const now = performance.now();
        const rendered = this.host.getClientRects().length > 0;
        const instant = glassChangesAtOnce({
            reduceMotion: this.reduceMotion,
            instant: this.host.closest(`[${GLASS_INSTANT_ATTRIBUTE}]`) !== null,
            shownAt: this.shownAt,
            now,
        });
        if (rendered)
            this.shownAt ??= now;
        const previous = new Map([...this.shapes].map(([id, shape]) => [id, shape.rect()]));
        const next = new Map([...targets].map(([id, target]) => [id, target.rect]));
        // Bubbles born out of their origin (a menu out of its button), and ones returning into it.
        const origins = new Map();
        const originOf = new Map();
        for (const [id, target] of targets) {
            const element = target.member?.options.origin;
            if (this.shapes.has(id) || !element)
                continue;
            const rect = this.originRect(element, frame);
            if (rect) {
                origins.set(id, rect);
                originOf.set(id, element);
            }
        }
        for (const [id, shape] of this.shapes) {
            if (next.has(id) || shape.leaving || !shape.origin)
                continue;
            const rect = this.originRect(shape.origin, frame);
            if (rect)
                origins.set(id, rect);
        }
        // A surface opening out of its button always grows, even in a container that just appeared.
        const atOnce = this.reduceMotion || this.host.closest(`[${GLASS_INSTANT_ATTRIBUTE}]`) !== null;
        const plan = planGlassTransition(previous, next, this.spacing, origins);
        for (const birth of plan.births) {
            const target = targets.get(birth.id);
            const origin = originOf.get(birth.id) ?? null;
            const grow = birth.kind === 'grow' && !(origin ? atOnce : instant);
            const shape = new Shape(grow ? birth.from : target.rect, grow || instant ? 1 : 0);
            shape.carry = !grow;
            shape.growing = grow;
            // A bubble growing out of a neighbour crosses the space between them: no clip (a slot's
            // overflow box would cut it off at the slot's edge) until it arrives.
            shape.clip = grow ? undefined : target.clip;
            shape.origin = origin;
            if (origin && grow)
                shape.spring = GLASS_ORIGIN_SPRINGS.grow;
            this.shapes.set(birth.id, shape);
            // A surface out of its origin fades its own content in.
            if (!instant && !origin && target.member)
                fadeIn(target.member.element);
        }
        for (const death of plan.deaths) {
            const shape = this.shapes.get(death.id);
            if (!shape || shape.leaving)
                continue;
            shape.leaving = true;
            shape.home = shape.layout;
            shape.layout = null;
            // It travels into its neighbour: free of its old slot's clip.
            if (death.kind === 'absorb')
                shape.clip = undefined;
            this.release(shape, death.id);
            const token = ++shape.token;
            const done = () => {
                if (shape.token === token && shape.leaving && this.shapes.get(death.id) === shape) {
                    this.shapes.delete(death.id);
                    if (shape.origin)
                        this.clearOriginClip(death.id);
                }
                this.scheduleDraw();
            };
            if (shape.origin ? atOnce : instant) {
                this.shapes.delete(death.id);
                this.clearOriginClip(death.id);
            }
            else {
                if (death.kind === 'absorb')
                    void shape.animate(death.into, false, shape.origin ? GLASS_ORIGIN_SPRINGS.absorb : SPRING).then(done);
                else
                    void shape.scale.animateTo(0, { spring: SPRING }).then(done);
                // Springs only advance on animation frames, which a hidden or background tab pauses:
                // never leave a departed bubble's glass behind for longer than this.
                setTimeout(done, 900);
            }
        }
        // Content inside resizing itself smoothly (a segmented control folding): every bubble of the
        // row follows the layout exactly, the neighbours it pushes included, so nothing overlaps.
        const followAll = this.host.querySelector(`[${GLASS_FOLLOW_ATTRIBUTE}]`) !== null;
        for (const [id, target] of targets) {
            const shape = this.shapes.get(id);
            shape.leaving = false;
            shape.radius = target.radius;
            shape.cornerExponent = this.cornerShape === 'round' ? 2 : undefined;
            shape.clip = shape.growing ? undefined : target.clip;
            // Bubbles that animate their own size, that something else is animating right now, or that a
            // scroller moved, are followed exactly instead of sprung, so the glass never lags behind them.
            const follow = !shape.growing &&
                (target.member?.options.motion === 'follow' ||
                    !!target.animated ||
                    !!target.scrolled ||
                    followAll);
            const changed = !shape.layout || !sameRect(shape.layout, target.rect);
            shape.layout = target.rect;
            // A bubble out of its origin keeps growing in a container that just appeared.
            const jump = shape.origin ? atOnce : instant;
            if (shape.scale.getTarget() !== 1)
                void shape.scale.animateTo(1, { spring: SPRING, instant: jump });
            if (follow || jump) {
                shape.set(target.rect);
                // A jump ends any growth in progress (its spring's arrival would have): the bubble is its
                // own shape again, back in its slot's clip, not a bridge out of its neighbour.
                if (jump && shape.growing) {
                    ++shape.token;
                    shape.carry = true;
                    shape.growing = false;
                    shape.clip = target.clip;
                }
            }
            else if (changed || (!sameRect(shape.rect(), target.rect) && !sameRect(shape.target(), target.rect))) {
                // A spring already heading there keeps its course (tracking measures every frame).
                const token = ++shape.token;
                void shape.animate(target.rect, false).then((arrived) => {
                    if (arrived && shape.token === token) {
                        shape.carry = true;
                        shape.growing = false;
                        shape.spring = SPRING;
                        shape.clip = target.clip;
                    }
                    this.scheduleDraw();
                });
            }
        }
        this.tracking = tracking;
        this.scheduleDraw();
        this.requestSampleWhileScrolling();
    }
    /**
     * The part of the container `element`'s glass may paint in: the boxes of its ancestors below the
     * container that clip (overflow other than visible, clip-path, contain: paint), intersected. Also
     * whether one of them scrolled since the last measure.
     */
    clipOf(element, frame) {
        const clips = [];
        let scrolled = false;
        if (!this.host.contains(element))
            return { scrolled };
        for (let node = element.parentElement; node && node !== this.host; node = node.parentElement) {
            if (this.scrolled.has(node))
                scrolled = true;
            const axes = clipAxes(getComputedStyle(node));
            if (!axes.x && !axes.y)
                continue;
            const box = node.getBoundingClientRect();
            const sx = node.offsetWidth ? box.width / node.offsetWidth : 1;
            const sy = node.offsetHeight ? box.height / node.offsetHeight : 1;
            // Overflow clips at the padding box (inside borders and scrollbars), clip-path at the border box.
            const edge = axes.box === 'padding'
                ? { left: box.left + node.clientLeft * sx, top: box.top + node.clientTop * sy, width: node.clientWidth * sx, height: node.clientHeight * sy }
                : box;
            clips.push(openClip(toLocalRect(frame, edge), axes));
        }
        return { clip: memberClip(clips), scrolled };
    }
    /**
     * Where a bubble with an origin comes from and returns to, in the container's pixels
     * (`glassOrigin`: the origin's rect when it is glass, else a droplet at its centre); null when the
     * origin is gone.
     */
    originRect(origin, frame) {
        if (!origin.isConnected)
            return null;
        const box = origin.getBoundingClientRect();
        if (!box.width || !box.height)
            return null;
        const member = origin.closest('[data-glass-member]');
        return glassOrigin(toLocalRect(frame, box), member ? toLocalRect(frame, member.getBoundingClientRect()) : null);
    }
    clearOriginClip(id) {
        const member = this.members.get(id);
        if (member)
            setStyleIfChanged(member.element.style, 'clipPath', '');
    }
    release(shape, id) {
        const member = this.members.get(id);
        if (member) {
            member.element.style.translate = '';
            member.element.style.scale = '';
        }
        shape.offset = { x: 0, y: 0 };
        shape.contentScale = 1;
    }
    scheduleDraw() {
        if (this.disposed)
            return;
        this.dirty = true;
        if (this.drawHook)
            return;
        let paint = false;
        // All springs advance first, then every glass scene reads layout/styles, then they paint.
        // Measurements from React/ResizeObserver only request a paint; they never paint twice in
        // one refresh or force the next scene to read layout after this scene has changed it.
        const stopMeasure = onMeasureFrame(() => {
            if (this.measureQueued || this.tracking) {
                this.measureQueued = false;
                this.measure();
            }
            const glow = this.glow;
            const moving = [...this.shapes.values()].some((shape) => shape.values().some((v) => v.isAnimating())) ||
                (glow !== null && (glow.radius.isAnimating() || glow.opacity.isAnimating()));
            paint = this.dirty || moving || this.wasMoving;
            this.wasMoving = moving;
            if (paint) {
                this.dirty = false;
                this.drawInput = this.readDrawInput();
            }
        });
        const stopRender = onRenderFrame(() => {
            if (paint) {
                this.draw();
                this.drawInput = null;
                paint = false;
            }
            if (!this.dirty && !this.wasMoving && !this.tracking) {
                this.drawHook?.();
                this.drawHook = null;
            }
        });
        this.drawHook = () => {
            stopMeasure();
            stopRender();
            this.drawInput = null;
        };
    }
    readDrawInput() {
        const frame = this.frame();
        const source = supportsElementRefraction() ? this.elementSource() : null;
        return {
            frame,
            sourceFrame: source ? toLocalRect(frame, source.getBoundingClientRect()) : null,
            paint: readPaintStyle(this.paint),
        };
    }
    /** Paints the current frame: element offsets, backdrop clip, edge, light and shadow. */
    draw() {
        if (this.disposed)
            return;
        // Read source geometry once, before any style writes: Firefox must not flush layout for
        // every cluster while placing its live element image.
        const input = this.drawInput ?? this.readDrawInput();
        const { frame } = input;
        this.sourceFrame = input.sourceFrame;
        const visuals = [];
        const clips = [];
        for (const [id, shape] of this.shapes) {
            const visual = shape.visual();
            visuals.push({ ...visual, id });
            clips.push(shape.clip);
            const member = this.members.get(id);
            // A surface out of its origin shows its content only inside its glass while it travels.
            if (member && shape.origin) {
                const home = shape.layout ?? shape.home;
                const travelling = (shape.growing || shape.leaving) && home;
                setStyleIfChanged(member.element.style, 'clipPath', travelling ? `path('${shapePath({ ...visual, x: visual.x - home.x, y: visual.y - home.y })}')` : '');
            }
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
            shape.contentScale = Math.abs(press - 1) < 0.001 ? 1 : press;
            setStyleIfChanged(member.element.style, 'scale', shape.contentScale === 1 ? '' : String(shape.contentScale));
        }
        const placed = visuals;
        const key = `${this.cornerShape}|${this.spacing}|${placed.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.width.toFixed(1)},${v.height.toFixed(1)},${v.radius.toFixed(1)}`).join(';')}|${clips.map((c) => (c ? `${c.x.toFixed(1)},${c.y.toFixed(1)},${c.width.toFixed(1)},${c.height.toFixed(1)}` : '')).join(';')}`;
        if (key !== this.cache.key)
            this.cache = { key, paths: clippedGlassPaths(placed, clips, this.spacing) };
        const paths = this.cache.paths;
        this.piecePaths = backdropPaths(paths);
        this.syncBackdrops(this.piecePaths);
        // The hairlines follow the clusters' outlines, joined or not.
        this.syncHairlines(paths);
        const lights = paths.map((p) => this.lightFor(p.bounds, frame));
        const glow = this.glow;
        this.surfaceGrey = input.paint.surface;
        renderPaint(this.paint, paths, lights, this.uid, this.spacing, this.highlightWidth, this.highlightStrength, this.highlightProfile, glassRim(this.tint, this.scheme()), input.paint, glow ? { x: glow.x, y: glow.y, radius: glow.radius.get(), opacity: glow.opacity.get() } : null);
        // iOS 27 casts the faint shadow under clear glass too.
        renderShadow(this.shadow, paths, this.uid, this.material === 'menu' ? GLASS_MENU.shadow : GLASS_SHADOW);
        if (!this.host.hasAttribute('data-glass-ready'))
            this.host.setAttribute('data-glass-ready', '');
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
            const piece = this.pieces[i];
            const style = piece.style;
            // A lone shape's own clamped corner (a capsule or circle is round); merged clusters clip by path.
            const lone = path.shapes.length === 1 ? path.shapes[0] : null;
            setPropertyIfChanged(style, 'corner-shape', this.cornerShape === 'round' || !lone ? 'round' : cssCornerShape(clampRadius(lone), lone.width, lone.height));
            // The material follows the cluster's smallest bubble: control-sized glass is denser.
            const side = smallestSide(path.shapes);
            const size = glassSize(side);
            if (piece.dataset.glassSize !== size)
                piece.dataset.glassSize = size;
            // Clear glass always softens a little (1.6 px); the regular blur joins with the tint when on.
            setPropertyIfChanged(style, '--lab-glass-blur', `${glassKindBlur(this.material, side, this.tint, this.blur).toFixed(2)}px`);
            setStyleIfChanged(style, 'left', `${x}px`);
            setStyleIfChanged(style, 'top', `${y}px`);
            setStyleIfChanged(style, 'width', `${width}px`);
            setStyleIfChanged(style, 'height', `${height}px`);
            const sourceImage = piece.querySelector('.lab-glass-source');
            if (sourceImage)
                this.positionElementSource(piece, sourceImage);
            if (path.shapes.length === 1) {
                // A lone shape clips with CSS: hand back the radius CSS would use (the circle fallback's),
                // cut straight at the scroller or clip around it.
                const r = clampRadius(path.shapes[0]);
                setStyleIfChanged(style, 'borderRadius', `${cssCornerRadius(r, path.shapes[0].width, path.shapes[0].height, this.cornerFit)}px`);
                setStyleIfChanged(style, 'clipPath', clipInset(path.bounds, path.clip));
                setPropertyIfChanged(style, 'mask', '');
            }
            else {
                // A merged outline masks rather than clips: inside an overflow-clip ancestor (a dialog's
                // scroll area) Chromium ignores clip-path on a backdrop-filter and blurs the whole box.
                setStyleIfChanged(style, 'borderRadius', '');
                setStyleIfChanged(style, 'clipPath', '');
                setPropertyIfChanged(style, 'mask', outlineMask(translatePath(path.visible, -x, -y), width, height));
            }
        });
    }
    /**
     * The dark hairline outside each cluster (material.ts GLASS_HAIRLINE): per cluster, the ring and
     * the side slivers as even-odd SVG paths filled black at their strength, in their own layer above
     * the glass. On white that is exactly iOS 27's plus-darker; over darker content it darkens
     * proportionally (a backdrop-filter clipped to the band would be exact, but Chromium clips such
     * filters to the clip's bounding box inside glass, darkening the whole box). Bands are cached
     * per cluster shape and follow merged outlines.
     */
    syncHairlines(paths) {
        if (!this.hairlineHost) {
            this.hairlineHost = node('svg', { 'aria-hidden': 'true', 'class': 'lab-glass-hairlines' });
        }
        if (this.hairlineHost.parentElement !== this.backdrop.parentElement)
            this.backdrop.after(this.hairlineHost);
        const strength = glassHairline(this.tint, this.scheme());
        while (this.hairlines.length > paths.length) {
            const gone = this.hairlines.pop();
            gone.ring.remove();
            gone.sliver.remove();
        }
        paths.forEach((path, i) => {
            let line = this.hairlines[i];
            if (!line) {
                const make = (kind) => node('path', { 'class': 'lab-glass-hairline', 'fill-rule': 'evenodd', 'data-glass-hairline': kind });
                line = { ring: make('ring'), sliver: make('sliver'), key: '', bands: { ring: [], sliver: [] } };
                this.hairlines[i] = line;
                this.hairlineHost.append(line.ring, line.sliver);
            }
            const clip = path.clip;
            const key = `${this.spacing}|${path.shapes.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.width.toFixed(2)},${v.height.toFixed(2)},${v.radius.toFixed(2)},${v.cornerExponent ?? ''}`).join(';')}|${clip ? `${clip.x.toFixed(1)},${clip.y.toFixed(1)},${clip.width.toFixed(1)},${clip.height.toFixed(1)}` : ''}`;
            if (line.key !== key) {
                const bands = hairlineBands(path.shapes, this.spacing);
                // A scroller's clip cuts the bands straight at its edge.
                const cut = (loops) => clip
                    ? loops.map((points) => points.map(([px, py]) => [Math.min(clip.x + clip.width, Math.max(clip.x, px)), Math.min(clip.y + clip.height, Math.max(clip.y, py))]))
                    : loops;
                line.bands = { ring: cut(bands.ring), sliver: cut(bands.sliver) };
                line.key = key;
                setAttributeIfChanged(line.ring, 'd', bandPath(line.bands.ring));
                setAttributeIfChanged(line.sliver, 'd', bandPath(line.bands.sliver));
            }
            setAttributeIfChanged(line.ring, 'fill-opacity', strength.ring.toFixed(4));
            setAttributeIfChanged(line.sliver, 'fill-opacity', strength.sliver.toFixed(4));
        });
    }
    /** Keep the same optical layer alive through motion, merges and adaptive tone changes. */
    updateRefraction(outline) {
        const key = `${outline}|${this.material}|${this.tint}|${this.blur}|${this.scheme()}|${this.surfaceGrey.toFixed(3)}|${this.refractionStrength}|${this.refractionProfile}|${this.backdropSource ?? ''}`;
        const wanted = this.refraction && this.refractionStrength > 0 &&
            (supportsRefraction() || (supportsElementRefraction() && !!this.elementSource())) &&
            document.documentElement.getAttribute('data-lab-glass') !== 'solid' &&
            !window.matchMedia?.('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches;
        if (!wanted) {
            for (const work of this.refractionWork)
                work.dispose();
            this.refractionWork = [];
            this.refractionRequests = [];
            for (const map of this.decodedMaps)
                map.dispose();
            this.decodedMaps = [];
            this.decodedScales = [];
            this.refractionMaps = [];
            // Disposed decoders revoke their URLs. Re-enabling starts with fresh filter inputs,
            // never a retained feImage pointing at a resource that no longer exists.
            for (const filter of this.filters)
                filter.remove();
            this.filters = [];
            for (const piece of this.pieces) {
                piece.style.backdropFilter = '';
                piece.style.removeProperty('-webkit-backdrop-filter');
                piece.querySelector('.lab-glass-source')?.remove();
                piece.removeAttribute('data-glass-source');
            }
            this.refractKey = '';
            return;
        }
        if (this.refractKey !== key)
            this.applyRefraction(key);
    }
    /** Sampling a separate paint layer avoids Firefox's recursive element-image prohibition. */
    elementSource() {
        const source = this.backdropSource ? document.getElementById(this.backdropSource) : null;
        return source && !source.contains(this.host) && !this.host.contains(source) && !isScroller(source) ? source : null;
    }
    positionElementSource(piece, image) {
        const box = this.sourceFrame;
        if (!box)
            return;
        const x = Number.parseFloat(piece.style.left) || 0;
        const y = Number.parseFloat(piece.style.top) || 0;
        const placement = elementImagePlacement(box, { x, y, width: Number.parseFloat(piece.style.width) || 0, height: Number.parseFloat(piece.style.height) || 0 });
        // Only real changes: any write re-renders the live element image.
        const size = `${placement.width}px ${placement.height}px`;
        const position = `${placement.x}px ${placement.y}px`;
        if (image.style.backgroundSize !== size)
            image.style.backgroundSize = size;
        if (image.style.backgroundPosition !== position)
            image.style.backgroundPosition = position;
    }
    applyRefraction(key) {
        const nativeBackdrop = supportsRefraction();
        if (!this.filterHost) {
            // Its own hidden SVG: the paint and shadow layers are rebuilt every frame.
            this.filterHost = node('svg', { 'width': 0, 'height': 0, 'aria-hidden': 'true', 'class': 'lab-glass-filters' });
            this.backdrop.parentElement?.append(this.filterHost);
        }
        this.piecePaths.forEach((path, i) => {
            const piece = this.pieces[i];
            if (!piece)
                return;
            const { x, y, width, height } = path.bounds;
            const shifted = path.shapes.map((shape) => ({ ...shape, x: shape.x - x, y: shape.y - y }));
            // Position is deliberately absent: dragging a rigid bubble only moves its existing lens.
            const geometryKey = `${width.toFixed(1)},${height.toFixed(1)}|${this.spacing}|${this.refractionProfile}|${shifted.map(s => `${s.x.toFixed(1)},${s.y.toFixed(1)},${s.width.toFixed(1)},${s.height.toFixed(1)},${s.radius.toFixed(1)},${s.cornerExponent}`).join(';')}`;
            let map = this.refractionMaps[i];
            if (nativeBackdrop && (!map || map.key !== geometryKey)) {
                map = nativeMap(geometryKey, () => {
                    const pixels = liveDisplacementMap(width, height, [shifted], this.spacing, this.refractionProfile);
                    return { key: geometryKey, scale: pixels.scale, href: rgbaBmpDataUrl(pixels.width, pixels.height, pixels.data) };
                });
                this.refractionMaps[i] = map;
            }
            const side = smallestSide(path.shapes);
            const material = this.material === 'menu' ? glassMenuMaterial(this.scheme()) : glassMaterial(this.tint, this.scheme(), glassSize(side));
            const blur = glassKindBlur(this.material, side, this.tint, this.blur);
            const edgeTerms = glassEdgeTerms(this.tint, this.scheme(), material, this.surfaceGrey);
            let filter = this.filters[i];
            if (!filter) {
                filter = node('filter', { 'id': `${this.uid}-r${i}`, 'color-interpolation-filters': 'sRGB', 'filterUnits': 'userSpaceOnUse', 'x': 0, 'y': 0 });
                // (Blur,) bend, saturate and lift the backdrop, apply the edge (the map's blue channel is
                // the edge mask E: x + k1·x·E + k3·E, see glassEdgeTerms), then keep only the glass shape
                // (the map's alpha). The element's own background lays the veil over the result.
                const lift = node('feComponentTransfer', { in: 'tone', result: 'lifted' });
                for (const channel of ['feFuncR', 'feFuncG', 'feFuncB'])
                    lift.append(node(channel, { type: 'linear', slope: 1, intercept: 0 }));
                filter.append(node('feImage', { result: 'map', preserveAspectRatio: 'none', x: 0, y: 0 }), node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 0, edgeMode: 'duplicate', result: 'soft' }), node('feDisplacementMap', { in: 'soft', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: 0, result: 'bent' }), node('feColorMatrix', { in: 'bent', type: 'saturate', values: 1, result: 'tone' }), lift, 
                // The mask as an opaque grey image, so the arithmetic below sees E in every channel.
                node('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 0 1', result: 'edge' }), 
                // Alpha is 1 + k1 + k3 ≥ 1 (clamped to 1), so premultiplied colour stays exact.
                node('feComposite', { in: 'lifted', in2: 'edge', operator: 'arithmetic', k1: 0, k2: 1, k3: 0, k4: 0, result: 'edged' }), ...(nativeBackdrop ? [node('feComposite', { in: 'edged', in2: 'map', operator: 'in' })] : []));
                this.filterHost.append(filter);
                this.filters[i] = filter;
            }
            for (const element of [filter, filter.firstElementChild]) {
                setAttributeIfChanged(element, 'width', String(width));
                setAttributeIfChanged(element, 'height', String(height));
            }
            const [, soft, bent, tone, lift, , edged] = Array.from(filter.children);
            if (nativeBackdrop)
                setAttributeIfChanged(filter.firstElementChild, 'href', map.href);
            else {
                const image = filter.firstElementChild;
                const decoded = this.decodedMaps[i] ??= new DecodedRefractionMap(frame => {
                    this.decodedScales[i] = frame.scale;
                    setAttributeIfChanged(image, 'href', frame.href);
                    setAttributeIfChanged(bent, 'scale', (frame.scale * this.refractionStrength).toFixed(2));
                }, undefined, href => URL.revokeObjectURL(href));
                const work = this.refractionWork[i] ??= new RefractionWork(frame => {
                    // Pixel work runs off-thread; only a ready bitmap enters the bounded decode queue.
                    // The live outline and reflection never wait for it and the previous lens stays put.
                    const href = URL.createObjectURL(new Blob([frame.bytes], { type: 'image/bmp' }));
                    const next = { key: frame.key, href, scale: frame.scale };
                    this.refractionMaps[i] = next;
                    decoded.request(next);
                });
                if (this.refractionRequests[i] !== geometryKey) {
                    this.refractionRequests[i] = geometryKey;
                    work.submit({ key: geometryKey, width, height, shapes: shifted, spacing: this.spacing, profile: this.refractionProfile });
                }
                else if (map?.key === geometryKey)
                    decoded.request(map);
            }
            setAttributeIfChanged(soft, 'stdDeviation', blur.toFixed(2));
            // Without blur the bend reads the backdrop itself: no blur stage at all.
            setAttributeIfChanged(bent, 'in', blur > 0 ? 'soft' : 'SourceGraphic');
            setAttributeIfChanged(bent, 'scale', ((nativeBackdrop ? map.scale : this.decodedScales[i] ?? 0) * this.refractionStrength).toFixed(2));
            // feColorMatrix saturate takes 0–1 in older engines; above 1 it is the same matrix as CSS.
            setAttributeIfChanged(tone, 'values', material.saturate.toFixed(4));
            // The measured lift, clipped at white like iOS: light content under clear glass turns
            // whiter, which is what keeps clear glass visible on light backgrounds (LIGHT-EDGES.md).
            for (const channel of Array.from(lift.children)) {
                setAttributeIfChanged(channel, 'slope', material.gain.toFixed(4));
                setAttributeIfChanged(channel, 'intercept', material.offset.toFixed(4));
            }
            setAttributeIfChanged(edged, 'k1', edgeTerms.k1.toFixed(4));
            setAttributeIfChanged(edged, 'k3', edgeTerms.k3.toFixed(4));
            const value = `url(#${this.uid}-r${i})`;
            if (nativeBackdrop) {
                piece.style.backdropFilter = value;
                piece.style.setProperty('-webkit-backdrop-filter', value);
            }
            else {
                const source = this.elementSource();
                if (!source)
                    return;
                const image = piece.querySelector('.lab-glass-source') ?? document.createElement('div');
                if (image.className !== 'lab-glass-source')
                    image.className = 'lab-glass-source';
                const background = `-moz-element(#${CSS.escape(source.id)})`;
                if (image.style.backgroundImage !== background)
                    image.style.backgroundImage = background;
                if (image.style.filter !== value)
                    image.style.filter = value;
                if (image.parentElement !== piece)
                    this.positionElementSource(piece, image);
                if (!piece.hasAttribute('data-glass-source'))
                    piece.setAttribute('data-glass-source', '');
                if (image.parentElement !== piece)
                    piece.replaceChildren(image);
            }
        });
        // A split/merge may reduce the number of clusters. Retain live entries, discard departed ones.
        while (this.filters.length > this.pieces.length)
            this.filters.pop().remove();
        while (this.refractionWork.length > this.pieces.length)
            this.refractionWork.pop().dispose();
        this.refractionRequests.length = this.pieces.length;
        while (this.decodedMaps.length > this.pieces.length)
            this.decodedMaps.pop().dispose();
        this.decodedScales.length = this.pieces.length;
        this.refractionMaps.length = this.pieces.length;
        this.refractKey = key;
    }
    /** The colour scheme the glass paints in: the adaptive tone when it flipped, else the page's. */
    scheme() {
        const tone = this.host.getAttribute('data-glass-backdrop');
        if (tone === 'light' || tone === 'dark')
            return tone;
        return document.documentElement.getAttribute('data-lab-theme') === 'dark' ? 'dark' : 'light';
    }
    lightFor(bounds, frame) {
        if (!this.followPointer || this.reduceMotion || !this.pointer)
            return DEFAULT_GLASS_LIGHT;
        const centre = toScreenPoint(frame, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
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
/** Shorter side of the smallest bubble in a cluster: the material and bend follow it. */
function smallestSide(shapes) {
    return Math.min(...shapes.map((shape) => Math.min(shape.width, shape.height)));
}
/**
 * Lens maps by geometry, shared by every scene: the same bubble (a close button, a dock, a title
 * that opens again) never computes and encodes its map twice. Data URLs need no release.
 */
const NATIVE_MAPS_KEPT = 48;
const nativeMaps = new Map();
function nativeMap(key, create) {
    let map = nativeMaps.get(key);
    if (map)
        nativeMaps.delete(key);
    else
        map = create();
    nativeMaps.set(key, map);
    if (nativeMaps.size > NATIVE_MAPS_KEPT)
        nativeMaps.delete(nativeMaps.keys().next().value);
    return map;
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
/**
 * A scroller can't be a Firefox lens source: Firefox scrolls it on the compositor while the element
 * image of it is repainted on the main thread, so the bent copy trails the real content and every
 * scroll frame repaints the whole viewport through a CPU filter. Glass floating over a scroller
 * (ScrollArea app bars and docks) keeps the CSS material there; Chromium bends the real backdrop.
 */
const scrollers = new WeakMap();
function isScroller(element) {
    let scroller = scrollers.get(element);
    if (scroller === undefined) {
        const style = getComputedStyle(element);
        scroller = /(auto|scroll)/.test(style.overflowY + style.overflowX);
        scrollers.set(element, scroller);
    }
    return scroller;
}
/**
 * The backdrop pieces for the clusters: a cluster whose shapes are not joined (as many outlines
 * as shapes) blurs per shape, each cut by its CSS corner radius. Inside an overflow-clip ancestor
 * (a dialog's scroll area) Chromium blurs a clipped or masked piece's whole bounding box; only a
 * border radius cuts its backdrop. Joined outlines keep one masked piece.
 */
function backdropPaths(paths) {
    return paths.flatMap((path) => {
        if (path.shapes.length < 2 || (path.d.match(/M/g)?.length ?? 0) < path.shapes.length)
            return [path];
        return path.shapes.map((shape) => ({
            ...path,
            shapes: [shape],
            bounds: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
        }));
    });
}
/** A CSS mask of `d` (an outline in a `width` × `height` box) as an inline SVG image. */
function outlineMask(d, width, height) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><path d='${d}'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 100% 100% no-repeat`;
}
function setAttributeIfChanged(element, name, value) {
    if (element.getAttribute(name) !== value)
        element.setAttribute(name, value);
}
function setStyleIfChanged(style, name, value) {
    if (style[name] !== value)
        style[name] = value;
}
function setPropertyIfChanged(style, name, value) {
    if (style.getPropertyValue(name) !== value)
        style.setProperty(name, value);
}
/** Resolve inherited paint tokens in the frame's read phase, before any geometry writes. */
/** Grey level (0–1, sRGB) of a computed colour: rgb(), color(srgb …) or oklab(); 1 if unknown. */
export function surfaceGrey(value) {
    const colour = parseCssColor(value);
    if (colour)
        return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
    const oklab = /^oklab\(\s*([\d.]+)(%?)/i.exec(value.trim());
    if (!oklab)
        return 1;
    const lightness = Number(oklab[1]) / (oklab[2] ? 100 : 1);
    const linear = Math.min(1, Math.max(0, lightness)) ** 3;
    return linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
}
function readPaintStyle(svg) {
    const styles = getComputedStyle(svg);
    const lightColor = parseCssColor(styles.getPropertyValue('--lab-glass-edge-light')) ?? { r: 1, g: 1, b: 1, a: 0.2 };
    return {
        lightColor,
        lightAlpha: Math.min(1, lightColor.a * 2.5 + 0.24),
        // glass.css resolves --lab-surface into the svg's (otherwise unused) stop-color.
        surface: surfaceGrey(styles.getPropertyValue('stop-color')),
        shadowAlpha: Math.min(1, (Number.parseFloat(styles.getPropertyValue('--lab-glass-shadow-alpha')) || 0.1) * (Number.parseFloat(styles.getPropertyValue('--lab-glass-tint')) || 0) * 2),
    };
}
const rimSurfaces = new WeakMap();
const edgeLayers = new WeakMap();
const reflectionLayers = new WeakMap();
/** Edge and light, one clipped group per cluster so each bubble is lit on its own. */
function renderPaint(svg, paths, lights, uid, spacing, highlightWidth, highlightStrength, highlightProfile, rim, paint, glow) {
    let layer = reflectionLayers.get(svg);
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'lab-glass-reflection-layer';
        svg.parentElement?.insertBefore(layer, svg);
        reflectionLayers.set(svg, layer);
    }
    const { lightColor, lightAlpha, shadowAlpha } = paint;
    // The rim's samples must reach its full width; the surface bevel uses highlightWidth itself.
    const sampleWidth = highlightProfile === 'rim' ? highlightWidth * GLASS_RIM_MAX_WIDTH : highlightWidth;
    const rimProfile = { ...rim, width: rim.width * highlightWidth };
    let surfaces = rimSurfaces.get(svg);
    if (!surfaces) {
        surfaces = [];
        rimSurfaces.set(svg, surfaces);
    }
    let edges = edgeLayers.get(svg);
    if (!edges || edges.defs.parentNode !== svg) {
        edges = { defs: node('defs', {}), clusters: [] };
        edgeLayers.set(svg, edges);
        svg.replaceChildren(edges.defs);
    }
    while (surfaces.length > paths.length)
        surfaces.pop().canvas.remove();
    while (edges.clusters.length > paths.length) {
        const departed = edges.clusters.pop();
        departed.clip.remove();
        departed.group.remove();
    }
    const defs = edges.defs;
    paths.forEach((path, i) => {
        let edge = edges.clusters[i];
        if (!edge) {
            const clip = node('clipPath', { id: `${uid}-c${i}` });
            const outline = node('path', {});
            clip.append(outline);
            defs.append(clip);
            const group = node('g', { 'clip-path': `url(#${uid}-c${i})` });
            const stroke = node('path', { class: 'lab-glass-edge' });
            group.append(stroke);
            svg.append(group);
            edge = { clip, outline, group, edge: stroke, d: '', visible: '' };
            edges.clusters[i] = edge;
        }
        // The stroke keeps the whole outline; its clip is cut at the scroller, so the cut edge is bare.
        if (edge.d !== path.d) {
            edge.edge.setAttribute('d', path.d);
            edge.d = path.d;
        }
        if (edge.visible !== path.visible) {
            edge.outline.setAttribute('d', path.visible);
            edge.visible = path.visible;
        }
        // Merged path bounds already include a fringe. The exact CSS box of a lone shape does
        // not, so give its reflection the same room for antialiasing without resizing the lens.
        const fringe = path.shapes.length === 1 ? 1 : 0;
        const x = path.bounds.x - fringe;
        const y = path.bounds.y - fringe;
        const width = path.bounds.width + fringe * 2;
        const height = path.bounds.height + fringe * 2;
        // A moved cluster has the same optical surface. Normalize to its own bounds instead of
        // tying the cache to a freshly allocated path object or its position in the container.
        const local = path.shapes.map(shape => ({ ...shape, x: shape.x - x, y: shape.y - y }));
        const geometry = `${spacing}|${sampleWidth}|${width.toFixed(3)},${height.toFixed(3)}|${local.map(shape => `${shape.x.toFixed(3)},${shape.y.toFixed(3)},${shape.width.toFixed(3)},${shape.height.toFixed(3)},${shape.radius.toFixed(3)},${shape.cornerExponent ?? ''}`).join(';')}`;
        let cached = surfaces[i];
        if (!cached || cached.geometry !== geometry) {
            const surface = highlightSurface(local, spacing, { x: 0, y: 0, width, height }, sampleWidth);
            const canvas = cached?.canvas ?? document.createElement('canvas');
            const capacityWidth = rimBufferCapacity(surface.width, cached ? canvas.width : 0);
            const capacityHeight = rimBufferCapacity(surface.height, cached ? canvas.height : 0);
            const resized = canvas.width !== capacityWidth || canvas.height !== capacityHeight;
            if (canvas.width !== capacityWidth)
                canvas.width = capacityWidth;
            if (canvas.height !== capacityHeight)
                canvas.height = capacityHeight;
            // Resizing clears the whole backing. With retained capacity, erase only the old pixels
            // beyond the new image; putImageData replaces every active pixel, including transparency.
            if (cached && !resized) {
                const context = canvas.getContext('2d');
                for (const rect of obsoleteRimRegions(cached.surface, surface))
                    context?.clearRect(rect.x, rect.y, rect.width, rect.height);
            }
            canvas.className = 'lab-glass-rim lab-glass-reflection-canvas';
            cached = { geometry, surface, canvas, image: null, key: '' };
            surfaces[i] = cached;
        }
        const light = lights[i];
        const key = `${light.x.toFixed(3)},${light.y.toFixed(3)}|${highlightProfile}|${rimProfile.w0},${rimProfile.w1},${rimProfile.p},${rimProfile.width}|${highlightStrength}|${lightColor.r},${lightColor.g},${lightColor.b},${lightAlpha}|${shadowAlpha}`;
        if (cached.key !== key) {
            const { surface, canvas } = cached;
            const context = canvas.getContext('2d');
            if (context) {
                const image = cached.image ??= context.createImageData(surface.width, surface.height);
                for (const sample of surface.samples) {
                    const reflection = highlightProfile === 'rim'
                        ? rimLayer(sample.depth, (sample.nx * light.x + sample.ny * light.y) / (Math.hypot(sample.nx, sample.ny) || 1), rimProfile)
                        : surfaceReflection(sample.depth, sample.nx, sample.ny, light, surface.bezel) * lightAlpha;
                    const highlight = Math.min(1, reflection * highlightStrength) * sample.coverage;
                    const shade = highlightProfile === 'rim' ? 0 : surfaceShade(sample.depth, sample.nx, sample.ny, light, surface.bezel) * Math.min(1, highlightStrength) * shadowAlpha * sample.coverage;
                    const alpha = highlight + shade * (1 - highlight);
                    const share = alpha > 0 ? highlight / alpha : 0;
                    image.data[sample.index] = Math.round(lightColor.r * share * 255);
                    image.data[sample.index + 1] = Math.round(lightColor.g * share * 255);
                    image.data[sample.index + 2] = Math.round(lightColor.b * share * 255);
                    image.data[sample.index + 3] = Math.round(alpha * 255);
                }
                context.putImageData(image, 0, 0);
                cached.key = key;
            }
        }
        // highlightSurface samples at exactly 2×. Preserve that scale when fractional spring
        // dimensions round its bitmap upward; squeezing it back into the unrounded box moved
        // the rim inward by up to half a pixel on each frame.
        setStyleIfChanged(cached.canvas.style, 'left', `${x}px`);
        setStyleIfChanged(cached.canvas.style, 'top', `${y}px`);
        setStyleIfChanged(cached.canvas.style, 'width', `${cached.canvas.width / 2}px`);
        setStyleIfChanged(cached.canvas.style, 'height', `${cached.canvas.height / 2}px`);
        setStyleIfChanged(cached.canvas.style, 'clipPath', clipInset({ x, y, width: cached.canvas.width / 2, height: cached.canvas.height / 2 }, path.clip));
        if (cached.canvas.parentElement !== layer)
            layer.append(cached.canvas);
    });
    if (glow && glow.opacity > 0.01 && paths.length) {
        // Keep the pointer glow's paint server alive as well: changing its numbers must not
        // destroy/recreate every rim, clip and gradient during a press animation.
        let effect = edges.glow;
        if (!effect) {
            const clip = node('clipPath', { id: `${uid}-gc` });
            const outline = node('path', {});
            clip.append(outline);
            const gradient = node('radialGradient', { id: `${uid}-gg`, gradientUnits: 'userSpaceOnUse' });
            gradient.append(node('stop', { offset: 0, class: 'lab-glass-glow-stop' }), node('stop', { offset: 1, class: 'lab-glass-glow-stop', 'stop-opacity': 0 }));
            defs.append(clip, gradient);
            const group = node('g', { 'clip-path': `url(#${uid}-gc)` });
            const circle = node('circle', { fill: `url(#${uid}-gg)` });
            group.append(circle);
            svg.append(group);
            effect = edges.glow = { clip, outline, gradient, group, circle };
        }
        if (effect.group.hasAttribute('display'))
            effect.group.removeAttribute('display');
        setAttributeIfChanged(effect.outline, 'd', paths.map(path => path.visible).join(''));
        setAttributeIfChanged(effect.group, 'opacity', String(glow.opacity));
        for (const element of [effect.gradient, effect.circle]) {
            setAttributeIfChanged(element, 'cx', String(glow.x));
            setAttributeIfChanged(element, 'cy', String(glow.y));
            setAttributeIfChanged(element, 'r', String(Math.max(1, glow.radius)));
        }
        // New clusters can be appended after the glow; it stays the topmost paint layer.
        if (svg.lastElementChild !== effect.group)
            svg.append(effect.group);
    }
    else if (edges.glow)
        setAttributeIfChanged(edges.glow.group, 'display', 'none');
}
/**
 * A wide, soft shadow outside the glass only (masked), like CSS box-shadow: `GLASS_SHADOW.dy` down,
 * blurred by `GLASS_SHADOW.blur`, lighter under control-sized glass. It reaches past the material
 * box (the SVG overflows), so its regions extend well beyond it.
 */
const shadowLayers = new WeakMap();
function renderShadow(svg, paths, uid, shadow) {
    let layer = shadowLayers.get(svg);
    const inset = shadow.inset ?? 0;
    const key = `${shadow.dy},${shadow.blur},${inset}|` + paths.map(path => `${path.d}|${glassSize(smallestSide(path.shapes))}|${path.clip ? Object.values(path.clip).join(',') : ''}`).join(';');
    if (layer?.key === key && layer.defs.parentNode === svg)
        return;
    if (!paths.length) {
        svg.replaceChildren();
        shadowLayers.delete(svg);
        return;
    }
    const spec = `${shadow.dy},${shadow.blur},${inset}`;
    if (!layer || layer.defs.parentNode !== svg || layer.spec !== spec) {
        const defs = node('defs', {});
        const mask = node('mask', { id: `${uid}-m`, maskUnits: 'userSpaceOnUse' });
        const bounds = node('rect', { fill: 'white' });
        const cutout = node('path', { fill: 'black' });
        mask.append(bounds, cutout);
        const blur = node('filter', { id: `${uid}-b`, filterUnits: 'userSpaceOnUse' });
        // A negative spread (the menu's) shrinks the shape before it blurs.
        if (inset > 0)
            blur.append(node('feMorphology', { operator: 'erode', radius: inset }));
        blur.append(node('feGaussianBlur', { stdDeviation: shadow.blur }));
        defs.append(mask, blur);
        const group = node('g', { mask: `url(#${uid}-m)` });
        svg.replaceChildren(defs, group);
        layer = { key: '', spec, defs, mask, bounds, cutout, blur, group, shapes: [], scissors: [] };
        shadowLayers.set(svg, layer);
    }
    layer.key = key;
    const reach = shadow.blur * 3 + shadow.dy;
    const box = boundsOf(paths.map(path => path.bounds));
    const region = { x: box.x - reach, y: box.y - reach, width: box.width + reach * 2, height: box.height + reach * 2 };
    for (const element of [layer.mask, layer.bounds, layer.blur])
        for (const [name, value] of Object.entries(region))
            element.setAttribute(name, String(value));
    layer.cutout.setAttribute('d', paths.map(path => path.visible).join(''));
    while (layer.shapes.length > paths.length)
        layer.shapes.pop().remove();
    // Sparse: only clipped paths have a scissor.
    while (layer.scissors.length > paths.length)
        layer.scissors.pop()?.remove();
    paths.forEach((path, i) => {
        let shape = layer.shapes[i];
        if (!shape) {
            shape = node('path', {
                'class': 'lab-glass-shadow-shape',
                'transform': `translate(0 ${shadow.dy})`,
                'filter': `url(#${uid}-b)`,
            });
            layer.group.append(shape);
            layer.shapes[i] = shape;
        }
        shape.setAttribute('d', path.d);
        shape.setAttribute('data-glass-size', glassSize(smallestSide(path.shapes)));
        // Glass in a scroller casts its shadow inside it only. The clip is in the shape's own
        // (translated) space, so it moves back up by the shadow's offset.
        if (path.clip) {
            let scissor = layer.scissors[i];
            if (!scissor) {
                scissor = node('clipPath', { id: `${uid}-s${i}`, clipPathUnits: 'userSpaceOnUse' });
                scissor.append(node('rect', {}));
                layer.defs.append(scissor);
                layer.scissors[i] = scissor;
            }
            const rect = scissor.firstElementChild;
            const clip = { ...path.clip, y: path.clip.y - shadow.dy };
            for (const [name, value] of Object.entries(clip))
                rect.setAttribute(name, String(value));
            shape.setAttribute('clip-path', `url(#${uid}-s${i})`);
        }
        else
            shape.removeAttribute('clip-path');
    });
}
//# sourceMappingURL=scene.js.map