import type {SupabaseClient} from '@supabase/supabase-js';
import {decodeGame, SAVE_VERSION} from '../persistence/json';
import type {GameState} from '../state/types';

export const OUTDATED = 'Une version plus récente du jeu a enregistré ta partie : recharge la page pour mettre le jeu à jour.';
export class CloudError extends Error {
  constructor(public code: 'outdated' | 'invalid' | 'session' | 'network', message?: string) { super(message ?? code); }
}
export interface RemoteSave {owner: string; state: GameState; revision: number; savedAt: string; operation: string}
export interface CommitRequest {owner: string; expected: number; operation: string; state: GameState}
export type CommitResult = {status: 'ok'; owner: string; revision: number; savedAt: string; operation: string}
  | {status: 'conflict'; remote: RemoteSave | null};
export interface CloudGateway {read(owner: string): Promise<RemoteSave | null>; commit(request: CommitRequest): Promise<CommitResult>}
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
  async read(owner: string): Promise<RemoteSave | null> {
    const {data, error} = await this.client.from('prairie_saves').select('*').eq('owner_id', owner).maybeSingle();
    if (error) fail(error);
    return data ? remoteSave(data, owner) : null;
  }
  async commit(r: CommitRequest): Promise<CommitResult> {
    const {data, error} = await this.client.rpc('prairie_commit', {p_owner: r.owner, p_expected: r.expected, p_operation: r.operation, p_state: r.state});
    if (error) fail(error);
    if (data?.status === 'outdated') throw new CloudError('outdated', OUTDATED);
    if (data?.status === 'conflict') return {status: 'conflict', remote: data.remote ? remoteSave(data.remote, r.owner) : null};
    if (data?.status !== 'ok' || data.owner_id !== r.owner || data.operation_id !== r.operation || data.revision !== r.expected + 1 || typeof data.saved_at !== 'string' || !Number.isFinite(Date.parse(data.saved_at))) throw new CloudError('invalid');
    return {status: 'ok', owner: r.owner, revision: data.revision, savedAt: data.saved_at, operation: r.operation};
  }
}
