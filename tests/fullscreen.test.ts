// @vitest-environment happy-dom
import {expect, it, vi} from 'vitest';
import {requestMobileFullscreen} from '../src/display/fullscreen';
import html from '../index.html?raw';
import rawManifest from '../public/assets/app/manifest.webmanifest?raw';

function setup(coarse: boolean, enabled = true, request = vi.fn(() => Promise.resolve())) {
  const host = {matchMedia: () => ({matches: coarse})} as unknown as Window;
  const root = {fullscreenEnabled: enabled, fullscreenElement: null, documentElement: {requestFullscreen: request}} as unknown as Document;
  return {host, root, request};
}
it('requests fullscreen only on supported touch devices and tolerates denial', async () => {
  const touch = setup(true); requestMobileFullscreen(touch.root, touch.host);
  expect(touch.request).toHaveBeenCalledWith({navigationUI: 'hide'});
  for (const [coarse, enabled] of [[false,true],[true,false]]) {
    const s=setup(coarse,enabled); requestMobileFullscreen(s.root,s.host);expect(s.request).not.toHaveBeenCalled();
  }
  const denied=setup(true,true,vi.fn(() => Promise.reject(new Error('denied'))));
  expect(() => requestMobileFullscreen(denied.root,denied.host)).not.toThrow();
  await Promise.resolve();
});
it('requests edge-to-edge installed mode rather than an opaque status strip', () => {
  expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
  const manifest=JSON.parse(rawManifest);
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.display_override).toEqual(['fullscreen','standalone']);
});
