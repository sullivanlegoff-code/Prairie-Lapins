import {it, expect} from 'vitest';
import {PARCEL_IDS} from '../src/config/land';
import {floatingIslandArt} from '../src/display/floatingIslandArt';

// Generated relief for islands grown outside the fixed order (painted stages cover the others).
// Layout reviewed in %TEMP%/prairie-underside-C/cycle3-*.png.
it('preserves the reviewed organic island drawing commands', async () => {
  const digest = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify(value)))), b => b.toString(16).padStart(2, '0')).join('');
  const masks = [0, 64, 208, 65, 510, 511]; // empty, start, L, detached, hole, full
  const art = masks.map(mask => floatingIslandArt(PARCEL_IDS.filter((_, i) => mask & (1 << i))));
  expect(await digest(art)).toBe('673e1ddd6971c6da5a3f77f322b1e1611aa75606dddaea83433611e9cdc20881');
});
