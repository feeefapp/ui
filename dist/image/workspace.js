'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import './workspace.css';
/** Bounded Lab canvas with measured floating chrome and a 12px edge inset. */
export function ImageWorkspace({ top, bottom, board }) {
    const header = useRef(null), composer = useRef(null);
    const [insets, setInsets] = useState({ top: 80, bottom: 120, left: 12, right: 12 });
    useLayoutEffect(() => {
        const measure = () => setInsets(old => {
            const top = (header.current?.offsetHeight ?? 0) + 24, bottom = (composer.current?.offsetHeight ?? 0) + 24;
            return old.top === top && old.bottom === bottom ? old : { ...old, top, bottom };
        });
        const observer = new ResizeObserver(measure);
        if (header.current)
            observer.observe(header.current);
        if (composer.current)
            observer.observe(composer.current);
        measure();
        return () => observer.disconnect();
    }, []);
    return _jsxs("div", { className: "lab-image-workspace", children: [board(insets), _jsx("div", { className: "lab-image-workspace-top", ref: header, children: top }), _jsx("div", { className: "lab-image-workspace-bottom", ref: composer, children: bottom })] });
}
//# sourceMappingURL=workspace.js.map