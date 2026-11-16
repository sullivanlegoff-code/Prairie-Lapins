import {describe, expect, it} from 'vitest';
import {RunTips, RunWords, TIP_GAP, TIP_QUEUE, TIP_STALE, WORD, tipMs, wordMs} from '../src/ui/bennyRunNotices';

describe('« Cours cours Benny ! » words on screen', () => {
  it('shows one tip at a time: the next waits until the first has been read', () => {
    const tips = new RunTips();
    tips.say('Un trou : saute par-dessus !', 0); tips.say('Défi : frappe 6 pots', 0);
    expect(tips.tick(0)).toBe('Un trou : saute par-dessus !');
    expect(tips.tick(tipMs('Un trou : saute par-dessus !') - 1)).toBe('Un trou : saute par-dessus !');
    const end = tipMs('Un trou : saute par-dessus !');
    expect(tips.tick(end)).toBeNull(); // A short gap between two tips, so the change is seen.
    expect(tips.tick(end + TIP_GAP)).toBe('Défi : frappe 6 pots');
  });
  it('never says the same tip twice in a row, keeps a short queue and drops a stale tip', () => {
    const tips = new RunTips();
    tips.say('A', 0); tips.say('A', 0); tips.tick(0);
    for (let i = 0; i < TIP_QUEUE + 2; i++) tips.say(`B${i}`, 10);
    expect(tips.waiting).toBe(TIP_QUEUE);
    const tips2 = new RunTips();
    tips2.say('Long', 0); tips2.say('Vieux', 0); tips2.tick(0);
    expect(tips2.tick(TIP_STALE + 10)).toBeNull(); // « Vieux » waited too long: the obstacle it spoke of is gone.
    expect(tips2.waiting).toBe(0);
  });
  it('shows an urgent tip at once, and the one it cut short comes back after it', () => {
    const tips = new RunTips();
    tips.say('Défi : frappe 6 pots', 0); expect(tips.tick(0)).toBe('Défi : frappe 6 pots');
    tips.say('Au-dessus du vide : reviens sur la piste !', 100, true);
    expect(tips.tick(100)).toBe('Au-dessus du vide : reviens sur la piste !');
    const end = 100 + tipMs('Au-dessus du vide : reviens sur la piste !');
    tips.tick(end); expect(tips.tick(end + TIP_GAP)).toBe('Défi : frappe 6 pots');
  });
  it('holds the tutorial’s advice until its step is done; the tips wait behind it', () => {
    const tips = new RunTips();
    tips.hold('Une barrière : glisse vers le haut pour sauter !', 0); tips.say('Un trou : saute par-dessus !', 0);
    expect(tips.tick(60_000 - TIP_STALE)).toBe('Une barrière : glisse vers le haut pour sauter !'); expect(tips.held).toBe(true);
    tips.hold(null, 100); expect(tips.held).toBe(false);
    expect(tips.tick(100 + TIP_GAP)).toBe('Un trou : saute par-dessus !');
  });
  it('keeps the words brief, and a big moment is never cut by a combo’s count', () => {
    const words = new RunWords();
    expect(words.say('Frénésie !', 0, WORD.big)?.text).toBe('Frénésie !');
    expect(words.say('4 coups', 100, WORD.combo)).toBeNull();
    expect(words.current(100)?.text).toBe('Frénésie !');
    expect(words.current(wordMs(WORD.big))).toBeNull();
    expect(words.say('5 coups', 2000, WORD.combo)?.text).toBe('5 coups');
    expect(words.say('6 coups', 2100, WORD.combo)?.text).toBe('6 coups'); // The same weight: the newer count.
    expect(words.say('3', 2200, WORD.count)?.text).toBe('3');
  });
  it('lets a second big moment wait for the first to be read rather than cut it', () => {
    const words = new RunWords();
    words.say('Nouveau record !', 0, WORD.big);
    expect(words.say('500 m !', 100, WORD.big)).toBeNull();
    expect(words.current(200)?.text).toBe('Nouveau record !');
    expect(words.current(wordMs(WORD.big) / 2)?.text).toBe('500 m !');
  });
});
