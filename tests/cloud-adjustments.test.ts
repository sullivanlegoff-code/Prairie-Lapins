import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {applyAdjustments, type Adjustment} from '../src/simulation/adjustments';
import {adjustmentRows} from '../src/cloud/gateway';
import {createGame, decodeGame, encodeGame} from '../src/simulation';
import {fixture} from './cloud-fixtures';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const set100: Adjustment = {id: A, kind: 'set_pattes', amount: 100};
const fixtures: ReturnType<typeof fixture>[] = [];
const setup = (...args: Parameters<typeof fixture>) => { const f = fixture(...args); fixtures.push(f); return f; };
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { fixtures.forEach(f => f.dispose()); fixtures.length = 0; vi.useRealTimers(); });

describe('corrections du propriétaire', () => {
  it('s’appliquent une seule fois, dans l’ordre, sans ressource négative', () => {
    const s = createGame(0); s.pattes = 5000; s.hearts = 3;
    const once = applyAdjustments(s, [set100, {id: B, kind: 'add_hearts', amount: -10}]);
    expect([once.pattes, once.hearts, once.appliedAdjustments]).toEqual([100, 0, [A, B]]);
    expect(applyAdjustments(once, [set100])).toBe(once);
    const r = decodeGame(encodeGame(once)); expect(r.ok && r.state.appliedAdjustments).toEqual([A, B]);
    expect(decodeGame(JSON.stringify({...once, appliedAdjustments: ['pas-un-uuid']})).ok).toBe(false);
  });
  it('ignorent les lignes invalides ou d’un autre joueur', () => {
    expect(adjustmentRows([
      {id: B, owner_id: 'player-a', kind: 'add_grass', amount: '20'},
      {id: A, owner_id: 'player-b', kind: 'set_pattes', amount: 1},
      {id: 'x', owner_id: 'player-a', kind: 'set_pattes', amount: 1},
      {id: A, owner_id: 'player-a', kind: 'delete_rabbits', amount: 1},
      {id: A, owner_id: 'player-a', kind: 'set_pattes', amount: 100},
    ], 'player-a')).toEqual([set100, {id: B, kind: 'add_grass', amount: 20}]);
    expect(adjustmentRows(null, 'player-a')).toEqual([]);
  });
  it('gardent la progression de l’appareil et corrigent seulement les pièces', async () => {
    const f = setup(); await f.sync.connect('player-a'); await f.sync.choose('local', true);
    f.sync.disconnect(); f.rename('Praline');
    f.gateway.corrections = [set100];
    await f.sync.connect('player-a');
    const s = f.controller.getSnapshot().state!;
    expect([s.pattes, s.rabbits[0].name, s.appliedAdjustments]).toEqual([100, 'Praline', [A]]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.gateway.remote!.state.pattes).toBe(100); expect(f.gateway.remote!.state.rabbits[0].name).toBe('Praline');
    expect(f.sync.getView().status).toBe('saved');
  });
  it('s’appliquent aussi à une partie récupérée en ligne ou importée plus tard', async () => {
    const f = setup(); await f.sync.connect('player-a'); await f.sync.choose('local', true);
    const old = f.controller.exportGame(); if (!old.ok) throw new Error('export');
    f.gateway.corrections = [set100]; await f.sync.retry();
    expect(f.controller.getSnapshot().state!.pattes).toBe(100);
    await vi.advanceTimersByTimeAsync(5000);
    const imported = JSON.parse(old.json); imported.pattes = 49_248;
    const prepared = f.controller.prepareImport(JSON.stringify(imported)); if (!prepared.ok) throw new Error('prepare');
    expect(f.controller.confirmImport(prepared.token, true).ok).toBe(true);
    expect(f.controller.getSnapshot().state!.pattes).toBe(100);
  });
  it('n’agissent jamais dans le laboratoire', () => {
    const f = setup('laboratory'); const before = f.controller.getSnapshot().state!.pattes;
    expect(f.controller.applyAdjustments([set100])).toBe(false);
    expect(f.controller.getSnapshot().state!.pattes).toBe(before);
  });
  it('un serveur sans table de corrections ne bloque pas la sauvegarde', async () => {
    const f = setup(); f.gateway.adjustments = async () => { throw new Error('relation does not exist'); };
    await f.sync.connect('player-a'); await f.sync.choose('local', true);
    expect(f.sync.getView().status).toBe('saved');
  });
});
