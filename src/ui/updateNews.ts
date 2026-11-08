import {christmasActive} from '../config/christmas';
import {NEWS_PAGES, UPDATE_NEWS_ID, type NewsPage} from '../config/updateNews';
import type {PreferenceStore} from './preferences';

/**
 * The page of the Christmas update's news (owner, 8 November 2026): « quand le joueur arrive sur le jeu il doit être accueilli
 * par une page qui donne les nouveautés de la mise à jour et l'événement de Noël ». It opens by itself once per device, when no
 * other window is open and Paille's guided start is over, then the button under the settings opens it again while the
 * Christmas event lasts. Three painted posters to swipe through (src/config/updateNews.ts), the words over their calm bottom.
 */
const escape = (text: string) => text.replace(/[&<>"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[char]!);
const slide = (page: NewsPage, index: number, count: number) => `<section class="un-slide un-${page.id}" aria-roledescription="affiche" aria-label="${index + 1} sur ${count}">
  <img class="un-poster" src="${page.poster}" alt="" draggable="false" decoding="async">
  <div class="un-card"><h2>${escape(page.title)}</h2><ul>${page.lines.map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>
</section>`;

export class UpdateNews {
  readonly dialog = document.createElement('dialog');
  private pending = false;
  private track: HTMLElement;
  private dots: HTMLElement[];
  private next: HTMLButtonElement;
  private page = 0;
  constructor(private preferences: PreferenceStore, private guidanceBusy: () => boolean, private pages: readonly NewsPage[] = NEWS_PAGES) {
    const d = this.dialog;
    d.className = 'update-news'; d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Nouveautés de la mise à jour de Noël');
    d.innerHTML = `<div class="un-track">${pages.map((p, i) => slide(p, i, pages.length)).join('')}</div>
      <p class="un-ribbon" aria-hidden="true">Mise à jour de Noël</p>
      <button type="button" class="un-close kit-bare" aria-label="Fermer les nouveautés">✕</button>
      <div class="un-footer"><div class="un-dots">${pages.map((p, i) => `<button type="button" class="kit-bare" aria-label="Affiche ${i + 1} : ${escape(p.title)}"></button>`).join('')}</div>
      <button type="button" class="un-next">Suivant</button></div>`;
    this.track = d.querySelector('.un-track')!;
    this.dots = [...d.querySelectorAll<HTMLElement>('.un-dots button')];
    this.next = d.querySelector('.un-next')!;
    // A poster not there yet (or not loaded) leaves the slide's own bright colours.
    for (const img of d.querySelectorAll<HTMLImageElement>('.un-poster')) img.addEventListener('error', () => { img.hidden = true; }, {once: true});
    d.querySelector<HTMLButtonElement>('.un-close')!.onclick = () => this.close();
    this.dots.forEach((dot, i) => { dot.onclick = () => this.show(i); });
    this.next.onclick = () => { if (this.page >= this.pages.length - 1) this.close(); else this.show(this.page + 1); };
    this.track.addEventListener('scroll', () => {
      const width = this.track.clientWidth;
      if (width > 0) this.mark(Math.round(this.track.scrollLeft / width));
    }, {passive: true});
    d.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); this.show(Math.min(this.page + 1, this.pages.length - 1)); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); this.show(Math.max(this.page - 1, 0)); }
    });
    d.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    document.body.append(d);
  }
  /** Whether the button under the settings shows: only while the Christmas event lasts. */
  get available(): boolean { return christmasActive(); }
  get seen(): boolean { return this.preferences.value.newsSeen === UPDATE_NEWS_ID; }
  open(page = 0): void {
    if (!this.dialog.open) this.dialog.showModal();
    this.preferences.set({newsSeen: UPDATE_NEWS_ID});
    this.show(page, false);
    this.next.focus({preventScroll: true});
  }
  close(): void { if (this.dialog.open) this.dialog.close(); }
  /** At the start: the page will open by itself as soon as nothing else is in the way, if this device has not seen it. */
  request(): void { if (this.available && !this.seen) { this.pending = true; this.flush(); } }
  /** Called every second: opens a requested page once Paille's guided start and every other window are done. */
  flush(): void {
    if (!this.pending) return;
    if (!this.available || this.seen) { this.pending = false; return; }
    if (this.guidanceBusy() || document.querySelector('dialog[open]')) return;
    this.pending = false;
    this.open();
  }
  private show(index: number, smooth = true): void {
    const target = Math.max(0, Math.min(index, this.pages.length - 1));
    const left = target * this.track.clientWidth;
    if (typeof this.track.scrollTo === 'function') this.track.scrollTo({left, behavior: smooth && !matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'});
    else this.track.scrollLeft = left;
    this.mark(target);
  }
  private mark(index: number): void {
    this.page = Math.max(0, Math.min(index, this.pages.length - 1));
    this.dots.forEach((dot, i) => { dot.classList.toggle('is-current', i === this.page); dot.setAttribute('aria-current', i === this.page ? 'true' : 'false'); });
    this.next.textContent = this.page >= this.pages.length - 1 ? 'C’est parti !' : 'Suivant';
  }
  dispose(): void { this.pending = false; this.close(); this.dialog.remove(); }
}
