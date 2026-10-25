import {describe, expect, it} from 'vitest';
import {act, advance, createGame} from '../src/simulation';
import {BRANCH_MISSION_IDS, SOLO_INITIAL_MISSION_IDS} from '../src/config/missions';
import {activeMainMissions, availableMissionRewards} from '../src/simulation/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';

// Playtest of 25 October 2026: optional branches must never hide the durable goals or a reward already earned.
function afterStart() {
  const s = createGame(0);
  s.missions.claimed = [...SOLO_INITIAL_MISSION_IDS]; s.missions.completed = [...SOLO_INITIAL_MISSION_IDS];
  return s;
}
describe('visible main missions', () => {
  it('keeps the durable goal visible while only optional branches remain, and lets it be claimed', () => {
    let s = afterStart();
    const optional = ['first-decoration', 'seven-species'] as const;
    s.missions.claimed.push(...BRANCH_MISSION_IDS.filter(id => !(optional as readonly string[]).includes(id)));
    s.missions.completed.push(...BRANCH_MISSION_IDS.filter(id => !(optional as readonly string[]).includes(id)));
    s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5};
    s = advance(s, 1);
    expect(activeMainMissions(s)).toEqual(['level-five', 'first-decoration']);
    expect(availableMissionRewards(s)).toBe(1);
    const claimed = act(s, {type: 'claimMainMission', id: 'level-five'}, 1);
    expect(claimed.ok).toBe(true);
    expect(activeMainMissions(claimed.state)).toEqual(['welcome-fire', 'first-decoration']);
  });
  it('shows every claimable branch first, then the durable goal and one branch in progress', () => {
    let s = afterStart();
    s.discovered = ['paille', 'neige', 'feu', 'belier-gris', 'volant'];
    s = advance(s, 1);
    expect(s.missions.completed).toEqual(expect.arrayContaining(['varied-family', 'growing-collection']));
    expect(activeMainMissions(s)).toEqual(['varied-family', 'growing-collection', 'level-five', 'two-habitats']);
    expect(availableMissionRewards(s)).toBe(2);
  });
});
