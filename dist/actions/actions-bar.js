'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PopoverSurface } from '../ui.js';
import * as React from 'react';
import { useI18n } from '../i18n.js';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, ChevronRight, MoreHorizontal, Square, SquareCheck } from 'lucide-react';
import { cn } from '../utils.js';
import { Button } from '../ui.js';
import { PixelLoader } from '../pixel-art.js';
import { computeActionsLayout } from './layout.js';
import { useMeasuredActions } from './use_measured_actions.js';
import { useActionsWidth } from './width-context.js';
import './actions.css';
import { useOverflowMotion } from './overflow-motion.js';
/**
 * Responsive, priority-based actions. Measures its real controls and moves the lowest-priority
 * ones into a "More actions" menu when they don't fit. Place inside a dock or any bounded slot.
 */
export function ActionsBar({ actions, label, align = 'end', size = 'regular', gap = 4, overflowLabel, className, portalContainer, onActionError, }) {
    const { t } = useI18n();
    const resolvedOverflowLabel = overflowLabel ?? t('lab.common.moreActions');
    const ownerId = React.useId();
    const host = React.useRef(null);
    const measuringRow = React.useRef(null);
    const overflowTrigger = React.useRef(null);
    const row = React.useRef(null);
    const [container, setContainer] = React.useState();
    const [pending, setPending] = React.useState(new Set());
    const pendingRef = React.useRef(new Set());
    const alive = React.useRef(true);
    const [errorLabel, setErrorLabel] = React.useState('');
    const [overflowOpen, setOverflowOpen] = React.useState(false);
    const inheritedWidth = useActionsWidth();
    const revision = React.useMemo(() => ({ actions, size, pending }), [actions, size, pending]);
    const { measurements, focusAfterFit } = useMeasuredActions(host, measuringRow, revision);
    React.useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);
    React.useLayoutEffect(() => {
        setContainer(portalContainer === undefined ? (host.current?.closest('dialog') ?? null) : portalContainer);
    }, [portalContainer]);
    const layout = React.useMemo(() => measurements
        ? computeActionsLayout({
            actions,
            maxWidth: inheritedWidth ?? measurements.availableWidth,
            measure: (action) => measurements.widths.get(action.id) ?? measurements.overflowWidth,
            overflowWidth: measurements.overflowWidth,
            gap,
        })
        : { visible: [...actions], overflow: [], requiredWidth: 0 }, [actions, gap, inheritedWidth, measurements]);
    useOverflowMotion(row, overflowTrigger, layout.visible.map((action) => action.id));
    React.useLayoutEffect(() => {
        const actionId = focusAfterFit.current;
        focusAfterFit.current = null;
        if (actionId &&
            layout.overflow.some((action) => action.id === actionId) &&
            !host.current?.contains(document.activeElement)) {
            overflowTrigger.current?.focus();
        }
        if (!layout.overflow.length)
            setOverflowOpen(false);
    }, [layout, focusAfterFit]);
    const execute = (action, checked) => {
        if (action.disabled || action.loading || pendingRef.current.has(action.id))
            return;
        pendingRef.current.add(action.id);
        setPending(new Set(pendingRef.current));
        setErrorLabel('');
        void (async () => {
            try {
                if (action.type === 'toggle')
                    await action.onCheckedChange(checked ?? !action.checked);
                else
                    await action.onAction();
            }
            catch (error) {
                if (alive.current)
                    setErrorLabel(`${action.label} could not complete. Try again.`);
                onActionError?.(error, action);
            }
            finally {
                pendingRef.current.delete(action.id);
                if (alive.current)
                    setPending(new Set(pendingRef.current));
            }
        })();
    };
    const menu = { container, pending, execute, ownerId };
    return (_jsxs("div", { ref: host, "data-lab-actions-owner": ownerId, className: cn('lab-actions-bar', className), role: "group", "aria-label": label, hidden: !actions.length, "data-align": align, "data-size": size, "data-measured": !!measurements, style: {
            '--lab-actions-gap': `${gap}px`,
            ...(inheritedWidth === undefined
                ? {}
                : { inlineSize: layout.requiredWidth, flex: 'none' }),
        }, children: [_jsxs("div", { ref: row, className: "lab-actions-bar__row", children: [layout.visible.map((action) => (_jsx("span", { className: "lab-actions-bar__entry", "data-lab-action-id": action.id, children: action.type === 'group' ? (_jsx(GroupControl, { action: action, size: size, menu: menu })) : (_jsx(ActionControl, { action: action, size: size, loading: pending.has(action.id), onClick: () => execute(action) })) }, action.id))), !!layout.overflow.length && (_jsxs(DropdownMenu.Root, { modal: false, open: overflowOpen, onOpenChange: setOverflowOpen, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx(Button, { ref: overflowTrigger, className: "lab-actions-bar__control", variant: "ghost", appearance: "toolbar", controlSize: "icon", "aria-label": resolvedOverflowLabel, title: resolvedOverflowLabel, children: _jsx(MoreHorizontal, { size: 20, "aria-hidden": "true" }) }) }), _jsx(MenuSurface, { menu: menu, label: resolvedOverflowLabel, children: layout.overflow.map((action) => (_jsx(MenuAction, { action: action, menu: menu }, action.id))) })] }))] }), _jsxs("div", { ref: measuringRow, className: "lab-actions-bar__measure", "aria-hidden": "true", inert: true, children: [actions.map((action) => (_jsx("span", { className: "lab-actions-bar__entry", "data-lab-action-id": action.id, children: _jsx(ActionControl, { action: action, size: size, loading: pending.has(action.id) }) }, action.id))), _jsx("span", { className: "lab-actions-bar__entry", "data-lab-overflow-measure": true, children: _jsx(Button, { className: "lab-actions-bar__control", variant: "ghost", appearance: "toolbar", controlSize: "icon", tabIndex: -1, children: _jsx(MoreHorizontal, { size: 20, "aria-hidden": "true" }) }) })] }), errorLabel && (_jsx("span", { className: "lab-actions-bar__error", role: "alert", children: errorLabel }))] }));
}
const ActionControl = React.forwardRef(function ActionControl({ action, size, loading, ...buttonProps }, ref) {
    const iconOnly = action.display === 'icon' && (action.type === 'toggle' || !!action.icon);
    const blocked = action.disabled || (action.type === 'group' && !action.actions.length);
    return (_jsxs(Button, { ...buttonProps, ref: ref, className: "lab-actions-bar__control", variant: action.destructive
            ? 'destructive'
            : (action.variant ?? (action.type === 'toggle' && action.checked ? 'elevated' : 'ghost')), controlSize: iconOnly ? 'icon' : size, appearance: action.appearance ??
            (!action.destructive && (!action.variant || action.variant === 'ghost')
                ? 'toolbar'
                : 'default'), disabled: blocked, loading: loading || action.loading, "aria-label": action.label, "aria-pressed": action.type === 'toggle' ? action.checked : undefined, title: action.tooltip ?? (iconOnly ? action.label : undefined), children: [action.icon ? (_jsx("span", { className: "lab-actions-bar__icon", "aria-hidden": "true", children: action.icon })) : action.type === 'toggle' ? (action.checked ? (_jsx(SquareCheck, { size: 18, "aria-hidden": "true" })) : (_jsx(Square, { size: 18, "aria-hidden": "true" }))) : null, !iconOnly && _jsx("span", { children: action.label }), action.type === 'group' && !iconOnly && _jsx(ChevronDown, { size: 14, "aria-hidden": "true" })] }));
});
function GroupControl({ action, size, menu, }) {
    const [open, setOpen] = React.useState(false);
    return (_jsxs(DropdownMenu.Root, { modal: false, open: open, onOpenChange: (next) => {
            if (next && action.onOpen?.() === false)
                return;
            setOpen(next);
        }, children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsx(ActionControl, { action: action, size: size }) }), _jsx(MenuSurface, { menu: menu, label: action.label, children: action.actions.map((child) => (_jsx(MenuAction, { action: child, menu: menu }, child.id))) })] }));
}
function MenuSurface({ menu, label, children, }) {
    return (_jsx(DropdownMenu.Portal, { container: menu.container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(DropdownMenu.Content, { className: "lab-actions-menu", "data-lab-actions-owner": menu.ownerId, "data-lab-corners": true, sideOffset: 8, collisionBoundary: menu.container ?? undefined, collisionPadding: 12, align: "end", "aria-label": label, children: children }) }) }));
}
function MenuAction({ action, menu }) {
    const loading = action.loading || menu.pending.has(action.id);
    const disabled = action.disabled || loading;
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { className: "lab-actions-menu__leading", "aria-hidden": "true", children: loading ? (_jsx(PixelLoader, { size: 17, decorative: true })) : action.type === 'toggle' ? (_jsx(DropdownMenu.ItemIndicator, { children: _jsx(Check, { size: 18 }) })) : (action.icon) }), _jsx("span", { className: "lab-actions-menu__label", children: action.label })] }));
    if (action.type === 'group')
        return _jsx(SubmenuAction, { action: action, menu: menu });
    if (action.type === 'toggle')
        return (_jsx(DropdownMenu.CheckboxItem, { className: "lab-actions-menu__item", "data-lab-corners": true, "data-destructive": action.destructive || action.variant === 'destructive' || undefined, disabled: disabled, checked: action.checked, onCheckedChange: (checked) => menu.execute(action, checked === true), "aria-busy": loading || undefined, textValue: action.label, children: content }));
    return (_jsx(DropdownMenu.Item, { className: "lab-actions-menu__item", "data-lab-corners": true, "data-destructive": action.destructive || action.variant === 'destructive' || undefined, disabled: disabled, onSelect: () => menu.execute(action), "aria-busy": loading || undefined, textValue: action.label, children: content }));
}
function SubmenuAction({ action, menu }) {
    const [open, setOpen] = React.useState(false);
    return (_jsxs(DropdownMenu.Sub, { open: open, onOpenChange: (next) => {
            if (next && action.onOpen?.() === false)
                return;
            setOpen(next);
        }, children: [_jsxs(DropdownMenu.SubTrigger, { className: "lab-actions-menu__item", "data-lab-corners": true, disabled: action.disabled || action.loading || !action.actions.length, "aria-busy": action.loading || undefined, "data-destructive": action.destructive || action.variant === 'destructive' || undefined, textValue: action.label, children: [_jsx("span", { className: "lab-actions-menu__leading", "aria-hidden": "true", children: action.loading ? _jsx(PixelLoader, { size: 17, decorative: true }) : action.icon }), _jsx("span", { className: "lab-actions-menu__label", children: action.label }), _jsx(ChevronRight, { className: "lab-actions-menu__chevron lab-dir-flip", size: 16, "aria-hidden": "true" })] }), _jsx(DropdownMenu.Portal, { container: menu.container, children: _jsx(PopoverSurface, { asChild: true, children: _jsx(DropdownMenu.SubContent, { className: "lab-actions-menu", "data-lab-actions-owner": menu.ownerId, "data-lab-corners": true, sideOffset: 4, collisionBoundary: menu.container ?? undefined, collisionPadding: 12, "aria-label": action.label, children: action.actions.map((child) => (_jsx(MenuAction, { action: child, menu: menu }, child.id))) }) }) })] }));
}
//# sourceMappingURL=actions-bar.js.map