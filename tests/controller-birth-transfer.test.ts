import {describe, expect, it} from 'vitest';
import {GameController} from '../src/application/GameController';
import {BALANCE, HOUR} from '../src/config/balance';
import {habitatStats} from '../src/simulation/habitats';
import {nestForParent} from '../src/simulation/breeding';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {createGame} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';

describe('visible automatic birth transfer', () => {
  it('refreshes the panel at transfer, without rerendering ordinary clock ticks', () => {
    const initial = createGame(0), enclosure = initial.buildings[0];
    enclosure.incomeUnits = habitatStats(enclosure).cap * HOUR;
    initial.rabbits[0].affection = 2;
    initial.rabbits.push({id: 'rabbit-6', species: 'paille', affection: 2, enclosureId: enclosure.id});
    initial.nextId = 8;
    initial.missions.completed.push('to-nursery');
    initial.missions.claimed.push('to-nursery');
    initial.buildings.find(b => b.kind === 'nest')!.breeding = {
      parents: ['rabbit-2', 'rabbit-6'], startedAt: 0, endsAt: BALANCE.breedingDuration,
      birth: {id: 'birth-7', species: 'paille', guaranteed: false, reservedDiscovery: false},
    };
    const data = new Map([[SAVE_KEY, encodeGame(initial)]]);
    let now = 0;
    const controller = new GameController({getItem: key => data.get(key) ?? null,
      setItem: (key, value) => {data.set(key, value);}}, () => now);
    const before = controller.getSnapshot().viewRevision;

    now = BALANCE.breedingDuration - 1; controller.refresh();
    expect(controller.getSnapshot().viewRevision).toBe(before);
    expect(nestForParent(controller.getSnapshot().state!, 'rabbit-2')).toBeDefined();

    now++; controller.refresh();
    const transferred = controller.getSnapshot();
    expect(transferred.viewRevision).toBe(before + 1);
    expect(transferred.state!.buildings.find(b => b.kind === 'nest')!.breeding).toBeNull();
    expect(transferred.state!.buildings.find(b => b.kind === 'nursery')!.nursery!.babies).toMatchObject([
      {slot: 0, birth: {id: 'birth-7'}, startedAt: now},
    ]);
    expect(nestForParent(transferred.state!, 'rabbit-2')).toBeUndefined();
    expect(nestForParent(transferred.state!, 'rabbit-6')).toBeUndefined();
    const saved = decodeGame(data.get(SAVE_KEY)!);
    expect(saved.ok && saved.state).toEqual(transferred.state);

    now++; controller.refresh();
    expect(controller.getSnapshot().viewRevision).toBe(transferred.viewRevision);
    controller.dispose();
  });
});
