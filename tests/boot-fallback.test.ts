// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';

let stop: (() => void) | undefined;
afterEach(() => { stop?.(); vi.useRealTimers(); });
function setup() {
  vi.useFakeTimers();
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  const reload = vi.fn();
  const script = html.match(/<script id="boot-fallback">([\s\S]*?)<\/script>/)![1];
  // Execute exactly the shipped classic script without loading any resource.
  new Function('window', 'document', 'location', 'setTimeout', 'clearTimeout', script)(window, document, {reload}, setTimeout, clearTimeout);
  stop = () => window.dispatchEvent(new Event('prairie-booted'));
  return {reload, root: document.getElementById('loading-screen')!, retry: document.getElementById('loading-retry') as HTMLButtonElement};
}
it('shows a working retry when the main module never starts', () => {
  const {root, retry, reload} = setup();
  vi.advanceTimersByTime(24999); expect(retry.hidden).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.dataset.state).toBe('failed');
  expect(document.getElementById('loading-message')!.textContent).toBe("Le jeu n'a pas pu se charger. Vérifie ta connexion puis réessaie.");
  expect(retry.hidden).toBe(false); expect(retry.disabled).toBe(false);
  retry.click(); expect(reload).toHaveBeenCalledOnce();
});
it.each(['module', 'modulepreload'])('reacts immediately to a failed %s resource', type => {
  const {retry} = setup();
  const resource = document.createElement(type === 'module' ? 'script' : 'link');
  resource.setAttribute(type === 'module' ? 'type' : 'rel', type);
  document.head.append(resource); resource.dispatchEvent(new Event('error'));
  expect(retry.hidden).toBe(false); resource.remove();
});
it('cancels the fallback after the normal boot signal, even with later resource errors', () => {
  const {root, retry} = setup();
  root.dataset.booted = 'true'; window.dispatchEvent(new Event('prairie-booted'));
  vi.advanceTimersByTime(60000);
  const resource = document.createElement('script'); resource.type = 'module';
  document.head.append(resource); resource.dispatchEvent(new Event('error')); resource.remove();
  expect(root.dataset.state).toBe('loading'); expect(retry.hidden).toBe(true);
  expect(document.getElementById('loading-message')!.textContent).toBe('');
});
