import { jsx as _jsx } from "react/jsx-runtime";
import { SlideSwitch, SlideSwitchIndicator } from './slider.js';
/** Compatibility aliases; new code uses the shared spring controls explicitly. */
export const SwitchIndicator = SlideSwitchIndicator;
export function Switch(props) {
    return _jsx(SlideSwitch, { ...props });
}
//# sourceMappingURL=switch.js.map