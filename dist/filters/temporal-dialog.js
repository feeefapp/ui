'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../primitives/button.js';
import { Modal } from '../primitives/modal.js';
import { ToolbarGroup } from '../toolbar.js';
import { cn } from '../utils.js';
import { TemporalBody, TemporalEdges, TemporalPresets, useTemporalEditor, } from './temporal-editor.js';
import './temporal-dialog.css';
/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export function TemporalDialog({ open, label, close, returnFocusRef, formId, onSubmit, onClear, clearLabel = 'Clear', clearDisabled, applyLabel = 'Apply', showApply = true, error, intro, dir, className, ...options }) {
    const editor = useTemporalEditor({ ...options, resetKey: open });
    const bar = !!editor.presets.length || (editor.range && editor.hasCalendar);
    return (_jsx(Modal, { open: open, label: label, close: close, returnFocusRef: returnFocusRef, scrollable: true, fitContent: true, headerless: true, showClose: false, 
        // Content starts where the buttons inside the bars start (bar inset + the group's 2px padding).
        scrollOptions: { edgeGap: 12, contentPadding: 14 }, className: cn('lab-temporal-dialog', editor.range && editor.hasCalendar && 'lab-temporal-dialog--pair', className), top: bar ? (_jsxs("div", { className: "lab-temporal-dialog-bar", dir: dir, children: [editor.range && editor.hasCalendar && (_jsx(ToolbarGroup, { label: "Range ends", className: "lab-temporal-dialog-edges", children: _jsx(TemporalEdges, { editor: editor, appearance: "plain" }) })), !!editor.presets.length && (_jsx(ToolbarGroup, { label: "Quick choices", className: "lab-temporal-dialog-presets", children: _jsx(TemporalPresets, { editor: editor, layout: "bar" }) }))] })) : (_jsx("div", { className: "lab-temporal-dialog-bar", dir: dir, children: _jsx(ToolbarGroup, { label: "Dialog title", className: "lab-temporal-dialog-title", children: _jsx("h2", { className: "lab-modal-title", children: label }) }) })), bottom: _jsx("div", { className: "lab-temporal-dialog-bar", dir: dir, children: _jsxs(ToolbarGroup, { label: `${label} actions`, className: "lab-temporal-dialog-actions", children: [_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "compact", onClick: close, children: "Cancel" }), _jsx("span", { className: "lab-temporal-dialog-spacer" }), onClear && (_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "compact", disabled: clearDisabled, onClick: onClear, children: clearLabel })), showApply && (_jsx(Button, { variant: "filled", appearance: "toolbar", controlSize: "compact", type: "submit", form: formId, children: applyLabel }))] }) }), children: _jsxs("form", { id: formId, className: "lab-temporal-dialog-form", dir: dir, onSubmit: onSubmit, children: [intro && _jsx("p", { className: "lab-temporal-dialog-intro", children: intro }), _jsx("div", { className: "lab-temporal-editor", "data-calendar": editor.hasCalendar, "data-range": editor.range, children: _jsx(TemporalBody, { editor: editor }) }), error && (_jsx("p", { role: "alert", className: "lab-filter-error", children: error }))] }) }));
}
//# sourceMappingURL=temporal-dialog.js.map