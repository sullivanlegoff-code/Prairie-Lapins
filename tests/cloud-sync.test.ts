import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BACKUP_KEY, CLOUD_KEY, fingerprint, LINK_BACKUP_PREFIX} from '../src/cloud/sync';
import {CloudError, remoteSave, type CommitResult} from '../src/cloud/gateway';
import {SAVE_KEY} from '../src/persistence/storage';
import {createGame, advance} from '../src/simulation';
import {SCENARIOS, scenarioState} from '../src/dev/scenarios';
import {fixture, MemoryCloud, remote} from './cloud-fixtures';

const fixtures: ReturnType<typeof fixture>[] = [];
const setup = (...args: Parameters<typeof fixture>) => { const f = fixture(...args); fixtures.push(f); return f; };
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { fixtures.forEach(f => f.dispose()); fixtures.length = 0; vi.useRealTimers(); });
async function link(f: ReturnType<typeof fixture>) { await f.sync.connect('player-a'); await f.sync.choose('local', true); }
describe('synchronisation automatique, sans réseau', () => {
  it('répare une liaison invalide seulement après confirmation et archivage, sans remplacer une partie', async () => {
    const f = setup(); const raw = '{"pending": "envoi à préserver", cassé';
    f.data.set(CLOUD_KEY, raw); f.data.set(BACKUP_KEY, 'secours précédent'); f.gateway.remote = remote();
    const before = f.data.get(SAVE_KEY); await f.sync.connect('player-a');
    expect(f.sync.getView().status).toBe('recovery');
    await f.sync.repairLink(false); expect(f.data.get(CLOUD_KEY)).toBe(raw);
    vi.spyOn(f.storage, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    await f.sync.repairLink(true); expect(f.data.get(CLOUD_KEY)).toBe(raw); expect(f.sync.getView().status).toBe('recovery');
    await f.sync.repairLink(true);
    expect([...f.data].filter(([key]) => key.startsWith(LINK_BACKUP_PREFIX)).map(([, value]) => value)).toEqual([raw]);
    expect(f.data.get(SAVE_KEY)).toBe(before); expect(f.data.get(BACKUP_KEY)).toBe('secours précédent');
    expect(f.sync.getView().status).toBe('choice'); expect(f.gateway.calls).toHaveLength(0); expect(f.replacement).not.toHaveBeenCalled();
  });
  it('ne supprime pas une liaison réparée entre-temps par un autre onglet', async () => {
    const f = setup(); f.data.set(CLOUD_KEY, 'cassé'); await f.sync.connect('player-a');
    const valid = JSON.stringify({owner: 'player-a', revision: 0, baseline: '', syncedAt: null, pending: null});
    f.data.set(CLOUD_KEY, valid); await f.sync.repairLink(true);
    expect(f.data.get(CLOUD_KEY)).toBe(valid); expect([...f.data.keys()].some(key => key.startsWith(LINK_BACKUP_PREFIX))).toBe(false);
  });
  it('demande une association et sa confirmation avant le premier envoi', async () => {
    const f = setup(); await f.sync.connect('player-a');
    expect(f.sync.getView().status).toBe('choice'); expect(f.gateway.calls).toHaveLength(0);
    await f.sync.choose('local', false); expect(f.gateway.calls).toHaveLength(0);
    await f.sync.choose('local', true); expect(f.gateway.remote?.revision).toBe(1);
    expect(f.sync.getView().status).toBe('saved');
  });
  it('un nouvel appareil propose un choix, puis récupère avec secours et rafraîchissement', async () => {
    const f = setup(); const online = createGame(1_790_000_000_000); online.pattes = 500;
    f.gateway.remote = remote(online); const previous = f.data.get(SAVE_KEY);
    await f.sync.connect('player-a'); expect(f.sync.getView().status).toBe('choice');
    expect(f.controller.getSnapshot().state!.pattes).not.toBe(500);
    await f.sync.choose('remote', true);
    expect(f.data.get(BACKUP_KEY)).toBe(previous); expect(f.replacement).toHaveBeenCalledOnce();
    expect(f.controller.getSnapshot().state!.pattes).toBe(500); expect(f.gateway.calls).toHaveLength(0);
  });
  it('récupère automatiquement une révision plus récente si le local est inchangé', async () => {
    const f = setup(); await link(f); f.sync.disconnect();
    f.gateway.remote!.state.pattes = 777; f.gateway.remote!.revision++;
    await f.sync.connect('player-a'); expect(f.controller.getSnapshot().state!.pattes).toBe(777);
    expect(f.sync.getView().status).toBe('saved'); expect(f.data.has(BACKUP_KEY)).toBe(true);
  });
  it('conserve les deux parties en conflit, puis applique le choix local par CAS', async () => {
    const f = setup(); await link(f); f.sync.disconnect(); f.rename('Praline');
    f.gateway.remote!.state.pattes = 888; f.gateway.remote!.revision++;
    await f.sync.connect('player-a'); expect(f.sync.getView().status).toBe('conflict');
    await vi.advanceTimersByTimeAsync(60000); expect(f.gateway.calls).toHaveLength(1);
    expect(f.controller.getSnapshot().state!.rabbits[0].name).toBe('Praline');
    await f.sync.choose('local', true); expect(f.gateway.remote!.revision).toBe(3);
    expect(f.gateway.remote!.state.rabbits[0].name).toBe('Praline');
  });
  it('groupe les changements après 4 secondes, et envoie les changements restants après un envoi', async () => {
    const f = setup(); await link(f); f.rename('A');
    await vi.advanceTimersByTimeAsync(2000); f.rename('B');
    await vi.advanceTimersByTimeAsync(1999); expect(f.gateway.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1); expect(f.gateway.calls).toHaveLength(2);
    expect(f.gateway.remote!.state.rabbits[0].name).toBe('B');
    const original = f.gateway.commit.bind(f.gateway); let release!: () => void;
    vi.spyOn(f.gateway, 'commit').mockImplementationOnce(async r => { await new Promise<void>(resolve => { release = resolve; }); return original(r); });
    f.rename('C'); const sending = f.sync.flush(); f.rename('D');
    await f.sync.flush(); expect(f.gateway.calls).toHaveLength(2);
    release(); await sending; await vi.advanceTimersByTimeAsync(4000);
    expect(f.gateway.remote!.state.rabbits[0].name).toBe('D'); expect(f.gateway.remote!.revision).toBe(4);
  });
  it('une simple avance du temps ne déclenche aucun envoi, y compris revenus et échéances', async () => {
    const f = setup(); await link(f); f.advance(48 * 3600000); await vi.advanceTimersByTimeAsync(60000);
    expect(f.gateway.calls).toHaveLength(1); expect(f.sync.getView().status).toBe('saved');
    for (const id of Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]) {
      const s = scenarioState(id, 1_790_000_000_000);
      expect(fingerprint(advance(s, s.lastSimulatedAt + 48 * 3600000)), id).toBe(fingerprint(s));
      expect(fingerprint(advance(s, s.lastSimulatedAt - 3600000)), id + ' : recul horloge').toBe(fingerprint(s));
    }
  });
  it('persiste pending avant envoi ; réponse perdue et rechargement rejouent la même opération', async () => {
    const f = setup(); await link(f); f.rename('Persistante'); f.gateway.loseReply = true;
    await f.sync.flush(); const pending = JSON.parse(f.data.get(CLOUD_KEY)!).pending;
    expect(pending.operation).toBe(f.gateway.calls.at(-1)!.operation); expect(f.sync.getView().status).toBe('offline');
    f.sync.disconnect();
    const next = setup('normal', f.gateway, f.data); await next.sync.connect('player-a');
    expect(f.gateway.calls.at(-1)!.operation).toBe(pending.operation); expect(f.gateway.remote!.revision).toBe(2);
    expect(next.sync.getView().status).toBe('saved'); expect(JSON.parse(f.data.get(CLOUD_KEY)!).pending).toBeNull();
  });
  it('réessaie hors ligne à 5/10/20/40/60 secondes et conserve la requête', async () => {
    const f = setup(); await link(f); f.gateway.offline = true; f.rename('Hors ligne'); await f.sync.flush();
    const operation = f.gateway.calls.at(-1)!.operation;
    for (const delay of [5000, 10000, 20000, 40000, 60000]) {
      const count = f.gateway.calls.length; await vi.advanceTimersByTimeAsync(delay - 1); expect(f.gateway.calls).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1); expect(f.gateway.calls).toHaveLength(count + 1);
      expect(f.gateway.calls.at(-1)!.operation).toBe(operation);
    }
    f.gateway.offline = false; await f.sync.retry(); expect(f.sync.getView().status).toBe('saved');
  });
  it('refuse une version distante future et ne fait aucune écriture', async () => {
    const f = setup(); f.gateway.remote = remote();
    Object.assign(f.gateway.remote.state, {version: 21}); await f.sync.connect('player-a');
    expect(f.sync.getView().status).toBe('outdated'); await f.sync.choose('local', true); await f.sync.retry();
    expect(f.gateway.calls).toHaveLength(0); expect(f.data.has(BACKUP_KEY)).toBe(false);
    expect(() => remoteSave({state: {version: 21}}, 'player-a')).toThrow(/version plus récente/);
  });
  it('ignore la réponse tardive après déconnexion et changement de compte', async () => {
    const f = setup(); await link(f); f.rename('En cours'); let resolve!: (r: CommitResult) => void;
    vi.spyOn(f.gateway, 'commit').mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const flight = f.sync.flush(), previous = f.data.get(CLOUD_KEY); const request = JSON.parse(previous!).pending;
    f.sync.disconnect();
    resolve({status: 'ok', owner: 'player-a', revision: 2, savedAt: new Date().toISOString(), operation: request.operation}); await flight;
    expect(f.sync.getView().status).toBe('disconnected'); expect(f.data.get(CLOUD_KEY)).toBe(previous);
    const gateway = new MemoryCloud(); f.sync.dispose();
    const next = setup('normal', gateway, f.data); await next.sync.connect('player-b');
    expect(next.sync.getView().status).toBe('choice'); expect(gateway.calls).toHaveLength(0);
  });
  it('bloque en cas de session expirée ou sauvegarde locale en erreur', async () => {
    const f = setup(); await link(f); f.rename('Session');
    vi.spyOn(f.gateway, 'commit').mockRejectedValueOnce(new CloudError('session'));
    await f.sync.flush(); expect(f.sync.getView().status).toBe('session'); await f.sync.retry(); expect(f.gateway.calls).toHaveLength(1);
    const g = setup(); await link(g); g.data.set(SAVE_KEY, 'autre onglet'); g.controller.refresh();
    await g.sync.flush(); expect(g.sync.getView().status).toBe('local-error'); expect(g.gateway.calls).toHaveLength(1);
  });
  it('refuse le laboratoire avant toute lecture du gateway', async () => {
    const f = setup('laboratory'); const read = vi.spyOn(f.gateway, 'read'); await f.sync.connect('player-a');
    expect(read).not.toHaveBeenCalled(); expect(f.sync.getView().status).toBe('error');
  });
  it('une copie de secours impossible empêche tout remplacement', async () => {
    const f = setup(); f.gateway.remote = remote(); await f.sync.connect('player-a');
    const before = f.controller.getSnapshot().state;
    vi.spyOn(f.storage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await f.sync.choose('remote', true); expect(f.controller.getSnapshot().state).toEqual(before);
    expect(f.replacement).not.toHaveBeenCalled(); expect(f.sync.getView().status).toBe('error');
  });
});
