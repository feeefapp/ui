'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../primitives/button.js';
import { Modal } from '../presentation/modal.js';
import { useShellGap } from '../scroll/shell-gap.js';
import { ToolbarGroup } from '../toolbar.js';
import { cn } from '../utils.js';
import { TemporalBody, TemporalEdges, TemporalPresets, useTemporalEditor, } from './temporal-editor.js';
import './temporal-dialog.css';
import { GlassScope } from '../glass/container.js';
/**
 * A temporal picker as a dialog, two levels deep and nothing more: the dialog, then one row of
 * glass groups above (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply).
 * The calendars and times scroll between them. There is no title bar and no close button; Cancel,
 * Escape and the backdrop close it. Wrap your own submit handling with `onSubmit`; the hidden
 * `date` or `from`/`to` inputs are inside its form for `readTemporalForm`.
 */
export function TemporalDialog({ open, label, close, returnFocusRef, formId, onSubmit, onClear, clearLabel = 'Clear', actions, clearDisabled, applyLabel = 'Apply', showApply = true, error, intro, dir, className, ...options }) {
    const editor = useTemporalEditor({ ...options, resetKey: open });
    const bar = !!editor.presets.length || (editor.range && editor.hasCalendar);
    const gap = useShellGap();
    return (_jsx(Modal, { open: open, label: label, onOpenChange: close, returnFocusRef: returnFocusRef, 
        // Bars float the shell gap G from the edges; content starts where the buttons inside them
        // start (G + the group's 2px padding).
        edgeGap: gap, contentPadding: gap + 2, className: cn('lab-temporal-dialog', editor.range && editor.hasCalendar && 'lab-temporal-dialog--pair', className), header: bar ? (_jsxs(GlassScope, { className: "lab-temporal-dialog-bar", dir: dir, children: [editor.range && editor.hasCalendar && (_jsx(ToolbarGroup, { label: "Range ends", className: "lab-temporal-dialog-edges", children: _jsx(TemporalEdges, { editor: editor }) })), !!editor.presets.length && (_jsx(ToolbarGroup, { label: "Quick choices", className: "lab-temporal-dialog-presets", children: _jsx(TemporalPresets, { editor: editor, layout: "bar" }) }))] })) : (_jsx(GlassScope, { className: "lab-temporal-dialog-bar", dir: dir, children: _jsx(ToolbarGroup, { label: "Dialog title", className: "lab-temporal-dialog-title", children: _jsx("h2", { className: "lab-presentation-title", children: label }) }) })), dock: _jsx(GlassScope, { className: "lab-temporal-dialog-bar", dir: dir, children: _jsxs(ToolbarGroup, { label: `${label} actions`, className: "lab-temporal-dialog-actions", children: [_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "regular", onClick: close, children: "Cancel" }), _jsx("span", { className: "lab-temporal-dialog-spacer" }), actions, onClear && (_jsx(Button, { variant: "text", appearance: "toolbar", controlSize: "regular", disabled: clearDisabled, onClick: onClear, children: clearLabel })), showApply && (_jsx(Button, { variant: "filled", appearance: "toolbar", controlSize: "regular", type: "submit", form: formId, children: applyLabel }))] }) }), children: _jsxs("form", { id: formId, className: "lab-temporal-dialog-form", dir: dir, onSubmit: onSubmit, children: [intro && _jsx("p", { className: "lab-temporal-dialog-intro", children: intro }), _jsx("div", { className: "lab-temporal-editor", "data-calendar": editor.hasCalendar, "data-range": editor.range, children: _jsx(TemporalBody, { editor: editor }) }), error && (_jsx("p", { role: "alert", className: "lab-filter-error", children: error }))] }) }));
}
//# sourceMappingURL=temporal-dialog.js.map