import {progressionFromXp} from '../simulation/progression';
import {applyProgressionGain} from '../simulation/progressionRewards';
import {act, advance, createGame, decodeGame, encodeGame} from '../simulation';
import {MAX_JSON_LENGTH, readPresentationId, type DecodeResult} from '../persistence/json';
import {SAVE_KEY, type SaveStorage} from '../persistence/storage';
import type {ActionResult, Command, GameState, ProgressionGain} from '../state/types';

type DecodeFailure = Extract<DecodeResult, {ok: false}>['reason'];
export type ControllerIssue = DecodeFailure | 'READ_FAILED' | 'WRITE_FAILED' | 'STORAGE_CHANGED' |
  'NO_GAME' | 'NOT_CONFIRMED' | 'STALE_IMPORT' | 'DISPOSED' | 'ENCODING_FAILED';
export type Operation = {ok: true} | {ok: false; reason: ControllerIssue};
export type SaveStatus = 'saved' | 'unsaved' | 'read-error' | 'write-error' | 'invalid-save' | 'conflict';
export interface ConfirmedProgressionGain extends ProgressionGain {presentationId: string; fromLevel: number; toLevel: number}
export interface Snapshot {
  presentationId?: string;
  generation: number; state: GameState | null; status: SaveStatus; issue: ControllerIssue | null;
  lastSavedAt: number | null; dirty: boolean; hasUnreadableBackup: boolean;
  /** True when this session started on a new game because the stored one predates the current catalogue (never restored). */
  catalogReset: boolean;
}
export interface ImportSummary {hearts: number; pattes: number; grass: number; rabbits: number; discovered: GameState['discovered']}
export type PreparedImport = {ok: true; token: number; summary: ImportSummary} | {ok: false; reason: ControllerIssue};

/** Owns the only mutable game reference. No Phaser, DOM, timers or browser APIs. */
export class GameController {
  private state: GameState | null = null;
  private status: SaveStatus = 'unsaved';
  private issue: ControllerIssue | null = null;
  private lastSavedAt: number | null = null;
  private dirty = false;
  private storedRaw: string | null = null;
  private hasRead = false;
  private disposed = false;
  private importSequence = 0;
  private pendingImport: {token: number; state: GameState} | null = null;
  private catalogReset = false;
  private generation = 0;
  private presentationId: string = crypto.randomUUID();
  private gainListeners = new Set<(gain: ConfirmedProgressionGain) => void>();
  private stopStorage: (() => void) | undefined;
  private listeners = new Set<(snapshot: Snapshot) => void>();

  constructor(private storage: SaveStorage, private clock: () => number = Date.now,
    private rng: () => number = Math.random) {
    this.load();
    this.stopStorage = storage.onChange?.(SAVE_KEY, () => {
      if (!this.disposed && this.state && this.storageChanged()) this.emit();
    });
  }

  get storageScope(): 'normal' | 'laboratory' { return this.storage.scope ?? 'normal'; }

  getSnapshot(): Snapshot {
    return {presentationId: this.presentationId, generation: this.generation, catalogReset: this.catalogReset, state: this.state ? structuredClone(this.state) : null, status: this.status, issue: this.issue,
      lastSavedAt: this.lastSavedAt, dirty: this.dirty,
      hasUnreadableBackup: this.status === 'invalid-save' && this.storedRaw !== null};
  }
  subscribe(listener: (snapshot: Snapshot) => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener); listener(this.getSnapshot());
    return () => { this.listeners.delete(listener); };
  }
  onProgressionGain(listener: (gain: ConfirmedProgressionGain) => void): () => void {
    if (this.disposed) return () => {};
    this.gainListeners.add(listener); return () => { this.gainListeners.delete(listener); };
  }
  private emit(): void { for (const listener of this.listeners) listener(this.getSnapshot()); }

  private load(): void {
    let raw: string | null;
    try { raw = this.storage.getItem(SAVE_KEY); }
    catch { this.status = 'read-error'; this.issue = 'READ_FAILED'; this.emit(); return; }
    this.hasRead = true; this.storedRaw = raw;
    const now = this.clock();
    const decoded = raw === null ? null : decodeGame(raw);
    // A save from before the catalogue boundary is neither read nor restored: the game starts again, and says so.
    // Only this game's save is replaced (through the same write, with its failure handling); nothing else in storage is touched.
    if (decoded && !decoded.ok && decoded.reason === 'INCOMPATIBLE_CATALOG') this.catalogReset = true;
    else if (decoded && !decoded.ok) {
      this.status = 'invalid-save'; this.issue = decoded.reason; this.emit(); return;
    }
    if (decoded?.ok && raw !== null) this.presentationId = readPresentationId(raw) ?? this.presentationId;
    this.state = decoded?.ok ? advance(decoded.state, now) : createGame(now);
    this.dirty = true;
    this.saveCurrent(now); this.emit();
  }

  /** Best-effort stale-tab detection. Web Storage read/write is not a transaction. */
  private storageChanged(): boolean {
    if (this.status === 'conflict') return true;
    let raw: string | null;
    try { raw = this.storage.getItem(SAVE_KEY); } catch { return false; }
    if (!this.hasRead || raw === this.storedRaw) return false;
    this.status = 'conflict'; this.issue = 'STORAGE_CHANGED'; this.dirty = true;
    this.cancelImport(); return true;
  }
  private write(candidate: GameState, savedAt: number, presentationId = this.presentationId): Operation {
    let json: string;
    try { json = encodeGame(candidate, presentationId); }
    catch { return {ok: false, reason: 'ENCODING_FAILED'}; }
    // Also prevents a superseded controller from silently overwriting a successful import.
    let raw: string | null;
    try { raw = this.storage.getItem(SAVE_KEY); }
    catch { return {ok: false, reason: 'READ_FAILED'}; }
    if (this.hasRead && raw !== this.storedRaw) return {ok: false, reason: 'STORAGE_CHANGED'};
    try { this.storage.setItem(SAVE_KEY, json); }
    catch { return {ok: false, reason: 'WRITE_FAILED'}; }
    this.hasRead = true; this.storedRaw = json; this.lastSavedAt = savedAt;
    return {ok: true};
  }
  private saveCurrent(now: number): Operation {
    if (!this.state) return {ok: false, reason: 'NO_GAME'};
    const result = this.write(this.state, now);
    if (result.ok) { this.status = 'saved'; this.issue = null; this.dirty = false; }
    else {
      this.status = result.reason === 'STORAGE_CHANGED' ? 'conflict' : result.reason === 'READ_FAILED' ? 'read-error' : 'write-error';
      this.issue = result.reason; this.dirty = true;
    }
    return result;
  }
  /** Separate time advance survives action refusal. */
  private updateTime(now: number): boolean {
    if (!this.state) return false;
    const next = advance(this.state, now);
    const changed = JSON.stringify(next) !== JSON.stringify(this.state);
    if (changed) { this.state = next; this.dirty = true; }
    return changed;
  }
  refresh(): void {
    if (this.disposed || !this.state) return;
    if (this.storageChanged()) { this.emit(); return; }
    const now = this.clock();
    if (this.updateTime(now)) this.saveCurrent(now);
    this.emit();
  }
  perform(command: Command): ActionResult | {ok: false; reason: 'NO_GAME' | 'DISPOSED' | 'SALE_NOT_SAVED' | 'ACTION_NOT_SAVED' | 'STORAGE_CHANGED'} {
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!this.state) return {ok: false, reason: 'NO_GAME'};
    if (this.storageChanged()) { this.emit(); return {ok: false, reason: command.type === 'sellDecoration' ? 'ACTION_NOT_SAVED' : 'STORAGE_CHANGED'}; }
    const now = this.clock();
    const changed = this.updateTime(now);
    const result = act(this.state!, command, now, this.rng);
    return this.finishAction(result, now, changed);
  }

  /** Laboratory-only entry point; the normal UI never imports the test tools. */
  grantLaboratoryXp(amount: number): ActionResult | {ok: false; reason: 'SALE_NOT_SAVED' | 'NOT_TEST_SESSION' | 'NO_GAME' | 'DISPOSED' | 'STORAGE_CHANGED' | 'ACTION_NOT_SAVED'} {
    if (this.storageScope !== 'laboratory') return {ok: false, reason: 'NOT_TEST_SESSION'};
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!this.state) return {ok: false, reason: 'NO_GAME'};
    if (this.storageChanged()) { this.emit(); return {ok: false, reason: 'STORAGE_CHANGED'}; }
    const now = this.clock(), changed = this.updateTime(now);
    const candidate = structuredClone(this.state!);
    const applied = amount === 50 || amount === 500 ? applyProgressionGain(candidate, amount) : {ok: false as const, reason: 'INVALID_CHOICE' as const};
    const result: ActionResult = applied.ok ? {ok: true, state: candidate, progressionGain: applied.gain} : {ok: false, state: this.state!, reason: applied.reason};
    return this.finishAction(result, now, changed);
  }

  /** Every successful command commits its complete candidate before adoption. Time alone remains best-effort. */
  private finishAction(result: ActionResult, now: number, changed: boolean): ActionResult | {ok: false; reason: 'ACTION_NOT_SAVED'} {
    if (result.ok) {
      const saved = this.write(result.state, now);
      if (!saved.ok) {
        this.status = saved.reason === 'STORAGE_CHANGED' ? 'conflict' : saved.reason === 'READ_FAILED' ? 'read-error' : 'write-error';
        this.issue = saved.reason; this.emit();
        return {ok: false, reason: 'ACTION_NOT_SAVED'};
      }
      const fromLevel = progressionFromXp(this.state!.progression.totalXp).level;
      this.state = result.state; this.status = 'saved'; this.issue = null; this.dirty = false;
      if (result.progressionGain && result.progressionGain.xpGained > 0) {
        const gain: ConfirmedProgressionGain = {...structuredClone(result.progressionGain), presentationId: this.presentationId,
          fromLevel, toLevel: progressionFromXp(this.state.progression.totalXp).level};
        for (const listener of this.gainListeners) { try { listener(structuredClone(gain)); } catch { /* Presentation cannot undo a saved command. */ } }
      }
      this.emit(); return structuredClone(result);
    }
    if (changed) this.saveCurrent(now);
    this.emit();
    return structuredClone(result);
  }
  retrySave(): Operation {
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!this.state) {
      // An invalid save must never be overwritten by the Retry button.
      if (this.status === 'invalid-save') return {ok: false, reason: this.issue!};
      this.load(); return this.state && this.status === 'saved' ? {ok: true} : {ok: false, reason: this.issue ?? 'NO_GAME'};
    }
    const now = this.clock(); this.updateTime(now);
    const result = this.saveCurrent(now); this.emit(); return result;
  }
  exportGame(): {ok: true; json: string; filename: string} | {ok: false; reason: ControllerIssue} {
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!this.state) return {ok: false, reason: 'NO_GAME'};
    this.refresh();
    try {
      const date = new Date(this.clock()).toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
      return {ok: true, json: encodeGame(this.state, this.presentationId), filename: `prairie-lapins-${date}.json`};
    } catch { return {ok: false, reason: 'ENCODING_FAILED'}; }
  }
  unreadableBackup(): string | null { return this.status === 'invalid-save' ? this.storedRaw : null; }
  prepareImport(json: string, fileSize?: number): PreparedImport {
    this.cancelImport();
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (fileSize !== undefined && fileSize > MAX_JSON_LENGTH) return {ok: false, reason: 'FILE_TOO_LARGE'};
    // An incompatible or invalid file is refused here, before anything of the current game or its save is touched.
    const decoded = decodeGame(json);
    if (!decoded.ok) return decoded;
    const token = ++this.importSequence;
    this.pendingImport = {token, state: decoded.state};
    return {ok: true, token, summary: {hearts: decoded.state.hearts, pattes: decoded.state.pattes, grass: decoded.state.grass,
      rabbits: decoded.state.rabbits.length, discovered: [...decoded.state.discovered]}};
  }
  cancelImport(): void { this.pendingImport = null; this.importSequence++; }
  confirmImport(token: number, confirmed: boolean): Operation {
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!this.pendingImport || this.pendingImport.token !== token) return {ok: false, reason: 'STALE_IMPORT'};
    if (!confirmed) { this.cancelImport(); return {ok: false, reason: 'NOT_CONFIRMED'}; }
    const now = this.clock();
    const candidate = advance(this.pendingImport.state, now);
    // Persist first. Failure cannot replace the current game or change its save status.
    const presentationId = crypto.randomUUID();
    const result = this.write(candidate, now, presentationId);
    if (!result.ok) return result;
    this.presentationId = presentationId; this.generation++;
    this.state = candidate; this.dirty = false; this.status = 'saved'; this.issue = null;
    this.cancelImport(); this.emit(); return {ok: true};
  }
  restart(confirmed: boolean): Operation {
    if (this.disposed) return {ok: false, reason: 'DISPOSED'};
    if (!confirmed) return {ok: false, reason: 'NOT_CONFIRMED'};
    const now = this.clock(); const candidate = createGame(now);
    const presentationId = crypto.randomUUID();
    const result = this.write(candidate, now, presentationId);
    if (!result.ok) return result;
    this.presentationId = presentationId; this.generation++;
    this.state = candidate; this.dirty = false; this.status = 'saved'; this.issue = null;
    this.cancelImport(); this.emit(); return {ok: true};
  }
  dispose(): void { this.disposed = true; this.stopStorage?.(); this.stopStorage = undefined; this.cancelImport(); this.listeners.clear(); this.gainListeners.clear(); }
}
