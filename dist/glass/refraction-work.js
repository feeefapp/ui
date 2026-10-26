import { buildRefractionBitmap } from './refraction-work-model.js';
function createWorker() {
    return new Worker(new URL('./refraction-worker.js', import.meta.url), { type: 'module' });
}
/**
 * One worker for all glass clusters. Only one computation is in flight; each client keeps its
 * newest pending geometry. FIFO clients prevent a frequently dragged bubble starving another.
 * Injectable dependencies keep queue, failure and resource-lifetime tests deterministic.
 * @internal
 */
export class RefractionWorkBroker {
    makeWorker;
    calculate;
    defer;
    worker = null;
    workerFailed = false;
    clients = new Set();
    pending = new Map();
    active = null;
    nextId = 0;
    constructor(makeWorker = createWorker, calculate = buildRefractionBitmap, defer = queueMicrotask) {
        this.makeWorker = makeWorker;
        this.calculate = calculate;
        this.defer = defer;
    }
    /** A client owns one cluster and may replace its pending geometry without growing the queue. */
    connect(commit) {
        const client = { commit, disposed: false };
        this.clients.add(client);
        return {
            submit: (request) => {
                if (client.disposed)
                    return;
                if (this.active?.client === client && this.active.request.key === request.key) {
                    // The gesture returned to the shape already being calculated.
                    this.pending.delete(client);
                }
                else
                    this.pending.set(client, request);
                this.pump();
            },
            dispose: () => {
                if (client.disposed)
                    return;
                client.disposed = true;
                this.clients.delete(client);
                this.pending.delete(client);
                if (!this.clients.size) {
                    this.worker?.terminate();
                    this.worker = null;
                    this.active = null;
                    this.pending.clear();
                }
            },
        };
    }
    pump() {
        if (this.active || !this.pending.size)
            return;
        const [client, request] = this.pending.entries().next().value;
        this.pending.delete(client);
        const job = { id: ++this.nextId, client, request };
        this.active = job;
        if (!this.worker && !this.workerFailed) {
            try {
                const worker = this.makeWorker();
                this.worker = worker;
                worker.onmessage = event => {
                    if (this.worker !== worker)
                        return;
                    const reply = event.data;
                    if (reply.id !== this.active?.id)
                        return;
                    if ('error' in reply)
                        this.failWorker();
                    else
                        this.finish(this.active, reply.result);
                };
                worker.onerror = event => {
                    if (this.worker !== worker)
                        return;
                    event.preventDefault?.();
                    this.failWorker();
                };
                worker.onmessageerror = () => {
                    if (this.worker === worker)
                        this.failWorker();
                };
            }
            catch {
                this.workerFailed = true;
            }
        }
        if (!this.worker) {
            this.runFallback(job);
            return;
        }
        try {
            this.worker.postMessage({ id: job.id, request });
        }
        catch {
            this.failWorker();
        }
    }
    failWorker() {
        this.worker?.terminate();
        this.worker = null;
        this.workerFailed = true;
        if (this.active)
            this.runFallback(this.active);
    }
    runFallback(job) {
        // Preserve the asynchronous contract even without workers (including a worker-src CSP).
        this.defer(() => {
            if (this.active !== job)
                return;
            if (job.client.disposed) {
                this.finish(job);
                return;
            }
            let result;
            try {
                result = this.calculate(job.request);
            }
            catch {
                // Invalid/unrenderable input must not erase the last valid lens or block other clients.
            }
            this.finish(job, result);
        });
    }
    finish(job, result) {
        if (this.active !== job)
            return;
        this.active = null;
        try {
            if (!job.client.disposed && result)
                job.client.commit(result);
        }
        finally {
            this.pump();
        }
    }
}
let sharedBroker;
/**
 * Asynchronously calculate the exact Firefox refraction map. One active job and the latest
 * pending geometry advance during continuous motion; dispose drops callbacks and queued work.
 */
export class RefractionWork {
    client;
    constructor(commit, broker = sharedBroker ??= new RefractionWorkBroker()) {
        this.client = broker.connect(commit);
    }
    /** Replace any unstarted geometry with this newest frame. */
    submit(request) { this.client.submit(request); }
    /** Release this cluster; the shared worker terminates when its final client leaves. */
    dispose() { this.client.dispose(); }
}
//# sourceMappingURL=refraction-work.js.map