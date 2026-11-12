/**
 * Keep a live lens image in place while its replacement is decoded. SVG feImage can briefly
 * paint transparent pixels when a new href is assigned before Firefox has decoded it. A decoded
 * HTML image shares the resource cache with feImage; holding that image retains its pixels.
 *
 * At most one decode runs at a time, with one replaceable pending frame. A ready frame commits
 * even when a newer shape is pending, so a continuous gesture advances the lens instead of
 * waiting for the gesture to stop. The scene remains responsible for the live outline clip.
 */
export class DecodedRefractionMap {
    commit;
    createImage;
    release;
    active = null;
    pending = null;
    cache = new Map();
    disposed = false;
    committed = null;
    // The scene can request its cached URL again after a decode failure. Keep that resource
    // valid until it is retried, superseded or disposed, even when no further frame arrives.
    failed = null;
    constructor(commit, createImage = () => new Image(), release = () => { }) {
        this.commit = commit;
        this.createImage = createImage;
        this.release = release;
    }
    /** Request the newest geometry; replaces any unstarted decode rather than growing a queue. */
    request(frame) {
        if (this.disposed)
            return;
        if (this.active) {
            const previousPending = this.pending?.href;
            // An equivalent resource can carry newer scale or material metadata.
            if (frame.href === this.active.frame.href) {
                this.active.frame = frame;
                this.pending = null;
            }
            else
                this.pending = frame;
            if (previousPending)
                this.releaseUnused(previousPending);
            return;
        }
        if (this.committed?.href === frame.href || this.cache.has(frame.href)) {
            this.publish(frame);
            return;
        }
        this.start(frame);
    }
    /** Drop retained resources and make an already-running decode harmless when the scene leaves. */
    dispose() {
        const resources = new Set([
            ...this.cache.keys(),
            this.active?.frame.href,
            this.pending?.href,
            this.committed?.href,
            this.failed?.href,
        ]);
        this.disposed = true;
        this.active = null;
        this.pending = null;
        this.committed = null;
        this.failed = null;
        this.cache.clear();
        for (const href of resources)
            if (href)
                this.release(href);
    }
    start(frame, retry = 0) {
        const previousFailure = this.failed?.href;
        this.failed = null;
        const image = this.createImage();
        const active = { frame, image, retry };
        this.active = active;
        if (previousFailure)
            this.releaseUnused(previousFailure);
        image.src = frame.href;
        void image.decode().then(() => {
            if (this.disposed || this.active !== active)
                return;
            this.cache.delete(active.frame.href);
            this.cache.set(active.frame.href, image);
            this.publish(active.frame);
            while (this.cache.size > 3) {
                const oldest = this.cache.keys().next().value;
                this.cache.delete(oldest);
                this.releaseUnused(oldest);
            }
        }, () => {
            if (this.disposed || this.active !== active)
                return;
            // Preserve the displayed lens and the failed resource. A settled final frame gets one
            // retry; a newer pending frame takes priority. A later explicit request can retry again.
            this.failed = active.frame;
        }).finally(() => {
            if (this.disposed || this.active !== active)
                return;
            this.active = null;
            const latest = this.pending;
            this.pending = null;
            if (latest)
                this.request(latest);
            else if (this.failed?.href === active.frame.href && active.retry === 0)
                this.start(active.frame, 1);
        });
    }
    publish(frame) {
        const previous = this.committed?.href;
        const previousFailure = this.failed?.href;
        this.failed = null;
        this.committed = frame;
        // Refresh decoded resources in LRU order, including a return to an older cached geometry.
        const image = this.cache.get(frame.href);
        if (image) {
            this.cache.delete(frame.href);
            this.cache.set(frame.href, image);
        }
        this.commit(frame);
        if (previous)
            this.releaseUnused(previous);
        if (previousFailure)
            this.releaseUnused(previousFailure);
    }
    releaseUnused(href) {
        if (this.active?.frame.href === href || this.pending?.href === href || this.committed?.href === href || this.failed?.href === href || this.cache.has(href))
            return;
        this.release(href);
    }
}
//# sourceMappingURL=decoded-refraction-map.js.map