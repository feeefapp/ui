import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { LabCheckbox, LabRadio } from './choice.js';
export const LabInput = React.forwardRef(({ className, type, ...props }, ref) => type === 'checkbox' ? (_jsx(LabCheckbox, { ref: ref, className: className, ...props })) : type === 'radio' ? (_jsx(LabRadio, { ref: ref, className: className, ...props })) : (_jsx("input", { ref: ref, type: type, className: cn('lab-input', className), ...props })));
LabInput.displayName = 'LabInput';
export const LabTextarea = React.forwardRef(({ className, ...props }, ref) => (_jsx("textarea", { ref: ref, className: cn('lab-textarea', className), ...props })));
LabTextarea.displayName = 'LabTextarea';
export const LabLabel = React.forwardRef(({ className, ...props }, ref) => (_jsx("label", { ref: ref, className: cn('lab-label', className), ...props })));
LabLabel.displayName = 'LabLabel';
export const LabImage = React.forwardRef((props, ref) => _jsx("img", { ...props, ref: ref }));
LabImage.displayName = 'LabImage';
//# sourceMappingURL=fields.js.map