'use client';
import { useLayoutEffect, useRef, useState } from 'react';
/** Measure unconstrained content against the host, not against an in-flight animated shell. */
export function useDockSize() {
    const host = useRef(null);
    const surface = useRef(null);
    const body = useRef(null);
    const [size, setSize] = useState(null);
    const [maxWidth, setMaxWidth] = useState();
    const [tileWidth, setTileWidth] = useState();
    const [actionsMaxWidth, setActionsMaxWidth] = useState();
    useLayoutEffect(() => {
        const parent = host.current;
        const shell = surface.current;
        const inner = body.current;
        if (!parent || !shell || !inner)
            return;
        let frame = 0;
        const read = () => {
            frame = 0;
            const css = getComputedStyle(shell);
            const horizontal = Number.parseFloat(css.paddingLeft) +
                Number.parseFloat(css.paddingRight) +
                Number.parseFloat(css.borderLeftWidth) +
                Number.parseFloat(css.borderRightWidth);
            const vertical = Number.parseFloat(css.paddingTop) +
                Number.parseFloat(css.paddingBottom) +
                Number.parseFloat(css.borderTopWidth) +
                Number.parseFloat(css.borderBottomWidth);
            const available = Math.max(0, parent.clientWidth - horizontal);
            setMaxWidth((value) => (value === available ? value : available));
            const tile = inner.querySelector('.lab-dock-content');
            const row = inner.querySelector('.lab-dock-row');
            const gap = tile && row ? Number.parseFloat(getComputedStyle(row).gap) || 0 : 0;
            const tileStyle = tile ? getComputedStyle(tile) : null;
            const tilePadding = tileStyle
                ? Number.parseFloat(tileStyle.paddingLeft) + Number.parseFloat(tileStyle.paddingRight)
                : 0;
            const intrinsic = tile
                ? Math.max(Math.max(0, ...[...tile.children].map((child) => child.scrollWidth)) +
                    tilePadding, tile.scrollWidth)
                : 0;
            const tileMax = tile
                ? Math.max(0, Math.min(available * 0.4, intrinsic, available - 44 - gap))
                : 0;
            setTileWidth((value) => (value === tileMax ? value : tileMax));
            const actionMax = Math.max(0, available - tileMax - gap);
            setActionsMaxWidth((value) => (value === actionMax ? value : actionMax));
            const next = {
                width: Math.min(parent.clientWidth, Math.ceil(inner.offsetWidth + horizontal)),
                height: Math.ceil(inner.offsetHeight + vertical),
            };
            setSize((value) => value?.width === next.width && value?.height === next.height ? value : next);
        };
        const schedule = () => {
            if (!frame)
                frame = requestAnimationFrame(read);
        };
        const resize = new ResizeObserver(schedule);
        resize.observe(parent);
        resize.observe(inner);
        const mutations = new MutationObserver(schedule);
        mutations.observe(inner, { childList: true, subtree: true, characterData: true });
        read();
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            mutations.disconnect();
        };
    }, []);
    return {
        host,
        actionsMaxWidth,
        surface,
        body,
        shellStyle: size ? { width: size.width, height: size.height } : undefined,
        bodyStyle: {
            '--lab-dock-tile-max': tileWidth === undefined ? undefined : `${tileWidth}px`,
            '--lab-dock-body-max': maxWidth === undefined ? undefined : `${maxWidth}px`,
        },
    };
}
//# sourceMappingURL=use_dock_size.js.map