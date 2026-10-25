import {describe, expect, it} from 'vitest';
import {STRAW_ART, SNOW_ART, rabbitArt} from '../src/config/rabbitArt';
import {portrait} from '../src/ui/portraits';
describe('Paille reference artwork (Terre was removed with its catalogue)', () => {
  it('uses each species original texture for every shared portrait, without mixing sources', () => {
    for (const art of [STRAW_ART]) {
      const html = portrait(art.species);
      expect(html).toContain(`src="${art.url}"`);
      expect(html).toContain(`data-rabbit-art="${art.species}"`);
      expect(html).toContain(`width="${art.width}" height="${art.height}"`);
      expect(html).not.toContain(SNOW_ART.url);
    }
    expect(rabbitArt('orange')).toBeUndefined();
    expect(rabbitArt()).toBeUndefined();
  });
  it('preserves the validated snow scale and anchor while retaining species proportions', () => {
    expect(SNOW_ART).toMatchObject({width:461, height:421, worldWidth:48, groundY:12});
    expect(STRAW_ART.height / STRAW_ART.width).toBeGreaterThan(1.4);
    expect(STRAW_ART.groundY).toBe(SNOW_ART.groundY);
  });
});
