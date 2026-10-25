import {expect, it} from 'vitest';
import {resizeRegion} from '../scripts/resize-rgba.mjs';

it('samples an offset patch on exactly the full sprite grid, including partial edge pixels', () => {
  const patch = {width: 3, height: 2, pixels: Buffer.from(Array.from({length: 6}, (_, i) => [30 + i * 20, 200, 90, 255]).flat())};
  const full = {width: 7, height: 5, pixels: Buffer.alloc(7 * 5 * 4)};
  for (let y = 0; y < patch.height; y++) patch.pixels.copy(full.pixels, ((y + 1) * 7 + 2) * 4, y * 12, (y + 1) * 12);
  const sprite = resizeRegion(full, 7, 5, 4, 3), cropped = resizeRegion(patch, 7, 5, 4, 3, 2, 1);
  expect([cropped.x, cropped.y, cropped.width, cropped.height]).toEqual([1, 0, 2, 2]);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
    const actual = sprite.pixels.subarray((y * 4 + x) * 4, (y * 4 + x + 1) * 4);
    const inside = x >= cropped.x && x < cropped.x + cropped.width && y >= cropped.y && y < cropped.y + cropped.height;
    const index = ((y - cropped.y) * cropped.width + x - cropped.x) * 4;
    expect(actual).toEqual(inside ? cropped.pixels.subarray(index, index + 4) : Buffer.alloc(4));
  }
});

it('keeps the opaque colour beside transparency instead of producing a dark fringe', () => {
  const image = {width: 2, height: 2, pixels: Buffer.from([240, 80, 20, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])};
  expect([...resizeRegion(image, 2, 2, 1, 1).pixels]).toEqual([240, 80, 20, 64]);
});
