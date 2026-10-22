import * as React from 'react';
import './slider.css';
/** What the `render*` slots receive on every frame of interaction. */
export type LabSliderState = {
    /** The committed value, snapped to `step`. */
    value: number;
    /** Smooth pointer position, useful for progressive effects between discrete stops. */
    position: number;
    /** `position` as 0–1 along the track. */
    fraction: number;
    /** True while a pointer drags the thumb. */
    dragging: boolean;
    /** True when disabled or when the range is empty. */
    disabled: boolean;
};
/** A stop on the track, optionally labelled under it. */
export type LabSliderMark = {
    value: number;
    label?: React.ReactNode;
};
export type LabSliderProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'children' | 'role' | 'aria-valuenow' | 'aria-valuemin' | 'aria-valuemax' | 'aria-checked'> & {
    /** Track height: `regular` (44px) or `compact` (40px). */
    controlSize?: 'regular' | 'compact';
    /** `thick`: the track is the control surface. `thin`: a 4px rail with a round thumb. */
    trackStyle?: 'thick' | 'thin';
    /** Accessible name. Not rendered; show a visible label next to the control yourself. */
    label: string;
    /** The value, for a controlled slider. */
    value?: number;
    /** The initial value, for an uncontrolled slider. Defaults to `min`. */
    defaultValue?: number;
    /** Lowest value. */
    min?: number;
    /** Highest value. */
    max?: number;
    /** Distance between allowed values. Page Up / Page Down move ten steps. */
    step?: number;
    /** Ignores pointer and keyboard input and removes the slider from the tab order. */
    disabled?: boolean;
    /** Called on every value change while dragging or pressing keys. */
    onValueChange?: (value: number) => void;
    /** Called once when the user settles on a value: pointer release or a key press. */
    onValueCommit?: (value: number) => void;
    /** Turns the value into the text screen readers announce, such as `"1,200 DZD"`. */
    getValueText?: (value: number) => string;
    /** Draws a dot at every step (up to 101 steps). Ignored when `marks` is set. */
    showStops?: boolean;
    /** Dots at chosen values; marks with a `label` also print it under the track. */
    marks?: LabSliderMark[];
    /** Decoration drawn behind the rail, such as a waveform or gradient. */
    renderTrack?: (state: LabSliderState) => React.ReactNode;
    /** Content inside the filled part of the track. */
    renderFill?: (state: LabSliderState) => React.ReactNode;
    /** Content inside the thumb, such as an icon or the value. */
    renderThumb?: (state: LabSliderState) => React.ReactNode;
    /** Form field name; the value is submitted through a hidden input. */
    name?: string;
    /** Id of a form outside the slider that its hidden input belongs to. */
    form?: string;
};
/**
 * A single-value slider with a large touch-friendly track, springy thumb, optional stops and
 * marks, and render slots for custom track, fill and thumb decoration.
 */
export declare const LabSlider: React.ForwardRefExoticComponent<Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "role" | "aria-checked" | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "onChange"> & {
    /** Track height: `regular` (44px) or `compact` (40px). */
    controlSize?: "regular" | "compact";
    /** `thick`: the track is the control surface. `thin`: a 4px rail with a round thumb. */
    trackStyle?: "thick" | "thin";
    /** Accessible name. Not rendered; show a visible label next to the control yourself. */
    label: string;
    /** The value, for a controlled slider. */
    value?: number;
    /** The initial value, for an uncontrolled slider. Defaults to `min`. */
    defaultValue?: number;
    /** Lowest value. */
    min?: number;
    /** Highest value. */
    max?: number;
    /** Distance between allowed values. Page Up / Page Down move ten steps. */
    step?: number;
    /** Ignores pointer and keyboard input and removes the slider from the tab order. */
    disabled?: boolean;
    /** Called on every value change while dragging or pressing keys. */
    onValueChange?: (value: number) => void;
    /** Called once when the user settles on a value: pointer release or a key press. */
    onValueCommit?: (value: number) => void;
    /** Turns the value into the text screen readers announce, such as `"1,200 DZD"`. */
    getValueText?: (value: number) => string;
    /** Draws a dot at every step (up to 101 steps). Ignored when `marks` is set. */
    showStops?: boolean;
    /** Dots at chosen values; marks with a `label` also print it under the track. */
    marks?: LabSliderMark[];
    /** Decoration drawn behind the rail, such as a waveform or gradient. */
    renderTrack?: (state: LabSliderState) => React.ReactNode;
    /** Content inside the filled part of the track. */
    renderFill?: (state: LabSliderState) => React.ReactNode;
    /** Content inside the thumb, such as an icon or the value. */
    renderThumb?: (state: LabSliderState) => React.ReactNode;
    /** Form field name; the value is submitted through a hidden input. */
    name?: string;
    /** Id of a form outside the slider that its hidden input belongs to. */
    form?: string;
} & React.RefAttributes<HTMLDivElement>>;
export type LabSlideSwitchProps = Omit<LabSliderProps, 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'onValueChange' | 'onValueCommit' | 'getValueText' | 'showStops' | 'marks'> & {
    /** Disables the switch and marks it busy while a change is saving. */
    loading?: boolean;
    /** The state, for a controlled switch. */
    checked?: boolean;
    /** The initial state, for an uncontrolled switch. */
    defaultChecked?: boolean;
    /** Called whenever the state changes, including mid-drag. */
    onCheckedChange?: (checked: boolean) => void;
    /** Called once when the user settles: a click, a key press or the end of a drag. */
    onCheckedCommit?: (checked: boolean) => void;
    /** Short text shown on the track while on. Visual only. */
    onText?: string;
    /** Short text shown on the track while off. Visual only. */
    offText?: string;
};
/**
 * An on/off switch that can be tapped or dragged. It shares the slider's track, thumb and spring;
 * the state maps to 0 and 1.
 */
export declare const LabSlideSwitch: React.ForwardRefExoticComponent<Omit<LabSliderProps, "value" | "defaultValue" | "min" | "max" | "step" | "onValueChange" | "onValueCommit" | "getValueText" | "showStops" | "marks"> & {
    /** Disables the switch and marks it busy while a change is saving. */
    loading?: boolean;
    /** The state, for a controlled switch. */
    checked?: boolean;
    /** The initial state, for an uncontrolled switch. */
    defaultChecked?: boolean;
    /** Called whenever the state changes, including mid-drag. */
    onCheckedChange?: (checked: boolean) => void;
    /** Called once when the user settles: a click, a key press or the end of a drag. */
    onCheckedCommit?: (checked: boolean) => void;
    /** Short text shown on the track while on. Visual only. */
    onText?: string;
    /** Short text shown on the track while off. Visual only. */
    offText?: string;
} & React.RefAttributes<HTMLDivElement>>;
/**
 * A non-interactive switch picture for menu items and rows that already carry the checked
 * semantics (for example `menuitemcheckbox`). Same geometry and spring, hidden from assistive technology.
 */
export declare function LabSlideSwitchIndicator({ checked, loading, controlSize, }: {
    /** The state to draw. */
    checked: boolean;
    /** Dims the indicator while a change is saving. */
    loading?: boolean;
    /** Indicator size: `compact` (default) or `regular`. */
    controlSize?: 'regular' | 'compact';
}): React.JSX.Element;
//# sourceMappingURL=slider.d.ts.map