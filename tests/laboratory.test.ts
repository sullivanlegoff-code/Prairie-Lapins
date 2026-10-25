import {createGame} from '../src/simulation';
// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {developmentEnvironment, TEST_PREFIX, TEST_CLOCK_KEY} from '../src/dev/tools';
import {SCENARIOS, type ScenarioId} from '../src/dev/scenarios';
import {sessionPolicy} from '../src/config/runtime';
import {browserStorage} from '../src/persistence/browserStorage';
import {SAVE_KEY} from '../src/persistence/storage';
import { decodeGame, encodeGame} from '../src/simulation';
import {PreferenceStore} from '../src/ui/preferences';
import html from '../index.html?raw';
import {breedingPool} from '../src/simulation/breeding';
import {oddsView, rabbitAvailability} from '../src/ui/models';
import {habitatEntryReason} from '../src/simulation/habitats';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {EXPECTED_IDS} from './rabbit-art-fixtures';

const controllers: GameController[] = [];
const dispose: (() => void)[] = [];
// Old migration backups are orphan keys now, but the laboratory must still never touch them.
const BACKUP_KEY = 'prairie-lapins.backup.before-v2';
const normalKeys = [SAVE_KEY, BACKUP_KEY, 'prairie-lapins.backup.before-v3', 'prairie-lapins.backup.before-v4', 'prairie-lapins.ui.v1', 'unrelated-game'];
const normalSnapshot = () => normalKeys.map(key => localStorage.getItem(key));
beforeEach(() => {
  localStorage.clear(); vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
  window.confirm = vi.fn(() => false);
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  normalKeys.forEach(key => localStorage.setItem(key, key === SAVE_KEY ? encodeGame(createGame(Date.now())) : `protected-${key}`));
});
afterEach(() => { dispose.splice(0).forEach(fn => fn()); controllers.splice(0).forEach(c => c.dispose()); vi.restoreAllMocks(); });
function setup() {
  const dev = developmentEnvironment(browserStorage());
  const controller = new GameController(dev.storage, dev.clock); controllers.push(controller);
  return {dev, controller};
}

describe('published laboratory isolation', () => {
  it('loads and reloads Pic Pic through the real isolated selector with available adults, room and exact 40/40/20 odds', () => {
    const before = normalSnapshot(), {dev,controller} = setup(); dispose.push(dev.mount(controller));
    const button = document.getElementById('dev-scenario-picPic')!;
    expect(button.textContent).toBe('Pic Pic — découverte et reproduction');
    const initial = controller.getSnapshot().state;
    button.click(); expect(controller.getSnapshot().state).toEqual(initial);
    vi.mocked(window.confirm).mockReturnValue(true); button.click();
    const s = controller.getSnapshot().state!;
    expect(s.progression).toEqual({totalXp:cumulativeLevelXp(9),rewardedThroughLevel:9});
    expect(s.rabbits.map(r=>[r.species,r.affection])).toEqual([['pic-pic',2],['neige',2],['volant',2]]);
    expect(s.discovered).toEqual(['pic-pic','neige','volant']);expect(s.recipeBook).toEqual([]);
    expect(s.initiation).toBeUndefined();expect(s.startCourse).toBeUndefined();
    expect(s.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();
    expect(s.buildings.find(b=>b.kind==='nursery')!.nursery!.babies).toEqual([]);
    const home = s.buildings.find(b=>b.id===s.rabbits[0].enclosureId)!;
    expect(home.habitat).toEqual({type:'universal',level:2});
    expect(s.rabbits.every(r=>r.enclosureId===home.id && rabbitAvailability(s,r.id,Date.now())===null)).toBe(true);
    for(const species of ['pic-pic','neige','volant'] as const) expect(habitatEntryReason(s,home,species)).toBeNull();
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
    const reloaded = setup();expect(reloaded.controller.getSnapshot().state).toEqual(s);
    for(const [a,b] of [['neige','volant'],['volant','neige'],['pic-pic','neige'],['neige','pic-pic']] as const) {
      expect(breedingPool(s,a,b,2,2)).toMatchObject({"weights":{"neige":30,"pic-pic":30,"tunini":30,"volant":30},"total":120,"guaranteed":false});
      // Tunini, still undiscovered, shares the same union and appears as the unknown result.
      expect(oddsView(s,a,b,2,2)).toMatchObject({entries:[{name:'Lapin Neige',weight:25,probability:'25 %'},{name:'Lapin Volant',weight:25,probability:'25 %'},{name:'Pic Pic',weight:25,probability:'25 %'}],unknown:{weight:25,probability:'25 %'}});
    }
    for(const pair of [s.rabbits.slice(1),s.rabbits.slice(0,2)]) {
      expect(dev.loadScenario(controller,'picPic').ok).toBe(true);
      const parents=pair.map(r=>r.id) as [string,string];expect(controller.perform({type:'breed',parents}).ok).toBe(true);
      const job=controller.getSnapshot().state!.buildings.find(b=>b.breeding)!.breeding!;
      expect(job.parents).toEqual(parents);expect(job.endsAt-job.startedAt).toBe(20*60_000);
    }
    expect(normalSnapshot()).toEqual(before);
  });
  it('loads and reloads Améthyste through the real isolated selector with available adults, room and exact 40/40/20 odds', () => {
    const before = normalSnapshot(), {dev,controller} = setup(); dispose.push(dev.mount(controller));
    const button = document.getElementById('dev-scenario-amethyste')!;
    expect(button.textContent).toBe('Améthyste — découverte et reproduction');
    const initial = controller.getSnapshot().state;
    button.click(); expect(controller.getSnapshot().state).toEqual(initial);
    vi.mocked(window.confirm).mockReturnValue(true); button.click();
    const s = controller.getSnapshot().state!;
    expect(s.progression).toEqual({totalXp:cumulativeLevelXp(7),rewardedThroughLevel:7});
    expect(s.rabbits.map(r=>[r.species,r.affection])).toEqual([['amethyste',2],['belier-gris',2],['feu',2]]);
    expect(s.discovered).toEqual(['amethyste','belier-gris','feu']);expect(s.recipeBook).toEqual([]);
    expect(s.initiation).toBeUndefined();expect(s.startCourse).toBeUndefined();
    expect(s.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();
    expect(s.buildings.find(b=>b.kind==='nursery')!.nursery!.babies).toEqual([]);
    const home = s.buildings.find(b=>b.id===s.rabbits[0].enclosureId)!;
    expect(home.habitat).toEqual({type:'universal',level:2});
    expect(s.rabbits.every(r=>r.enclosureId===home.id && rabbitAvailability(s,r.id,Date.now())===null)).toBe(true);
    for(const species of ['amethyste','belier-gris','feu'] as const) expect(habitatEntryReason(s,home,species)).toBeNull();
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
    const reloaded = setup();expect(reloaded.controller.getSnapshot().state).toEqual(s);
    for(const [a,b] of [['belier-gris','feu'],['feu','belier-gris'],['amethyste','feu'],['feu','amethyste']] as const) {
      expect(breedingPool(s,a,b,2,2)).toMatchObject({"weights":{"amethyste":30,"belier-gris":30,"dinono":30,"feu":30},"total":120,"guaranteed":false});
      // Dinono, still undiscovered, shares the same union and appears as the unknown result.
      expect(oddsView(s,a,b,2,2)).toMatchObject({entries:[{name:'Lapin Feu',weight:25,probability:'25 %'},{name:'Lapin Bélier Gris',weight:25,probability:'25 %'},{name:'Améthyste',weight:25,probability:'25 %'}],unknown:{weight:25,probability:'25 %'}});
    }
    for(const pair of [s.rabbits.slice(1),s.rabbits.slice(0,2)]) {
      expect(dev.loadScenario(controller,'amethyste').ok).toBe(true);
      const parents=pair.map(r=>r.id) as [string,string];expect(controller.perform({type:'breed',parents}).ok).toBe(true);
      const job=controller.getSnapshot().state!.buildings.find(b=>b.breeding)!.breeding!;
      expect(job.parents).toEqual(parents);expect(job.endsAt-job.startedAt).toBe(20*60_000);
    }
    expect(normalSnapshot()).toEqual(before);
  });
  it('loads and reloads the existing Ardent/SNK scenario with four available adults, room and current 40/40/20/20 weights', () => {
    const before = normalSnapshot(), {dev, controller} = setup();
    dispose.push(dev.mount(controller));
    const button = document.getElementById('dev-scenario-ardent')!;
    expect(button.textContent).toBe('Ardent et SNK — découverte et reproduction');
    const initial = controller.getSnapshot().state;
    button.click(); expect(controller.getSnapshot().state).toEqual(initial);
    vi.mocked(window.confirm).mockReturnValue(true); button.click();
    const s = controller.getSnapshot().state!;
    expect(s.progression).toEqual({totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5});
    expect(s.rabbits.map(r => [r.species, r.affection])).toEqual([['ardent',2],['snk',2],['paille',2],['feu',2]]);
    expect(s.discovered).toEqual(['ardent','snk','paille','feu']); expect(s.recipeBook).toEqual([]);
    expect(s.initiation).toBeUndefined(); expect(s.startCourse).toBeUndefined();
    expect(s.buildings.find(b => b.kind === 'nest')!.breeding).toBeNull();
    expect(s.buildings.find(b => b.kind === 'nursery')!.nursery!.babies).toEqual([]);
    const home = s.buildings.find(b => b.id === s.rabbits[0].enclosureId)!;
    expect(home.habitat).toEqual({type:'universal',level:2});
    expect(s.rabbits.every(r => r.enclosureId === home.id && rabbitAvailability(s,r.id,Date.now()) === null)).toBe(true);
    for (const species of ['paille','feu','ardent','snk'] as const) expect(habitatEntryReason(s,home,species)).toBeNull();
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
    const reloaded = setup(); expect(reloaded.controller.getSnapshot().state).toEqual(s);
    for (const [a,b] of [['paille','feu'],['feu','paille'],['ardent','snk'],['snk','ardent']] as const) {
      expect(breedingPool(s,a,b,2,2)).toMatchObject({weights:{paille:30,feu:30,ardent:30,snk:30},total:120,guaranteed:false});
      expect(oddsView(s,a,b,2,2)).toMatchObject({"entries":[{"name":"Lapin Paille","probability":"25 %","weight":25},{"name":"Lapin Feu","probability":"25 %","weight":25},{"name":"Ardent","probability":"25 %","weight":25},{"name":"SNK","probability":"25 %","weight":25}],"unknown":null});
    }
    for (const pair of [s.rabbits.slice(2),s.rabbits.slice(0,2)]) {
      expect(dev.loadScenario(controller,'ardent').ok).toBe(true);
      const parents = pair.map(r => r.id) as [string,string];
      expect(controller.perform({type:'breed',parents}).ok).toBe(true);
      const job = controller.getSnapshot().state!.buildings.find(b => b.breeding)!.breeding!;
      expect(job.parents).toEqual(parents); expect(job.endsAt-job.startedAt).toBe(20*60_000);
    }
    expect(normalSnapshot()).toEqual(before);
  });
  it('loads the Frisket/Icy selector fixture with available adults and the normal exact 50/50 pool, isolated from normal saves', () => {
    const before = normalSnapshot(), {dev, controller} = setup();
    dispose.push(dev.mount(controller));
    vi.mocked(window.confirm).mockReturnValue(true);
    const button = document.getElementById('dev-scenario-frisketIcy')!;
    expect(button.textContent).toBe('Frisket et Icy — découverte et reproduction');
    button.click();
    const s = controller.getSnapshot().state!;
    expect(s.rabbits.map(r => [r.species, r.affection])).toEqual([['frisket', 2], ['icy', 2]]);
    expect(s.discovered).toEqual(['frisket', 'icy']);
    expect(s.recipeBook).toEqual([]);
    expect(s.initiation).toBeUndefined();
    expect(s.buildings.find(b => b.kind === 'nest')!.breeding).toBeNull();
    expect(s.buildings.find(b => b.kind === 'nursery')!.nursery!.babies).toEqual([]);
    const home = s.buildings.find(b => b.id === s.rabbits[0].enclosureId)!;
    expect(home.habitat).toEqual({type: 'universal', level: 1});
    expect(s.rabbits.every(r => r.enclosureId === home.id && rabbitAvailability(s, r.id, Date.now()) === null)).toBe(true);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    for (const [a, b] of [['frisket', 'icy'], ['icy', 'frisket']] as const) {
      expect(breedingPool(s, a, b, 2, 2)).toMatchObject({"weights":{"frisket":30,"icy":30},"total":60});
      expect(oddsView(s, a, b, 2, 2)).toMatchObject({entries: [{name: 'Frisket', weight: 50, probability: '50 %'}, {name: 'Icy', weight: 50, probability: '50 %'}], unknown: null});
    }
    expect(controller.perform({type: 'breed', parents: s.rabbits.map(r => r.id) as [string, string]}).ok).toBe(true);
    const job = controller.getSnapshot().state!.buildings.find(b => b.breeding)!.breeding!;
    expect(job.endsAt - job.startedAt).toBe(20 * 60_000);
    expect(normalSnapshot()).toEqual(before);
  });
  it('refuses a normal controller accidentally passed to test commands', () => {
    const {dev} = setup(), normal = new GameController(browserStorage(), Date.now); controllers.push(normal);
    const before = normalSnapshot();
    expect(dev.grant(normal, 'pattes', 1000)).toEqual({ok: false, reason: 'NOT_TEST_SESSION'});
    expect(dev.advanceTime(normal, 1440)).toEqual({ok: false, reason: 'NOT_TEST_SESSION'});
    expect(dev.loadScenario(normal, 'habitats')).toEqual({ok: false, reason: 'NOT_TEST_SESSION'});
    expect(() => dev.mount(normal)).toThrow('isolated laboratory storage');
    expect(normalSnapshot()).toEqual(before); expect(localStorage.getItem(TEST_CLOCK_KEY)).toBeNull();
  });
  it('grants every preset and advances every time step without changing ANY normal/backup key or normal clock', () => {
    const before = normalSnapshot(), {dev, controller} = setup();
    for (const minutes of [5, 20, 60, 360, 1440]) expect(dev.advanceTime(controller, minutes).ok).toBe(true);
    for (const [resource, amounts] of Object.entries({pattes: [1000,10000], grass: [100,1000], hearts: [10,100]})) for (const amount of amounts) expect(dev.grant(controller, resource as 'pattes' | 'grass' | 'hearts', amount).ok).toBe(true);
    expect(normalSnapshot()).toEqual(before); expect(Date.now()).toBe(1_000_000);
    expect(controller.getSnapshot().state!.pattes).toBe(11350);
    expect(localStorage.getItem(TEST_CLOCK_KEY)).toBe(String((5+20+60+360+1440)*60000));
    expect(dev.policy.onlineServicesAllowed).toBe(false); expect(sessionPolicy(false).kind).toBe('normal');
  });
  it('reloads each save and the test clock independently; preferences use separate keys', () => {
    const {dev, controller} = setup(); dev.grant(controller,'pattes',1000); dev.advanceTime(controller,60);
    const normalPrefs = new PreferenceStore('prairie-lapins.ui.v1'); normalPrefs.set({muted: true});
    const normalRaw = localStorage.getItem('prairie-lapins.ui.v1');
    new PreferenceStore(dev.preferenceKey).set({muted: false, tutorial: false});
    expect(localStorage.getItem('prairie-lapins.ui.v1')).toBe(normalRaw);
    const reloaded = setup(); expect(reloaded.dev.clock()).toBe(Date.now()+3600000);
    expect(reloaded.controller.getSnapshot().state!.pattes).toBe(1350);
    const normal = new GameController(browserStorage(), Date.now); controllers.push(normal);
    expect(normal.getSnapshot().state!.pattes).toBe(350); expect(normal.getSnapshot().state!.lastSimulatedAt).toBe(Date.now());
  });
  it('resets an incompatible laboratory save in the laboratory only, and refuses an incompatible import', () => {
    const before = normalSnapshot(), old = JSON.parse(encodeGame(createGame(Date.now()))); old.version = 15;
    localStorage.setItem(TEST_PREFIX+SAVE_KEY, JSON.stringify(old));
    const {controller} = setup();
    expect(controller.getSnapshot()).toMatchObject({status: 'saved', issue: null, catalogReset: true});
    expect(decodeGame(localStorage.getItem(TEST_PREFIX+SAVE_KEY)!).ok).toBe(true);
    expect(normalSnapshot()).toEqual(before);
    const saved = localStorage.getItem(TEST_PREFIX+SAVE_KEY);
    expect(controller.prepareImport(JSON.stringify(old))).toEqual({ok: false, reason: 'INCOMPATIBLE_CATALOG'});
    expect(localStorage.getItem(TEST_PREFIX+SAVE_KEY)).toBe(saved); expect(normalSnapshot()).toEqual(before);
  });
  it('imports a normal copy and can reset test state without replacing the source, clock, preferences or backups', () => {
    const before = normalSnapshot(), {dev, controller} = setup();
    const prepared=controller.prepareImport(localStorage.getItem(SAVE_KEY)!); if (!prepared.ok) throw Error(prepared.reason);
    controller.confirmImport(prepared.token,true); dev.advanceTime(controller,20); dev.grant(controller,'hearts',100);
    localStorage.setItem(dev.preferenceKey,'test-prefs'); localStorage.setItem(TEST_PREFIX+BACKUP_KEY,'test-backup');
    const testBefore=localStorage.getItem(TEST_PREFIX+SAVE_KEY);
    expect(controller.restart(false).ok).toBe(false); expect(localStorage.getItem(TEST_PREFIX+SAVE_KEY)).toBe(testBefore);
    expect(controller.restart(true).ok).toBe(true); expect(controller.getSnapshot().state!.hearts).toBe(12);
    expect(localStorage.getItem(TEST_CLOCK_KEY)).toBe('1200000'); expect(localStorage.getItem(dev.preferenceKey)).toBe('test-prefs');
    expect(localStorage.getItem(TEST_PREFIX+BACKUP_KEY)).toBe('test-backup'); expect(normalSnapshot()).toEqual(before);
  });
  it('rejects storage failures, overflows and invalid presets without replacing the test or normal state', () => {
    const base=browserStorage(), dev=developmentEnvironment({getItem:base.getItem,setItem:(k,v)=>{if(k===TEST_CLOCK_KEY)throw Error('quota');base.setItem(k,v);}});
    const c=new GameController(dev.storage,dev.clock);controllers.push(c);const before=c.getSnapshot().state, normal=normalSnapshot();
    expect(dev.advanceTime(c,5)).toEqual({ok:false,reason:'WRITE_FAILED'}); expect(dev.clock()).toBe(Date.now());
    expect(dev.grant(c,'hearts',-1).ok).toBe(false); expect(dev.advanceTime(c,7).ok).toBe(false);expect(c.getSnapshot().state).toEqual(before);
    const full=createGame(Date.now()); full.pattes=Number.MAX_SAFE_INTEGER;const p=c.prepareImport(encodeGame(full));if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,true);
    expect(dev.grant(c,'pattes',1000).ok).toBe(false);expect(c.getSnapshot().state!.pattes).toBe(Number.MAX_SAFE_INTEGER);expect(normalSnapshot()).toEqual(normal);
  });
  it('keeps the test state intact if a grant/scenario cannot be written', () => {
    const base=browserStorage();let failed=false;
    const dev=developmentEnvironment({getItem:base.getItem,setItem:(k,v)=>{if(failed)throw Error('quota');base.setItem(k,v);}});
    const c=new GameController(dev.storage,dev.clock);controllers.push(c);const before=c.getSnapshot().state, normal=normalSnapshot();failed=true;
    expect(dev.grant(c,'pattes',1000).ok).toBe(false);expect(dev.loadScenario(c,'habitats').ok).toBe(false);
    expect(c.getSnapshot().state).toEqual(before);expect(normalSnapshot()).toEqual(normal);
  });
  it('uses controller persistence for the two XP buttons, without touching normal state', () => {
    const {dev,controller}=setup(),before=normalSnapshot();dispose.push(dev.mount(controller));
    document.getElementById('dev-xp-50')!.click();document.getElementById('dev-xp-500')!.click();
    expect(controller.getSnapshot().state).toMatchObject({"progression":{"rewardedThroughLevel":3,"totalXp":550},"hearts":14});
    expect(document.getElementById('dev-status')!.textContent).toContain('+500 XP');
    expect(normalSnapshot()).toEqual(before);
  });
  it('requires confirmation in the real reset/scenario controls and labels the permanent banner', () => {
    const {dev,controller}=setup();dispose.push(dev.mount(controller));dev.grant(controller,'pattes',1000);
    const confirm=vi.mocked(window.confirm).mockReturnValue(false),before=controller.getSnapshot().state;
    document.getElementById('dev-reset')!.click();document.getElementById('dev-scenario-habitats')!.click();expect(controller.getSnapshot().state).toEqual(before);
    confirm.mockReturnValue(true);document.getElementById('dev-reset')!.click();expect(controller.getSnapshot().state!.pattes).toBe(350);
    expect(document.getElementById('dev-badge')!.hidden).toBe(false);expect(document.getElementById('dev-badge')!.textContent).toContain('MODE TEST — PARTIE SÉPARÉE');
  });
  it('exposes all seven decoration/island scenarios in the laboratory and preview and requires confirmation', () => {
    const base = browserStorage(), lab = setup(); dispose.push(lab.dev.mount(lab.controller));
    const ids = ['islandStart', 'islandExpanded', 'islandFull', 'decorationStart', 'decorationDemo', 'decoratedHabitat', 'decorationDense'];
    for (const id of ids) expect(document.getElementById('dev-scenario-' + id)).not.toBeNull();
    dispose.pop()!();
    const preview = developmentEnvironment(base, {decorationPreview: true});
    const controller = new GameController(preview.storage, preview.clock); controllers.push(controller);
    dispose.push(preview.mount(controller)); const original = normalSnapshot();
    for (const id of ids) expect(document.getElementById('dev-scenario-' + id)).not.toBeNull();
    const before = controller.getSnapshot().state;
    document.getElementById('dev-scenario-decorationStart')!.click();
    expect(controller.getSnapshot().state).toEqual(before);
    vi.mocked(window.confirm).mockReturnValue(true);
    document.getElementById('dev-scenario-decorationStart')!.click();
    expect(controller.getSnapshot().state).toEqual(createGame(Date.now()));
    expect(normalSnapshot()).toEqual(original);
  });
  it.each(Object.keys(SCENARIOS) as ScenarioId[])('%s passes v9 validation, serializes and never touches normal data', id => {
    const before=normalSnapshot();
    const {dev,controller}=setup();expect(dev.loadScenario(controller,id).ok).toBe(true);expect(normalSnapshot()).toEqual(before);
    // Validate the fixture actually loaded, without rebuilding the 512-object scenario twice.
    const fixture=controller.getSnapshot().state!;expect(decodeGame(encodeGame(fixture))).toEqual({ok:true,state:fixture});
    if(id==='habitats')for(const home of fixture.buildings)expect(fixture.rabbits.filter(r=>r.enclosureId===home.id)).toHaveLength(7);
    if(id==='collection')expect(fixture.discovered).toEqual([...EXPECTED_IDS]);
    if(id==='missions')expect(fixture.missions.completed).toHaveLength(12);
    if(id==='reproduction')expect(controller.perform({type:'breed',parents:['rabbit-2','rabbit-3']}).ok).toBe(true);
  }, 20000);
});
