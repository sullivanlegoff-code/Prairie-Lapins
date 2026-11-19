// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BENNY_FLIGHT_FALL_MS, mountBennyFlightActivity, type BennyFlightSound} from '../src/ui/BennyFlightActivity';

// Owner, 19 November 2026: sounds in « Le vol de Benny », and Benny seen falling before the end card.
afterEach(() => { document.body.innerHTML = ''; });
describe('the end of a flight', () => {
  it('lets Benny fall into the clouds for a moment, with sounds, before the end card', () => {
    let now = 1000; const heard: BennyFlightSound[] = [], finished = vi.fn(() => '+3 pattes');
    const activity = mountBennyFlightActivity(document.body, {onFinished: finished, clock: () => now, frame: () => 0, sound: kind => { heard.push(kind); }});
    activity.open({id: 'benny'} as never);
    document.querySelector<HTMLElement>('[data-benny-flight-start]')!.click();
    activity.flap(); expect(heard).toEqual(['flap']);
    // No more wing beats: she drops into the sea of clouds.
    while (!activity.game!.over) { now += 16; activity.update(); }
    expect(heard).toContain('fall'); expect(finished).not.toHaveBeenCalled();
    const card = document.querySelector<HTMLElement>('[data-benny-flight-card]')!;
    expect(card.hidden).toBe(true);
    const benny = document.querySelector<HTMLElement>('.benny-flight-benny')!, y = () => +/translate3d\([^,]+, ([\d.-]+)px/.exec(benny.style.transform)![1];
    const before = y(); now += BENNY_FLIGHT_FALL_MS / 2; activity.update();
    expect(y()).toBeGreaterThan(before); expect(finished).not.toHaveBeenCalled();
    activity.flap(); expect(heard.filter(k => k === 'flap')).toHaveLength(1);
    now += BENNY_FLIGHT_FALL_MS; activity.update();
    expect(finished).toHaveBeenCalledOnce(); expect(card.hidden).toBe(false);
  });
});
