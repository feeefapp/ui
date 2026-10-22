'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { FoAnimatedLogo } from '../brand/logo.js';
import { Link, Toolbar, ToolbarGroup } from '../ui.js';
import { useI18n } from '../i18n.js';
/**
 * Floating workspace header: a glass group with the sidebar toggle and logo, the page title and
 * detail, then optional `tools` and `actions` groups at the end. Pages supply context and
 * commands, never a second navbar skin.
 */
export function WorkspaceHeader({ toggle, title, detail, actions, tools, toolsLabel, headerRef, embedded = false, brandHref = '/', brandLabel = 'Feeef', brandSuffix, }) {
    const { t } = useI18n();
    return (_jsx("header", { ref: headerRef, className: "lab-workspace-header", "data-embedded": embedded, children: _jsx(Toolbar, { label: t('lab.nav.labWorkspace'), leading: _jsxs(_Fragment, { children: [_jsxs(ToolbarGroup, { label: t('lab.nav.workspaceNavigation'), className: "lab-workspace-header-leading", children: [toggle, _jsxs(Link, { href: brandHref, className: "lab-workspace-brand", "aria-label": brandLabel, children: [_jsx(FoAnimatedLogo, { width: "var(--lab-navigation-logo-width, 100px)", height: "var(--lab-navigation-logo-height, 27px)" }), brandSuffix && _jsxs("span", { "aria-hidden": "true", children: ["/ ", brandSuffix] })] })] }), _jsxs("div", { className: "lab-workspace-context", children: [_jsx("strong", { children: title }), detail && _jsx("span", { children: detail })] })] }), trailing: _jsxs(_Fragment, { children: [tools && (_jsx(ToolbarGroup, { label: toolsLabel ?? t('lab.nav.viewControls'), className: "lab-workspace-header-tools", children: tools })), actions && (_jsx(ToolbarGroup, { label: t('lab.nav.workspaceActions'), className: "lab-workspace-header-actions", children: actions }))] }) }) }));
}
//# sourceMappingURL=workspace-header.js.map