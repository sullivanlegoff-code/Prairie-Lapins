import {describe, expect, it} from 'vitest';
import {SNOW_ART, rabbitArt} from '../src/config/rabbitArt';
import {portrait} from '../src/ui/portraits';
import {SPECIES_IDS} from '../src/config/balance';
import {rabbitHit} from '../src/display/rabbitLayout';
describe('Neige original artwork', () => {
 it('shares one image without changing other species or unknown portraits', () => {
  expect(portrait('neige')).toContain(`src="${SNOW_ART.url}"`);
  expect(portrait('neige')).toContain('alt="Lapin Neige"');
  for(const id of SPECIES_IDS.filter(id=>!rabbitArt(id)))expect(portrait(id)).toMatch(/^<svg /);
  expect(portrait()).toContain('>?</text>');
 });
 it('admits the Snow silhouette beyond the old body circle while retaining nearest-body priority', () => {
  const snow={id:'snow',point:{x:0,y:0},depth:0,radius:Infinity};
  expect(rabbitHit({x:0,y:-40},[snow])?.id).toBe('snow');
  const adjacent={id:'other',point:{x:0,y:-40},depth:1};
  expect(rabbitHit({x:0,y:-40},[snow,adjacent])?.id).toBe('other');
  expect(rabbitHit({x:0,y:-80},[adjacent])).toBeNull();
 });
});
