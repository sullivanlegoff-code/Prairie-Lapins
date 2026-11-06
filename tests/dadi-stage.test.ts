import {describe, expect, it} from 'vitest';

import {DADI_STAGE} from '../src/config/dadiStageArt';
import {DadiStageView} from '../src/display/dadiStageView';

function setup() {
  const sprite = {texture: 'rabbit-dadi-evolved-v2', setTexture(key: string) { this.texture = key; return this; }};
  const scene = {textures: {exists: () => true}};
  const art = {texture: 'rabbit-dadi-evolved-v2'};
  const view = new DadiStageView(scene as never, 'rabbit-7', sprite as never, art as never);
  return {sprite, view};
}

/** Dadi « Superstar » (owner, 6 November 2026): at least 8 poses that alternate, and the microphone while his song plays. */
describe('Dadi on stage', () => {
  it('has at least eight painted poses and a standing microphone, at the evolved drawing’s scale', () => {
    expect(DADI_STAGE.poses.length).toBeGreaterThanOrEqual(8);
    expect(DADI_STAGE.micro).not.toBeNull();
    // Same cap-to-sole height as the evolved drawing (528 pixels high): only the width changes with the arms.
    for (const frame of [...DADI_STAGE.poses, DADI_STAGE.micro!]) expect(Math.abs(frame.height - 528)).toBeLessThanOrEqual(4);
  });
  it('alternates between his poses, never the same twice in a row, and shows them all in a while', () => {
    const {sprite, view} = setup(), seen = new Set<string>(), changes: string[] = [];
    let last = sprite.texture;
    for (let t = 0; t < 600_000; t += 50) {
      view.update(50, true, false);
      if (sprite.texture !== last) { changes.push(sprite.texture); last = sprite.texture; }
      seen.add(sprite.texture);
    }
    expect(seen.size).toBe(9); // The eight poses and his evolved drawing.
    for (let i = 1; i < changes.length; i++) expect(changes[i]).not.toBe(changes[i - 1]);
    const [low, high] = DADI_STAGE.hold;
    expect(changes.length).toBeGreaterThan(600_000 / high - 2); expect(changes.length).toBeLessThan(600_000 / low + 2);
    expect(seen.has(DADI_STAGE.micro!.texture)).toBe(false);
  });
  it('holds the microphone while his song plays, then comes back to normal', () => {
    const {sprite, view} = setup();
    view.update(50, true, true); expect(sprite.texture).toBe(DADI_STAGE.micro!.texture); expect(view.singing).toBe(true);
    for (let t = 0; t < 30_000; t += 50) view.update(50, true, true);
    expect(sprite.texture).toBe(DADI_STAGE.micro!.texture);
    view.update(50, true, false); expect(sprite.texture).toBe('rabbit-dadi-evolved-v2'); expect(view.singing).toBe(false);
  });
  it('keeps his pose while he is not on screen', () => {
    const {sprite, view} = setup();
    for (let t = 0; t < 60_000; t += 50) view.update(50, false, false);
    expect(sprite.texture).toBe('rabbit-dadi-evolved-v2');
  });
});
