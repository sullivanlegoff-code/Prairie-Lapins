// @vitest-environment happy-dom
import {describe, it, expect, beforeEach} from 'vitest';
import html from '../index.html?raw';
import {PreferenceStore} from '../src/ui/preferences';
import {mountSoundSettings, channelSettings, type SoundChannel} from '../src/ui/soundSettings';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
});
const mount = (key = 'prairie-lapins.ui.v1') => {
  const prefs = new PreferenceStore(key), changes: [SoundChannel, boolean, number][] = [];
  const ui = mountSoundSettings(document, prefs, {onChange: (c, e, v) => changes.push([c, e, v])});
  return {prefs, ui, changes, toggle: (c: string) => document.getElementById(`${c}-toggle`) as HTMLButtonElement, slider: (c: string) => document.getElementById(`${c}-volume`) as HTMLInputElement,
    output: (c: string) => document.getElementById(`${c}-volume-value`)!.textContent};
};

describe('Paramètres → Son', () => {
  it('defaults: music and effects on, 50 % and 80 %', () => {
    const {prefs, toggle, output} = mount();
    expect(channelSettings(prefs, 'music')).toEqual({enabled: true, volume: .5});
    expect(channelSettings(prefs, 'effects')).toEqual({enabled: true, volume: .8});
    expect([toggle('music').getAttribute('aria-pressed'), toggle('effects').getAttribute('aria-pressed')]).toEqual(['true', 'true']);
    expect([output('music'), output('effects')]).toEqual(['50 %', '80 %']);
  });
  it('two separate channels with accessible names, state and icons that change when muted', () => {
    const {prefs, toggle, slider, output, changes} = mount();
    const before = toggle('music').innerHTML;
    toggle('music').click();
    expect(toggle('music').getAttribute('aria-pressed')).toBe('false'); expect(toggle('music').getAttribute('aria-label')).toBe('Musique');
    expect(toggle('music').title).toBe('Musique : coupée'); expect(toggle('music').innerHTML).not.toBe(before);
    expect(slider('music').disabled).toBe(true); expect(output('music')).toBe('Coupée');
    expect(channelSettings(prefs, 'effects')).toEqual({enabled: true, volume: .8});
    toggle('effects').click(); expect(toggle('effects').title).toBe('Bruitages : coupés'); expect(prefs.value.muted).toBe(true);
    slider('music').disabled = false; slider('music').value = '25'; slider('music').dispatchEvent(new Event('input'));
    expect(prefs.value.musicVolume).toBe(.25); expect(prefs.value.effectsVolume).toBe(.8);
    expect(changes).toEqual([['music', false, .5], ['effects', false, .8], ['music', false, .25]]);
    for (const id of ['music-volume', 'effects-volume']) expect(document.querySelector(`label[for="${id}"]`)).not.toBeNull();
  });
  it('keeps the settings between sessions, separately for the game and the laboratory', () => {
    const game = mount('prairie-lapins.ui.v1'); game.toggle('music').click(); game.ui.dispose(); // the laboratory is another page
    const lab = mount('prairie-lapins.development.ui'); lab.slider('effects').value = '30'; lab.slider('effects').dispatchEvent(new Event('input'));
    const reloadedGame = new PreferenceStore('prairie-lapins.ui.v1'), reloadedLab = new PreferenceStore('prairie-lapins.development.ui');
    expect([reloadedGame.value.music, reloadedGame.value.effectsVolume]).toEqual([false, .8]);
    expect([reloadedLab.value.music, reloadedLab.value.effectsVolume]).toEqual([true, .3]);
    expect(localStorage.getItem('prairie-lapins.save.v1')).toBeNull();
  });
  it('reads older preferences (muted only) and rejects invalid volumes', () => {
    localStorage.setItem('prairie-lapins.ui.v1', JSON.stringify({muted: true, tutorial: false}));
    expect(channelSettings(new PreferenceStore('prairie-lapins.ui.v1'), 'effects')).toEqual({enabled: false, volume: .8});
    localStorage.setItem('prairie-lapins.ui.v1', JSON.stringify({musicVolume: 7, effectsVolume: 'loud', music: 'yes'}));
    const p = new PreferenceStore('prairie-lapins.ui.v1').value;
    expect([p.musicVolume, p.effectsVolume, p.music]).toEqual([1, .8, true]);
  });
});
