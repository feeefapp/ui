import { type RefractionWorkRequest, type RefractionWorkResult } from './refraction-work-model.js';
export type { RefractionWorkRequest, RefractionWorkResult } from './refraction-work-model.js';
type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
/**
 * One worker for all glass clusters. Only one computation is in flight; each client keeps its
 * newest pending geometry. FIFO clients prevent a frequently dragged bubble starving another.
 * Injectable dependencies keep queue, failure and resource-lifetime tests deterministic.
 * @internal
 */
export declare class RefractionWorkBroker {
    private makeWorker;
    private calculate;
    private defer;
    private worker;
    private workerFailed;
    private clients;
    private pending;
    private active;
    private nextId;
    constructor(makeWorker?: () => WorkerPort, calculate?: (request: RefractionWorkRequest) => RefractionWorkResult, defer?: (callback: () => void) => void);
    /** A client owns one cluster and may replace its pending geometry without growing the queue. */
    connect(commit: (result: RefractionWorkResult) => void): {
        submit: (request: RefractionWorkRequest) => void;
        dispose: () => void;
    };
    private pump;
    private failWorker;
    private runFallback;
    private finish;
}
/**
 * Asynchronously calculate the exact Firefox refraction map. One active job and the latest
 * pending geometry advance during continuous motion; dispose drops callbacks and queued work.
 */
export declare class RefractionWork {
    private client;
    constructor(commit: (result: RefractionWorkResult) => void, broker?: RefractionWorkBroker);
    /** Replace any unstarted geometry with this newest frame. */
    submit(request: RefractionWorkRequest): void;
    /** Release this cluster; the shared worker terminates when its final client leaves. */
    dispose(): void;
}
//# sourceMappingURL=refraction-work.d.ts.map