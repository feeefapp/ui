import * as React from 'react';
import './slider.css';
export type LabSliderState = {
    value: number;
    /** Smooth pointer position, useful for progressive effects between discrete stops. */
    position: number;
    fraction: number;
    dragging: boolean;
    disabled: boolean;
};
export type LabSliderMark = {
    value: number;
    label?: React.ReactNode;
};
export type LabSliderProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'children' | 'role' | 'aria-valuenow' | 'aria-valuemin' | 'aria-valuemax' | 'aria-checked'> & {
    controlSize?: 'regular' | 'compact';
    trackStyle?: 'thick' | 'thin';
    label: string;
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onValueChange?: (value: number) => void;
    onValueCommit?: (value: number) => void;
    getValueText?: (value: number) => string;
    showStops?: boolean;
    marks?: LabSliderMark[];
    renderTrack?: (state: LabSliderState) => React.ReactNode;
    renderFill?: (state: LabSliderState) => React.ReactNode;
    renderThumb?: (state: LabSliderState) => React.ReactNode;
    name?: string;
    form?: string;
};
/** Large single-value slider. Decoration slots share one interaction/geometry engine. */
export declare const LabSlider: React.ForwardRefExoticComponent<Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "role" | "aria-checked" | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "onChange"> & {
    controlSize?: "regular" | "compact";
    trackStyle?: "thick" | "thin";
    label: string;
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onValueChange?: (value: number) => void;
    onValueCommit?: (value: number) => void;
    getValueText?: (value: number) => string;
    showStops?: boolean;
    marks?: LabSliderMark[];
    renderTrack?: (state: LabSliderState) => React.ReactNode;
    renderFill?: (state: LabSliderState) => React.ReactNode;
    renderThumb?: (state: LabSliderState) => React.ReactNode;
    name?: string;
    form?: string;
} & React.RefAttributes<HTMLDivElement>>;
export type LabSlideSwitchProps = Omit<LabSliderProps, 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'onValueChange' | 'onValueCommit' | 'getValueText' | 'showStops' | 'marks'> & {
    loading?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onCheckedCommit?: (checked: boolean) => void;
    onText?: string;
    offText?: string;
};
/** Same track, thumb, pointer and animation engine; boolean state maps exactly to 0/1. */
export declare const LabSlideSwitch: React.ForwardRefExoticComponent<Omit<LabSliderProps, "value" | "defaultValue" | "min" | "max" | "step" | "onValueChange" | "onValueCommit" | "getValueText" | "showStops" | "marks"> & {
    loading?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onCheckedCommit?: (checked: boolean) => void;
    onText?: string;
    offText?: string;
} & React.RefAttributes<HTMLDivElement>>;
/** Noninteractive menu decoration with the same geometry and spring, never nested switch semantics. */
export declare function LabSlideSwitchIndicator({ checked, loading, controlSize, }: {
    checked: boolean;
    loading?: boolean;
    controlSize?: 'regular' | 'compact';
}): React.JSX.Element;
//# sourceMappingURL=slider.d.ts.map