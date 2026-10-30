import {afterEach, expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createGame} from '../src/simulation';
import {CLOUD_REQUEST_TIMEOUT, remoteSave, SupabaseGateway} from '../src/cloud/gateway';
import {CloudSync, CLOUD_KEY} from '../src/cloud/sync';
import {fixture} from './cloud-fixtures';

afterEach(() => vi.useRealTimers());
const response = (data: unknown, error: unknown = null) => ({abortSignal: (_signal: AbortSignal) => Promise.resolve({data, error})});

const owner = '00000000-0000-4000-8000-000000000001';
const row = () => ({owner_id: owner, state: createGame(1_790_000_000_000), revision: 5, operation_id: crypto.randomUUID(), saved_at: '2026-10-26T10:00:00.000Z'});
it('valide les lignes et accepte les anciennes versions via les migrations du jeu', () => {
  const r = row();
  expect(remoteSave(r, owner).state.version).toBe(21);
  const v18 = {...r.state, version: 18};
  expect(remoteSave({...r, state: v18}, owner).state.version).toBe(21);
  expect(() => remoteSave({...r, owner_id: 'autre'}, owner)).toThrow();
  expect(() => remoteSave({...r, state: {...r.state, grass: -1}}, owner)).toThrow();
  expect(() => remoteSave({...r, state: {...r.state, version: 22}}, owner)).toThrow(/version plus récente/);
  expect(() => remoteSave({...r, revision: Number.MAX_SAFE_INTEGER + 1}, owner)).toThrow();
});
it('le gateway traduit les erreurs, valide le reçu et transmet les paramètres exacts au RPC', async () => {
  const r = row(), request = {owner, expected: 4, operation: r.operation_id, state: r.state};
  const rpc = vi.fn(() => response({status: 'ok', owner_id: owner, revision: 5, operation_id: r.operation_id, saved_at: r.saved_at}));
  const eq = vi.fn(() => ({abortSignal: (_signal: AbortSignal) => ({maybeSingle: () => Promise.resolve({data: r, error: null})})}));
  const client = {rpc, from: vi.fn(() => ({select: () => ({eq})}))} as unknown as SupabaseClient;
  const g = new SupabaseGateway(client);
  expect((await g.read(owner))?.revision).toBe(5); expect(eq).toHaveBeenCalledWith('owner_id', owner);
  expect(await g.commit(request)).toEqual({status: 'ok', owner, revision: 5, savedAt: r.saved_at, operation: r.operation_id});
  expect(rpc).toHaveBeenCalledWith('prairie_commit', {p_owner: owner, p_expected: 4, p_operation: r.operation_id, p_state: r.state});
  rpc.mockReturnValueOnce(response({...r, status: 'outdated'}));
  await expect(g.commit(request)).rejects.toMatchObject({code: 'outdated'});
  rpc.mockReturnValueOnce(response(null, {status: 401}));
  await expect(g.commit(request)).rejects.toMatchObject({code: 'session'});
  rpc.mockReturnValueOnce(response(null, {status: 503}));
  await expect(g.commit(request)).rejects.toMatchObject({code: 'network'});
  rpc.mockReturnValueOnce(response({status: 'ok', owner_id: owner, revision: 8, operation_id: r.operation_id, saved_at: r.saved_at}));
  await expect(g.commit(request)).rejects.toMatchObject({code: 'invalid'});
});
it('annule une lecture suspendue après vingt secondes et ignore sa réponse tardive', async () => {
  vi.useFakeTimers();
  let signal!: AbortSignal, finish!: (value: {data: unknown; error: null}) => void;
  const client = {from: () => ({select: () => ({eq: () => ({abortSignal: (s: AbortSignal) => ({maybeSingle: () => {
    signal = s; return new Promise(resolve => { finish = resolve; });
  }})})})})} as unknown as SupabaseClient;
  const result = new SupabaseGateway(client).read(owner);
  const rejected = expect(result).rejects.toMatchObject({code: 'network'});
  await vi.advanceTimersByTimeAsync(CLOUD_REQUEST_TIMEOUT);
  await rejected; expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  finish({data: row(), error: null}); await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0);
});
it('libère un envoi suspendu puis rejoue exactement le même pending, sans adopter le reçu tardif', async () => {
  vi.useFakeTimers(); const f = fixture(); f.sync.dispose();
  let firstSignal!: AbortSignal, finish!: (value: unknown) => void;
  const receipt = (p: {p_owner: string; p_operation: string}) => ({status: 'ok', owner_id: p.p_owner, revision: 1, operation_id: p.p_operation, saved_at: row().saved_at});
  const rpc = vi.fn((_name: string, p: {p_owner: string; p_operation: string}) => response(receipt(p)));
  rpc.mockImplementationOnce((_name, _p) => ({abortSignal: (signal: AbortSignal) => {
    firstSignal = signal; return new Promise(resolve => { finish = resolve; });
  }}) as never);
  const client = {rpc, from: () => ({select: () => ({eq: () => ({abortSignal: (_signal: AbortSignal) => ({maybeSingle: () => Promise.resolve({data: null, error: null})})})})})} as unknown as SupabaseClient;
  const sync = new CloudSync(f.controller, f.storage, new SupabaseGateway(client));
  try {
    await sync.connect(owner); const sending = sync.choose('local', true);
    await vi.advanceTimersByTimeAsync(CLOUD_REQUEST_TIMEOUT); await sending;
    expect(firstSignal.aborted).toBe(true); expect(sync.getView().status).toBe('offline');
    const pending = JSON.parse(f.data.get(CLOUD_KEY)!).pending;
    await sync.retry(); expect(sync.getView().status).toBe('saved');
    expect(rpc.mock.calls[1]).toEqual(rpc.mock.calls[0]);
    expect(rpc.mock.calls[1][1].p_operation).toBe(pending.operation);
    const saved = f.data.get(CLOUD_KEY);
    finish({data: {...receipt(rpc.mock.calls[0][1]), revision: 999}, error: null});
    await Promise.resolve(); await Promise.resolve();
    expect(f.data.get(CLOUD_KEY)).toBe(saved); expect(sync.getView().status).toBe('saved');
  } finally { sync.dispose(); f.dispose(); }
});
