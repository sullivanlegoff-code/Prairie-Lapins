import type {PreferenceStore} from './preferences';

/** Musique (note) and Bruitages (classic speaker); the muted variants add a diagonal bar. */
const ICONS = {
  music: (on: boolean) => `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/>${on ? '' : '<path d="M3 3l18 18"/>'}</svg>`,
  effects: (on: boolean) => `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9l5 6"/><path d="M21 9l-5 6"/>'}</svg>`,
};
const CHANNELS = {
  music: {name: 'Musique', enabled: 'music', volume: 'musicVolume', invert: false, on: 'activée', off: 'coupée'},
  effects: {name: 'Bruitages', enabled: 'muted', volume: 'effectsVolume', invert: true, on: 'activés', off: 'coupés'},
} as const;
export type SoundChannel = keyof typeof CHANNELS;
export interface SoundHooks {onChange(channel: SoundChannel, enabled: boolean, volume: number): void}

/** Reads a channel from the stored preferences (`muted` = Bruitages off). */
export function channelSettings(preferences: PreferenceStore, channel: SoundChannel): {enabled: boolean; volume: number} {
  const c = CHANNELS[channel], value = preferences.value[c.enabled];
  return {enabled: c.invert ? !value : value, volume: preferences.value[c.volume]};
}

/**
 * Paramètres → Son: per channel a stone icon button (on/off, aria-pressed, explicit label)
 * and a volume slider (0–100 %, step 5). Preferences are saved at once; hooks apply them.
 */
export function mountSoundSettings(root: ParentNode, preferences: PreferenceStore, hooks: SoundHooks): {render(): void; dispose(): void} {
  const abort = new AbortController(), parts = (Object.keys(CHANNELS) as SoundChannel[]).map(channel => ({
    channel, toggle: root.querySelector<HTMLButtonElement>(`#${channel}-toggle`)!, slider: root.querySelector<HTMLInputElement>(`#${channel}-volume`)!,
    output: root.querySelector<HTMLOutputElement>(`#${channel}-volume-value`)!,
  }));
  const save = (channel: SoundChannel, settings: {enabled: boolean; volume: number}) => {
    const c = CHANNELS[channel];
    preferences.set({[c.enabled]: c.invert ? !settings.enabled : settings.enabled, [c.volume]: settings.volume});
    hooks.onChange(channel, settings.enabled, settings.volume); render();
  };
  function render(): void {
    for (const {channel, toggle, slider, output} of parts) {
      const {enabled, volume} = channelSettings(preferences, channel), c = CHANNELS[channel], percent = Math.round(volume * 100), label = `${c.name} : ${enabled ? c.on : c.off}`;
      toggle.innerHTML = ICONS[channel](enabled);
      toggle.setAttribute('aria-pressed', String(enabled));
      // Fixed accessible name + aria-pressed: read as « Musique, bouton bascule, activé ».
      toggle.setAttribute('aria-label', c.name); toggle.title = label;
      toggle.classList.toggle('sound-off', !enabled);
      slider.value = String(percent); slider.disabled = !enabled;
      slider.setAttribute('aria-valuetext', `${percent} %`);
      output.textContent = enabled ? `${percent} %` : c.off[0].toUpperCase() + c.off.slice(1);
    }
  }
  for (const {channel, toggle, slider} of parts) {
    toggle.addEventListener('click', () => { const s = channelSettings(preferences, channel); save(channel, {...s, enabled: !s.enabled}); }, {signal: abort.signal});
    slider.addEventListener('input', () => { const s = channelSettings(preferences, channel); save(channel, {...s, volume: Math.min(100, Math.max(0, Number(slider.value) || 0)) / 100}); }, {signal: abort.signal});
  }
  render();
  return {render, dispose: () => abort.abort()};
}
