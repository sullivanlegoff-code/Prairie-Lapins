import type {GameController} from '../application/GameController';
import type {SaveStorage} from '../persistence/storage';
import {SAVE_KEY} from '../persistence/storage';
import {decodeGame, encodeGame} from '../persistence/json';
import type {GameState} from '../state/types';
import {CloudError, OUTDATED, type CloudGateway, type CommitRequest, type RemoteSave} from './gateway';

import {CLOUD_KEY} from './accountState';
export {CLOUD_KEY} from './accountState';
export const BACKUP_KEY = 'prairie-lapins.cloud.backup.v1';
interface Link {owner: string; revision: number; baseline: string; syncedAt: string | null; pending: CommitRequest | null}
export type SyncStatus = 'disconnected' | 'checking' | 'choice' | 'conflict' | 'saved' | 'waiting' | 'sending' | 'offline' | 'session' | 'error' | 'local-error' | 'outdated';
export interface SyncView {status: SyncStatus; syncedAt: string | null; remote: RemoteSave | null; message?: string}
interface Timing {now(): number; set(callback: () => void, delay: number): unknown; clear(handle: unknown): void; uuid(): string}
const timing: Timing = {now: Date.now, set: (f, ms) => setTimeout(f, ms), clear: h => clearTimeout(h as ReturnType<typeof setTimeout>), uuid: () => crypto.randomUUID()};

/** Stable projection of player progress. Passive income, daily rollover, derived rights,
 * mission completion and initiation expiry are recalculated on load. A birth retains its
 * identity across the automatic nest → nursery transfer; manual actions also update
 * resources/events. Job deadlines remain for orders/trips (including acceleration).
 * This is a comparison string, not a cryptographic digest or an uploaded save. */
export function fingerprint(state: GameState): string {
  const s = structuredClone(state);
  // The simulation rebases all deadlines together if the device clock goes backwards.
  // Express them relative to the stable daily reference, so this remains passive too.
  const reference = s.missions.daily.referenceAt;
  s.nextHeartGiftAt -= reference;
  for (const t of s.travel?.trips ?? []) { t.startedAt -= reference; t.endsAt -= reference; }
  for (const b of s.buildings) {
    if (b.order) { b.order.startedAt -= reference; b.order.endsAt -= reference; }
    if (b.breeding) { b.breeding.startedAt -= reference; b.breeding.endsAt -= reference; }
    for (const baby of b.nursery?.babies ?? []) { baby.startedAt -= reference; baby.readyAt -= reference; }
  }
  const automaticTransfer = s.missions.claimed.includes('to-nursery');
  const births = s.buildings.flatMap(b => [
    ...(b.breeding ? [b.breeding.birth] : []), ...(b.nursery?.babies.map(x => x.birth) ?? []),
  ]).sort((a, b) => a.id.localeCompare(b.id));
  const {lastSimulatedAt: _time, purchaseUnlocks: _unlocks, levelAccessTransition: _rights, missions, initiation, buildings, ...rest} = s;
  return JSON.stringify({...rest, births,
    missions: {events: missions.events, claimed: missions.claimed, nightOrderStarted: missions.nightOrderStarted},
    initiation: initiation ? {used: initiation.used, birthId: initiation.birthId} : null,
    buildings: buildings.map(({incomeUnits: _income, breeding, nursery, ...b}) => ({...b,
      breeding: automaticTransfer ? null : breeding,
      nursery: nursery ? automaticTransfer ? {capacity: nursery.capacity} : nursery : null})),
  });
}

/** No DOM/auth/network dependencies. Local writes must succeed before any request. */
export class CloudSync {
  private owner: string | null = null;
  private link: Link | null = null;
  private generation = 0;
  private flight: number | null = null;
  private timer: unknown;
  private failures = 0;
  private ready = false;
  private replacing = false;
  private view: SyncView = {status: 'disconnected', syncedAt: null, remote: null};
  private listeners = new Set<(v: SyncView) => void>();
  private unsubscribe: () => void;
  constructor(private controller: GameController, private storage: SaveStorage, private gateway: CloudGateway,
    private onReplacement: () => void = () => {}, private clock: Timing = timing,
    private policy = {onlineServicesAllowed: true}) {
    this.unsubscribe = controller.subscribe(() => this.changed());
  }
  getView(): SyncView { return {...this.view}; }
  subscribe(f: (v: SyncView) => void): () => void { this.listeners.add(f); f(this.getView()); return () => { this.listeners.delete(f); }; }
  private show(status: SyncStatus, message?: string): void {
    this.view = {...this.view, status, syncedAt: this.link?.syncedAt ?? null, message};
    for (const f of this.listeners) f(this.getView());
  }
  private persist(link: Link): void { this.storage.setItem(CLOUD_KEY, JSON.stringify(link)); this.link = link; }
  private readLink(owner: string): Link | null {
    const raw = this.storage.getItem(CLOUD_KEY); if (!raw) return null;
    const r = JSON.parse(raw) as Link;
    if (r.owner !== owner) return null;
    if (!Number.isSafeInteger(r.revision) || r.revision < 0 || typeof r.baseline !== 'string' || !(r.syncedAt === null || typeof r.syncedAt === 'string')) throw new Error('invalid cache');
    if (r.pending) {
      const p = r.pending, d = decodeGame(JSON.stringify(p.state));
      if (p.owner !== owner || p.expected !== r.revision || typeof p.operation !== 'string' || !d.ok) throw new Error('invalid pending');
      // Keep the exact request as stored, including a historical format. Never mutate a replay.
    }
    return r;
  }
  async connect(owner: string): Promise<void> {
    this.disconnect();
    if (!this.policy.onlineServicesAllowed || this.controller.storageScope === 'laboratory' || this.storage.scope === 'laboratory') {
      this.show('error', "Le laboratoire n'a jamais accès aux comptes."); return;
    }
    this.owner = owner; const gen = this.generation; this.show('checking');
    try {
      this.link = this.readLink(owner);
      let remote = await this.gateway.read(owner);
      if (gen !== this.generation) return;
      // A lost reply is resolved with the identical operation before reconciliation.
      if (this.link?.pending) {
        if (this.controller.getSnapshot().status !== 'saved') { this.show('local-error'); return; }
        const result = await this.gateway.commit(this.link.pending);
        if (gen !== this.generation) return;
        if (result.status === 'ok') this.accept(result.revision, result.savedAt, this.link.pending.state);
        else { this.view.remote = result.remote; this.show('conflict'); return; }
        remote = await this.gateway.read(owner);
        if (gen !== this.generation) return;
      }
      this.view.remote = remote;
      const local = this.controller.getSnapshot().state;
      if (!this.link) { this.show('choice'); return; }
      if ((remote?.revision ?? 0) === this.link.revision) {
        this.ready = true; this.show('saved'); this.changed(); return;
      }
      if (remote && remote.revision > this.link.revision && local && fingerprint(local) === this.link.baseline) {
        this.replace(remote); return;
      }
      this.show('conflict');
    } catch (e) { if (gen === this.generation) this.failed(e); }
  }
  disconnect(): void {
    this.generation++; this.owner = null; this.ready = false; this.flight = null; this.link = null;
    this.cancelTimer(); this.view.remote = null; this.show('disconnected');
  }
  expire(): void { this.disconnect(); this.show('session'); }
  dispose(): void { this.disconnect(); this.unsubscribe(); this.listeners.clear(); }
  private cancelTimer(): void { if (this.timer !== undefined) this.clock.clear(this.timer); this.timer = undefined; }
  private schedule(delay: number, f: () => void): void {
    if (this.timer !== undefined) return;
    this.timer = this.clock.set(() => { this.timer = undefined; f(); }, delay);
  }
  private local(): GameState {
    const snap = this.controller.getSnapshot();
    if (snap.status !== 'saved' || !snap.state) throw new Error('local save unavailable');
    return snap.state;
  }
  /** The panel asks for explicit confirmation, with both current summaries. */
  async choose(choice: 'remote' | 'local', confirmed: boolean): Promise<void> {
    if (!confirmed || !this.owner || !['choice', 'conflict'].includes(this.view.status)) return;
    try {
      if (choice === 'remote') { if (this.view.remote) this.replace(this.view.remote); return; }
      const state = this.local();
      this.persist({owner: this.owner, revision: this.view.remote?.revision ?? 0, baseline: '', syncedAt: null, pending: null});
      this.ready = true; this.show('waiting');
      await this.flush(state);
    } catch (e) { this.failed(e); }
  }
  private replace(remote: RemoteSave): void {
    if (!this.owner) return;
    // Even an unreadable local save is backed up verbatim before import.
    const raw = this.storage.getItem(SAVE_KEY);
    if (raw !== null) this.storage.setItem(BACKUP_KEY, raw);
    const prepared = this.controller.prepareImport(encodeGame(remote.state));
    if (!prepared.ok) throw new Error('import refused');
    this.replacing = true;
    try {
      const imported = this.controller.confirmImport(prepared.token, true);
      if (!imported.ok) throw new Error('import failed');
      this.persist({owner: this.owner, revision: remote.revision, baseline: fingerprint(this.local()), syncedAt: remote.savedAt, pending: null});
      this.ready = true; this.failures = 0; this.show('saved'); this.onReplacement();
    } finally { this.replacing = false; }
  }
  private changed(): void {
    if (!this.ready || !this.owner || !this.link || this.replacing) return;
    const snap = this.controller.getSnapshot();
    if (snap.status !== 'saved' || !snap.state) { this.cancelTimer(); this.show('local-error'); return; }
    if (this.flight !== null || ['outdated', 'error', 'session', 'offline'].includes(this.view.status)) return;
    if (this.link.pending || fingerprint(snap.state) !== this.link.baseline) {
      this.show('waiting'); this.schedule(4000, () => { void this.flush(); });
    } else { this.cancelTimer(); this.show('saved'); }
  }
  private accept(revision: number, savedAt: string, state: GameState): void {
    this.persist({owner: this.owner!, revision, syncedAt: savedAt, baseline: fingerprint(state), pending: null});
    this.failures = 0;
  }
  async flush(state?: GameState): Promise<void> {
    if (!this.owner || !this.ready || !this.link || this.flight !== null || ['conflict', 'choice', 'outdated', 'error', 'session'].includes(this.view.status)) return;
    this.cancelTimer();
    const gen = this.generation;
    try {
      const local = this.local();
      if (!this.link.pending && !state && fingerprint(local) === this.link.baseline) { this.show('saved'); return; }
      if (!this.link.pending) this.persist({...this.link, pending: {owner: this.owner, expected: this.link.revision, operation: this.clock.uuid(), state: state ?? local}});
      const pending = this.link.pending!;
      this.flight = gen; this.show('sending');
      const result = await this.gateway.commit(pending);
      if (gen !== this.generation) return;
      if (result.status === 'conflict') {
        this.ready = false; this.view.remote = result.remote; this.show('conflict');
      } else { this.accept(result.revision, result.savedAt, pending.state); this.show('saved'); }
    } catch (e) { if (gen === this.generation) this.failed(e); }
    finally { if (gen === this.generation) { this.flight = null; this.changed(); } }
  }
  private failed(e: unknown): void {
    const snap = this.controller.getSnapshot();
    if (snap.status !== 'saved') { this.show('local-error'); return; }
    if (e instanceof CloudError && e.code === 'outdated') { this.ready = false; this.cancelTimer(); this.show('outdated', OUTDATED); }
    else if (e instanceof CloudError && e.code === 'session') { this.ready = false; this.show('session'); }
    else if (e instanceof CloudError && e.code === 'network') {
      this.show('offline');
      const delays = [5000, 10000, 20000, 40000, 60000];
      this.schedule(delays[Math.min(this.failures++, 4)], () => { void this.retry(); });
    } else { this.ready = false; this.show('error', 'La sauvegarde en ligne est bloquée. Ta partie reste sur cet appareil. Exporte-la puis réessaie.'); }
  }
  async retry(): Promise<void> {
    this.cancelTimer();
    if (!this.owner || ['outdated', 'session', 'choice', 'conflict'].includes(this.view.status)) return;
    if (this.ready) await this.flush(); else await this.connect(this.owner);
  }
}
