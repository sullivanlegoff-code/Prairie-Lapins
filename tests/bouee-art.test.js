import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {decodePng, encodePng} from '../scripts/derive-nursery-overlays.mjs';
import {BACKGROUND_SEEDS, DESIGNS, decodeRgbPng, cutOut, crop} from '../scripts/prepare-rabbit-masters.mjs';
import {SPECIES} from '../src/config/species';
import {rabbitBlinkArt} from '../src/config/rabbitBlinkArt';

const approved = 'output/imagegen/bouee-v2/bouee-B.png';
const master = readFileSync('assets-source/rabbits/bouee/sprite.png');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

it('keeps the approved Cocktail master and grounds the bottom of its ring, without facial patches', () => {
  expect(sha256(master)).toBe('c66e7d232aea7b4ed4cfd04b44567c43a65a34bf904c9c56c65f0af662ddff89');
  const image = decodePng(master), art = SPECIES.bouee.art;
  expect([image.width, image.height]).toEqual([1191, 1200]);
  let foot = 0;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++)
    if (image.pixels[(y * image.width + x) * 4 + 3] > 200) foot = y;
  expect(foot).toBe(1191);
  const contact = art.groundY - (image.height - foot) * art.worldWidth / image.width;
  expect(contact).toBeGreaterThan(11); expect(contact).toBeLessThan(12);
  expect(rabbitBlinkArt('bouee')).toBeUndefined();
});

// The approved concept stays outside Git; the pinned master above is always checked, including in CI.
it.skipIf(!existsSync(approved))('reproduces the master from the owner-approved local concept B', () => {
  const bytes = readFileSync(approved);
  expect(sha256(bytes)).toBe('0a076e761042db7d316feed07d71a061f37765842171ca887fbc6323a03bb074');
  const design = DESIGNS.find(design => design.id === 'bouee');
  expect(design).toEqual({id: 'bouee', source: approved, background: 'light'});
  const image = decodeRgbPng(bytes);
  expect([image.width, image.height]).toEqual([1254, 1254]);
  cutOut(image, design.background, BACKGROUND_SEEDS.bouee);
  // The pocket between ear and body is background; the white ring dots stay in the opaque silhouette.
  expect(image.pixels[(570 * image.width + 490) * 4 + 3]).toBe(0);
  expect(encodePng(crop(image)).equals(master)).toBe(true);
});
