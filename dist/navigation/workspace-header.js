'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { FoAnimatedLogo } from '../brand/logo.js';
import { LabLink, LabToolbar, LabToolbarGroup } from '../ui.js';
import { useLabI18n } from '../i18n.js';
/** Shared chrome; pages supply context and commands, never a second navbar skin. */
export function LabWorkspaceHeader({ toggle, title, detail, actions, tools, toolsLabel, headerRef, embedded = false, brandHref = '/', brandLabel = 'Feeef', brandSuffix, }) {
    const { t } = useLabI18n();
    return (_jsx("header", { ref: headerRef, className: "lab-workspace-header", "data-embedded": embedded, children: _jsx(LabToolbar, { label: t('lab.nav.labWorkspace'), leading: _jsxs(_Fragment, { children: [_jsxs(LabToolbarGroup, { label: t('lab.nav.workspaceNavigation'), className: "lab-workspace-header-leading", children: [toggle, _jsxs(LabLink, { href: brandHref, className: "lab-workspace-brand", "aria-label": brandLabel, children: [_jsx(FoAnimatedLogo, { width: "var(--lab-navigation-logo-width, 100px)", height: "var(--lab-navigation-logo-height, 27px)" }), brandSuffix && _jsxs("span", { "aria-hidden": "true", children: ["/ ", brandSuffix] })] })] }), _jsxs("div", { className: "lab-workspace-context", children: [_jsx("strong", { children: title }), detail && _jsx("span", { children: detail })] })] }), trailing: _jsxs(_Fragment, { children: [tools && (_jsx(LabToolbarGroup, { label: toolsLabel ?? t('lab.nav.viewControls'), className: "lab-workspace-header-tools", children: tools })), actions && (_jsx(LabToolbarGroup, { label: t('lab.nav.workspaceActions'), className: "lab-workspace-header-actions", children: actions }))] }) }) }));
}
//# sourceMappingURL=workspace-header.js.map