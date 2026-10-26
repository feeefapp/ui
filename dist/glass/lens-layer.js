import { lensMaterial } from './material.js';
import { LENS_DISPERSION, LENS_SOFT, lensDisplacementMap, rgbaBmpDataUrl, supportsRefraction } from './refraction.js';
const SVG = 'http://www.w3.org/2000/svg';
const PLAIN_QUERY = '(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)';
let plainQuery;
/** The lens mode from `<html data-lab-glass>` and the user's transparency and contrast settings. */
export function lensMode() {
    if (typeof document === 'undefined')
        return 'off';
    if (plainQuery === undefined)
        plainQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PLAIN_QUERY) : null;
    if (plainQuery?.matches)
        return 'off';
    const glass = document.documentElement.getAttribute('data-lab-glass');
    return glass === 'solid' ? 'off' : glass === 'transparent' ? 'transparent' : 'liquid';
}
/** Whether lenses bend what is behind them: liquid, with the theme's refraction on, in a browser
 * whose backdrop filters bend (Chromium). */
export function lensBends() {
    return (lensMode() === 'liquid' &&
        document.documentElement.getAttribute('data-lab-glass-refraction') !== 'off' &&
        supportsRefraction());
}
/** Lens maps by quantised geometry, shared by every lens (a drag revisits the same widths). */
const MAPS_KEPT = 64;
const maps = new Map();
function lensMap(width, height, radius, kind) {
    const key = `${width}|${height}|${radius}|${kind}`;
    let map = maps.get(key);
    if (map)
        maps.delete(key);
    else {
        const pixels = lensDisplacementMap({ x: 0, y: 0, width, height, radius }, kind);
        map = { scale: pixels.scale, href: rgbaBmpDataUrl(pixels.width, pixels.height, pixels.data) };
    }
    maps.set(key, map);
    if (maps.size > MAPS_KEPT)
        maps.delete(maps.keys().next().value);
    return map;
}
/** Maps are cut on this grid (px): a moving lens reuses its neighbours' maps, stretched to fit. */
const MAP_GRID = 2;
let filterHost = null;
let filterCount = 0;
function node(tag, attrs) {
    const el = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attrs))
        el.setAttribute(name, String(value));
    return el;
}
function setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value)
        element.setAttribute(name, value);
}
function setProperty(style, name, value) {
    if (style.getPropertyValue(name) !== value)
        style.setProperty(name, value);
}
/** One lens element's glass. `update` runs on every frame the lens moves; it touches only what changed. */
export class GlassLensLayer {
    el;
    kind;
    filter = null;
    id = `lab-lens-${++filterCount}`;
    measured = null;
    observer = null;
    last = null;
    /**
     * `measure`: the lens takes its size and corners from the element (a thumb's own box, which CSS
     * sizes), watched with a ResizeObserver. Otherwise every `update` passes the shape.
     */
    constructor(el, kind, measure = false) {
        this.el = el;
        this.kind = kind;
        if (measure && typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => {
                this.measure();
                if (this.last !== null)
                    this.update(this.last);
            });
            this.observer.observe(el);
        }
    }
    measure() {
        const width = this.el.offsetWidth;
        const height = this.el.offsetHeight;
        const radius = Number.parseFloat(getComputedStyle(this.el).borderTopLeftRadius) || 0;
        this.measured = { width, height, radius };
    }
    /**
     * Shows the lens at `lens` (0 rest … 1 glass). `shape` is the lens's box in its own pixels (only
     * its size and radius count; owners place the element) unless the layer measures itself.
     */
    update(lens, shape) {
        this.last = lens;
        const el = this.el;
        const t = Number.isFinite(lens) ? Math.max(0, Math.min(1, lens)) : 0;
        const mode = lensMode();
        if (t <= 0.001 || mode === 'off') {
            this.hide();
            return;
        }
        if (!shape && !this.measured)
            this.measure();
        const size = shape ?? this.measured;
        if (!(size.width > 0 && size.height > 0)) {
            this.hide();
            return;
        }
        el.removeAttribute('data-hidden');
        const tone = el.closest('[data-glass-backdrop]')?.getAttribute('data-glass-backdrop');
        const scheme = tone === 'light' || tone === 'dark'
            ? tone
            : document.documentElement.getAttribute('data-lab-theme') === 'dark'
                ? 'dark'
                : 'light';
        const material = lensMaterial(this.kind, t, scheme);
        const style = el.style;
        setProperty(style, '--lab-lens-veil', material.veil.toFixed(4));
        setProperty(style, '--lab-lens-shade-top', material.shade.top.toFixed(4));
        setProperty(style, '--lab-lens-shade-middle', material.shade.middle.toFixed(4));
        setProperty(style, '--lab-lens-rim-top', material.rim.top.toFixed(4));
        setProperty(style, '--lab-lens-rim-side', material.rim.side.toFixed(4));
        setProperty(style, '--lab-lens-rim-bottom', material.rim.bottom.toFixed(4));
        setProperty(style, '--lab-lens-rim-edge-top', material.rimEdge.top.toFixed(4));
        setProperty(style, '--lab-lens-rim-edge-side', material.rimEdge.side.toFixed(4));
        setProperty(style, '--lab-lens-rim-edge-bottom', material.rimEdge.bottom.toFixed(4));
        setProperty(style, '--lab-lens-line', material.line.inner.toFixed(4));
        setProperty(style, '--lab-lens-line-outer', material.line.outer.toFixed(4));
        setProperty(style, '--lab-lens-line-bottom', material.line.bottom.toFixed(4));
        setProperty(style, '--lab-lens-shadow', material.shadow.toFixed(4));
        const radius = Math.min(size.radius, size.width / 2, size.height / 2);
        const value = mode === 'liquid' && lensBends() ? this.refraction(size.width, size.height, radius, t) : null;
        if (value) {
            setProperty(style, 'backdrop-filter', value);
            setProperty(style, '-webkit-backdrop-filter', value);
        }
        else {
            this.dropFilter();
            if (style.getPropertyValue('backdrop-filter')) {
                style.removeProperty('backdrop-filter');
                style.removeProperty('-webkit-backdrop-filter');
            }
        }
    }
    /** The SVG backdrop filter: the measured bend per colour channel (LENS_DISPERSION), cut to the shape. */
    refraction(width, height, radius, t) {
        if (!filterHost || !filterHost.isConnected) {
            filterHost = node('svg', { 'width': 0, 'height': 0, 'aria-hidden': 'true', 'class': 'lab-lens-filters' });
            filterHost.style.position = 'absolute';
            filterHost.style.pointerEvents = 'none';
            document.body.append(filterHost);
        }
        let filter = this.filter;
        if (!filter || !filter.isConnected) {
            filter = node('filter', { 'id': this.id, 'color-interpolation-filters': 'sRGB', 'filterUnits': 'userSpaceOnUse', 'x': 0, 'y': 0 });
            const bend = (result) => node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: 0, result });
            // One channel of a bent copy, opaque: the three add up to the colour.
            const channel = (input, keep, result) => {
                const rows = [0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((column) => Number(row === keep && column === keep)).join(' '));
                return node('feColorMatrix', { in: input, type: 'matrix', values: [...rows, '0 0 0 1 0'].join('  '), result });
            };
            filter.append(node('feImage', { result: 'map', preserveAspectRatio: 'none', x: 0, y: 0 }), bend('red'), bend('green'), bend('blue'), channel('red', 0, 'r'), channel('green', 1, 'g'), channel('blue', 2, 'b'), node('feComposite', { in: 'r', in2: 'g', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'rg' }), node('feComposite', { in: 'rg', in2: 'b', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'bent' }), 
            // A slider thumb softens its edge band: the backdrop blurred, then bent like the rest (its band
            // magnifies, so blurring after the bend would soften nothing), where the map's blue says so.
            ...(this.kind === 'thumb'
                ? [
                    node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: LENS_SOFT.blur, edgeMode: 'duplicate', result: 'blurred' }),
                    node('feDisplacementMap', { 'in': 'blurred', 'in2': 'map', 'xChannelSelector': 'R', 'yChannelSelector': 'G', 'scale': 0, 'result': 'bentBlurred', 'data-lens-soft': '' }),
                    node('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0', result: 'band' }),
                    node('feComposite', { in: 'bentBlurred', in2: 'band', operator: 'in', result: 'soft' }),
                    node('feComposite', { in: 'soft', in2: 'bent', operator: 'over', result: 'bent' }),
                ]
                : []), 
            // Chromium ignores clip-path on an SVG backdrop filter: the map's alpha cuts the shape.
            node('feComposite', { in: 'bent', in2: 'map', operator: 'in' }));
            filterHost.append(filter);
            this.filter = filter;
        }
        const grid = (value) => Math.max(MAP_GRID, Math.round(value / MAP_GRID) * MAP_GRID);
        const mapWidth = grid(width);
        const mapHeight = grid(height);
        const map = lensMap(mapWidth, mapHeight, Math.round(Math.min(radius * (mapHeight / height), mapWidth / 2, mapHeight / 2)), this.kind);
        const [image, red, green, blue] = Array.from(filter.children);
        for (const element of [filter, image]) {
            setAttribute(element, 'width', width.toFixed(2));
            setAttribute(element, 'height', height.toFixed(2));
        }
        setAttribute(image, 'href', map.href);
        // The bend scales with the map's scale: the lens eases it in.
        setAttribute(red, 'scale', (map.scale * t * (1 - LENS_DISPERSION)).toFixed(2));
        setAttribute(green, 'scale', (map.scale * t).toFixed(2));
        setAttribute(blue, 'scale', (map.scale * t * (1 + LENS_DISPERSION)).toFixed(2));
        const soft = filter.querySelector('[data-lens-soft]');
        if (soft)
            setAttribute(soft, 'scale', (map.scale * t).toFixed(2));
        return `url(#${this.id})`;
    }
    hide() {
        if (!this.el.hasAttribute('data-hidden'))
            this.el.setAttribute('data-hidden', '');
        const style = this.el.style;
        if (style.getPropertyValue('backdrop-filter')) {
            style.removeProperty('backdrop-filter');
            style.removeProperty('-webkit-backdrop-filter');
        }
    }
    dropFilter() {
        this.filter?.remove();
        this.filter = null;
    }
    dispose() {
        this.observer?.disconnect();
        this.observer = null;
        this.dropFilter();
        this.hide();
    }
}
//# sourceMappingURL=lens-layer.js.map