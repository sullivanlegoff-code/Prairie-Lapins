import {expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {BlendModes: {ADD: 1}}}));
import {SalonSpaView} from '../src/display/salonSpa';
import {createGame} from '../src/state/initial';
import type {GameState} from '../src/state/types';

/** A scene whose every object accepts any chained call; every texture exists. */
function fakeScene() {
  const object = (): unknown => new Proxy({}, {get: (_, key) => key === 'width' || key === 'height' ? 100 : () => object()});
  return {add: {container: object, image: object}, textures: {exists: () => true}} as never;
}
it('a rabbit picked up from the salon after its care shines, even when no state was seen between the end and the pick-up (plan 3.8)', () => {
  const view = new SalonSpaView(fakeScene()), s: GameState = createGame(0), id = s.rabbits[0].id;
  const inCare = structuredClone(s); inCare.care = {rabbitId: id, care: 'bath', startedAt: 0, endsAt: 60_000};
  view.sync(inCare, 1_000); // Last state seen during the care.
  view.sync(s, 120_000); // Picked up after its end: the care is gone from the state.
  expect(view.glowing(id)).toBe(true);
  // Taken out before its end (no care given): no glow.
  const other = new SalonSpaView(fakeScene());
  other.sync(inCare, 1_000); other.sync(s, 30_000);
  expect(other.glowing(id)).toBe(false);
});
