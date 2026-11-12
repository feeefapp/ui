'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { MotionValue, prefersReducedMotion } from './motion-value.js';
import { SPRINGS } from './spring.js';
/** Running layout animations, per element, so a new layout change can take over their speed. */
const tracks = new WeakMap();
const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
};
/** Where each element is on screen now (transforms included), to animate from after a change. */
export function snapshotLayout(elements) {
    const boxes = new Map();
    for (const el of elements)
        boxes.set(el, boxOf(el));
    return boxes;
}
/**
 * FLIP on springs: animates each element from its box in `before` to where layout now puts it.
 * Call it after the DOM changed (a layout effect). Elements mid-flight keep their speed. With
 * `size`, an element also scales from its old size (use it for media and plain shapes).
 */
export function animateLayoutFrom(before, options = {}) {
    if (prefersReducedMotion())
        return;
    const spring = options.spring ?? SPRINGS.snappy;
    for (const [el, first] of before) {
        if (!el.isConnected)
            continue;
        const track = tracks.get(el);
        const speed = track
            ? { x: track.x.getVelocity(), y: track.y.getVelocity(), sx: track.sx.getVelocity(), sy: track.sy.getVelocity() }
            : null;
        track?.stop();
        el.style.transform = '';
        const last = boxOf(el);
        const sized = options.size?.(el) ?? false;
        const from = {
            dx: first.x - last.x,
            dy: first.y - last.y,
            sx: sized && last.width ? first.width / last.width : 1,
            sy: sized && last.height ? first.height / last.height : 1,
        };
        if (Math.abs(from.dx) < 0.5 && Math.abs(from.dy) < 0.5 && Math.abs(from.sx - 1) < 0.005 && Math.abs(from.sy - 1) < 0.005) {
            tracks.delete(el);
            continue;
        }
        move(el, from, speed, spring);
    }
}
function move(el, from, speed, spring) {
    const x = new MotionValue(from.dx, 0.25);
    const y = new MotionValue(from.dy, 0.25);
    const sx = new MotionValue(from.sx, 0.001);
    const sy = new MotionValue(from.sy, 0.001);
    const paint = () => {
        el.style.transformOrigin = '0 0';
        el.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) scale(${sx.get()}, ${sy.get()})`;
    };
    const unsubscribe = [x, y, sx, sy].map((v) => v.subscribe(paint));
    let settled = 0;
    const done = (arrived) => {
        if (!arrived || ++settled < 4)
            return;
        unsubscribe.forEach((u) => u());
        el.style.transform = '';
        el.style.transformOrigin = '';
        tracks.delete(el);
    };
    tracks.set(el, {
        x,
        y,
        sx,
        sy,
        stop: () => {
            ;
            [x, y, sx, sy].forEach((v) => v.stop());
            unsubscribe.forEach((u) => u());
        },
    });
    paint();
    void x.animateTo(0, { spring, velocity: speed?.x ?? 0 }).then(done);
    void y.animateTo(0, { spring, velocity: speed?.y ?? 0 }).then(done);
    void sx.animateTo(1, { spring, velocity: speed?.sx ?? 0 }).then(done);
    void sy.animateTo(1, { spring, velocity: speed?.sy ?? 0 }).then(done);
}
function enter(el, spring) {
    const p = new MotionValue(0, 0.002);
    const paint = (v) => {
        el.style.opacity = String(Math.min(1, Math.max(0, v)));
        el.style.transform = `scale(${0.94 + 0.06 * v})`;
    };
    const unsubscribe = p.subscribe(paint);
    paint(0);
    void p.animateTo(1, { spring }).then(() => {
        unsubscribe();
        el.style.opacity = '';
        el.style.transform = '';
    });
}
/**
 * Shared-element layout transitions (FLIP on springs): after each render, every element marked
 * `data-lab-layout-id` that moved animates from where it was to where it now is, even into
 * another container inside the group. Mark an element `data-lab-layout="size"` to animate its
 * size too (it scales, so prefer it for media and plain shapes). An interrupted move continues
 * from where it is on screen at the speed it had, so rapid changes never jump.
 */
export class LayoutGroup extends React.Component {
    root = React.createRef();
    elements() {
        const root = this.root.current;
        return root ? Array.from(root.querySelectorAll('[data-lab-layout-id]')) : [];
    }
    getSnapshotBeforeUpdate(previous) {
        if ('layoutKey' in this.props && Object.is(previous.layoutKey, this.props.layoutKey))
            return null;
        const boxes = new Map();
        for (const el of this.elements())
            boxes.set(el.dataset.labLayoutId, boxOf(el));
        return boxes;
    }
    componentDidUpdate(_, __, before) {
        if (!before || prefersReducedMotion())
            return;
        const spring = this.props.spring ?? SPRINGS.snappy;
        const moved = new Map();
        for (const el of this.elements()) {
            const first = before.get(el.dataset.labLayoutId);
            if (first)
                moved.set(el, first);
            else if (this.props.animateEnter !== false && !tracks.has(el))
                enter(el, spring);
        }
        animateLayoutFrom(moved, { spring, size: (el) => el.dataset.labLayout === 'size' });
    }
    render() {
        return (_jsx("div", { ref: this.root, className: "lab-layout-group", style: { display: 'contents' }, children: this.props.children }));
    }
}
//# sourceMappingURL=layout-group.js.map