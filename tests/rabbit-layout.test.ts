import {describe, expect, it} from 'vitest';
import {VISUAL} from '../src/config/visual';
import {rabbitHit, rabbitHitPoint, rabbitOffset, rabbitPosition, type RabbitHitTarget} from '../src/display/rabbitLayout';
import {gridPoint, MeadowCamera, type Point} from '../src/ui/gestures';

const center = gridPoint(.5, .5);
const slots = (count: number): Point[] => Array.from({length: count}, (_, index) => {
  const offset = rabbitOffset(index, count);
  return {x: center.x + offset.x, y: center.y + offset.y};
});
const targets = (positions: readonly Point[], camera: MeadowCamera): RabbitHitTarget[] => positions.map((position, index) =>
  ({id: `rabbit-${index}`, point: camera.screen(rabbitHitPoint(position)), depth: position.y}));

describe('crowded rabbit display and selection', () => {
  it.each([5, 7])('keeps every one of %i animated occupants selectable at minimum and initial zoom', count => {
    const bases = slots(count), camera = new MeadowCamera(); camera.resize(844, 390);
    for (const zoom of [VISUAL.camera.minZoom, VISUAL.camera.initialZoom]) {
      camera.zoom = zoom;
      for (const time of [0, 170, 530, 900, 1530, 3110, 5970, 10_130, 24_870, 61_310]) {
        for (const fed of [false, true]) {
          const positions = bases.map((base, index) => rabbitPosition(base, time, index * 3 + 2, fed ? time + 900 : 0));
          const hits = targets(positions, camera);
          positions.forEach((position, index) => {
            // Both the visible body and its face must select its own occupant.
            expect(rabbitHit(camera.screen(position), hits)?.id).toBe(`rabbit-${index}`);
            expect(rabbitHit(camera.screen(rabbitHitPoint(position)), hits)?.id).toBe(`rabbit-${index}`);
          });
        }
      }
    }
  });

  it.each([5, 7])('preserves each of %i body/face targets even when neighbors approach at maximum motion', count => {
    const bases = slots(count), camera = new MeadowCamera(); camera.resize(844, 390);
    const motion = VISUAL.rabbit.motion;
    // Independent extrema are stricter than the correlated sine animations.
    const extremes: Point[] = [];
    for (const x of [-motion.x, motion.x]) for (const y of [-motion.y, motion.y]) for (const hop of [0, motion.hop])
      extremes.push({x, y: y - hop});
    for (const zoom of [VISUAL.camera.minZoom, VISUAL.camera.initialZoom]) {
      camera.zoom = zoom;
      bases.forEach((base, selected) => {
        for (const extreme of extremes) {
          const position = {x: base.x + extreme.x, y: base.y + extreme.y};
          for (const aim of [{x: 3, y: 3}, {x: 0, y: -7 * VISUAL.rabbit.scale},
            {x: -6 * VISUAL.rabbit.scale, y: -7 * VISUAL.rabbit.scale}, {x: 6 * VISUAL.rabbit.scale, y: -7 * VISUAL.rabbit.scale}]) {
            const tap = {x: position.x + aim.x, y: position.y + aim.y};
            const positions = bases.map((other, index) => {
              if (index === selected) return position;
              const candidates = extremes.map(shift => ({x: other.x + shift.x, y: other.y + shift.y}));
              // Place every neighbor at whichever extremum is closest to this touch.
              return candidates.reduce((closest, candidate) => {
                const distance = (point: Point) => Math.hypot(rabbitHitPoint(point).x - tap.x, rabbitHitPoint(point).y - tap.y);
                return distance(candidate) < distance(closest) ? candidate : closest;
              });
            });
            expect(rabbitHit(camera.screen(tap), targets(positions, camera))?.id).toBe(`rabbit-${selected}`);
          }
        }
      });
    }
  });

  it('leaves the front border and habitat label clear of every rabbit shadow', () => {
    for (const count of [4, 5, 6, 7]) {
      for (const base of slots(count)) {
        // Renderer shadow: ellipse centered y+10, height12, scaled with the animal.
        const shadowBottom = base.y - center.y + VISUAL.rabbit.motion.y + 16 * VISUAL.rabbit.scale;
        expect(shadowBottom).toBeLessThanOrEqual(57);
        // Include tail/lop ears, but wings may overlap the border naturally.
        expect(Math.abs(base.x - center.x) + VISUAL.rabbit.motion.x + 24 * VISUAL.rabbit.scale).toBeLessThanOrEqual(85);
      }
    }
  });

  it('uses the frontmost rabbit for an equal-distance touch without stealing a closer body', () => {
    const back = {id: 'back', point: {x: 3, y: 3}, depth: 0};
    const front = {id: 'front', point: {x: 10, y: 0}, depth: 30};
    for (const order of [[back, front], [front, back]]) {
      expect(rabbitHit({x: 8, y: 3}, order)?.id).toBe('front');
      expect(rabbitHit({x: 4, y: 3}, order)?.id).toBe('back');
    }
  });

  it('allows empty ground to select the habitat and keeps a screen-sized touch target at either zoom', () => {
    const camera = new MeadowCamera();
    for (const zoom of [VISUAL.camera.minZoom, VISUAL.camera.initialZoom]) {
      camera.zoom = zoom;
      const hits = targets([center], camera), point = hits[0].point;
      expect(rabbitHit({x: point.x + VISUAL.rabbit.hitRadius - 1, y: point.y}, hits)?.id).toBe('rabbit-0');
      expect(rabbitHit({x: point.x + VISUAL.rabbit.hitRadius + 1, y: point.y}, hits)).toBeNull();
    }
    expect(rabbitHit(center, [])).toBeNull();
  });

  it('bounds the discreet idle and feeding motion without changing the base position', () => {
    const base = {x: 100, y: 200};
    for (let time = 0; time <= 20_000; time += 37) {
      const position = rabbitPosition(base, time, 4, 20_001);
      expect(Math.abs(position.x - base.x)).toBeLessThanOrEqual(3);
      expect(position.y - base.y).toBeGreaterThanOrEqual(-6.5);
      expect(position.y - base.y).toBeLessThanOrEqual(1.5);
    }
    expect(base).toEqual({x: 100, y: 200});
  });
});
