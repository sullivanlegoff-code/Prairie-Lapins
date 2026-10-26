import type {PreferenceStore} from './preferences';

/** One pending invitation, displayed only when the other dialogs have closed. */
export class AccountReminder {
  private pending = false;
  private dialog = document.createElement('dialog');
  constructor(private preferences: PreferenceStore, private eligible: () => boolean,
    private guidanceBusy: () => boolean, openAccount: () => void) {
    this.dialog.className = 'account-reminder';
    this.dialog.setAttribute('aria-labelledby', 'account-reminder-title');
    this.dialog.setAttribute('aria-describedby', 'account-reminder-text');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.innerHTML = `<h2 id="account-reminder-title">Garde ta prairie en sécurité</h2>
      <p id="account-reminder-text">Ta prairie grandit ! Associe ta partie à ton adresse e-mail : tu la retrouveras sur un autre appareil, même si ton navigateur l'efface.</p>
      <div class="actions"><button type="button">Associer mon e-mail</button><button type="button" class="secondary">Plus tard</button></div>`;
    const [associate, later] = this.dialog.querySelectorAll('button');
    associate.onclick = () => { this.dialog.close(); openAccount(); };
    later.onclick = () => this.dialog.close();
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.dialog.close(); });
    document.body.append(this.dialog);
  }
  request(): void {
    if (!this.eligible() || this.preferences.value.accountReminderShown || this.guidanceBusy()) return;
    this.pending = true;
    this.flush();
  }
  flush(): void {
    if (!this.pending) return;
    if (!this.eligible() || this.preferences.value.accountReminderShown || this.guidanceBusy()) { this.pending = false; return; }
    if (document.querySelector('dialog[open]')) return;
    this.pending = false;
    this.dialog.showModal();
    this.preferences.set({accountReminderShown: true});
    this.dialog.querySelector('button')!.focus();
  }
  dispose(): void { this.pending = false; if (this.dialog.open) this.dialog.close(); this.dialog.remove(); }
}
