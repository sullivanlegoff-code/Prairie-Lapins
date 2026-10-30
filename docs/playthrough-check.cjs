// Partie jouée automatiquement (Chromium, écran de téléphone) : nouvelle partie, suit Paille et la cible du guide,
// donne un prénom à Paille, place les bâtiments sur l'île, réclame les missions, et enregistre une capture par étape.
// Ce n'est PAS un essai iPhone. Il s'arrête dès que trois étapes de suite ne changent rien (« stuck ») : lis alors
// la dernière capture pour comprendre où un joueur bloquerait.
// Préparation : `npm run build -- --configLoader runner`, puis servir dist/ sur 127.0.0.1:5199 :
//   node node_modules/vite/bin/vite.js preview --outDir dist --port 5199 --strictPort --host 127.0.0.1
// Usage : PLAYWRIGHT_MODULE=<chemin absolu de node_modules/playwright> node docs/playthrough-check.cjs <dossier de sortie hors dépôt> [largeur=844] [hauteur=390] [étapes=120]
// FEU=1 : après le tutoriel, achète la Clairière de feu puis le Lapin Feu avec les seules récompenses (log « feuStart » → « feuEnd »).
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
    else if (state.panel === 'Missions' && await page.evaluate(() => [...document.querySelectorAll('#panel-content button')].some(b => /^(Réclamer|Valider l’objectif)/.test(b.textContent) && !b.disabled))) {
      const label = await page.evaluate(() => { const b = [...document.querySelectorAll('#panel-content button')].find(b => /^(Réclamer|Valider l’objectif)/.test(b.textContent) && !b.disabled); b.click(); return b.textContent; });
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
  if (process.env.FEU === '1') try {
    // Phase 2 : le joueur a fini le tutoriel avec ses seules récompenses ; il doit pouvoir acheter la Clairière de feu puis le Lapin Feu.
    const shot = async name => page.screenshot({path: `${out}/feu-${name}.png`});
    const texts = () => page.evaluate(() => [...document.querySelectorAll('#panel-content button')].map(b => (b.disabled ? '[x] ' : '') + b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 40));
    const save = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('prairie-lapins.save.v1')); return {p: s.pattes, level: s.progression.totalXp, rabbits: s.rabbits.map(r => r.species), habitats: s.buildings.filter(b => b.habitat).map(b => b.habitat.type)}; });
    const clickText = async (re, scope = '#panel-content') => { const ok = await page.evaluate(([src, scope]) => { const re = new RegExp(src); const b = [...document.querySelectorAll(scope + ' button')].find(b => re.test(b.textContent) && !b.disabled && b.offsetParent); if (b) { b.click(); return b.textContent.replace(/\s+/g, ' ').trim(); } return null; }, [re.source, scope]); log.push({feu: ok ?? 'introuvable: ' + re}); await page.waitForTimeout(500); return ok; };
    const close = async () => { for (let i = 0; i < 3 && await page.isVisible('#continue-level-up'); i++) { await page.click('#continue-level-up'); await page.waitForTimeout(400); } if (await page.isVisible('#close-panel')) await page.click('#close-panel'); await page.waitForTimeout(300); for (let i = 0; i < 3 && await page.isVisible('#continue-level-up'); i++) { await page.click('#continue-level-up'); await page.waitForTimeout(400); } };
    await close(); log.push({feuStart: await save()});
    await page.click('#open-shop'); await page.waitForTimeout(600); log.push({shop: await texts()}); await shot('1-boutique');
    // Habitats : la carte de la Clairière de feu (titre « Clairière de feu »).
    const card = async (title, tab) => { if (tab) await clickText(tab); return page.evaluate(title => { const c = [...document.querySelectorAll('#panel-content .card, #panel-content .shop-category')].find(c => new RegExp(title).test(c.textContent)); if (!c) return null; const b = c.querySelector('button'); return {text: b?.textContent.replace(/\s+/g, ' ').trim(), disabled: b?.disabled}; }, title); };
    log.push({glade: await card('Clairière de feu')});
    let ok = await page.evaluate(() => { const c = [...document.querySelectorAll('#panel-content .card, #panel-content .shop-category')].find(c => /Clairière de feu/.test(c.textContent)); const b = c?.querySelector('button:not(:disabled)'); if (b) { b.click(); return true; } return false; });
    await page.waitForTimeout(700);
    if (!ok) { await clickText(/^Bâtiments|^Habitats/); log.push({shopTab: await texts()}); ok = await page.evaluate(() => { const c = [...document.querySelectorAll('#panel-content .card, #panel-content .shop-category')].find(c => /Clairière de feu/.test(c.textContent)); const b = c?.querySelector('button:not(:disabled)'); if (b) { b.click(); return true; } return false; }); await page.waitForTimeout(700); }
    log.push({gladeCardClicked: ok, panel: await page.textContent('#panel-title')}); await shot('2-placement');
    // Placement : toucher l'île jusqu'à ce que « Confirmer » soit actif, puis confirmer.
    const area = await page.evaluate(() => { const c = document.querySelector('#game canvas').getBoundingClientRect(), p = document.getElementById('game-panel').getBoundingClientRect(); return {w: Math.min(c.width, p.left || c.width), h: c.height}; });
    let placed = false;
    for (let y = 60; y < area.h - 20 && !placed; y += 9) for (let x = 20; x < area.w - 20 && !placed; x += 9) {
      await page.mouse.click(x, y); await page.waitForTimeout(40);
      placed = await page.evaluate(() => [...document.querySelectorAll('#panel-content button')].some(b => /^(Confirmer|Acheter et placer)/.test(b.textContent) && !b.disabled));
    }
    log.push({gladePlacementPossible: placed}); await shot('3-case');
    if (placed) { await clickText(/^(Confirmer|Acheter et placer)/); await page.waitForTimeout(800); }
    await close(); log.push({afterGlade: await save()}); await shot('4-clairiere');
    // Lapin Feu : boutique, onglet Lapins, carte « Lapin Feu », choisir l'habitat Feu, confirmer.
    await page.click('#open-shop'); await page.waitForTimeout(500); await clickText(/^Lapins/);
    log.push({rabbitShop: await texts()}); await shot('5-lapins');
    const feuCard = await page.evaluate(() => { const c = [...document.querySelectorAll('#panel-content .card')].find(c => c.querySelector('h3')?.textContent === 'Lapin Feu'); const b = c?.querySelector('button'); if (b && !b.disabled) { b.click(); return b.textContent.replace(/\s+/g, ' ').trim(); } return b ? '[désactivé] ' + b.textContent.replace(/\s+/g, ' ').trim() : null; });
    await page.waitForTimeout(600); log.push({feuCard}); log.push({destinations: await texts()}); await shot('6-destination');
    await clickText(/Clairière de feu|feu/i); log.push({afterDestination: await texts()});
    await clickText(/^Confirmer l’achat/); await page.waitForTimeout(900);
    await close(); log.push({feuEnd: await save()}); await shot('7-fin');
  } catch (e) { log.push({feuError: String(e).slice(0, 400)}); await page.screenshot({path: `${out}/feu-erreur.png`}).catch(() => {}); }
  fs.writeFileSync(`${out}/log.json`, JSON.stringify({log, errors}, null, 1));
  console.log(JSON.stringify({steps: log.length, errors: errors.slice(0, 10), last: log.slice(-4)}, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
