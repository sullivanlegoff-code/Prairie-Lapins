import type {GameController} from '../application/GameController';
import type {SaveStorage} from '../persistence/storage';
import {SAVE_KEY} from '../persistence/storage';
import {decodeGame, encodeGame} from '../persistence/json';
import type {GameState} from '../state/types';
import type {Adjustment} from '../simulation/adjustments';
import {CloudError, OUTDATED, type CloudGateway, type CommitRequest, type RemoteSave} from './gateway';

import {CLOUD_KEY} from './accountState';
import {xpAfterSlowdown} from '../simulation/progression';
export {CLOUD_KEY} from './accountState';
export const BACKUP_KEY = 'prairie-lapins.cloud.backup.v1';
export const LINK_BACKUP_PREFIX = 'prairie-lapins.cloud.link-backup.v1.';
class InvalidLink extends Error {}
interface Link {owner: string; revision: number; baseline: string; syncedAt: string | null; pending: CommitRequest | null; format?: number}
/** Version of the fingerprint below. A link written with another one (none: before v25) compares with `sameCore`. */
export const FINGERPRINT_FORMAT = 4;
export type SyncStatus = 'disconnected' | 'checking' | 'choice' | 'conflict' | 'saved' | 'waiting' | 'sending' | 'offline' | 'session' | 'error' | 'local-error' | 'outdated' | 'recovery';
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
  if (s.care) { s.care.startedAt -= reference; s.care.endsAt -= reference; }
  // Benny's recharge moves with the other deadlines when the clock goes backwards (format 4).
  if (s.benny && s.benny.powerReadyAt > 0) s.benny.powerReadyAt -= reference;
  for (const b of s.buildings) {
    if (b.order) { b.order.startedAt -= reference; b.order.endsAt -= reference; }
    if (b.breeding) { b.breeding.startedAt -= reference; b.breeding.endsAt -= reference; }
    for (const baby of b.nursery?.babies ?? []) { baby.startedAt -= reference; baby.readyAt -= reference; }
  }
  const automaticTransfer = s.missions.claimed.includes('to-nursery');
  const births = s.buildings.flatMap(b => [
    ...(b.breeding ? [b.breeding.birth] : []), ...(b.nursery?.babies.map(x => x.birth) ?? []),
  ]).sort((a, b) => a.id.localeCompare(b.id));
  const {lastSimulatedAt: _time, purchaseUnlocks: _unlocks, levelAccessTransition: _rights, missions, initiation, buildings, cozy, christmas, ...rest} = s;
  // A change of drawing ends by itself: only the drawing it leads to counts. The automatic transfer counts each parent's birth by
  // itself too, so that challenge is passive once the transfer is.
  const rabbits = rest.rabbits.map(({lookChange, classicLook, evolution, ...rabbit}) => {
    let kept = evolution;
    if (evolution && automaticTransfer) {
      const {challenges, ...others} = evolution, {parent: _parent, ...counted} = challenges ?? {};
      kept = {...others, ...(Object.keys(counted).length ? {challenges: counted} : {})};
    }
    return {...rabbit, ...((lookChange ? !classicLook : classicLook) ? {classicLook: true} : {}), ...(kept && Object.keys(kept).length ? {evolution: kept} : {})};
  });
  // Christmas (v26): the sucres d'orge, today's snowman and the mini-game are actions of their own. The challenges drawn at a new
  // cycle are passive, like the daily missions; their claims change the sucres d'orge. Absent until something real happened, so
  // a game that never played the event keeps the same fingerprint as before it.
  const festive = christmas && (christmas.candies || christmas.snowman || christmas.skyGifts)
    ? {christmas: {candies: christmas.candies, snowman: christmas.snowman ?? null, skyGifts: christmas.skyGifts ?? null}} : {};
  // Shared time is passive, like income. The full bonds and album still travel with the next action save.
  return JSON.stringify({...rest, rabbits, ...festive, births, cozy: {souvenirs: cozy?.souvenirs ?? [], album: cozy?.album.filter(m => m.kind !== 'friendship') ?? []},
    // A caress and the 3-day streak are actions of their own: they must reach the other devices (audit, 4 November 2026).
    missions: {events: missions.events, claimed: missions.claimed, nightOrderStarted: missions.nightOrderStarted, petted: missions.daily.petted ?? [], streak: missions.streak ?? null},
    initiation: initiation ? {used: initiation.used, birthId: initiation.birthId} : null,
    buildings: buildings.map(({incomeUnits: _income, breeding, nursery, ...b}) => ({...b,
      breeding: automaticTransfer ? null : breeding,
      nursery: nursery ? automaticTransfer ? {capacity: nursery.capacity} : nursery : null})),
  });
}

/**
 * Whether two fingerprints, possibly of different formats, describe the same progress. A save update (v22 → v25) reshapes
 * what the fingerprint holds (enclosures grown, old cozy fields gone), so an untouched game would look changed and show a
 * conflict. Only what every format holds the same way and what any real play changes is compared: resources, levels,
 * identifiers, rabbits, buildings and missions claimed.
 */
export function sameCore(a: string, b: string): boolean {
  try {
    const core = (json: string, adjust: (xp: number) => number = xp => xp) => {
      const f = JSON.parse(json) as {pattes?: unknown; grass?: unknown; hearts?: unknown; nextId?: unknown; progression?: unknown;
        rabbits?: {id: unknown; species: unknown; name?: unknown; affection: unknown}[]; buildings?: {id: unknown; kind: unknown}[]; missions?: {claimed?: unknown; events?: unknown}};
      const p = f.progression as {totalXp?: unknown} | undefined, progression = p && typeof p.totalXp === 'number' ? {...p, totalXp: adjust(p.totalXp)} : p;
      return JSON.stringify([f.pattes, f.grass, f.hearts, f.nextId, progression, f.missions?.claimed, f.missions?.events,
        (f.rabbits ?? []).map(r => [r.id, r.species, r.name ?? null, r.affection]), (f.buildings ?? []).map(x => [x.id, x.kind])]);
    };
    // A baseline from before the slow-down above level 20 says the XP of the published curve (see `migrateV26`).
    return core(a) === core(b) || core(a) === core(b, xpAfterSlowdown);
  } catch { return false; }
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
  private corrections: Adjustment[] = [];
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
  private persist(link: Link): void { link = {...link, format: FINGERPRINT_FORMAT}; this.storage.setItem(CLOUD_KEY, JSON.stringify(link)); this.link = link; }
  private readLink(owner: string): Link | null {
    const raw = this.storage.getItem(CLOUD_KEY); if (!raw) return null;
    try {
      const r = JSON.parse(raw) as Link;
      if (!r || typeof r.owner !== 'string') throw new InvalidLink();
      if (r.owner !== owner) return null;
      if (!Number.isSafeInteger(r.revision) || r.revision < 0 || typeof r.baseline !== 'string' || !(r.syncedAt === null || typeof r.syncedAt === 'string') || !(r.format === undefined || Number.isSafeInteger(r.format))) throw new InvalidLink();
      if (r.pending) {
        const p = r.pending, d = decodeGame(JSON.stringify(p.state));
        if (p.owner !== owner || p.expected !== r.revision || typeof p.operation !== 'string' || !d.ok) throw new InvalidLink();
        // Keep the exact request as stored, including a historical format. Never mutate a replay.
      }
      return r;
    } catch { throw new InvalidLink(); }
  }
  /** Archive before clearing a broken link; neither game nor replacement backup is touched. */
  async repairLink(confirmed: boolean): Promise<void> {
    if (!confirmed || !this.owner || this.view.status !== 'recovery') return;
    const owner = this.owner;
    try {
      let broken = false;
      try { this.readLink(owner); } catch (e) { if (!(e instanceof InvalidLink)) throw e; broken = true; }
      // Another tab may already have repaired it: never clear a newly valid pending operation.
      if (!broken) { await this.connect(owner); return; }
      const raw = this.storage.getItem(CLOUD_KEY);
      if (raw) {
        const key = LINK_BACKUP_PREFIX + this.clock.uuid();
        if (this.storage.getItem(key) !== null) throw new Error('backup collision');
        this.storage.setItem(key, raw);
      }
      this.storage.setItem(CLOUD_KEY, '');
    } catch { this.show('recovery', 'La copie de la liaison a échoué. Aucun remplacement de partie n’a été effectué. Libère un peu d’espace et réessaie.'); return; }
    await this.connect(owner);
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
      this.corrections = await this.loadCorrections(owner);
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
      // A link from an older fingerprint format: if this device has not played since, its baseline becomes today's one.
      if (this.link.format !== FINGERPRINT_FORMAT && !this.link.pending && this.link.baseline && local && sameCore(fingerprint(local), this.link.baseline))
        this.persist({...this.link, baseline: fingerprint(local)});
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
    this.generation++; this.owner = null; this.ready = false; this.flight = null; this.link = null; this.corrections = [];
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
    // A recovered save receives the owner's corrections it does not carry yet.
    this.changed();
  }
  private async loadCorrections(owner: string): Promise<Adjustment[]> {
    try { return await this.gateway.adjustments?.(owner) ?? []; } catch { return []; }
  }
  /** Applies missing owner corrections to the current local save; the normal envoi follows. */
  private correct(): boolean {
    return this.corrections.length > 0 && this.controller.applyAdjustments(this.corrections);
  }
  private changed(): void {
    if (!this.ready || !this.owner || !this.link || this.replacing) return;
    const snap = this.controller.getSnapshot();
    if (snap.status !== 'saved' || !snap.state) { this.cancelTimer(); this.show('local-error'); return; }
    if (this.flight !== null || ['outdated', 'error', 'session', 'offline'].includes(this.view.status)) return;
    // The nested save notification schedules the envoi.
    if (!this.link.pending && this.correct()) return;
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
    if (e instanceof InvalidLink) { this.ready = false; this.show('recovery'); return; }
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
    if (!this.ready) { await this.connect(this.owner); return; }
    const owner = this.owner, gen = this.generation, corrections = await this.loadCorrections(owner);
    if (gen !== this.generation) return;
    this.corrections = corrections; this.changed();
    await this.flush();
  }
}
