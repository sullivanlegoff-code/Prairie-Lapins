import {vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import type {SaveStorage} from '../src/persistence/storage';
import {SAVE_KEY} from '../src/persistence/storage';
import {createGame, encodeGame} from '../src/simulation';
import type {GameState} from '../src/state/types';
import {CloudError, remoteSave, type CloudGateway, type CommitRequest, type CommitResult, type RemoteSave} from '../src/cloud/gateway';
import {CloudSync} from '../src/cloud/sync';
import type {Adjustment} from '../src/simulation/adjustments';

export class MemoryCloud implements CloudGateway {
  remote: RemoteSave | null = null;
  calls: CommitRequest[] = [];
  receipts = new Map<string, CommitResult>();
  offline = false; loseReply = false;
  corrections: Adjustment[] = [];
  async adjustments() { if (this.offline) throw new CloudError('network'); return structuredClone(this.corrections); }
  async read(owner: string) {
    if (this.offline) throw new CloudError('network');
    return this.remote ? remoteSave({owner_id: owner, revision: this.remote.revision, saved_at: this.remote.savedAt, operation_id: this.remote.operation, state: this.remote.state}, owner) : null;
  }
  async commit(request: CommitRequest): Promise<CommitResult> {
    this.calls.push(structuredClone(request));
    if (this.offline) throw new CloudError('network');
    const receipt = this.receipts.get(request.operation); if (receipt) return receipt;
    if (request.expected !== (this.remote?.revision ?? 0)) return {status: 'conflict', remote: structuredClone(this.remote)};
    this.remote = {owner: request.owner, revision: request.expected + 1, savedAt: new Date(1_790_000_000_000).toISOString(), operation: request.operation, state: structuredClone(request.state)};
    const result = {status: 'ok' as const, ...this.remote}; this.receipts.set(request.operation, result);
    if (this.loseReply) { this.loseReply = false; throw new CloudError('network'); }
    return result;
  }
}
export function remote(state: GameState = createGame(1_790_000_000_000), revision = 1): RemoteSave {
  return {owner: 'player-a', state, revision, operation: crypto.randomUUID(), savedAt: new Date(1_790_000_000_000).toISOString()};
}
export function fixture(scope: 'normal' | 'laboratory' = 'normal', gateway = new MemoryCloud(), data = new Map<string, string>(), seed?: GameState) {
  let now = 1_790_000_000_000;
  if (!data.has(SAVE_KEY)) data.set(SAVE_KEY, encodeGame(seed ?? createGame(now)));
  const storage: SaveStorage = {scope, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }};
  const controller = new GameController(storage, () => now);
  const replacement = vi.fn();
  const sync = new CloudSync(controller, storage, gateway, replacement);
  return {controller, sync, storage, data, gateway, replacement,
    rename(name: string) { expectSuccess(controller.perform({type: 'renameRabbit', id: controller.getSnapshot().state!.rabbits[0].id, name})); },
    advance(ms: number) { now += ms; controller.refresh(); },
    dispose() { sync.dispose(); controller.dispose(); }};
}
function expectSuccess(result: {ok: boolean}) { if (!result.ok) throw new Error('fixture action failed'); }
