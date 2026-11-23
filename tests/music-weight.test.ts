import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {KITCHEN_TRACKS} from '../src/config/music';

/** The bitrate in kb/s of the first MPEG-1 Layer III frame, after an optional ID3v2 tag. */
function firstFrameKbps(bytes: Uint8Array): number {
  let at = String.fromCharCode(bytes[0], bytes[1], bytes[2]) === 'ID3' ? 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]) : 0;
  while (at < bytes.length - 4 && !(bytes[at] === 0xff && (bytes[at + 1] & 0xfe) === 0xfa)) at++;
  return [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][bytes[at + 2] >> 4];
}

describe('music weight on the phone (plan 5.7)', () => {
  it('plays the Cuisine tracks at 96 kb/s, like the Christmas ones', () => {
    for (const name of [...KITCHEN_TRACKS, 'noel-1.mp3'])
      expect([name, firstFrameKbps(readFileSync(`public/assets/audio/music/${name}`))]).toEqual([name, 96]);
  });
});
