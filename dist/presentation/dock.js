'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useI18n } from '../i18n.js';
import { Dock } from '../dock/index.js';
/**
 * The actions of a presentation surface in one floating glass dock. Put it in a surface's `dock`
 * (or a `PresentationBody` `bottom`) so the actions never scroll away.
 */
export function PresentationDock({ label, content, children, className }) {
    const { t } = useI18n();
    return (_jsx(Dock, { label: label ?? t('lab.presentation.actions'), content: content, className: className, children: children }));
}
//# sourceMappingURL=dock.js.map