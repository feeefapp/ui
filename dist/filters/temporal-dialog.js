'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LabButton } from '../primitives/button.js';
import { LabModal } from '../primitives/modal.js';
import { LabToolbarGroup } from '../toolbar.js';
import { cn } from '../utils.js';
import { LabTemporalBody, LabTemporalEdges, LabTemporalPresets, useLabTemporalEditor, } from './temporal-editor.js';
import './temporal-dialog.css';
/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export function LabTemporalDialog({ open, label, close, returnFocusRef, formId, onSubmit, onClear, clearLabel = 'Clear', clearDisabled, applyLabel = 'Apply', showApply = true, error, intro, dir, className, ...options }) {
    const editor = useLabTemporalEditor({ ...options, resetKey: open });
    const bar = !!editor.presets.length || (editor.range && editor.hasCalendar);
    return (_jsx(LabModal, { open: open, label: label, close: close, returnFocusRef: returnFocusRef, scrollable: true, fitContent: true, headerless: true, showClose: false, 
        // Content starts where the buttons inside the bars start (bar inset + the group's 2px padding).
        scrollOptions: { edgeGap: 12, contentPadding: 14 }, className: cn('lab-temporal-dialog', editor.range && editor.hasCalendar && 'lab-temporal-dialog--pair', className), top: bar ? (_jsxs("div", { className: "lab-temporal-dialog-bar", dir: dir, children: [editor.range && editor.hasCalendar && (_jsx(LabToolbarGroup, { label: "Range ends", className: "lab-temporal-dialog-edges", children: _jsx(LabTemporalEdges, { editor: editor, appearance: "plain" }) })), !!editor.presets.length && (_jsx(LabToolbarGroup, { label: "Quick choices", className: "lab-temporal-dialog-presets", children: _jsx(LabTemporalPresets, { editor: editor, layout: "bar" }) }))] })) : (_jsx("div", { className: "lab-temporal-dialog-bar", dir: dir, children: _jsx(LabToolbarGroup, { label: "Dialog title", className: "lab-temporal-dialog-title", children: _jsx("h2", { className: "lab-modal-title", children: label }) }) })), bottom: _jsx("div", { className: "lab-temporal-dialog-bar", dir: dir, children: _jsxs(LabToolbarGroup, { label: `${label} actions`, className: "lab-temporal-dialog-actions", children: [_jsx(LabButton, { variant: "text", appearance: "toolbar", controlSize: "compact", onClick: close, children: "Cancel" }), _jsx("span", { className: "lab-temporal-dialog-spacer" }), onClear && (_jsx(LabButton, { variant: "text", appearance: "toolbar", controlSize: "compact", disabled: clearDisabled, onClick: onClear, children: clearLabel })), showApply && (_jsx(LabButton, { variant: "filled", appearance: "toolbar", controlSize: "compact", type: "submit", form: formId, children: applyLabel }))] }) }), children: _jsxs("form", { id: formId, className: "lab-temporal-dialog-form", dir: dir, onSubmit: onSubmit, children: [intro && _jsx("p", { className: "lab-temporal-dialog-intro", children: intro }), _jsx("div", { className: "lab-temporal-editor", "data-calendar": editor.hasCalendar, "data-range": editor.range, children: _jsx(LabTemporalBody, { editor: editor }) }), error && (_jsx("p", { role: "alert", className: "lab-filter-error", children: error }))] }) }));
}
//# sourceMappingURL=temporal-dialog.js.map