import { jsx as _jsx } from "react/jsx-runtime";
import { LabSlideSwitch, LabSlideSwitchIndicator } from './slider.js';
/** Compatibility aliases; new code uses the shared spring controls explicitly. */
export const LabSwitchIndicator = LabSlideSwitchIndicator;
export function LabSwitch(props) {
    return _jsx(LabSlideSwitch, { ...props, controlSize: "compact" });
}
//# sourceMappingURL=switch.js.map