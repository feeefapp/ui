'use client';
import { useLayoutEffect, useRef, useState } from 'react';
/** Measure the same controls the user sees, including fonts, zoom and loading. */
export function useMeasuredActions(host, measuringRow, revision) {
    const [measurements, setMeasurements] = useState(null);
    const focusAfterFit = useRef(null);
    useLayoutEffect(() => {
        const element = host.current;
        const row = measuringRow.current;
        if (!element || !row)
            return;
        let cancelled = false;
        const measure = () => {
            if (cancelled)
                return;
            const active = element.ownerDocument.activeElement;
            if (active instanceof HTMLElement && element.contains(active) && !row.contains(active)) {
                focusAfterFit.current =
                    active.closest('[data-lab-action-id]')?.dataset.labActionId ?? null;
            }
            const style = getComputedStyle(element);
            const availableWidth = Math.max(0, element.clientWidth -
                Number.parseFloat(style.paddingLeft || '0') -
                Number.parseFloat(style.paddingRight || '0'));
            const widths = new Map();
            for (const item of row.querySelectorAll('[data-lab-action-id]')) {
                widths.set(item.dataset.labActionId, item.getBoundingClientRect().width);
            }
            const overflowWidth = row.querySelector('[data-lab-overflow-measure]')?.getBoundingClientRect()
                .width ?? 40;
            setMeasurements((previous) => {
                if (previous &&
                    previous.availableWidth === availableWidth &&
                    previous.overflowWidth === overflowWidth &&
                    previous.widths.size === widths.size &&
                    [...widths].every(([id, width]) => previous.widths.get(id) === width))
                    return previous;
                return { availableWidth, widths, overflowWidth };
            });
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(element);
        for (const child of row.children)
            observer?.observe(child);
        // Font loading and browser zoom may change a label without a parent resize.
        const fonts = element.ownerDocument.fonts;
        void fonts?.ready.then(measure);
        fonts?.addEventListener('loadingdone', measure);
        element.ownerDocument.defaultView?.addEventListener('resize', measure);
        return () => {
            cancelled = true;
            observer?.disconnect();
            fonts?.removeEventListener('loadingdone', measure);
            element.ownerDocument.defaultView?.removeEventListener('resize', measure);
        };
    }, [host, measuringRow, revision]);
    return { measurements, focusAfterFit };
}
//# sourceMappingURL=use_measured_actions.js.map