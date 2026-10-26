import {expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createGame} from '../src/simulation';
import {remoteSave, SupabaseGateway} from '../src/cloud/gateway';

const owner = '00000000-0000-4000-8000-000000000001';
const row = () => ({owner_id: owner, state: createGame(1_790_000_000_000), revision: 5, operation_id: crypto.randomUUID(), saved_at: '2026-10-26T10:00:00.000Z'});
it('valide les lignes et accepte les anciennes versions via les migrations du jeu', () => {
  const r = row();
  expect(remoteSave(r, owner).state.version).toBe(19);
  const v18 = {...r.state, version: 18};
  expect(remoteSave({...r, state: v18}, owner).state.version).toBe(19);
  expect(() => remoteSave({...r, owner_id: 'autre'}, owner)).toThrow();
  expect(() => remoteSave({...r, state: {...r.state, grass: -1}}, owner)).toThrow();
  expect(() => remoteSave({...r, state: {...r.state, version: 20}}, owner)).toThrow(/version plus récente/);
  expect(() => remoteSave({...r, revision: Number.MAX_SAFE_INTEGER + 1}, owner)).toThrow();
});
it('le gateway traduit les erreurs, valide le reçu et transmet les paramètres exacts au RPC', async () => {
  const r = row(), request = {owner, expected: 4, operation: r.operation_id, state: r.state};
  const rpc = vi.fn(async () => ({data: {status: 'ok', owner_id: owner, revision: 5, operation_id: r.operation_id, saved_at: r.saved_at}, error: null}));
  const eq = vi.fn(() => ({maybeSingle: async () => ({data: r, error: null})}));
  const client = {rpc, from: vi.fn(() => ({select: () => ({eq})}))} as unknown as SupabaseClient;
  const g = new SupabaseGateway(client);
  expect((await g.read(owner))?.revision).toBe(5); expect(eq).toHaveBeenCalledWith('owner_id', owner);
  expect(await g.commit(request)).toEqual({status: 'ok', owner, revision: 5, savedAt: r.saved_at, operation: r.operation_id});
  expect(rpc).toHaveBeenCalledWith('prairie_commit', {p_owner: owner, p_expected: 4, p_operation: r.operation_id, p_state: r.state});
  rpc.mockResolvedValueOnce({data: {...r, status: 'outdated'}, error: null} as never);
  await expect(g.commit(request)).rejects.toMatchObject({code: 'outdated'});
  rpc.mockResolvedValueOnce({data: null, error: {status: 401}} as never);
  await expect(g.commit(request)).rejects.toMatchObject({code: 'session'});
  rpc.mockResolvedValueOnce({data: null, error: {status: 503}} as never);
  await expect(g.commit(request)).rejects.toMatchObject({code: 'network'});
  rpc.mockResolvedValueOnce({data: {status: 'ok', owner_id: owner, revision: 8, operation_id: r.operation_id, saved_at: r.saved_at}, error: null});
  await expect(g.commit(request)).rejects.toMatchObject({code: 'invalid'});
});
