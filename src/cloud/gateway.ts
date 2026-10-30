import type {SupabaseClient} from '@supabase/supabase-js';
import {decodeGame, SAVE_VERSION} from '../persistence/json';
import type {GameState} from '../state/types';
import {SPECIES, type SpeciesId} from '../config/balance';
import {ADJUSTMENT_KINDS, ADJUSTMENT_LIMIT, type Adjustment, type AdjustmentKind} from '../simulation/adjustments';

export const OUTDATED = 'Une version plus récente du jeu a enregistré ta partie : recharge la page pour mettre le jeu à jour.';
export const CLOUD_REQUEST_TIMEOUT = 20_000;
export class CloudError extends Error {
  constructor(public code: 'outdated' | 'invalid' | 'session' | 'network', message?: string) { super(message ?? code); }
}
export interface RemoteSave {owner: string; state: GameState; revision: number; savedAt: string; operation: string}
export interface CommitRequest {owner: string; expected: number; operation: string; state: GameState}
export type CommitResult = {status: 'ok'; owner: string; revision: number; savedAt: string; operation: string}
  | {status: 'conflict'; remote: RemoteSave | null};
export interface CloudGateway {
  read(owner: string): Promise<RemoteSave | null>; commit(request: CommitRequest): Promise<CommitResult>;
  /** Owner corrections (newest 100). Optional: absent or failing means none, never a blocked sync. */
  adjustments?(owner: string): Promise<Adjustment[]>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function adjustmentRows(rows: unknown, owner: string): Adjustment[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row): Adjustment[] => {
    const r = row as Record<string, unknown> | null;
    const amount = Number(r?.amount);
    if (!(r && r.owner_id === owner && typeof r.id === 'string' && UUID.test(r.id) && ADJUSTMENT_KINDS.includes(r.kind as AdjustmentKind)
      && Number.isSafeInteger(amount) && Math.abs(amount) <= ADJUSTMENT_LIMIT)) return [];
    const id = r.id.toLowerCase(), kind = r.kind as AdjustmentKind;
    if (kind !== 'plan_birth') return [{id, kind, amount}];
    // A planned birth names a species with a recipe; anything else is ignored.
    const species = r.species as SpeciesId;
    return typeof species === 'string' && Object.hasOwn(SPECIES, species) && SPECIES[species].recipe ? [{id, kind, amount, species}] : [];
  }).reverse(); // Oldest first: corrections apply in the order the owner wrote them.
}
export function remoteSave(value: unknown, owner: string): RemoteSave {
  const r = value as Record<string, unknown> | null;
  if (r && typeof r.state === 'object' && r.state && 'version' in r.state && Number(r.state.version) > SAVE_VERSION)
    throw new CloudError('outdated', OUTDATED);
  if (!r || r.owner_id !== owner || !Number.isSafeInteger(r.revision) || Number(r.revision) < 1 || typeof r.saved_at !== 'string' || !Number.isFinite(Date.parse(r.saved_at)) || typeof r.operation_id !== 'string') throw new CloudError('invalid');
  const decoded = decodeGame(JSON.stringify(r.state));
  if (!decoded.ok) throw new CloudError('invalid');
  return {owner, revision: Number(r.revision), savedAt: r.saved_at, operation: r.operation_id, state: decoded.state};
}
function fail(error: {status?: number; code?: string}): never {
  throw new CloudError(error.status === 401 || error.status === 403 || error.code === 'PGRST301' ? 'session' : 'network');
}
export class SupabaseGateway implements CloudGateway {
  constructor(private client: SupabaseClient) {}
  /** Abort the transport and settle once, even if a transport ignores cancellation. */
  private request<T>(start: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true; controller.abort(); reject(new CloudError('network'));
      }, CLOUD_REQUEST_TIMEOUT);
      void Promise.resolve().then(() => start(controller.signal)).then(value => {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve(value);
      }, () => {
        if (settled) return;
        settled = true; clearTimeout(timer); reject(new CloudError('network'));
      });
    });
  }
  async read(owner: string): Promise<RemoteSave | null> {
    const {data, error} = await this.request(signal => this.client.from('prairie_saves').select('*').eq('owner_id', owner).abortSignal(signal).maybeSingle());
    if (error) fail(error);
    return data ? remoteSave(data, owner) : null;
  }
  async adjustments(owner: string): Promise<Adjustment[]> {
    try {
      const {data, error} = await this.request(signal => this.client.from('prairie_adjustments').select('id, owner_id, kind, amount, species')
        .eq('owner_id', owner).order('created_at', {ascending: false}).limit(100).abortSignal(signal));
      return error ? [] : adjustmentRows(data, owner);
    } catch { return []; }
  }
  async commit(r: CommitRequest): Promise<CommitResult> {
    const {data, error} = await this.request(signal => this.client.rpc('prairie_commit', {p_owner: r.owner, p_expected: r.expected, p_operation: r.operation, p_state: r.state}).abortSignal(signal));
    if (error) fail(error);
    if (data?.status === 'outdated') throw new CloudError('outdated', OUTDATED);
    if (data?.status === 'conflict') return {status: 'conflict', remote: data.remote ? remoteSave(data.remote, r.owner) : null};
    if (data?.status !== 'ok' || data.owner_id !== r.owner || data.operation_id !== r.operation || data.revision !== r.expected + 1 || typeof data.saved_at !== 'string' || !Number.isFinite(Date.parse(data.saved_at))) throw new CloudError('invalid');
    return {status: 'ok', owner: r.owner, revision: data.revision, savedAt: data.saved_at, operation: r.operation};
  }
}
