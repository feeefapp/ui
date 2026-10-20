'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { sliderRange, sliderValue, sliderFraction, sliderPointer, sliderKey } from './slider-core.js';
import './slider.css';
import { useSliderMotion } from './slider-motion.js';
/** Large single-value slider. Decoration slots share one interaction/geometry engine. */
export const LabSlider = React.forwardRef((props, ref) => (_jsx(SliderControl, { ...props, forwardedRef: ref })));
LabSlider.displayName = 'LabSlider';
function SliderControl({ label, controlSize = 'regular', trackStyle = 'thick', value, defaultValue, min = 0, max = 100, step = 1, disabled = false, onValueChange, onValueCommit, getValueText, showStops = false, marks, renderTrack, renderFill, renderThumb, name, form, forwardedRef, switchMode = false, checkedText, className, style, onKeyDown, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, ...hostProps }) {
    const range = sliderRange(min, max, step);
    const normalize = (next) => sliderValue(next, range.min, range.max, range.step);
    const [internal, setInternal] = React.useState(() => normalize(defaultValue ?? range.min));
    const current = normalize(value ?? internal);
    const currentRef = React.useRef(current);
    currentRef.current = current;
    const host = React.useRef(null);
    const [pressed, setPressed] = React.useState(false);
    const [tracking, setTracking] = React.useState(false);
    const hidden = React.useRef(null);
    const gesture = React.useRef(null);
    const [position, setPosition] = React.useState(null);
    const inert = disabled || range.max <= range.min;
    const publish = (next) => {
        next = normalize(next);
        if (next === currentRef.current)
            return next;
        currentRef.current = next;
        if (value === undefined)
            setInternal(next);
        onValueChange?.(next);
        return next;
    };
    const atPointer = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const fraction = sliderPointer(event.clientX, rect.left, rect.width, getComputedStyle(event.currentTarget).direction === 'rtl', Number.parseFloat(getComputedStyle(event.currentTarget).getPropertyValue('--lab-slider-inset')) || 22);
        return range.min + fraction * (range.max - range.min);
    };
    const move = (event) => {
        const raw = atPointer(event);
        setPosition(raw);
        const next = publish(raw);
        if (gesture.current)
            gesture.current.value = next;
    };
    const cancel = () => {
        const active = gesture.current;
        gesture.current = null;
        setPressed(false);
        setTracking(false);
        setPosition(null);
        if (active)
            publish(active.start);
    };
    React.useEffect(() => {
        if (inert) {
            gesture.current = null;
            setPressed(false);
            setTracking(false);
            setPosition(null);
        }
    }, [inert]);
    React.useEffect(() => {
        const owner = hidden.current?.form;
        const reset = () => {
            gesture.current = null;
            setPressed(false);
            setTracking(false);
            setPosition(null);
            if (value === undefined)
                setInternal(normalize(defaultValue ?? range.min));
        };
        owner?.addEventListener('reset', reset);
        return () => owner?.removeEventListener('reset', reset);
    }, [value, defaultValue, range.min, range.max, range.step, form]);
    const displayPosition = inert ? current : (position ?? current);
    const fraction = sliderFraction(displayPosition, range.min, range.max);
    useSliderMotion(host, fraction, tracking, pressed, trackStyle === 'thin', inert);
    const state = {
        value: current,
        position: displayPosition,
        fraction,
        dragging: position !== null,
        disabled: inert,
    };
    const stopCount = Math.ceil((range.max - range.min) / range.step) + 1;
    const stops = marks ??
        (showStops && stopCount <= 101
            ? Array.from({ length: stopCount }, (_, index) => ({
                value: Math.min(range.max, range.min + index * range.step),
            }))
            : []);
    const description = getValueText?.(current);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { ...hostProps, ref: (el) => {
                    host.current = el;
                    if (typeof forwardedRef === 'function')
                        forwardedRef(el);
                    else if (forwardedRef)
                        forwardedRef.current = el;
                }, className: cn('lab-slider', className), style: { ...style, '--lab-slider-fraction': fraction }, role: switchMode ? 'switch' : 'slider', tabIndex: inert ? -1 : (hostProps.tabIndex ?? 0), "aria-label": label, "aria-disabled": inert || undefined, "aria-valuemin": switchMode ? undefined : range.min, "aria-valuemax": switchMode ? undefined : range.max, "aria-valuenow": switchMode ? undefined : current, "aria-valuetext": switchMode ? undefined : description, "aria-checked": switchMode ? current === 1 : undefined, "data-dragging": position !== null, "data-pressed": pressed && !inert, "data-tracking": tracking && !inert, "data-disabled": inert || undefined, "data-switch": switchMode || undefined, "data-control-size": controlSize, "data-track-style": trackStyle, onPointerDown: (event) => {
                    onPointerDown?.(event);
                    if (event.defaultPrevented ||
                        inert ||
                        event.button !== 0 ||
                        !event.isPrimary ||
                        gesture.current)
                        return;
                    setTracking(false);
                    setPressed(true);
                    event.currentTarget.focus({ preventScroll: true });
                    gesture.current = {
                        id: event.pointerId,
                        start: current,
                        value: current,
                        x: event.clientX,
                        moved: false,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    if (!switchMode)
                        move(event);
                }, onPointerMove: (event) => {
                    onPointerMove?.(event);
                    const active = gesture.current;
                    if (event.defaultPrevented || active?.id !== event.pointerId)
                        return;
                    if (Math.abs(event.clientX - active.x) > 4) {
                        active.moved = true;
                        setTracking(true);
                    }
                    if (!switchMode || active.moved)
                        move(event);
                }, onPointerUp: (event) => {
                    onPointerUp?.(event);
                    if (gesture.current?.id !== event.pointerId)
                        return;
                    if (inert || event.defaultPrevented) {
                        cancel();
                        return;
                    }
                    if (switchMode && !gesture.current.moved)
                        gesture.current.value = publish(1 - gesture.current.start);
                    else
                        move(event);
                    const next = gesture.current.value;
                    setPressed(false);
                    setTracking(false);
                    gesture.current = null;
                    setPosition(null);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    onValueCommit?.(next);
                }, onPointerCancel: (event) => {
                    onPointerCancel?.(event);
                    if (gesture.current?.id === event.pointerId)
                        cancel();
                }, onLostPointerCapture: (event) => {
                    onLostPointerCapture?.(event);
                    if (gesture.current?.id === event.pointerId)
                        cancel();
                }, onClick: (event) => {
                    onClick?.(event);
                    // Assistive technology activates the switch with a click without pointer events.
                    if (!event.defaultPrevented && !inert && switchMode && event.detail === 0) {
                        const next = publish(1 - current);
                        onValueCommit?.(next);
                    }
                }, onKeyDown: (event) => {
                    onKeyDown?.(event);
                    if (event.defaultPrevented || inert)
                        return;
                    if (event.key === 'Escape' && gesture.current) {
                        event.preventDefault();
                        cancel();
                        return;
                    }
                    const next = switchMode && [' ', 'Enter'].includes(event.key)
                        ? 1 - current
                        : sliderKey(event.key, current, range.min, range.max, range.step, getComputedStyle(event.currentTarget).direction === 'rtl');
                    if (next === null)
                        return;
                    event.preventDefault();
                    publish(next);
                    onValueCommit?.(next);
                }, children: [_jsx("span", { className: "lab-slider-track-decoration", "aria-hidden": "true", children: renderTrack?.(state) }), _jsx("span", { className: "lab-slider-rail", "aria-hidden": "true" }), _jsx("span", { className: "lab-slider-fill", "aria-hidden": "true", children: renderFill?.(state) }), stops
                        .filter((mark) => mark.value >= range.min && mark.value <= range.max)
                        .map((mark, index) => (_jsx("span", { className: "lab-slider-stop", "aria-hidden": "true", "data-active": mark.value <= current, style: {
                            '--lab-slider-stop': sliderFraction(mark.value, range.min, range.max),
                        } }, index))), _jsx("span", { className: "lab-slider-thumb", "aria-hidden": "true", children: renderThumb?.(state) }), switchMode && (_jsx("span", { className: "lab-slider-switch-text", "aria-hidden": "true", children: checkedText?.(current) }))] }), marks?.some((mark) => mark.label != null) && (_jsx("div", { className: "lab-slider-marks", "data-control-size": controlSize, "data-track-style": trackStyle, "aria-hidden": "true", children: marks
                    .filter((mark) => mark.value >= range.min && mark.value <= range.max)
                    .map((mark, index) => (_jsx("span", { style: {
                        '--lab-slider-stop': sliderFraction(mark.value, range.min, range.max),
                    }, children: mark.label }, index))) })), _jsx("input", { ref: hidden, type: "hidden", name: name, form: form, value: current, disabled: disabled })] }));
}
/** Same track, thumb, pointer and animation engine; boolean state maps exactly to 0/1. */
export const LabSlideSwitch = React.forwardRef(({ checked, loading, defaultChecked = false, onCheckedChange, onCheckedCommit, onText, offText, ...props }, ref) => {
    return (_jsx(SliderControl, { ...props, forwardedRef: ref, switchMode: true, disabled: props.disabled || loading, "aria-busy": loading || undefined, min: 0, max: 1, step: 1, value: checked === undefined ? undefined : Number(checked), defaultValue: Number(defaultChecked), onValueChange: (next) => onCheckedChange?.(next === 1), onValueCommit: (next) => onCheckedCommit?.(next === 1), checkedText: (next) => (next === 1 ? onText : offText) }));
});
LabSlideSwitch.displayName = 'LabSlideSwitch';
/** Noninteractive menu decoration with the same geometry and spring, never nested switch semantics. */
export function LabSlideSwitchIndicator({ checked, loading, controlSize = 'compact', }) {
    const host = React.useRef(null);
    useSliderMotion(host, Number(checked), false, false, false, Boolean(loading));
    return (_jsxs("div", { ref: host, className: "lab-slider lab-slide-switch-indicator", "data-checked": checked, "data-switch": true, "data-control-size": controlSize, "data-disabled": loading || undefined, "aria-hidden": "true", style: { '--lab-slider-fraction': Number(checked) }, children: [_jsx("span", { className: "lab-slider-rail" }), _jsx("span", { className: "lab-slider-fill" }), _jsx("span", { className: "lab-slider-thumb" })] }));
}
//# sourceMappingURL=slider.js.map