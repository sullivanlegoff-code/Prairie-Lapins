import type {ParcelId} from '../config/land';
import type {CoastRequest, CoastResponse, CoastResult} from './coastProtocol';

export interface CoastJob {
  id: number; ids: ParcelId[]; requestedAt: number; dispatchedAt?: number; receivedAt?: number;
  committedAt?: number; totalMs?: number; mainMs?: number; registrationMs?: number;
  requestMs: number; discarded?: boolean; error?: string; worker?: CoastResult['stats'];
}
interface Options {
  send(request: CoastRequest): void;
  ownership(ids: ParcelId[]): void;
  commit(result: CoastResult): {mainMs: number; registrationMs: number};
  stop(): void;
  now?: () => number;
}

/** One active job, one replaceable pending request. A stale result never reaches the renderer. */
export class CoastGeneration {
  readonly jobs: CoastJob[] = [];
  latest = 0;
  visible = 0;
  error: string | null = null;
  private signature: string | null = null;
  private pending: CoastJob | null = null;
  private active: CoastJob | null = null;
  private ready = false;
  private disposed = false;
  private readonly now: () => number;

  constructor(private readonly options: Options) { this.now = options.now ?? (() => performance.now()); }
  get busy(): boolean { return this.active !== null || this.pending !== null; }

  request(ids: readonly ParcelId[]): void {
    if (this.disposed) return;
    const sorted = [...new Set(ids)].sort(), signature = sorted.join(',');
    if (signature === this.signature) return;
    const start = this.now();
    this.signature = signature;
    const job: CoastJob = {id: ++this.latest, ids: sorted, requestedAt: start, requestMs: 0};
    this.options.ownership(sorted);
    this.pending = job;
    this.jobs.push(job);
    if (this.jobs.length > 64) this.jobs.shift();
    this.dispatch();
    job.requestMs = this.now() - start;
  }

  receive(response: CoastResponse): void {
    if (this.disposed) return;
    if (response.type === 'ready') { this.ready = true; this.dispatch(); return; }
    const job = this.active;
    if (!job || response.id !== job.id) return;
    this.active = null;
    job.receivedAt = this.now();
    if (response.type === 'failure') { job.error = response.message; this.error = response.message; }
    else if (response.id !== this.latest) job.discarded = true;
    else {
      job.worker = response.stats;
      try {
        const timing = this.options.commit(response);
        job.mainMs = timing.mainMs; job.registrationMs = timing.registrationMs;
        job.committedAt = this.now(); job.totalMs = job.committedAt - job.requestedAt;
        this.visible = job.id; this.error = null;
      } catch (error) { job.error = String(error); this.error = job.error; }
    }
    this.dispatch();
  }

  /** Fatal transport/startup failure leaves the last valid display untouched. */
  fail(error: string): void {
    if (this.disposed) return;
    this.error = error; this.ready = false;
    if (this.active) this.active.error = error;
    this.active = null; this.pending = null;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true; this.pending = null; this.active = null; this.options.stop();
  }

  private dispatch(): void {
    if (!this.ready || this.active || !this.pending || this.disposed) return;
    const job = this.pending; this.pending = null; this.active = job; job.dispatchedAt = this.now();
    try { this.options.send({type: 'generate', id: job.id, ids: job.ids}); }
    catch (error) { this.fail(String(error)); }
  }
}
