// Partie jouée automatiquement (Chromium, écran de téléphone) : nouvelle partie, suit Paille et la cible du guide,
// donne un prénom à Paille, place les bâtiments sur l'île, réclame les missions, et enregistre une capture par étape.
// Ce n'est PAS un essai iPhone. Il s'arrête dès que trois étapes de suite ne changent rien (« stuck ») : lis alors
// la dernière capture pour comprendre où un joueur bloquerait.
// Préparation : `npm run build -- --configLoader runner`, puis servir dist/ sur 127.0.0.1:5199 :
//   node node_modules/vite/bin/vite.js preview --outDir dist --port 5199 --strictPort --host 127.0.0.1
// Usage : PLAYWRIGHT_MODULE=<chemin absolu de node_modules/playwright> node docs/playthrough-check.cjs <dossier de sortie hors dépôt> [largeur=844] [hauteur=390] [étapes=120]
// Résultat : <dossier>/step-NNN.png et <dossier>/log.json (état lu dans la sauvegarde à chaque étape, erreurs JavaScript).
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const [out, w = '844', h = '390', maxSteps = '120'] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: +w, height: +h}, isMobile: true, hasTouch: true});
  const errors = [], log = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:5199/');
  await page.waitForSelector('#loading-play:not([disabled])', {timeout: 60000});
  await page.click('#loading-play'); await page.waitForTimeout(1500);
  if (await page.isVisible('#continue-portrait')) await page.click('#continue-portrait');
  let last = '', same = 0;
  for (let i = 0; i < +maxSteps; i++) {
    const state = await page.evaluate(() => {
      const visible = el => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
      const dialog = document.querySelector('#paille-dialogue');
      const openDialog = [...document.querySelectorAll('dialog[open]')].find(d => d.id !== 'paille-dialogue');
      const target = [...document.querySelectorAll('dialog[open] .guide-target'), ...document.querySelectorAll('.guide-target')].find(el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true');
      const save = JSON.parse(localStorage.getItem('prairie-lapins.save.v1') || 'null');
      return {paille: dialog?.open ? dialog.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null,
        dialog: openDialog ? (openDialog.id || openDialog.className) + ': ' + openDialog.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null,
        target: target ? (target.id || target.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)) : null,
        task: document.querySelector('.paille-task')?.textContent?.slice(0, 120) ?? document.querySelector('#tutorial:not([hidden])')?.textContent?.replace(/\s+/g, ' ').slice(0, 120) ?? null,
        panel: document.getElementById('game-panel').hidden ? null : document.getElementById('panel-title').textContent,
        toast: document.getElementById('toast').hidden ? null : document.getElementById('toast').textContent,
        res: save && {p: save.pattes, g: save.grass, h: save.hearts, xp: save.progression.totalXp, rabbits: save.rabbits.map(r => r.species).join(','), buildings: save.buildings.map(b => b.kind + (b.habitat ? ':' + b.habitat.type : '')).join(','), claimed: save.missions.claimed.length}};
    });
    const key = JSON.stringify([state.paille, state.dialog, state.target, state.panel, state.res && state.res.claimed, state.res && state.res.p]);
    same = key === last ? same + 1 : 0; last = key;
    log.push({i, ...state});
    await page.screenshot({path: `${out}/step-${String(i).padStart(3, '0')}.png`});
    if (same >= 3) { log.push({stuck: true}); break; }
    if (state.paille) {
      const field = await page.$('#paille-dialogue input:not([type=hidden])');
      if (field && !(await field.inputValue())) { await field.fill('Lili'); log.push({filled: 'Lili'}); await page.waitForTimeout(200); }
      // A player taps the speech box; action buttons other than « Passer le tutoriel » / « Paramètres » are part of the guide.
      const action = await page.evaluate(() => { const b = [...document.querySelectorAll('#paille-dialogue button:not([disabled])')].find(b => !/Passer le tutoriel|Paramètres/.test(b.textContent)); if (b && b.offsetParent) { b.click(); return b.textContent; } document.querySelector('#paille-dialogue').click(); return null; });
      log.push({clicked: action ?? 'dialogue'});
    }
    else if (state.target) { await page.evaluate(() => { const visible = el => el && el.offsetParent !== null; [...document.querySelectorAll('dialog[open] .guide-target'), ...document.querySelectorAll('.guide-target')].find(el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true').click(); }); }
    else if (state.dialog) { const btn = await page.$('dialog[open]:not(#paille-dialogue) button:not([disabled])'); if (btn) await btn.click(); }
    else if (state.panel === 'Missions' && await page.evaluate(() => [...document.querySelectorAll('#panel-content button')].some(b => /^Réclamer/.test(b.textContent) && !b.disabled))) {
      const label = await page.evaluate(() => { const b = [...document.querySelectorAll('#panel-content button')].find(b => /^Réclamer/.test(b.textContent) && !b.disabled); b.click(); return b.textContent; });
      log.push({claimed: label});
      if (await page.isVisible('#continue-level-up').catch(() => false)) await page.click('#continue-level-up');
    }
    else if (state.panel && /^Placer/.test(state.panel)) {
      // Placement: tap the island until a valid cell is chosen (the tutorial marks it with a yellow square).
      const box = await page.evaluate(() => { const c = document.querySelector('#game canvas').getBoundingClientRect(); const p = document.getElementById('game-panel').getBoundingClientRect(); return {w: Math.min(c.width, p.left || c.width), h: c.height}; });
      let placed = false;
      for (let y = 60; y < box.h - 20 && !placed; y += 9) for (let x = 20; x < box.w - 20 && !placed; x += 9) {
        await page.mouse.click(x, y); await page.waitForTimeout(40);
        placed = await page.evaluate(() => [...document.querySelectorAll('#panel-content button')].some(b => /^Confirmer/.test(b.textContent) && !b.disabled));
        if (placed) log.push({placedAt: [x, y]});
      }
      if (!placed) log.push({placementFailed: true});
    }
    else { log.push({noTarget: true}); }
    await page.waitForTimeout(700);
  }
  fs.writeFileSync(`${out}/log.json`, JSON.stringify({log, errors}, null, 1));
  console.log(JSON.stringify({steps: log.length, errors: errors.slice(0, 10), last: log.slice(-4)}, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
