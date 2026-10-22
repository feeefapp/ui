import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../utils.js';
import { Checkbox, Radio } from './choice.js';
export const Input = React.forwardRef(({ className, type, ...props }, ref) => type === 'checkbox' ? (_jsx(Checkbox, { ref: ref, className: className, ...props })) : type === 'radio' ? (_jsx(Radio, { ref: ref, className: className, ...props })) : (_jsx("input", { ref: ref, type: type, className: cn('lab-input', className), ...props })));
Input.displayName = 'Input';
export const Textarea = React.forwardRef(({ className, ...props }, ref) => (_jsx("textarea", { ref: ref, className: cn('lab-textarea', className), ...props })));
Textarea.displayName = 'Textarea';
export const Label = React.forwardRef(({ className, ...props }, ref) => (_jsx("label", { ref: ref, className: cn('lab-label', className), ...props })));
Label.displayName = 'Label';
export const Image = React.forwardRef((props, ref) => _jsx("img", { ...props, ref: ref }));
Image.displayName = 'Image';
//# sourceMappingURL=fields.js.map